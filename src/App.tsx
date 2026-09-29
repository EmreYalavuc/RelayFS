import { useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ConnectionPanel } from "./components/ConnectionPanel";
import { SetupView, saveSession, clearSession } from "./components/SetupView";
import { useYjs } from "./hooks/useYjs";
import { useFileSync } from "./hooks/useFileSync";
import { useWatcher } from "./hooks/useWatcher";
import { useSyncStore } from "./store/syncStore";
import { generateRoomCode, codeToRoomId } from "./utils/roomCode";

export default function App() {
  const appMode      = useSyncStore((s) => s.appMode);
  const project      = useSyncStore((s) => s.project);
  const roomId       = useSyncStore((s) => s.roomId);
  const autoSync     = useSyncStore((s) => s.autoSync);
  const setAppMode   = useSyncStore((s) => s.setAppMode);
  const setProject   = useSyncStore((s) => s.setProject);
  const setRoomId    = useSyncStore((s) => s.setRoomId);
  const setRoomCode  = useSyncStore((s) => s.setRoomCode);
  const resetSession = useSyncStore((s) => s.resetSession);

  const { doc, triggerSync, reconnect } = useYjs(roomId);
  const { handleFileChange, resolveConflict } = useFileSync(doc, project?.path ?? null);

  // Debounced auto-sync trigger for watcher events
  const autoSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const watcherCallback = useCallback((path: string) => {
    handleFileChange(path);
    if (autoSync) {
      if (autoSyncTimer.current) clearTimeout(autoSyncTimer.current);
      autoSyncTimer.current = setTimeout(() => triggerSync(), 400);
    }
  }, [handleFileChange, autoSync, triggerSync]);

  useWatcher(watcherCallback);

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

      saveSession({
        projectPath: info.path,
        projectName: info.name,
        roomCode: code,
        appMode: "host",
      });
    } catch (err) {
      console.error("Failed to open project:", err);
    }
  }, [setProject, setRoomCode, setRoomId, setAppMode]);

  // Guest: enter room code + pick destination folder
  const handleJoin = useCallback(async (code: string, destPath: string) => {
    try {
      await invoke("start_watching", { path: destPath }).catch(() => {});
      const projectName = destPath.split(/[\\/]/).pop() ?? "project";
      setProject({ name: projectName, path: destPath, fileCount: 0 });
      setRoomCode(null);
      setRoomId(codeToRoomId(code));
      setAppMode("guest");

      saveSession({
        projectPath: destPath,
        projectName,
        roomCode: code,
        appMode: "guest",
      });
    } catch (err) {
      console.error("Failed to join session:", err);
    }
  }, [setProject, setRoomCode, setRoomId, setAppMode]);

  const handleDisconnect = useCallback(() => {
    clearSession();
    useSyncStore.getState().setReconnectAt(null);
    resetSession();
  }, [resetSession]);

  const inSession = appMode === "host" || appMode === "guest";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 select-none">
      {inSession ? (
        <ConnectionPanel
          onSync={triggerSync}
          onResolveConflict={resolveConflict}
          onDisconnect={handleDisconnect}
          onReconnect={reconnect}
        />
      ) : (
        <SetupView onHost={handleHost} onJoin={handleJoin} />
      )}
    </div>
  );
}
