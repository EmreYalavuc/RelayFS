import { create } from "zustand";
import type {
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
    }),
}));
