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

// FNV-1a 32-bit hash — fast, good enough for integrity checking
function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

interface FileMeta { size: number; hash: string; }

export const LOCAL_ORIGIN = "local-disk";

export function useFileSync(doc: Y.Doc | null, projectPath: string | null) {
  const writing          = useRef(new Set<string>());
  const recentLocalMods  = useRef(new Set<string>());
  const localContentCache = useRef(new Map<string, string>());

  const setLastSync   = useSyncStore((s) => s.setLastSync);
  const setTransfer   = useSyncStore((s) => s.setTransfer);
  const addConflict   = useSyncStore((s) => s.addConflict);
  const clearConflict = useSyncStore((s) => s.clearConflict);
  const addActivity   = useSyncStore((s) => s.addActivity);
  const writtenCount  = useRef(0);

  // ── Step 1: Load all text files into Yjs on project open ─────────────────
  useEffect(() => {
    if (!doc || !projectPath) return;
    let alive = true;

    (async () => {
      const relPaths = await invoke<string[]>("list_project_files", { root: projectPath });
      const fileMap  = doc.getMap<Y.Text>("files");
      const metaMap  = doc.getMap<string>("file-meta");
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
            const fm: FileMeta = { size: content.length, hash: fnv1a(content) };
            doc.transact(() => {
              fileMap.set(rp, new Y.Text(content));
              metaMap.set(rp, JSON.stringify(fm));
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
    const metaMap = doc.getMap<string>("file-meta");

    const observer = (
      event: Y.YMapEvent<Y.Text>,
      transaction: Y.Transaction
    ) => {
      if (transaction.origin === LOCAL_ORIGIN) return;

      event.changes.keys.forEach(async (change, rp) => {
        const abs  = `${projectPath}\\${rp.replace(/\//g, "\\")}`;
        const norm = abs.replace(/\\/g, "/");

        if (change.action === "delete") {
          writing.current.add(norm);
          try {
            await invoke("delete_file", { path: abs });
            addActivity({ type: "deleted", path: rp, side: "remote" });
          } catch { /* already gone */ }
          finally {
            setTimeout(() => writing.current.delete(norm), 800);
          }
          return;
        }

        const yt = fileMap.get(rp);
        if (!yt) return;

        if (recentLocalMods.current.has(rp)) {
          addConflict(rp);
          addActivity({ type: "conflict", path: rp, side: "remote" });
        }

        const content = yt.toString();
        const size    = content.length;

        writing.current.add(norm);
        try {
          await invoke("write_file_atomic", { path: abs, content });
          writtenCount.current += 1;
          const total = doc.getMap<number>("meta").get("totalFiles") ?? 0;
          setTransfer(writtenCount.current, total);
          setLastSync(Date.now());

          // Verify: compare received content against stored meta hash
          const storedRaw = metaMap.get(rp);
          let verified = false;
          if (storedRaw) {
            try {
              const stored: FileMeta = JSON.parse(storedRaw);
              verified = stored.hash === fnv1a(content) && stored.size === size;
            } catch { /* ignore parse error */ }
          }

          addActivity({
            type: verified ? "verified" : (change.action === "add" ? "added" : "modified"),
            path: rp,
            side: "remote",
            size,
          });
        } catch (e) {
          console.error("[relayfs] write failed", rp, e);
          addActivity({ type: "error", path: rp, side: "remote", size });
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
          localContentCache.current.set(rp, content);
          recentLocalMods.current.add(rp);
          setTimeout(() => recentLocalMods.current.delete(rp), 5000);

          const fileMap = doc.getMap<Y.Text>("files");
          const metaMap = doc.getMap<string>("file-meta");
          const isNew   = !fileMap.has(rp);
          const fm: FileMeta = { size: content.length, hash: fnv1a(content) };

          doc.transact(() => {
            const yt = fileMap.get(rp);
            if (!yt) fileMap.set(rp, new Y.Text(content));
            else replaceText(yt, content);
            metaMap.set(rp, JSON.stringify(fm));
          }, LOCAL_ORIGIN);

          addActivity({
            type: isNew ? "added" : "modified",
            path: rp,
            side: "local",
            size: content.length,
          });
        })
        .catch(() => {
          doc.transact(() => {
            doc.getMap<Y.Text>("files").delete(rp);
          }, LOCAL_ORIGIN);
          addActivity({ type: "deleted", path: rp, side: "local" });
        });
    },
    [doc, projectPath, addActivity]
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
