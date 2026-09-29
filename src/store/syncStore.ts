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
    }),
}));
