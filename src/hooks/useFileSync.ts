import { useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import * as Y from "yjs";
import { useSyncStore } from "../store/syncStore";

const TEXT_EXT = new Set([
  "ts","tsx","js","jsx","mjs","cjs",
  "json","jsonc","css","scss","sass","less",
  "html","htm","svg","md","mdx","txt",
  "rs","toml","py","rb","go","vue","svelte","astro",
  "yaml","yml","sh","bash",
]);

function isText(path: string) {
  return TEXT_EXT.has(path.split(".").pop()?.toLowerCase() ?? "");
}

function rel(absPath: string, root: string) {
  return absPath.replace(/\\/g, "/").replace(root.replace(/\\/g, "/") + "/", "");
}

function replaceText(yt: Y.Text, content: string) {
  if (yt.toString() === content) return;
  yt.delete(0, yt.length);
  yt.insert(0, content);
}

export const LOCAL_ORIGIN = "local-disk";

export function useFileSync(doc: Y.Doc | null, projectPath: string | null) {
  const writing          = useRef(new Set<string>());
  const recentLocalMods  = useRef(new Set<string>());
  // Cache the last content we pushed locally so "Keep Mine" can restore it
  const localContentCache = useRef(new Map<string, string>());

  const setLastSync   = useSyncStore((s) => s.setLastSync);
  const setTransfer   = useSyncStore((s) => s.setTransfer);
  const addConflict   = useSyncStore((s) => s.addConflict);
  const clearConflict = useSyncStore((s) => s.clearConflict);
  const writtenCount  = useRef(0);

  // ── Step 1: Load all text files into Yjs on project open ─────────────────
  useEffect(() => {
    if (!doc || !projectPath) return;
    let alive = true;

    (async () => {
      const relPaths = await invoke<string[]>("list_project_files", { root: projectPath });
      const fileMap  = doc.getMap<Y.Text>("files");
      const meta     = doc.getMap<number>("meta");

      doc.transact(() => {
        meta.set("totalFiles", relPaths.length);
      }, LOCAL_ORIGIN);

      for (const rp of relPaths) {
        if (!alive) break;
        const abs = `${projectPath}\\${rp.replace(/\//g, "\\")}`;
        try {
          const content = await invoke<string>("read_file", { path: abs });
          if (!fileMap.has(rp)) {
            doc.transact(() => {
              fileMap.set(rp, new Y.Text(content));
            }, LOCAL_ORIGIN);
          }
        } catch { /* skip unreadable */ }
      }
    })();

    return () => { alive = false; };
  }, [doc, projectPath]);

  // ── Step 2: Remote Yjs changes → write to disk ───────────────────────────
  useEffect(() => {
    if (!doc || !projectPath) return;

    const fileMap = doc.getMap<Y.Text>("files");

    const observer = (
      event: Y.YMapEvent<Y.Text>,
      transaction: Y.Transaction
    ) => {
      if (transaction.origin === LOCAL_ORIGIN) return;

      event.changes.keys.forEach(async (change, rp) => {
        const abs  = `${projectPath}\\${rp.replace(/\//g, "\\")}`;
        const norm = abs.replace(/\\/g, "/");

        // Remote file deletion → remove from disk
        if (change.action === "delete") {
          writing.current.add(norm);
          try {
            await invoke("delete_file", { path: abs });
          } catch { /* already gone */ }
          finally {
            setTimeout(() => writing.current.delete(norm), 800);
          }
          return;
        }

        const yt = fileMap.get(rp);
        if (!yt) return;

        // Detect simultaneous local+remote edit
        if (recentLocalMods.current.has(rp)) {
          addConflict(rp);
        }

        writing.current.add(norm);
        try {
          await invoke("write_file_atomic", { path: abs, content: yt.toString() });
          writtenCount.current += 1;
          const total = doc.getMap<number>("meta").get("totalFiles") ?? 0;
          setTransfer(writtenCount.current, total);
          setLastSync(Date.now());
        } catch (e) {
          console.error("[relayfs] write failed", rp, e);
        } finally {
          setTimeout(() => writing.current.delete(norm), 800);
        }
      });
    };

    fileMap.observe(observer);
    return () => fileMap.unobserve(observer);
  }, [doc, projectPath]);

  // ── Step 3: Local disk change → update Yjs ───────────────────────────────
  const handleFileChange = useCallback(
    (absPath: string) => {
      if (!doc || !projectPath) return;
      if (!isText(absPath)) return;

      const norm = absPath.replace(/\\/g, "/");
      if (writing.current.has(norm)) return;

      const rp = rel(absPath, projectPath);

      invoke<string>("read_file", { path: absPath })
        .then((content) => {
          // Cache local version so conflict resolution can restore it
          localContentCache.current.set(rp, content);

          // Mark as recently modified locally (5s window)
          recentLocalMods.current.add(rp);
          setTimeout(() => recentLocalMods.current.delete(rp), 5000);

          const fileMap = doc.getMap<Y.Text>("files");
          doc.transact(() => {
            const yt = fileMap.get(rp);
            if (!yt) fileMap.set(rp, new Y.Text(content));
            else replaceText(yt, content);
          }, LOCAL_ORIGIN);
        })
        .catch(() => {
          doc.transact(() => {
            doc.getMap<Y.Text>("files").delete(rp);
          }, LOCAL_ORIGIN);
        });
    },
    [doc, projectPath]
  );

  // ── Conflict resolution ───────────────────────────────────────────────────
  const resolveConflict = useCallback(
    async (rp: string, strategy: "accept" | "keep-mine") => {
      clearConflict(rp);

      if (strategy === "keep-mine" && doc && projectPath) {
        const saved = localContentCache.current.get(rp);
        if (saved != null) {
          const abs  = `${projectPath}\\${rp.replace(/\//g, "\\")}`;
          const norm = abs.replace(/\\/g, "/");
          writing.current.add(norm);
          try {
            await invoke("write_file_atomic", { path: abs, content: saved });
            doc.transact(() => {
              const yt = doc.getMap<Y.Text>("files").get(rp);
              if (yt) replaceText(yt, saved);
            }, LOCAL_ORIGIN);
          } catch (e) {
            console.error("[relayfs] revert failed", rp, e);
          } finally {
            setTimeout(() => writing.current.delete(norm), 800);
          }
        }
      }

      localContentCache.current.delete(rp);
    },
    [doc, projectPath, clearConflict]
  );

  const getPendingCount = useCallback(() => {
    if (!doc) return 0;
    return doc.getMap<Y.Text>("files").size;
  }, [doc]);

  return { handleFileChange, resolveConflict, getPendingCount };
}
