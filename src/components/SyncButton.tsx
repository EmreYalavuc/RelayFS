import { clsx } from "clsx";
import { motion, AnimatePresence } from "motion/react";
import { ArrowsClockwise, CheckCircle, XCircle } from "@phosphor-icons/react";
import { useSyncStore } from "../store/syncStore";
import type { SyncPhase } from "../types";

interface Props {
  onClick: () => void;
}

const LABELS: Record<SyncPhase, string> = {
  idle:       "SYNC & MERGE",
  syncing:    "SYNCING",
  exchanging: "EXCHANGING STATE",
  applying:   "APPLYING UPDATES",
  converged:  "CONVERGED",
  error:      "RETRY SYNC",
};

const busy = (p: SyncPhase) =>
  p === "syncing" || p === "exchanging" || p === "applying";

export function SyncButton({ onClick }: Props) {
  const syncPhase = useSyncStore((s) => s.syncPhase);
  const connectionState = useSyncStore((s) => s.connectionState);

  const isBusy     = busy(syncPhase);
  const isDone     = syncPhase === "converged";
  const isError    = syncPhase === "error";
  const isDisabled = isBusy || connectionState === "offline" || connectionState === "connecting";

  return (
    <motion.button
      onClick={onClick}
      disabled={isDisabled}
      whileTap={!isDisabled ? { scale: 0.97 } : {}}
      className={clsx(
        "relative min-w-[210px] h-12 px-8 rounded-lg",
        "font-mono font-semibold text-[11px] tracking-[0.18em]",
        "border transition-colors duration-300",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950",
        "overflow-hidden",
        {
          "border-blue-500/50 bg-blue-500/8 text-blue-300 hover:bg-blue-500/14 hover:border-blue-400/70 cursor-pointer":
            !isDisabled && !isDone && !isError,
          "border-red-500/50 bg-red-500/8 text-red-300 hover:bg-red-500/14 cursor-pointer":
            isError,
          "border-blue-400/30 bg-blue-500/5 text-blue-400/60 cursor-wait":
            isBusy,
          "border-emerald-500/50 bg-emerald-500/8 text-emerald-300":
            isDone,
          "border-zinc-700/50 bg-zinc-800/30 text-zinc-600 cursor-not-allowed":
            isDisabled && !isBusy,
        }
      )}
    >
      {/* Sweep line when busy */}
      {isBusy && (
        <motion.div
          className="absolute inset-y-0 left-0 w-[2px] bg-blue-400/40"
          animate={{ x: ["0px", "210px"] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
        />
      )}

      <span className="relative flex items-center justify-center gap-2">
        {/* Leading icon */}
        {isBusy && (
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <ArrowsClockwise size={12} weight="bold" />
          </motion.span>
        )}
        {isDone && <CheckCircle size={13} weight="fill" />}
        {isError && <XCircle size={13} weight="fill" />}

        {/* Animated label */}
        <AnimatePresence mode="wait">
          <motion.span
            key={syncPhase}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.12 }}
          >
            {LABELS[syncPhase]}
          </motion.span>
        </AnimatePresence>
      </span>
    </motion.button>
  );
}
