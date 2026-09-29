import { clsx } from "clsx";
import { motion, AnimatePresence } from "motion/react";
import { ArrowsClockwise, CheckCircle, XCircle } from "@phosphor-icons/react";
import { useSyncStore } from "../store/syncStore";
import type { SyncPhase } from "../types";

interface Props {
  onClick: () => void;
}

const LABELS: Record<SyncPhase, string> = {
  idle:       "Sync & Merge",
  syncing:    "Syncing…",
  exchanging: "Exchanging State",
  applying:   "Applying Updates",
  converged:  "Up to Date",
  error:      "Retry Sync",
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
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={clsx(
        "min-w-[200px] h-11 px-8 rounded-full",
        "font-sans font-semibold text-[15px] tracking-[-0.01em]",
        "transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a84ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1c1c1e]",
        {
          "bg-[#0a84ff] text-white hover:bg-[#1a90ff] active:bg-[#0070d8] shadow-[0_1px_3px_rgba(0,0,0,0.3)] cursor-pointer":
            !isDisabled && !isDone && !isError,
          "bg-[#ff453a] text-white hover:bg-[#ff5e53] cursor-pointer":
            isError,
          "bg-[#0a84ff]/50 text-white/60 cursor-wait":
            isBusy,
          "bg-[#30d158] text-white shadow-[0_1px_3px_rgba(0,0,0,0.3)]":
            isDone,
          "bg-[#3a3a3c] text-[rgba(235,235,245,0.3)] cursor-not-allowed":
            isDisabled && !isBusy,
        }
      )}
    >
      <span className="flex items-center justify-center gap-2">
        {isBusy && (
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
          >
            <ArrowsClockwise size={15} weight="bold" />
          </motion.span>
        )}
        {isDone && <CheckCircle size={16} weight="fill" />}
        {isError && <XCircle size={16} weight="fill" />}

        <AnimatePresence mode="wait">
          <motion.span
            key={syncPhase}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
          >
            {LABELS[syncPhase]}
          </motion.span>
        </AnimatePresence>
      </span>
    </motion.button>
  );
}
