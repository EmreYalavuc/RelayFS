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
// FolderOpen kept for PathInput used in host tab
import logoUrl from "../assets/RelayFS.svg";
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
  onJoin: (code: string) => void;
}

export function SetupView({ onHost, onJoin }: Props) {
  const [tab, setTab]   = useState<"host" | "join">("host");
  const [path, setPath] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<SavedSession | null>(null);

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
    if (!t) { setError("Project folder is required"); return; }
    setError("");
    onHost(t);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.replace(/\s/g, "").toUpperCase();
    if (c.replace("-", "").length < 8) { setError("Enter a valid 8-character code"); return; }
    setError("");
    onJoin(c);
  };

  const handleResume = () => {
    if (!saved) return;
    if (saved.appMode === "host") onHost(saved.projectPath);
    else onJoin(saved.roomCode ?? "");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="w-[380px] bg-[#1c1c1e] border border-white/[0.08] rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden"
    >
      {/* Title bar — vibrancy */}
      <div
        data-tauri-drag-region
        className="flex items-center justify-between px-4 py-3 border-b border-[rgba(84,84,88,0.45)] bg-black/50 backdrop-blur-[20px]"
      >
        <img
          src={logoUrl}
          alt="RelayFS"
          className="h-7 w-auto"
          draggable={false}
          data-tauri-drag-region="false"
        />

        <div className="flex items-center gap-3" data-tauri-drag-region="false">
          <span className="text-[11px] font-mono text-[rgba(235,235,245,0.25)] tracking-wide">
            CRDT · P2P
          </span>
          <button
            onClick={() => getCurrentWindow().close()}
            title="Close"
            className="w-7 h-7 flex items-center justify-center rounded-full text-[rgba(235,235,245,0.4)] hover:text-white hover:bg-[#ff453a] transition-all"
          >
            <X size={13} weight="bold" />
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
            className="border-b border-[rgba(84,84,88,0.35)]"
          >
            <div className="px-4 py-3 flex items-center gap-3 bg-[#2c2c2e]/50">
              <ClockCounterClockwise size={15} weight="bold" className="text-[rgba(235,235,245,0.3)] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-[rgba(235,235,245,0.3)] uppercase tracking-widest mb-0.5">
                  Last Session
                </p>
                <p className="text-[12px] font-mono text-[rgba(235,235,245,0.6)] truncate">
                  {saved.projectName}
                  {saved.roomCode && (
                    <span className="text-[rgba(235,235,245,0.3)] ml-2 tracking-[0.15em]">{saved.roomCode}</span>
                  )}
                </p>
              </div>
              <button
                onClick={handleResume}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold text-[#0a84ff] bg-[#0a84ff]/10 border border-[rgba(10,132,255,0.25)] hover:bg-[#0a84ff]/20 transition-all flex-shrink-0"
              >
                Resume
                <ArrowRight size={11} weight="bold" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex border-b border-[rgba(84,84,88,0.35)]">
        {(["host", "join"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setError(""); }}
            className={`flex-1 py-3 text-[13px] font-semibold tracking-normal transition-all ${
              tab === t
                ? "text-[#0a84ff] border-b-2 border-[#0a84ff] -mb-px bg-[#0a84ff]/[0.05]"
                : "text-[rgba(235,235,245,0.4)] hover:text-[rgba(235,235,245,0.65)]"
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
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              onSubmit={handleHostSubmit}
              className="space-y-3"
            >
              <p className="text-[13px] text-[rgba(235,235,245,0.45)] mb-4 leading-relaxed">
                Open a local folder. A room code will be generated for teammates to join.
              </p>
              <PathInput
                value={path}
                onChange={(v) => { setPath(v); setError(""); }}
                placeholder="C:\Projects\MyApp"
                onBrowse={() => handleBrowse(setPath)}
              />
              {error && <ErrorLine msg={error} />}
              <SubmitBtn label="Open & Host" />
            </motion.form>
          ) : (
            <motion.form
              key="join"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              onSubmit={handleJoinSubmit}
              className="space-y-3"
            >
              <p className="text-[13px] text-[rgba(235,235,245,0.45)] mb-4 leading-relaxed">
                Takımınızdan aldığınız oda kodunu girin. Proje bilgileri odaya bağlandıktan sonra gösterilecek.
              </p>

              {/* Room code input */}
              <div className="relative">
                <LinkSimple
                  size={13}
                  weight="bold"
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[rgba(235,235,245,0.3)] pointer-events-none"
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
                  className="w-full bg-[#2c2c2e] border border-[rgba(84,84,88,0.6)] rounded-[10px] text-[16px] font-mono text-white placeholder-[rgba(235,235,245,0.2)] py-2.5 pl-9 pr-3 tracking-[0.22em] focus:outline-none focus:border-[rgba(10,132,255,0.6)] focus:bg-[#2c2c2e] transition-all"
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>

              {error && <ErrorLine msg={error} />}
              <SubmitBtn label="Odaya Bağlan" />
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
          size={13}
          weight="fill"
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[rgba(235,235,245,0.3)] pointer-events-none"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-[#2c2c2e] border border-[rgba(84,84,88,0.6)] rounded-[10px] text-[12px] font-mono text-[rgba(235,235,245,0.85)] placeholder-[rgba(235,235,245,0.2)] py-2.5 pl-9 pr-3 focus:outline-none focus:border-[rgba(10,132,255,0.6)] transition-all"
          spellCheck={false}
          autoComplete="off"
        />
      </div>
      <button
        type="button"
        onClick={onBrowse}
        className="flex items-center justify-center w-10 bg-[#2c2c2e] border border-[rgba(84,84,88,0.6)] rounded-[10px] hover:bg-[#3a3a3c] transition-all focus:outline-none flex-shrink-0"
      >
        <FolderOpen size={14} weight="fill" className="text-[rgba(235,235,245,0.45)]" />
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
      <Warning size={12} weight="fill" className="text-[#ff453a]" />
      <span className="text-[12px] text-[#ff453a]">{msg}</span>
    </motion.div>
  );
}

function SubmitBtn({ label }: { label: string }) {
  return (
    <button
      type="submit"
      className="w-full flex items-center justify-center gap-2 py-3 bg-[#0a84ff] hover:bg-[#1a90ff] active:bg-[#0070d8] text-white font-semibold text-[15px] tracking-[-0.01em] rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-all focus:outline-none mt-1"
    >
      {label}
      <ArrowRight size={14} weight="bold" />
    </button>
  );
}
