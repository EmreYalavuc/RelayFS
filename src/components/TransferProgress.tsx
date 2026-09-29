import { motion } from "motion/react";
import { useSyncStore } from "../store/syncStore";

export function TransferProgress() {
  const { done, total } = useSyncStore((s) => s.transfer);
  const pct      = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  const finished = total > 0 && done >= total;

  if (total === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="mt-4 pt-4 border-t border-white/[0.05]"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-[6px] h-[6px] rounded-full flex-shrink-0 ${
            finished
              ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
              : "bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.8)]"
          }`} />
          <span className="text-[10px] font-sans font-medium text-zinc-500">
            {finished ? "transfer complete" : "receiving files"}
          </span>
        </div>
        <span className="text-[10px] font-mono tabular-nums tracking-tight text-zinc-500">
          {done}<span className="text-zinc-700">/{total}</span>
        </span>
      </div>

      <div className="h-[2px] bg-white/[0.04] rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${
            finished
              ? "bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.6)]"
              : "bg-blue-500 shadow-[0_0_4px_rgba(59,130,246,0.6)]"
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ ease: "easeOut", duration: 0.3 }}
        />
      </div>
    </motion.div>
  );
}
