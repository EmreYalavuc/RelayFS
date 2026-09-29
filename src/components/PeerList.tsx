import { motion } from "motion/react";
import { User } from "@phosphor-icons/react";
import type { Peer } from "../types";

interface Props {
  peers: Peer[];
}

export function PeerList({ peers }: Props) {
  if (peers.length === 0) return null;
  return (
    <div className="mt-4 pt-4 border-t border-zinc-800">
      <p className="text-[9px] text-zinc-600 uppercase tracking-[0.2em] mb-2">
        peers
      </p>
      <div className="flex flex-wrap gap-1.5">
        {peers.map((peer, i) => (
          <motion.div
            key={peer.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-1.5 bg-zinc-800/60 border border-zinc-700/50 rounded px-2.5 py-1"
          >
            <User size={10} weight="bold" className="text-zinc-500" />
            <span className="text-[10px] text-zinc-300 font-mono">{peer.name}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
