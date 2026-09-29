import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useSyncStore } from "../store/syncStore";
import type { FileChangePayload } from "../types";

export function useWatcher(onFileChange?: (path: string) => void) {
  const incrementPending = useSyncStore((s) => s.incrementPending);

  useEffect(() => {
    const unlistenPromise = listen<FileChangePayload>("file-changed", (event) => {
      for (const path of event.payload.paths) {
        incrementPending();
        onFileChange?.(path);
      }
    });

    return () => {
      unlistenPromise.then((fn) => fn());
    };
  }, [incrementPending, onFileChange]);
}
