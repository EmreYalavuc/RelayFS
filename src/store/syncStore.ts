import { create } from "zustand";
import type { ConnectionState, Peer, ProjectInfo, SyncPhase } from "../types";

interface SyncStore {
  connectionState: ConnectionState;
  syncPhase: SyncPhase;
  peers: Peer[];
  project: ProjectInfo | null;
  pendingUpdates: number;
  lastSyncAt: number | null;
  roomId: string | null;

  setConnectionState: (state: ConnectionState) => void;
  setSyncPhase: (phase: SyncPhase) => void;
  addPeer: (peer: Peer) => void;
  removePeer: (id: string) => void;
  setProject: (project: ProjectInfo | null) => void;
  incrementPending: () => void;
  clearPending: () => void;
  setLastSync: (time: number) => void;
  setRoomId: (id: string | null) => void;
}

export const useSyncStore = create<SyncStore>((set) => ({
  connectionState: "offline",
  syncPhase: "idle",
  peers: [],
  project: null,
  pendingUpdates: 0,
  lastSyncAt: null,
  roomId: null,

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
}));
