import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { motion, AnimatePresence } from "motion/react";
import {
  FolderOpen,
  ArrowRight,
  Warning,
  LinkSimple,
} from "@phosphor-icons/react";
import { formatCode } from "../utils/roomCode";

interface Props {
  onHost: (path: string) => void;
  onJoin: (code: string, destPath: string) => void;
}

export function SetupView({ onHost, onJoin }: Props) {
  const [tab, setTab]         = useState<"host" | "join">("host");
  const [path, setPath]       = useState("");
  const [code, setCode]       = useState("");
  const [destPath, setDest]   = useState("");
  const [error, setError]     = useState("");

  const handleBrowse = async (setter: (v: string) => void) => {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string") {
      setter(selected);
      setError("");
    }
  };

  const handleHostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = path.trim();
    if (!t) { setError("project folder required"); return; }
    setError("");
    onHost(t);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.replace(/\s/g, "").toUpperCase();
    if (c.replace("-", "").length < 8) { setError("enter a valid 8-char code"); return; }
    const d = destPath.trim();
    if (!d) { setError("destination folder required"); return; }
    setError("");
    onJoin(c, d);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="w-[380px] bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-950/60">
        <span className="text-[10px] text-zinc-500 font-mono tracking-[0.15em] uppercase">
          relay<span className="text-blue-500">fs</span>
          <span className="text-zinc-700 ml-2">v0.1.0</span>
        </span>
        <span className="text-[9px] text-zinc-700 font-mono">CRDT · P2P · offline-first</span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        {(["host", "join"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setError(""); }}
            className={`flex-1 py-2.5 text-[10px] font-mono tracking-[0.12em] uppercase transition-colors
              ${tab === t
                ? "text-blue-400 border-b-2 border-blue-500 -mb-px bg-blue-500/5"
                : "text-zinc-600 hover:text-zinc-400"}`}
          >
            {t === "host" ? "Open Project" : "Join Session"}
          </button>
        ))}
      </div>

      <div className="px-5 py-5">
        <AnimatePresence mode="wait">
          {tab === "host" ? (
            <motion.form
              key="host"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
              onSubmit={handleHostSubmit}
              className="space-y-3"
            >
              <p className="text-[11px] text-zinc-500 mb-4">
                Open a local folder. A room code will be generated so teammates can join.
              </p>
              <PathInput
                value={path}
                onChange={(v) => { setPath(v); setError(""); }}
                placeholder="C:\Projects\MyApp"
                onBrowse={() => handleBrowse(setPath)}
              />
              {error && <ErrorLine msg={error} />}
              <SubmitBtn label="OPEN & HOST" />
            </motion.form>
          ) : (
            <motion.form
              key="join"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              onSubmit={handleJoinSubmit}
              className="space-y-3"
            >
              <p className="text-[11px] text-zinc-500 mb-4">
                Enter the room code from your teammate and choose where to save the project.
              </p>

              {/* Room code input */}
              <div className="relative">
                <LinkSimple
                  size={12}
                  weight="bold"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
                />
                <input
                  type="text"
                  value={code}
                  maxLength={9}
                  onChange={(e) => {
                    setCode(formatCode(e.target.value));
                    setError("");
                  }}
                  placeholder="ABCD-EFGH"
                  className="w-full bg-zinc-800/60 border border-zinc-700/60 rounded text-[13px] text-zinc-100 font-mono placeholder-zinc-600 py-2.5 pl-8 pr-3 tracking-[0.2em] focus:outline-none focus:border-blue-500/60 focus:bg-zinc-800 transition-colors"
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>

              {/* Destination folder */}
              <PathInput
                value={destPath}
                onChange={(v) => { setDest(v); setError(""); }}
                placeholder="C:\Projects\  (save location)"
                onBrowse={() => handleBrowse(setDest)}
              />

              {error && <ErrorLine msg={error} />}
              <SubmitBtn label="JOIN SESSION" />
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── small shared sub-components ───────────────────────────────────────────────

function PathInput({
  value, onChange, placeholder, onBrowse,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  onBrowse: () => void;
}) {
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <FolderOpen
          size={12}
          weight="fill"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-zinc-800/60 border border-zinc-700/60 rounded text-[11px] text-zinc-200 font-mono placeholder-zinc-600 py-2.5 pl-8 pr-3 focus:outline-none focus:border-blue-500/60 focus:bg-zinc-800 transition-colors"
          spellCheck={false}
          autoComplete="off"
        />
      </div>
      <button
        type="button"
        onClick={onBrowse}
        className="flex items-center justify-center w-9 bg-zinc-800/60 border border-zinc-700/60 rounded hover:bg-zinc-700/60 hover:border-zinc-600 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-zinc-900 flex-shrink-0"
      >
        <FolderOpen size={13} weight="fill" className="text-zinc-400" />
      </button>
    </div>
  );
}

function ErrorLine({ msg }: { msg: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="flex items-center gap-1.5"
    >
      <Warning size={10} weight="fill" className="text-red-400" />
      <span className="text-[10px] text-red-400 font-mono">{msg}</span>
    </motion.div>
  );
}

function SubmitBtn({ label }: { label: string }) {
  return (
    <button
      type="submit"
      className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600/90 hover:bg-blue-500 text-white font-mono font-semibold text-[11px] tracking-[0.15em] rounded transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-zinc-900"
    >
      {label}
      <ArrowRight size={12} weight="bold" />
    </button>
  );
}
