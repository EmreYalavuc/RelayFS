import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Terminal, Trash } from "@phosphor-icons/react";
import { useSyncStore } from "../store/syncStore";
import type { ActivityEntry } from "../types";

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

const TYPE_LABEL: Record<ActivityEntry["type"], string> = {
  added:    "eklendi",
  modified: "değişti",
  deleted:  "silindi",
  verified: "doğrulandı",
  mismatch: "uyuşmadı",
  conflict: "çakışma",
  error:    "hata",
};

const TYPE_COLOR: Record<ActivityEntry["type"], string> = {
  added:    "text-[#30d158]",
  modified: "text-[#0a84ff]",
  deleted:  "text-[#ff453a]",
  verified: "text-[#30d158]",
  mismatch: "text-[#ff9f0a]",
  conflict: "text-[#ff9f0a]",
  error:    "text-[#ff453a]",
};

const TYPE_ICON: Record<ActivityEntry["type"], string> = {
  added:    "+",
  modified: "~",
  deleted:  "-",
  verified: "✓",
  mismatch: "✗",
  conflict: "!",
  error:    "✗",
};

function EntryRow({ entry }: { entry: ActivityEntry }) {
  const filename = entry.path.split("/").pop() ?? entry.path;
  const dir      = entry.path.includes("/")
    ? entry.path.slice(0, entry.path.lastIndexOf("/") + 1)
    : "";

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.18 }}
      className="flex items-center gap-2 px-3 py-[5px] hover:bg-white/[0.03] transition-colors group"
    >
      {/* timestamp */}
      <span className="text-[10px] font-mono text-[rgba(235,235,245,0.25)] tabular-nums flex-shrink-0 w-[52px]">
        {formatTime(entry.ts)}
      </span>

      {/* side badge */}
      <span
        className={`text-[9px] font-bold uppercase tracking-[0.08em] flex-shrink-0 w-[38px] ${
          entry.side === "local"
            ? "text-[#0a84ff]"
            : "text-[#30d158]"
        }`}
      >
        {entry.side === "local" ? "local" : "remote"}
      </span>

      {/* type icon + label */}
      <span className={`text-[10px] font-mono flex-shrink-0 w-[68px] flex items-center gap-1 ${TYPE_COLOR[entry.type]}`}>
        <span>{TYPE_ICON[entry.type]}</span>
        <span>{TYPE_LABEL[entry.type]}</span>
      </span>

      {/* path */}
      <span className="text-[10px] font-mono text-[rgba(235,235,245,0.35)] flex-1 min-w-0 truncate">
        <span className="text-[rgba(235,235,245,0.2)]">{dir}</span>
        <span className="text-[rgba(235,235,245,0.6)]">{filename}</span>
      </span>

      {/* size */}
      {entry.size !== undefined && (
        <span className="text-[9px] font-mono text-[rgba(235,235,245,0.2)] flex-shrink-0">
          {formatSize(entry.size)}
        </span>
      )}
    </motion.div>
  );
}

export function ActivityTerminal() {
  const log          = useSyncStore((s) => s.activityLog);
  const clearActivity = useSyncStore((s) => s.clearActivity);
  const [open, setOpen] = useState(true);
  const scrollRef    = useRef<HTMLDivElement>(null);

  // Scroll to top on new entry (newest shown first)
  useEffect(() => {
    if (scrollRef.current && open) {
      scrollRef.current.scrollTop = 0;
    }
  }, [log.length, open]);

  return (
    <div className="mt-4 border-t border-[rgba(84,84,88,0.35)]">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 pt-3.5 pb-2 hover:opacity-80 transition-opacity focus:outline-none"
      >
        <Terminal size={12} weight="bold" className="text-[rgba(235,235,245,0.3)] flex-shrink-0" />
        <span className="text-[11px] font-semibold text-[rgba(235,235,245,0.35)] uppercase tracking-widest">
          Aktivite
        </span>
        {log.length > 0 && (
          <span className="ml-1 text-[9px] font-mono bg-[#2c2c2e] text-[rgba(235,235,245,0.3)] px-1.5 py-0.5 rounded-full">
            {log.length}
          </span>
        )}
        <span className="ml-auto text-[10px] font-mono text-[rgba(235,235,245,0.2)]">
          {open ? "▲" : "▼"}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* Terminal body */}
            <div className="bg-[#111113] border border-[rgba(84,84,88,0.3)] rounded-[10px] overflow-hidden">
              {/* Bar */}
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-[rgba(84,84,88,0.25)] bg-[#161618]">
                <div className="flex items-center gap-1.5">
                  <span className="w-[7px] h-[7px] rounded-full bg-[#ff5f57]" />
                  <span className="w-[7px] h-[7px] rounded-full bg-[#febc2e]" />
                  <span className="w-[7px] h-[7px] rounded-full bg-[#28c840]" />
                </div>
                <span className="text-[9px] font-mono text-[rgba(235,235,245,0.15)] tracking-widest">
                  relayfs — sync log
                </span>
                {log.length > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); clearActivity(); }}
                    title="Temizle"
                    className="flex items-center gap-1 text-[rgba(235,235,245,0.2)] hover:text-[rgba(235,235,245,0.5)] transition-colors"
                  >
                    <Trash size={10} weight="bold" />
                  </button>
                )}
              </div>

              {/* Log scroll area */}
              <div
                ref={scrollRef}
                className="overflow-y-auto"
                style={{ maxHeight: 192, minHeight: 48 }}
              >
                {log.length === 0 ? (
                  <p className="text-[10px] font-mono text-[rgba(235,235,245,0.15)] px-3 py-3">
                    — değişiklik yok —
                  </p>
                ) : (
                  log.map((entry) => (
                    <EntryRow key={entry.id} entry={entry} />
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
