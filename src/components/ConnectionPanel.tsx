import { useCallback, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { motion } from "motion/react";
import { FolderOpen, Copy, Check, SignOut, X } from "@phosphor-icons/react";
import { useSyncStore } from "../store/syncStore";
import { ConnectionStatus } from "./ConnectionStatus";
import { SyncButton } from "./SyncButton";
import { PeerList } from "./PeerList";
import { TransferProgress } from "./TransferProgress";
import { ConflictPanel } from "./ConflictPanel";
import { ReconnectBanner } from "./ReconnectBanner";

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
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="w-[380px] bg-[#111113] border border-white/[0.07] rounded-xl shadow-2xl shadow-black/80 overflow-hidden"
    >
      {/* Top bar — drag region */}
      <div
        data-tauri-drag-region
        className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#0D0D0F]/80"
      >
        <ConnectionStatus state={connectionState} />

        <div className="flex items-center gap-1.5" data-tauri-drag-region="false">
          {/* Auto-sync toggle */}
          <button
            onClick={toggleAutoSync}
            title={autoSync ? "Auto-sync ON" : "Auto-sync OFF"}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-mono tracking-widest uppercase border transition-all ${
              autoSync
                ? "text-blue-400 border-blue-500/30 bg-blue-500/[0.08] shadow-[0_0_10px_rgba(59,130,246,0.1)]"
                : "text-zinc-600 border-white/[0.06] hover:text-zinc-400 hover:border-white/[0.1]"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full transition-all ${
              autoSync
                ? "bg-blue-400 shadow-[0_0_5px_rgba(96,165,250,0.9)]"
                : "bg-zinc-600"
            }`} />
            {autoSync ? "auto" : "manual"}
          </button>

          {/* Branding */}
          <span className="text-[9px] font-mono tracking-widest text-zinc-700 px-1.5">
            relay<span className="text-blue-500/70">fs</span>
          </span>

          {/* Disconnect */}
          <button
            onClick={onDisconnect}
            title="Disconnect"
            className="w-6 h-6 flex items-center justify-center rounded-md text-zinc-700 hover:text-zinc-400 hover:bg-white/[0.06] transition-colors"
          >
            <SignOut size={11} weight="bold" />
          </button>

          {/* Close */}
          <button
            onClick={() => getCurrentWindow().close()}
            title="Close"
            className="w-6 h-6 flex items-center justify-center rounded-md text-zinc-700 hover:text-red-400 hover:bg-red-500/[0.08] transition-colors"
          >
            <X size={11} weight="bold" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-5">
        {/* Project path */}
        <div className="flex items-center gap-2 mb-3">
          <FolderOpen size={11} weight="fill" className="text-zinc-600 flex-shrink-0" />
          <p className="text-[11px] font-mono text-zinc-400 truncate flex-1 tabular-nums">
            {project?.path ?? "—"}
          </p>
        </div>

        {/* Room code (host only) */}
        {appMode === "host" && roomCode && (
          <RoomCodeBadge code={roomCode} />
        )}

        {/* Peers summary */}
        {peers.length > 0 && (
          <p className="text-[10px] font-sans text-zinc-600 mt-2">
            <span className="text-emerald-400 font-semibold tabular-nums font-mono">{peers.length}</span>
            {" "}peer{peers.length !== 1 ? "s" : ""} connected
          </p>
        )}

        {/* Central sync button */}
        <div className="flex justify-center my-6">
          <SyncButton onClick={onSync} />
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between pt-4 border-t border-white/[0.05]">
          <StatItem
            label="pending"
            value={String(pending)}
            accent={pending > 0}
            accentColor="text-amber-400"
          />
          <StatItem
            label="last sync"
            value={lastSyncAt ? formatRelative(lastSyncAt) : "—"}
          />
        </div>

        {appMode === "guest" && <TransferProgress />}
        <ConflictPanel onResolve={onResolveConflict} />
        <ReconnectBanner onReconnect={onReconnect} />
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
    <div className="flex items-center gap-2 mt-1 mb-1">
      <div className="flex-1 flex items-center gap-2.5 bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2">
        <span className="text-[9px] font-sans font-semibold text-zinc-600 uppercase tracking-widest">
          room
        </span>
        <span className="text-[13px] font-mono tracking-[0.22em] font-semibold text-zinc-100">
          {code}
        </span>
      </div>
      <button
        onClick={copy}
        title="Copy room code"
        className="flex items-center justify-center w-8 h-8 bg-white/[0.03] border border-white/[0.07] rounded-lg hover:bg-white/[0.06] hover:border-white/[0.12] transition-all"
      >
        {copied
          ? <Check size={11} weight="bold" className="text-emerald-400" />
          : <Copy size={11} weight="bold" className="text-zinc-500" />}
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
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-sans text-zinc-600">{label}</span>
      <span className={`text-[10px] font-mono tabular-nums tracking-tight ${accent ? accentColor : "text-zinc-500"}`}>
        {value}
      </span>
    </div>
  );
}
