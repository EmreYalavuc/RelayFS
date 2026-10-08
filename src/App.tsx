import { useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ConnectionPanel } from "./components/ConnectionPanel";
import { SetupView, saveSession, clearSession } from "./components/SetupView";
import { GuestLobbyView } from "./components/GuestLobbyView";
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
  const { handleFileChange, resolveConflict, downloadAllFromYjs } = useFileSync(doc, project?.path ?? null);

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
      saveSession({ projectPath: info.path, projectName: info.name, roomCode: code, appMode: "host" });
    } catch (err) {
      console.error("Failed to open project:", err);
    }
  }, [setProject, setRoomCode, setRoomId, setAppMode]);

  // Guest step 1: enter room code → connect immediately, show lobby with folder picker
  const handleJoin = useCallback((code: string) => {
    setRoomCode(code);                // save human-readable code for session restore
    setRoomId(codeToRoomId(code));    // derive roomId for Yjs
    setAppMode("guest-joining");
  }, [setRoomCode, setRoomId, setAppMode]);

  // Guest step 2: folder chosen → move to active guest session
  const handleGuestSetup = useCallback(async (
    destPath: string,
    mode: "existing" | "download",
  ) => {
    const savedCode = useSyncStore.getState().roomCode ?? "";
    try {
      await invoke("ensure_dir", { path: destPath });
      const info = await invoke<{ name: string; path: string; file_count: number }>(
        "start_watching", { path: destPath }
      );
      setProject({ name: info.name, path: info.path, fileCount: info.file_count });
      setAppMode("guest");
      saveSession({ projectPath: info.path, projectName: info.name, roomCode: savedCode, appMode: "guest" });

      // Download mode: write all Yjs files to the new folder after React re-renders
      if (mode === "download") {
        await new Promise<void>((r) => setTimeout(r, 50));
        await downloadAllFromYjs(info.path);
      }
    } catch (err) {
      console.error("Failed to setup guest project:", err);
      throw err;
    }
  }, [setProject, setAppMode, downloadAllFromYjs]);

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
          doc={doc}
          onSync={triggerSync}
          onResolveConflict={resolveConflict}
          onDisconnect={handleDisconnect}
          onReconnect={reconnect}
        />
      ) : appMode === "guest-joining" ? (
        <GuestLobbyView
          doc={doc}
          onSetup={handleGuestSetup}
          onCancel={handleDisconnect}
        />
      ) : (
        <SetupView onHost={handleHost} onJoin={handleJoin} />
      )}
    </div>
  );
}
