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

export type AppMode = "setup" | "host" | "guest" | "guest-joining";

export interface HostProjectInfo {
  name: string;
  fileCount: number;
}

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

export interface SavedSession {
  projectPath: string;
  projectName: string;
  roomCode: string | null;
  appMode: "host" | "guest";
}

export type ActivityEventType =
  | "added"
  | "modified"
  | "deleted"
  | "verified"
  | "mismatch"
  | "conflict"
  | "error";

export interface ActivityEntry {
  id: string;
  ts: number;
  type: ActivityEventType;
  path: string;
  side: "local" | "remote";
  size?: number;
  peerId?: string;    // persistent UUID identifying the originating peer
  peerName?: string;  // machine hostname
  peerIp?: string;    // local IP at time of change
  roomCode?: string;  // room this change happened in
}
