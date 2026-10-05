import { create } from "zustand";
import type {
  ActivityEntry,
  AppMode,
  ConnectionState,
  Peer,
  ProjectInfo,
  SyncPhase,
  TransferState,
} from "../types";

interface SyncStore {
  appMode: AppMode;
  connectionState: ConnectionState;
  syncPhase: SyncPhase;
  peers: Peer[];
  project: ProjectInfo | null;
  pendingUpdates: number;
  lastSyncAt: number | null;
  roomId: string | null;
  roomCode: string | null;
  transfer: TransferState;
  autoSync: boolean;
  conflictFiles: string[];
  reconnectAt: number | null;
  activityLog: ActivityEntry[];

  setAppMode: (mode: AppMode) => void;
  setConnectionState: (state: ConnectionState) => void;
  setSyncPhase: (phase: SyncPhase) => void;
  addPeer: (peer: Peer) => void;
  removePeer: (id: string) => void;
  setProject: (project: ProjectInfo | null) => void;
  incrementPending: () => void;
  clearPending: () => void;
  setLastSync: (time: number) => void;
  setRoomId: (id: string | null) => void;
  setRoomCode: (code: string | null) => void;
  setTransfer: (done: number, total: number) => void;
  toggleAutoSync: () => void;
  addConflict: (rp: string) => void;
  clearConflict: (rp: string) => void;
  setReconnectAt: (t: number | null) => void;
  addActivity: (entry: Omit<ActivityEntry, "id" | "ts">) => void;
  clearActivity: () => void;
  resetSession: () => void;
}

export const useSyncStore = create<SyncStore>((set) => ({
  appMode: "setup",
  connectionState: "offline",
  syncPhase: "idle",
  peers: [],
  project: null,
  pendingUpdates: 0,
  lastSyncAt: null,
  roomId: null,
  roomCode: null,
  transfer: { done: 0, total: 0 },
  autoSync: false,
  conflictFiles: [],
  reconnectAt: null,
  activityLog: [],

  setAppMode: (appMode) => set({ appMode }),
  setConnectionState: (connectionState) => set({ connectionState }),
  setSyncPhase: (syncPhase) => set({ syncPhase }),
  addPeer: (peer) =>
    set((s) => ({ peers: [...s.peers.filter((p) => p.id !== peer.id), peer] })),
  removePeer: (id) =>
    set((s) => ({ peers: s.peers.filter((p) => p.id !== id) })),
  setProject: (project) => set({ project }),
  incrementPending: () =>
    set((s) => ({ pendingUpdates: s.pendingUpdates + 1 })),
  clearPending: () => set({ pendingUpdates: 0 }),
  setLastSync: (lastSyncAt) => set({ lastSyncAt }),
  setRoomId: (roomId) => set({ roomId }),
  setRoomCode: (roomCode) => set({ roomCode }),
  setTransfer: (done, total) => set({ transfer: { done, total } }),
  toggleAutoSync: () => set((s) => ({ autoSync: !s.autoSync })),
  addConflict: (rp) =>
    set((s) => ({
      conflictFiles: s.conflictFiles.includes(rp)
        ? s.conflictFiles
        : [...s.conflictFiles, rp],
    })),
  clearConflict: (rp) =>
    set((s) => ({ conflictFiles: s.conflictFiles.filter((f) => f !== rp) })),
  setReconnectAt: (reconnectAt) => set({ reconnectAt }),
  addActivity: (entry) =>
    set((s) => {
      const full: ActivityEntry = {
        ...entry,
        id: Math.random().toString(36).slice(2, 9),
        ts: Date.now(),
      };
      return { activityLog: [full, ...s.activityLog].slice(0, 400) };
    }),
  clearActivity: () => set({ activityLog: [] }),
  resetSession: () =>
    set({
      appMode: "setup",
      connectionState: "offline",
      syncPhase: "idle",
      peers: [],
      project: null,
      pendingUpdates: 0,
      lastSyncAt: null,
      roomId: null,
      roomCode: null,
      transfer: { done: 0, total: 0 },
      conflictFiles: [],
      reconnectAt: null,
      activityLog: [],
    }),
}));

if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__RELAYFS_STORE__ = useSyncStore;
}
