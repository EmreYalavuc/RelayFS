import { motion } from "motion/react";
import type { Peer } from "../types";

interface Props {
  peers: Peer[];
}

export function PeerList({ peers }: Props) {
  if (peers.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-white/[0.05]">
      <p className="text-[9px] font-sans text-zinc-600 uppercase tracking-[0.2em] font-semibold mb-2.5">
        peers
      </p>
      <div className="flex flex-wrap gap-1.5">
        {peers.map((peer, i) => (
          <motion.div
            key={peer.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.07] rounded-full pl-2 pr-3 py-1"
          >
            <span className="w-[6px] h-[6px] rounded-full bg-emerald-400 flex-shrink-0 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            <span className="text-[10px] font-mono text-zinc-300">{peer.name}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
