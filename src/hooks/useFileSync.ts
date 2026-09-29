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

// Forward slashes, strip leading slash
function rel(absPath: string, root: string) {
  return absPath.replace(/\\/g, "/").replace(root.replace(/\\/g, "/") + "/", "");
}

// Y.Text replace: delete-all + insert preserves CRDT history object
function replaceText(yt: Y.Text, content: string) {
  if (yt.toString() === content) return; // no-op
  yt.delete(0, yt.length);
  yt.insert(0, content);
}

const LOCAL_ORIGIN = "local-disk";

export function useFileSync(doc: Y.Doc | null, projectPath: string | null) {
  // Paths we are currently writing to disk — ignore their watcher events
  const writing = useRef(new Set<string>());
  const setLastSync = useSyncStore((s) => s.setLastSync);

  // ── Step 1: Load all text files into Yjs on project open ──────────────────
  useEffect(() => {
    if (!doc || !projectPath) return;
    let alive = true;

    (async () => {
      const relPaths = await invoke<string[]>("list_project_files", { root: projectPath });
      const fileMap = doc.getMap<Y.Text>("files");

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

  // ── Step 2: Remote Yjs changes → write to disk ────────────────────────────
  useEffect(() => {
    if (!doc || !projectPath) return;

    const fileMap = doc.getMap<Y.Text>("files");

    const observer = (
      event: Y.YMapEvent<Y.Text>,
      transaction: Y.Transaction
    ) => {
      // Skip changes we initiated ourselves from disk
      if (transaction.origin === LOCAL_ORIGIN) return;

      event.changes.keys.forEach(async (change, rp) => {
        if (change.action === "delete") return;

        const yt = fileMap.get(rp);
        if (!yt) return;

        const abs = `${projectPath}\\${rp.replace(/\//g, "\\")}`;
        const norm = abs.replace(/\\/g, "/");

        writing.current.add(norm);
        try {
          await invoke("write_file_atomic", { path: abs, content: yt.toString() });
          setLastSync(Date.now());
        } catch (e) {
          console.error("[relayfs] write failed", rp, e);
        } finally {
          // Hold in set long enough to absorb the watcher bounce
          setTimeout(() => writing.current.delete(norm), 800);
        }
      });
    };

    fileMap.observe(observer);
    return () => fileMap.unobserve(observer);
  }, [doc, projectPath]);

  // ── Step 3: Local disk change → update Yjs (called by useWatcher) ────────
  const handleFileChange = useCallback(
    (absPath: string) => {
      if (!doc || !projectPath) return;
      if (!isText(absPath)) return;

      const norm = absPath.replace(/\\/g, "/");
      if (writing.current.has(norm)) return; // our own write, ignore

      const rp = rel(absPath, projectPath);

      invoke<string>("read_file", { path: absPath })
        .then((content) => {
          const fileMap = doc.getMap<Y.Text>("files");
          doc.transact(() => {
            let yt = fileMap.get(rp);
            if (!yt) {
              fileMap.set(rp, new Y.Text(content));
            } else {
              replaceText(yt, content);
            }
          }, LOCAL_ORIGIN);
        })
        .catch(() => {
          // File deleted — remove from map
          doc.transact(() => {
            doc.getMap<Y.Text>("files").delete(rp);
          }, LOCAL_ORIGIN);
        });
    },
    [doc, projectPath]
  );

  // Expose pending count from the Yjs map size (rough indicator)
  const getPendingCount = useCallback(() => {
    if (!doc) return 0;
    return doc.getMap<Y.Text>("files").size;
  }, [doc]);

  return { handleFileChange, getPendingCount };
}
