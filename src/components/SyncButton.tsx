import { clsx } from "clsx";
import { useSyncStore } from "../store/syncStore";
import type { SyncPhase } from "../types";

interface Props {
  onClick: () => void;
}

const LABELS: Record<SyncPhase, string> = {
  idle:       "SYNC & MERGE",
  syncing:    "SYNCING...",
  exchanging: "EXCHANGING STATE",
  applying:   "APPLYING UPDATES",
  converged:  "CONVERGED ✓",
  error:      "RETRY SYNC",
};

export function SyncButton({ onClick }: Props) {
  const syncPhase = useSyncStore((s) => s.syncPhase);
  const connectionState = useSyncStore((s) => s.connectionState);

  const busy = syncPhase === "syncing" || syncPhase === "exchanging" || syncPhase === "applying";
  const done = syncPhase === "converged";
  const disabled = busy || connectionState === "offline" || connectionState === "connecting";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "relative min-w-[210px] px-8 py-4 rounded-xl",
        "font-mono font-bold text-sm tracking-[0.15em]",
        "border-2 transition-all duration-300",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900",
        {
          // Idle + enabled
          "border-blue-500 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 hover:border-blue-400 cursor-pointer focus-visible:ring-blue-500":
            !disabled && !done && syncPhase === "idle",
          // Error
          "border-red-500 bg-red-500/10 text-red-300 hover:bg-red-500/20 cursor-pointer focus-visible:ring-red-500":
            !disabled && syncPhase === "error",
          // Busy
          "border-blue-400/60 bg-blue-500/10 text-blue-300/80 animate-pulse cursor-wait":
            busy,
          // Done
          "border-emerald-500 bg-emerald-500/10 text-emerald-300 cursor-default":
            done,
          // Offline disabled
          "border-gray-700 bg-gray-800/30 text-gray-600 cursor-not-allowed":
            disabled && !busy,
        }
      )}
    >
      {LABELS[syncPhase]}
    </button>
  );
}
