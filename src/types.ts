export type ConnectionState =
  | "offline"
  | "connecting"
  | "connected"
  | "syncing"
  | "converged"
  | "diverged";

export type SyncPhase =
  | "idle"
  | "syncing"
  | "exchanging"
  | "applying"
  | "converged"
  | "error";

export type AppMode = "setup" | "host" | "guest";

export interface Peer {
  id: string;
  name: string;
  connected: boolean;
  lastSeen: number;
}

export interface ProjectInfo {
  name: string;
  path: string;
  fileCount: number;
}

export interface FileChangePayload {
  kind: string;
  paths: string[];
}

export interface TransferState {
  done: number;
  total: number;
}
