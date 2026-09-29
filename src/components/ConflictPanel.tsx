import { motion, AnimatePresence } from "motion/react";
import { ArrowCounterClockwise, Check } from "@phosphor-icons/react";
import { useSyncStore } from "../store/syncStore";

interface Props {
  onResolve: (rp: string, strategy: "accept" | "keep-mine") => void;
}

function shortPath(rp: string) {
  const parts = rp.split("/");
  if (parts.length <= 2) return rp;
  return `…/${parts.slice(-2).join("/")}`;
}

export function ConflictPanel({ onResolve }: Props) {
  const conflictFiles = useSyncStore((s) => s.conflictFiles);

  return (
    <AnimatePresence>
      {conflictFiles.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-4 pt-4 border-t border-[rgba(84,84,88,0.35)]"
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-2.5">
            <span className="w-[7px] h-[7px] rounded-full bg-[#ff9f0a] flex-shrink-0" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#ff9f0a]">
              Conflicts
            </span>
            <span className="ml-auto text-[11px] font-mono tabular-nums text-[rgba(235,235,245,0.35)]">
              {conflictFiles.length}
            </span>
          </div>

          {/* File list */}
          <div className="space-y-2">
            {conflictFiles.map((rp) => (
              <motion.div
                key={rp}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 4 }}
                className="flex items-center gap-2 bg-[#2c2c2e] border border-[rgba(255,159,10,0.2)] rounded-[10px] px-3.5 py-2.5"
              >
                <span
                  className="flex-1 text-[11px] font-mono text-[rgba(235,235,245,0.6)] truncate"
                  title={rp}
                >
                  {shortPath(rp)}
                </span>

                <button
                  onClick={() => onResolve(rp, "keep-mine")}
                  title="Restore my version"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-[#ff9f0a] bg-[#ff9f0a]/10 hover:bg-[#ff9f0a]/20 transition-all"
                >
                  <ArrowCounterClockwise size={10} weight="bold" />
                  Mine
                </button>

                <button
                  onClick={() => onResolve(rp, "accept")}
                  title="Accept merged version"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-[#30d158] bg-[#30d158]/10 hover:bg-[#30d158]/20 transition-all"
                >
                  <Check size={10} weight="bold" />
                  OK
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
