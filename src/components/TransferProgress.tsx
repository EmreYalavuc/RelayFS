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
      className="mt-4 pt-4 border-t border-[rgba(84,84,88,0.35)]"
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className={`w-[7px] h-[7px] rounded-full flex-shrink-0 ${
            finished ? "bg-[#30d158]" : "bg-[#0a84ff]"
          }`} />
          <span className="text-[12px] font-medium text-[rgba(235,235,245,0.5)]">
            {finished ? "Transfer complete" : "Receiving files"}
          </span>
        </div>
        <span className="text-[12px] font-mono tabular-nums text-[rgba(235,235,245,0.45)]">
          {done}<span className="text-[rgba(235,235,245,0.25)]">/{total}</span>
        </span>
      </div>

      <div className="h-[3px] bg-[#3a3a3c] rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${finished ? "bg-[#30d158]" : "bg-[#0a84ff]"}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ ease: "easeOut", duration: 0.3 }}
        />
      </div>
    </motion.div>
  );
}
