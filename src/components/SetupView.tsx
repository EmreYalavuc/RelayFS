import { useState, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { motion, AnimatePresence } from "motion/react";
import {
  FolderOpen,
  ArrowRight,
  Warning,
  LinkSimple,
  ClockCounterClockwise,
  X,
} from "@phosphor-icons/react";
import { formatCode } from "../utils/roomCode";
import type { SavedSession } from "../types";

const SESSION_KEY = "relayfs:session";

export function loadSavedSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SavedSession) : null;
  } catch {
    return null;
  }
}

export function saveSession(s: SavedSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

interface Props {
  onHost: (path: string) => void;
  onJoin: (code: string, destPath: string) => void;
}

export function SetupView({ onHost, onJoin }: Props) {
  const [tab, setTab]       = useState<"host" | "join">("host");
  const [path, setPath]     = useState("");
  const [code, setCode]     = useState("");
  const [destPath, setDest] = useState("");
  const [error, setError]   = useState("");
  const [saved, setSaved]   = useState<SavedSession | null>(null);

  useEffect(() => {
    setSaved(loadSavedSession());
  }, []);

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

  const handleResume = () => {
    if (!saved) return;
    if (saved.appMode === "host") onHost(saved.projectPath);
    else onJoin(saved.roomCode ?? "", saved.projectPath);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="w-[380px] bg-[#111113] border border-white/[0.07] rounded-xl shadow-2xl shadow-black/80 overflow-hidden"
    >
      {/* Top bar — drag region */}
      <div
        data-tauri-drag-region
        className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#0D0D0F]/80"
      >
        <div className="flex items-center gap-2" data-tauri-drag-region="false">
          <span className="text-[10px] font-mono tracking-[0.18em] text-zinc-500 uppercase">
            relay<span className="text-blue-500/80">fs</span>
          </span>
          <span className="text-[9px] font-mono text-zinc-700">v0.1.0</span>
        </div>

        <div className="flex items-center gap-1.5" data-tauri-drag-region="false">
          <span className="text-[9px] font-mono text-zinc-700 tracking-wide">
            CRDT · P2P
          </span>
          <button
            onClick={() => getCurrentWindow().close()}
            title="Close"
            className="w-6 h-6 flex items-center justify-center rounded-md text-zinc-700 hover:text-red-400 hover:bg-red-500/[0.08] transition-colors"
          >
            <X size={11} weight="bold" />
          </button>
        </div>
      </div>

      {/* Resume last session */}
      <AnimatePresence>
        {saved && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-white/[0.06] bg-white/[0.01]"
          >
            <div className="px-4 py-3 flex items-center gap-3">
              <ClockCounterClockwise size={13} weight="bold" className="text-zinc-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-sans font-semibold text-zinc-600 uppercase tracking-widest mb-0.5">
                  last session
                </p>
                <p className="text-[11px] font-mono text-zinc-400 truncate">
                  {saved.projectName}
                  {saved.roomCode && (
                    <span className="text-zinc-700 ml-2 tracking-[0.15em]">{saved.roomCode}</span>
                  )}
                </p>
              </div>
              <button
                onClick={handleResume}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-sans font-semibold text-blue-400 border border-blue-500/25 hover:bg-blue-500/[0.08] hover:border-blue-500/40 transition-all flex-shrink-0"
              >
                resume
                <ArrowRight size={9} weight="bold" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.06]">
        {(["host", "join"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setError(""); }}
            className={`flex-1 py-2.5 text-[10px] font-sans font-semibold tracking-[0.1em] uppercase transition-all ${
              tab === t
                ? "text-blue-400 border-b-2 border-blue-500 -mb-px bg-blue-500/[0.04]"
                : "text-zinc-600 hover:text-zinc-400"
            }`}
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
              <p className="text-[11px] font-sans text-zinc-500 mb-4 leading-relaxed">
                Open a local folder. A room code will be generated for teammates to join.
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
              <p className="text-[11px] font-sans text-zinc-500 mb-4 leading-relaxed">
                Enter the room code from your teammate and choose a save location.
              </p>

              {/* Room code input */}
              <div className="relative">
                <LinkSimple
                  size={11}
                  weight="bold"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none"
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
                  className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg text-[13px] font-mono text-zinc-100 placeholder-zinc-700 py-2.5 pl-8 pr-3 tracking-[0.22em] focus:outline-none focus:border-blue-500/40 focus:bg-blue-500/[0.03] transition-all"
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>

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

// ── sub-components ─────────────────────────────────────────────────────────────

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
          size={11}
          weight="fill"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg text-[11px] font-mono text-zinc-300 placeholder-zinc-700 py-2.5 pl-8 pr-3 focus:outline-none focus:border-blue-500/40 focus:bg-blue-500/[0.03] transition-all"
          spellCheck={false}
          autoComplete="off"
        />
      </div>
      <button
        type="button"
        onClick={onBrowse}
        className="flex items-center justify-center w-9 bg-white/[0.03] border border-white/[0.07] rounded-lg hover:bg-white/[0.06] hover:border-white/[0.12] transition-all focus:outline-none flex-shrink-0"
      >
        <FolderOpen size={12} weight="fill" className="text-zinc-500" />
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
      <span className="text-[10px] font-mono text-red-400">{msg}</span>
    </motion.div>
  );
}

function SubmitBtn({ label }: { label: string }) {
  return (
    <button
      type="submit"
      className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600/80 hover:bg-blue-500/80 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] text-white font-sans font-semibold text-[11px] tracking-[0.12em] rounded-lg transition-all focus:outline-none"
    >
      {label}
      <ArrowRight size={11} weight="bold" />
    </button>
  );
}
