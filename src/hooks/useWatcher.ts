import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useSyncStore } from "../store/syncStore";
import type { FileChangePayload } from "../types";

export function useWatcher() {
  const incrementPending = useSyncStore((s) => s.incrementPending);

  useEffect(() => {
    const unlistenPromise = listen<FileChangePayload>("file-changed", () => {
      incrementPending();
    });

    return () => {
      unlistenPromise.then((fn) => fn());
    };
  }, [incrementPending]);
}
