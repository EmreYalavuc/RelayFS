import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { motion } from "motion/react";
import { FolderOpen, Copy, Check, SignOut, X, ArrowSquareOut } from "@phosphor-icons/react";
import logoUrl from "../assets/RelayFS.svg";
import { useSyncStore } from "../store/syncStore";
import { ConnectionStatus } from "./ConnectionStatus";
import { SyncButton } from "./SyncButton";
import { PeerList } from "./PeerList";
import { TransferProgress } from "./TransferProgress";
import { ConflictPanel } from "./ConflictPanel";
import { ReconnectBanner } from "./ReconnectBanner";
import { ActivityTerminal } from "./ActivityTerminal";

interface Props {
  onSync: () => void;
  onResolveConflict: (rp: string, strategy: "accept" | "keep-mine") => void;
  onDisconnect: () => void;
  onReconnect: () => void;
}

function formatRelative(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export function ConnectionPanel({ onSync, onResolveConflict, onDisconnect, onReconnect }: Props) {
  const connectionState = useSyncStore((s) => s.connectionState);
  const project         = useSyncStore((s) => s.project);
  const peers           = useSyncStore((s) => s.peers);
  const pending         = useSyncStore((s) => s.pendingUpdates);
  const lastSyncAt      = useSyncStore((s) => s.lastSyncAt);
  const roomCode        = useSyncStore((s) => s.roomCode);
  const appMode         = useSyncStore((s) => s.appMode);
  const autoSync        = useSyncStore((s) => s.autoSync);
  const toggleAutoSync  = useSyncStore((s) => s.toggleAutoSync);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="w-[380px] bg-[#1c1c1e] border border-white/[0.08] rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden"
    >
      {/* Title bar — vibrancy */}
      <div
        data-tauri-drag-region
        className="flex items-center justify-between px-4 py-3 border-b border-[rgba(84,84,88,0.45)] bg-black/50 backdrop-blur-[20px]"
      >
        <ConnectionStatus state={connectionState} />

        <div className="flex items-center gap-1" data-tauri-drag-region="false">
          {/* Auto-sync toggle */}
          <button
            onClick={toggleAutoSync}
            title={autoSync ? "Auto-sync ON" : "Auto-sync OFF"}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
              autoSync
                ? "text-[#0a84ff] bg-[#0a84ff]/10 border border-[rgba(10,132,255,0.25)]"
                : "text-[rgba(235,235,245,0.4)] bg-transparent hover:bg-white/[0.06] border border-transparent"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full transition-colors ${
              autoSync ? "bg-[#0a84ff]" : "bg-[#636366]"
            }`} />
            Auto
          </button>

          {/* Logo */}
          <img
            src={logoUrl}
            alt="RelayFS"
            className="h-5 w-auto opacity-30 mx-1"
            draggable={false}
          />

          {/* Disconnect */}
          <button
            onClick={onDisconnect}
            title="Disconnect"
            className="w-7 h-7 flex items-center justify-center rounded-full text-[rgba(235,235,245,0.4)] hover:text-[rgba(235,235,245,0.7)] hover:bg-white/[0.07] transition-all"
          >
            <SignOut size={13} weight="bold" />
          </button>

          {/* Close */}
          <button
            onClick={() => getCurrentWindow().close()}
            title="Close"
            className="w-7 h-7 flex items-center justify-center rounded-full text-[rgba(235,235,245,0.4)] hover:text-white hover:bg-[#ff453a] transition-all"
          >
            <X size={13} weight="bold" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-5">
        {/* Project path + reveal button */}
        <div className="flex items-center gap-2 mb-4">
          <FolderOpen size={13} weight="fill" className="text-[rgba(235,235,245,0.3)] flex-shrink-0" />
          <p className="text-[12px] font-mono text-[rgba(235,235,245,0.5)] truncate flex-1">
            {project?.path ?? "—"}
          </p>
          {project?.path && (
            <button
              onClick={() => invoke("reveal_in_explorer", { path: project.path }).catch(() => {})}
              title="Explorer'da göster"
              className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-[rgba(235,235,245,0.3)] hover:text-[rgba(235,235,245,0.7)] hover:bg-white/[0.07] transition-all"
            >
              <ArrowSquareOut size={12} weight="bold" />
            </button>
          )}
        </div>

        {/* Room code (host only) */}
        {appMode === "host" && roomCode && (
          <RoomCodeBadge code={roomCode} />
        )}

        {/* Peers summary */}
        {peers.length > 0 && (
          <p className="text-[12px] text-[rgba(235,235,245,0.45)] mt-1">
            <span className="text-[#30d158] font-semibold tabular-nums">{peers.length}</span>
            {" "}peer{peers.length !== 1 ? "s" : ""} connected
          </p>
        )}

        {/* Central sync button */}
        <div className="flex justify-center my-6">
          <SyncButton onClick={onSync} />
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between pt-4 border-t border-[rgba(84,84,88,0.35)]">
          <StatItem
            label="Pending"
            value={String(pending)}
            accent={pending > 0}
            accentColor="text-[#ff9f0a]"
          />
          <StatItem
            label="Last sync"
            value={lastSyncAt ? formatRelative(lastSyncAt) : "—"}
          />
        </div>

        {appMode === "guest" && <TransferProgress />}
        <ConflictPanel onResolve={onResolveConflict} />
        <ReconnectBanner onReconnect={onReconnect} />
        <ActivityTerminal />
      </div>

      {peers.length > 0 && (
        <div className="px-5 pb-5">
          <PeerList peers={peers} />
        </div>
      )}
    </motion.div>
  );
}

function RoomCodeBadge({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex-1 flex items-center gap-3 bg-[#2c2c2e] border border-[rgba(84,84,88,0.5)] rounded-[12px] px-3.5 py-2.5">
        <span className="text-[10px] font-sans font-semibold text-[rgba(235,235,245,0.3)] uppercase tracking-widest">
          Room
        </span>
        <span className="text-[15px] font-mono tracking-[0.2em] font-semibold text-white">
          {code}
        </span>
      </div>
      <button
        onClick={copy}
        title="Copy room code"
        className="flex items-center justify-center w-10 h-10 bg-[#2c2c2e] border border-[rgba(84,84,88,0.5)] rounded-[12px] hover:bg-[#3a3a3c] transition-all"
      >
        {copied
          ? <Check size={14} weight="bold" className="text-[#30d158]" />
          : <Copy size={14} weight="bold" className="text-[rgba(235,235,245,0.45)]" />}
      </button>
    </div>
  );
}

function StatItem({
  label, value, accent = false, accentColor = "",
}: {
  label: string;
  value: string;
  accent?: boolean;
  accentColor?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[12px] text-[rgba(235,235,245,0.35)]">{label}</span>
      <span className={`text-[12px] font-mono tabular-nums ${accent ? accentColor : "text-[rgba(235,235,245,0.55)]"}`}>
        {value}
      </span>
    </div>
  );
}
