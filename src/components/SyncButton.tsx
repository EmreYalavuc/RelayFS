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
  const syncPhase       = useSyncStore((s) => s.syncPhase);
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
        "relative min-w-[210px] h-11 px-8 rounded-lg",
        "font-mono font-semibold text-[11px] tracking-[0.18em]",
        "border transition-all duration-300",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent",
        "overflow-hidden",
        {
          "border-blue-500/40 bg-blue-500/[0.07] text-blue-300 hover:bg-blue-500/[0.12] hover:border-blue-400/60 hover:shadow-[0_0_20px_rgba(59,130,246,0.12)] cursor-pointer":
            !isDisabled && !isDone && !isError,
          "border-red-500/40 bg-red-500/[0.07] text-red-300 hover:bg-red-500/[0.12] cursor-pointer":
            isError,
          "border-blue-400/20 bg-blue-500/[0.04] text-blue-400/50 cursor-wait":
            isBusy,
          "border-emerald-500/40 bg-emerald-500/[0.07] text-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.08)]":
            isDone,
          "border-white/[0.06] bg-white/[0.02] text-zinc-600 cursor-not-allowed":
            isDisabled && !isBusy,
        }
      )}
    >
      {/* Sweep line when busy */}
      {isBusy && (
        <motion.div
          className="absolute inset-y-0 left-0 w-[1.5px] bg-blue-400/50 shadow-[0_0_6px_rgba(96,165,250,0.6)]"
          animate={{ x: ["0px", "210px"] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
        />
      )}

      <span className="relative flex items-center justify-center gap-2">
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
