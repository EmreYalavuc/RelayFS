import { motion } from "motion/react";
import type { Peer } from "../types";

interface Props {
  peers: Peer[];
}

export function PeerList({ peers }: Props) {
  if (peers.length === 0) return null;

  return (
    <div className="pt-4 border-t border-[rgba(84,84,88,0.35)]">
      <p className="text-[10px] font-semibold text-[rgba(235,235,245,0.3)] uppercase tracking-widest mb-2.5">
        Peers
      </p>
      <div className="flex flex-wrap gap-2">
        {peers.map((peer, i) => (
          <motion.div
            key={peer.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 25 }}
            className="flex items-center gap-2 bg-[#2c2c2e] border border-[rgba(84,84,88,0.45)] rounded-full pl-2.5 pr-3.5 py-1.5"
          >
            <span className="w-[7px] h-[7px] rounded-full bg-[#30d158] flex-shrink-0" />
            <span className="text-[12px] font-mono text-[rgba(235,235,245,0.75)]">{peer.name}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
