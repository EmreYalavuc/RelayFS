import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ConnectionPanel } from "./components/ConnectionPanel";
import { SetupView } from "./components/SetupView";
import { useYjs } from "./hooks/useYjs";
import { useFileSync } from "./hooks/useFileSync";
import { useWatcher } from "./hooks/useWatcher";
import { useSyncStore } from "./store/syncStore";
import { generateRoomCode, codeToRoomId } from "./utils/roomCode";

export default function App() {
  const appMode    = useSyncStore((s) => s.appMode);
  const project    = useSyncStore((s) => s.project);
  const roomId     = useSyncStore((s) => s.roomId);
  const setAppMode = useSyncStore((s) => s.setAppMode);
  const setProject = useSyncStore((s) => s.setProject);
  const setRoomId  = useSyncStore((s) => s.setRoomId);
  const setRoomCode= useSyncStore((s) => s.setRoomCode);

  const { doc, triggerSync }     = useYjs(roomId);
  const { handleFileChange }     = useFileSync(doc, project?.path ?? null);
  useWatcher(handleFileChange);

  // Host: open local project → generate room code
  const handleHost = useCallback(async (path: string) => {
    try {
      const info = await invoke<{ name: string; path: string; file_count: number }>(
        "start_watching", { path }
      );
      const code = generateRoomCode();
      setProject({ name: info.name, path: info.path, fileCount: info.file_count });
      setRoomCode(code);
      setRoomId(codeToRoomId(code));
      setAppMode("host");
    } catch (err) {
      console.error("Failed to open project:", err);
    }
  }, [setProject, setRoomCode, setRoomId, setAppMode]);

  // Guest: enter room code + pick destination folder
  const handleJoin = useCallback(async (code: string, destPath: string) => {
    try {
      // Create / validate destination directory
      await invoke("start_watching", { path: destPath }).catch(() => {
        // Dest folder may not have files yet — that's fine
      });
      setProject({ name: destPath.split(/[\\/]/).pop() ?? "project", path: destPath, fileCount: 0 });
      setRoomCode(null); // guests don't display the code
      setRoomId(codeToRoomId(code));
      setAppMode("guest");
    } catch (err) {
      console.error("Failed to join session:", err);
    }
  }, [setProject, setRoomCode, setRoomId, setAppMode]);

  const inSession = appMode === "host" || appMode === "guest";

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 select-none">
      {inSession ? (
        <ConnectionPanel onSync={triggerSync} />
      ) : (
        <SetupView onHost={handleHost} onJoin={handleJoin} />
      )}
    </div>
  );
}
