import { motion } from "motion/react";
import { FolderOpen, Clock, ArrowUp } from "@phosphor-icons/react";
import { useSyncStore } from "../store/syncStore";
import { ConnectionStatus } from "./ConnectionStatus";
import { SyncButton } from "./SyncButton";
import { PeerList } from "./PeerList";

interface Props {
  onSync: () => void;
}

function formatRelative(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export function ConnectionPanel({ onSync }: Props) {
  const connectionState = useSyncStore((s) => s.connectionState);
  const project        = useSyncStore((s) => s.project);
  const peers          = useSyncStore((s) => s.peers);
  const pending        = useSyncStore((s) => s.pendingUpdates);
  const lastSyncAt     = useSyncStore((s) => s.lastSyncAt);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="w-[360px] bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-950/60">
        <ConnectionStatus state={connectionState} />
        <span className="text-[9px] text-zinc-600 font-mono tracking-widest uppercase">
          relay<span className="text-blue-500">fs</span>
        </span>
      </div>

      {/* Body */}
      <div className="px-5 py-5">
        {/* Project path */}
        <div className="flex items-center gap-2 mb-5">
          <FolderOpen size={12} weight="fill" className="text-zinc-500 flex-shrink-0" />
          <p className="text-[11px] text-zinc-300 font-mono truncate">
            {project?.path ?? "no project"}
          </p>
        </div>

        {/* Peers summary */}
        {peers.length > 0 && (
          <p className="text-[10px] text-zinc-500 mb-5">
            <span className="text-emerald-400">{peers.length}</span>
            {" "}peer{peers.length !== 1 ? "s" : ""} connected
          </p>
        )}

        {/* Central sync button */}
        <div className="flex justify-center my-6">
          <SyncButton onClick={onSync} />
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
          <StatItem
            icon={<ArrowUp size={10} weight="bold" className={pending > 0 ? "text-amber-400" : "text-zinc-600"} />}
            label="pending"
            value={String(pending)}
            accent={pending > 0}
          />
          <StatItem
            icon={<Clock size={10} weight="bold" className="text-zinc-600" />}
            label="last sync"
            value={lastSyncAt ? formatRelative(lastSyncAt) : "—"}
          />
        </div>
      </div>

      {/* Peer badges */}
      {peers.length > 0 && (
        <div className="px-5 pb-5">
          <PeerList peers={peers} />
        </div>
      )}
    </motion.div>
  );
}

function StatItem({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <span className="text-[10px] text-zinc-600">{label}</span>
      <span className={`text-[10px] font-mono ${accent ? "text-amber-400" : "text-zinc-400"}`}>
        {value}
      </span>
    </div>
  );
}
