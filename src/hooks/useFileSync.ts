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

/**
 * Applies a character-level diff to a Y.Text instead of full delete+insert.
 * Finds the minimal unchanged prefix and suffix, then surgically replaces
 * only the changed middle section — preserving CRDT history and sending
 * far less data over the wire.
 */
function applyTextDiff(yt: Y.Text, newContent: string) {
  const old = yt.toString();
  if (old === newContent) return;

  // common prefix
  let start = 0;
  const minLen = Math.min(old.length, newContent.length);
  while (start < minLen && old[start] === newContent[start]) start++;

  // common suffix (never overlaps with prefix)
  let oldEnd = old.length;
  let newEnd = newContent.length;
  while (oldEnd > start && newEnd > start && old[oldEnd - 1] === newContent[newEnd - 1]) {
    oldEnd--;
    newEnd--;
  }

  const deleteCount = oldEnd - start;
  const insertSlice = newContent.slice(start, newEnd);

  if (deleteCount > 0) yt.delete(start, deleteCount);
  if (insertSlice.length > 0) yt.insert(start, insertSlice);
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

interface FileMeta { size: number; hash: string; modified: number; }

export const LOCAL_ORIGIN = "local-disk";

export function useFileSync(doc: Y.Doc | null, projectPath: string | null) {
  const writing           = useRef(new Set<string>());
  const recentLocalMods   = useRef(new Set<string>());
  const localContentCache = useRef(new Map<string, string>());
  // Per-file debounce timers so rapid watcher bursts don't flood Yjs
  const fileDebounce      = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const setLastSync      = useSyncStore((s) => s.setLastSync);
  const setTransfer      = useSyncStore((s) => s.setTransfer);
  const addConflict      = useSyncStore((s) => s.addConflict);
  const clearConflict    = useSyncStore((s) => s.clearConflict);
  const addActivityEntry = useSyncStore((s) => s.addActivityEntry);
  const writtenCount     = useRef(0);

  // Push activity both locally AND into the shared Yjs array so the remote
  // peer sees the exact same entry (same id + timestamp).
  const addActivity = useCallback(
    (raw: Omit<import("../types").ActivityEntry, "id" | "ts">) => {
      const store = useSyncStore.getState();
      const { localPeerInfo, roomCode } = store;

      const entry: import("../types").ActivityEntry = {
        ...raw,
        id: Math.random().toString(36).slice(2, 9),
        ts: Date.now(),
        peerId:   localPeerInfo?.peerId   ?? undefined,
        peerName: localPeerInfo?.peerName ?? undefined,
        peerIp:   localPeerInfo?.peerIp   ?? undefined,
        roomCode: roomCode ?? undefined,
      };

      addActivityEntry(entry); // local store — immediate

      // Persist to disk (non-blocking, fire-and-forget)
      invoke("append_history", { entry: JSON.stringify(entry) }).catch(() => {});

      if (!doc) return;
      const actLog = doc.getArray<string>("activity-log");
      doc.transact(() => {
        actLog.push([JSON.stringify(entry)]);
      }, LOCAL_ORIGIN);
    },
    [doc, addActivityEntry]
  );

  // ── Observe shared activity log from remote peers ─────────────────────────
  useEffect(() => {
    if (!doc) return;
    const actLog = doc.getArray<string>("activity-log");

    const observer = (event: Y.YArrayEvent<string>, txn: Y.Transaction) => {
      if (txn.origin === LOCAL_ORIGIN) return; // our own inserts, already in local store
      for (const delta of event.changes.delta) {
        if (!delta.insert) continue;
        for (const record of delta.insert as string[]) {
          try {
            const entry = JSON.parse(record) as import("../types").ActivityEntry;
            addActivityEntry(entry);
            // Persist remote peer's entries to local history too
            invoke("append_history", { entry: record }).catch(() => {});
          } catch { /* malformed — ignore */ }
        }
      }
    };

    actLog.observe(observer);
    return () => actLog.unobserve(observer);
  }, [doc, addActivityEntry]);

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
            const fm: FileMeta = { size: content.length, hash: fnv1a(content), modified: Date.now() };
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
  // Uses observeDeep so BOTH map-level changes (file add/delete) AND Y.Text
  // mutations (content edits via applyTextDiff) trigger a disk write.
  // Plain .observe only fires on key add/delete — it misses text mutations.
  useEffect(() => {
    if (!doc || !projectPath) return;

    const fileMap = doc.getMap<Y.Text>("files");
    const metaMap = doc.getMap<string>("file-meta");

    const onRemoteChange = (
      events: Y.YEvent<Y.AbstractType<unknown>>[],
      transaction: Y.Transaction,
    ) => {
      if (transaction.origin === LOCAL_ORIGIN) return;

      const toDelete = new Set<string>();
      const toWrite  = new Map<string, "added" | "modified">();

      for (const ev of events) {
        if (ev.path.length === 0) {
          // Map-level: key added / deleted / replaced
          const mapEv = ev as Y.YMapEvent<Y.Text>;
          mapEv.changes.keys.forEach((change, rp) => {
            if (change.action === "delete") {
              toDelete.add(rp);
            } else {
              toWrite.set(rp, change.action === "add" ? "added" : "modified");
            }
          });
        } else {
          // Text-level: Y.Text content mutated (applyTextDiff path)
          const rp = ev.path[0] as string;
          if (!toWrite.has(rp)) toWrite.set(rp, "modified");
        }
      }

      toDelete.forEach(async (rp) => {
        const abs  = `${projectPath}\\${rp.replace(/\//g, "\\")}`;
        const norm = abs.replace(/\\/g, "/");
        writing.current.add(norm);
        try {
          await invoke("delete_file", { path: abs });
          addActivity({ type: "deleted", path: rp, side: "remote" });
        } catch { /* already gone */ }
        finally { setTimeout(() => writing.current.delete(norm), 800); }
      });

      toWrite.forEach(async (action, rp) => {
        const yt  = fileMap.get(rp);
        if (!yt) return;

        if (recentLocalMods.current.has(rp)) {
          addConflict(rp);
          addActivity({ type: "conflict", path: rp, side: "remote" });
        }

        const content = yt.toString();
        const size    = content.length;
        const abs     = `${projectPath}\\${rp.replace(/\//g, "\\")}`;
        const norm    = abs.replace(/\\/g, "/");

        writing.current.add(norm);
        try {
          await invoke("write_file_atomic", { path: abs, content });
          writtenCount.current += 1;
          const total = doc.getMap<number>("meta").get("totalFiles") ?? 0;
          setTransfer(writtenCount.current, total);
          setLastSync(Date.now());

          const storedRaw = metaMap.get(rp);
          let verified = false;
          if (storedRaw) {
            try {
              const stored: FileMeta = JSON.parse(storedRaw);
              verified = stored.hash === fnv1a(content) && stored.size === size;
            } catch { /* ignore */ }
          }

          addActivity({
            type: verified ? "verified" : action,
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

    fileMap.observeDeep(onRemoteChange);
    return () => fileMap.unobserveDeep(onRemoteChange);
  }, [doc, projectPath]);

  // ── Step 3: Local disk change → update Yjs ───────────────────────────────
  // Debounced per-file so rapid watcher bursts (Windows fires 2-3 events per save)
  // collapse into a single Yjs transaction and a single WebRTC send.
  const handleFileChange = useCallback(
    (absPath: string) => {
      if (!doc || !projectPath) return;
      if (!isText(absPath)) return;

      const norm = absPath.replace(/\\/g, "/");
      if (writing.current.has(norm)) return;

      // Debounce: clear any pending flush for this file
      const existing = fileDebounce.current.get(norm);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(() => {
        fileDebounce.current.delete(norm);
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
            const fm: FileMeta = { size: content.length, hash: fnv1a(content), modified: Date.now() };

            doc.transact(() => {
              const yt = fileMap.get(rp);
              if (!yt) {
                fileMap.set(rp, new Y.Text(content));
              } else {
                // Diff-based update: only send the changed characters, not the whole file
                applyTextDiff(yt, content);
              }
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
      }, 80); // 80ms debounce — fast enough to feel instant, collapses duplicate events

      fileDebounce.current.set(norm, timer);
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
              if (yt) applyTextDiff(yt, saved);
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

  // Write every file currently in the Yjs map to destPath (initial guest download)
  const downloadAllFromYjs = useCallback(async (destPath: string) => {
    if (!doc) return;
    const fileMap = doc.getMap<Y.Text>("files");
    const entries: [string, string][] = [];
    fileMap.forEach((yt, rp) => { entries.push([rp, yt.toString()]); });

    for (const [rp, content] of entries) {
      const abs = `${destPath}\\${rp.replace(/\//g, "\\")}`;
      try {
        await invoke("write_file_atomic", { path: abs, content });
        addActivity({ type: "added", path: rp, side: "remote", size: content.length });
      } catch (e) {
        addActivity({ type: "error", path: rp, side: "remote" });
      }
    }
  }, [doc, addActivity]);

  return { handleFileChange, resolveConflict, getPendingCount, downloadAllFromYjs };
}
