import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ConnectionPanel } from "./components/ConnectionPanel";
import { SetupView } from "./components/SetupView";
import { useYjs } from "./hooks/useYjs";
import { useFileSync } from "./hooks/useFileSync";
import { useWatcher } from "./hooks/useWatcher";
import { useSyncStore } from "./store/syncStore";

export default function App() {
  const project       = useSyncStore((s) => s.project);
  const roomId        = useSyncStore((s) => s.roomId);
  const setProject    = useSyncStore((s) => s.setProject);
  const setRoomId     = useSyncStore((s) => s.setRoomId);

  const { doc, triggerSync }        = useYjs(roomId);
  const { handleFileChange }        = useFileSync(doc, project?.path ?? null);

  useWatcher(handleFileChange);

  const handleOpenProject = useCallback(
    async (path: string) => {
      try {
        const info = await invoke<{ name: string; path: string; file_count: number }>(
          "start_watching",
          { path }
        );
        setProject({ name: info.name, path: info.path, fileCount: info.file_count });
        setRoomId(
          `relayfs-${info.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`
        );
      } catch (err) {
        console.error("Failed to open project:", err);
      }
    },
    [setProject, setRoomId]
  );

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 select-none">
      {project ? (
        <ConnectionPanel onSync={triggerSync} />
      ) : (
        <SetupView onOpen={handleOpenProject} />
      )}
    </div>
  );
}
