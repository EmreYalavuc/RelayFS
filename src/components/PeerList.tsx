import type { Peer } from "../types";

interface Props {
  peers: Peer[];
}

export function PeerList({ peers }: Props) {
  if (peers.length === 0) return null;
  return (
    <div className="mt-4 pt-4 border-t border-gray-800">
      <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">
        Peers
      </p>
      <div className="flex flex-wrap gap-2">
        {peers.map((peer) => (
          <div
            key={peer.id}
            className="flex items-center gap-1.5 bg-gray-800/70 border border-gray-700 rounded-full px-3 py-1"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-xs text-gray-300 font-mono">{peer.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
