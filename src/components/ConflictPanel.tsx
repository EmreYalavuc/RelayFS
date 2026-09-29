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
          className="mt-4 pt-4 border-t border-white/[0.05]"
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-2.5">
            <span className="w-[6px] h-[6px] rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)] flex-shrink-0" />
            <span className="text-[10px] font-sans font-semibold uppercase tracking-widest text-amber-400">
              conflicts
            </span>
            <span className="ml-auto text-[10px] font-mono tabular-nums text-zinc-600">
              {conflictFiles.length}
            </span>
          </div>

          {/* File list */}
          <div className="space-y-1.5">
            {conflictFiles.map((rp) => (
              <motion.div
                key={rp}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 4 }}
                className="flex items-center gap-2 bg-amber-500/[0.05] border border-amber-500/[0.12] rounded-lg px-3 py-2"
              >
                <span
                  className="flex-1 text-[10px] font-mono text-zinc-400 truncate"
                  title={rp}
                >
                  {shortPath(rp)}
                </span>

                <button
                  onClick={() => onResolve(rp, "keep-mine")}
                  title="Restore my version"
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-sans font-semibold text-amber-400/80 border border-amber-500/20 hover:bg-amber-500/[0.08] hover:text-amber-300 transition-colors"
                >
                  <ArrowCounterClockwise size={9} weight="bold" />
                  mine
                </button>

                <button
                  onClick={() => onResolve(rp, "accept")}
                  title="Accept merged version"
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-sans font-semibold text-emerald-400/80 border border-emerald-500/20 hover:bg-emerald-500/[0.08] hover:text-emerald-300 transition-colors"
                >
                  <Check size={9} weight="bold" />
                  ok
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
