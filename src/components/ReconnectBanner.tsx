import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowsClockwise } from "@phosphor-icons/react";
import { useSyncStore } from "../store/syncStore";

interface Props {
  onReconnect: () => void;
}

export function ReconnectBanner({ onReconnect }: Props) {
  const reconnectAt    = useSyncStore((s) => s.reconnectAt);
  const setReconnectAt = useSyncStore((s) => s.setReconnectAt);
  const [secs, setSecs] = useState(10);

  useEffect(() => {
    if (!reconnectAt) return;

    const tick = () => {
      const remaining = Math.ceil((reconnectAt - Date.now()) / 1000);
      if (remaining <= 0) {
        setReconnectAt(null);
        onReconnect();
        return;
      }
      setSecs(remaining);
    };

    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [reconnectAt, onReconnect, setReconnectAt]);

  const handleNow = () => {
    setReconnectAt(null);
    onReconnect();
  };

  return (
    <AnimatePresence>
      {reconnectAt && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-4 pt-4 border-t border-white/[0.05]"
        >
          <div className="flex items-center justify-between gap-3 bg-red-500/[0.05] border border-red-500/[0.12] rounded-lg px-3 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-[6px] h-[6px] rounded-full bg-red-400 flex-shrink-0 shadow-[0_0_6px_rgba(248,113,113,0.8)]" />
              <span className="text-[10px] font-sans text-zinc-400 truncate">
                peer disconnected
              </span>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[11px] font-mono tabular-nums tracking-tight text-zinc-500">
                {secs}s
              </span>
              <button
                onClick={handleNow}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-sans font-semibold text-blue-400 border border-blue-500/25 hover:bg-blue-500/[0.08] hover:border-blue-500/40 transition-all"
              >
                <ArrowsClockwise size={9} weight="bold" />
                now
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
