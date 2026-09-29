import { motion } from "motion/react";
import { ArrowDown } from "@phosphor-icons/react";
import { useSyncStore } from "../store/syncStore";

export function TransferProgress() {
  const { done, total } = useSyncStore((s) => s.transfer);
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  const finished = total > 0 && done >= total;

  if (total === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="mt-4 pt-4 border-t border-zinc-800"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <ArrowDown
            size={11}
            weight="bold"
            className={finished ? "text-emerald-400" : "text-blue-400"}
          />
          <span className="text-[10px] text-zinc-500 font-mono">
            {finished ? "transfer complete" : "receiving files"}
          </span>
        </div>
        <span className="text-[10px] font-mono text-zinc-400">
          {done}/{total}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-[2px] bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${finished ? "bg-emerald-400" : "bg-blue-500"}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ ease: "easeOut", duration: 0.3 }}
        />
      </div>
    </motion.div>
  );
}
