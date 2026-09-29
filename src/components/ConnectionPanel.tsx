import { useSyncStore } from "../store/syncStore";
import { ConnectionStatus } from "./ConnectionStatus";
import { SyncButton } from "./SyncButton";
import { PeerList } from "./PeerList";

interface Props {
  onSync: () => void;
}

function formatRelative(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff} sec ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  return `${Math.floor(diff / 3600)} hr ago`;
}

export function ConnectionPanel({ onSync }: Props) {
  const connectionState = useSyncStore((s) => s.connectionState);
  const project = useSyncStore((s) => s.project);
  const peers = useSyncStore((s) => s.peers);
  const pendingUpdates = useSyncStore((s) => s.pendingUpdates);
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);

  return (
    <div className="w-[360px] bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl">
      {/* Status row */}
      <ConnectionStatus state={connectionState} />

      {/* Project / peer metadata */}
      <div className="mt-4 space-y-1.5">
        <MetaRow label="Project" value={project?.name ?? "—"} />
        {peers.length > 0 && (
          <MetaRow label="Peer" value={peers[0].name} />
        )}
      </div>

      {/* Central sync button */}
      <div className="flex justify-center my-8">
        <SyncButton onClick={onSync} />
      </div>

      {/* Footer stats */}
      <div className="border-t border-gray-800 pt-4 space-y-1.5">
        <StatRow label="Pending updates" value={String(pendingUpdates)} accent={pendingUpdates > 0} />
        <StatRow label="Last sync" value={lastSyncAt ? formatRelative(lastSyncAt) : "never"} />
      </div>

      {/* Extra peers beyond the first */}
      {peers.length > 1 && <PeerList peers={peers.slice(1)} />}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm text-gray-400">
      <span className="text-gray-600">{label}:</span>{" "}
      <span className="text-gray-100 font-medium">{value}</span>
    </p>
  );
}

function StatRow({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <p className="text-xs text-gray-500">
      {label}:{" "}
      <span className={accent ? "text-amber-400 font-mono" : "text-gray-400"}>
        {value}
      </span>
    </p>
  );
}
