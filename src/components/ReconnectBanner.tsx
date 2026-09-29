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
          className="mt-4 pt-4 border-t border-[rgba(84,84,88,0.35)]"
        >
          <div className="flex items-center justify-between gap-3 bg-[#2c2c2e] border border-[rgba(255,69,58,0.2)] rounded-[10px] px-3.5 py-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-[7px] h-[7px] rounded-full bg-[#ff453a] flex-shrink-0" />
              <span className="text-[12px] font-medium text-[rgba(235,235,245,0.55)] truncate">
                Peer disconnected
              </span>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[13px] font-mono tabular-nums text-[rgba(235,235,245,0.4)]">
                {secs}s
              </span>
              <button
                onClick={handleNow}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold text-[#0a84ff] bg-[#0a84ff]/10 hover:bg-[#0a84ff]/20 transition-all"
              >
                <ArrowsClockwise size={11} weight="bold" />
                Now
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
