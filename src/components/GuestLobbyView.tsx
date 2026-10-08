import { useState, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { motion, AnimatePresence } from "motion/react";
import {
  FolderOpen,
  ArrowRight,
  Warning,
  X,
  DownloadSimple,
  CircleNotch,
  CheckCircle,
  Users,
} from "@phosphor-icons/react";
import * as Y from "yjs";
import logoUrl from "../assets/RelayFS.svg";
import { useSyncStore } from "../store/syncStore";

interface Props {
  doc: Y.Doc | null;
  onSetup: (destPath: string, mode: "existing" | "download") => Promise<void>;
  onCancel: () => void;
}

export function GuestLobbyView({ doc, onSetup, onCancel }: Props) {
  const connectionState = useSyncStore((s) => s.connectionState);
  const hostProjectInfo = useSyncStore((s) => s.hostProjectInfo);
  const peers           = useSyncStore((s) => s.peers);

  const [existingPath, setExistingPath] = useState("");
  const [error, setError]               = useState("");
  const [busy, setBusy]                 = useState(false);

  // How many files are currently in Y.Doc (arrives as host syncs)
  const [yjsFileCount, setYjsFileCount] = useState(0);
  // Total files host declared in Y.Doc meta
  const [totalFiles, setTotalFiles]     = useState(0);

  useEffect(() => {
    if (!doc) return;
    const fileMap = doc.getMap<Y.Text>("files");
    const meta    = doc.getMap<number>("meta");

    const onFiles = () => setYjsFileCount(fileMap.size);
    const onMeta  = () => {
      const t = meta.get("totalFiles");
      if (t) setTotalFiles(t);
    };

    onFiles();
    onMeta();
    fileMap.observe(onFiles);
    meta.observe(onMeta);
    return () => { fileMap.unobserve(onFiles); meta.unobserve(onMeta); };
  }, [doc]);

  // Animated dots
  const [dots, setDots] = useState(".");
  useEffect(() => {
    const t = setInterval(() => setDots((d) => (d.length >= 3 ? "." : d + ".")), 500);
    return () => clearInterval(t);
  }, []);

  const handleBrowse = async () => {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string") { setExistingPath(selected); setError(""); }
  };

  const handleSelectExisting = async () => {
    const p = existingPath.trim();
    if (!p) { setError("Bir klasör seçin"); return; }
    setError("");
    setBusy(true);
    try { await onSetup(p, "existing"); }
    catch { setError("Klasör açılamadı"); setBusy(false); }
  };

  const handleDownload = async () => {
    let destPath: string;
    if (hostProjectInfo) {
      const parent = await open({ directory: true, multiple: false, title: "Projeyi kaydet" });
      if (typeof parent !== "string") return;
      destPath = `${parent}\\${hostProjectInfo.name}`;
    } else {
      const parent = await open({ directory: true, multiple: false, title: "İndirme klasörünü seç" });
      if (typeof parent !== "string") return;
      destPath = `${parent}\\relay-project`;
    }
    setBusy(true);
    setError("");
    try { await onSetup(destPath, "download"); }
    catch { setError("İndirme başarısız oldu"); setBusy(false); }
  };

  const isConnecting  = connectionState === "connecting";
  const hasFiles      = yjsFileCount > 0;
  const progress      = totalFiles > 0 ? Math.min(100, Math.round((yjsFileCount / totalFiles) * 100)) : 0;
  // +1 for self (guest)
  const memberCount   = peers.length + 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="w-[380px] bg-[#1c1c1e] border border-white/[0.08] rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden"
    >
      {/* Title bar */}
      <div
        data-tauri-drag-region
        className="flex items-center justify-between px-4 py-3 border-b border-[rgba(84,84,88,0.45)] bg-black/50 backdrop-blur-[20px]"
      >
        <img src={logoUrl} alt="RelayFS" className="h-7 w-auto" draggable={false} data-tauri-drag-region="false" />
        <div className="flex items-center gap-3" data-tauri-drag-region="false">
          {/* Members badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#2c2c2e] border border-[rgba(84,84,88,0.5)]">
            <Users size={11} weight="fill" className="text-[rgba(235,235,245,0.4)]" />
            <span className="text-[11px] font-mono text-[rgba(235,235,245,0.6)]">{memberCount}</span>
          </div>
          <button
            onClick={() => getCurrentWindow().close()}
            title="Close"
            className="w-7 h-7 flex items-center justify-center rounded-full text-[rgba(235,235,245,0.4)] hover:text-white hover:bg-[#ff453a] transition-all"
          >
            <X size={13} weight="bold" />
          </button>
        </div>
      </div>

      <div className="px-5 py-5 space-y-4">

        {/* ── Status + progress banner ── */}
        <AnimatePresence mode="wait">
          {hasFiles ? (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#2c2c2e] border border-[rgba(84,84,88,0.5)] rounded-[12px] px-4 py-3 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle size={13} weight="fill" className="text-[#30d158] flex-shrink-0" />
                  <span className="text-[12px] font-semibold text-[#30d158]">Dosyalar hazır</span>
                </div>
                <span className="text-[11px] font-mono text-[rgba(235,235,245,0.4)]">
                  {yjsFileCount}{totalFiles > 0 ? ` / ${totalFiles}` : ""} dosya
                </span>
              </div>
              {hostProjectInfo && (
                <p className="text-[13px] font-semibold text-white truncate">{hostProjectInfo.name}</p>
              )}
              {totalFiles > 0 && (
                <div className="space-y-1">
                  <div className="w-full h-1 bg-[#3a3a3c] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-[#30d158] rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    />
                  </div>
                  <p className="text-right text-[10px] font-mono text-[rgba(235,235,245,0.3)]">{progress}%</p>
                </div>
              )}
            </motion.div>
          ) : isConnecting ? (
            <motion.div
              key="connecting"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2.5 bg-[#2c2c2e] border border-[rgba(84,84,88,0.5)] rounded-[12px] px-4 py-3"
            >
              <CircleNotch size={14} weight="bold" className="text-[#0a84ff] animate-spin flex-shrink-0" />
              <span className="text-[12px] text-[rgba(235,235,245,0.5)]">Odaya bağlanılıyor{dots}</span>
            </motion.div>
          ) : (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#2c2c2e] border border-[rgba(84,84,88,0.5)] rounded-[12px] px-4 py-3 space-y-2.5"
            >
              <div className="flex items-center gap-2.5">
                <CircleNotch size={14} weight="bold" className="text-[#ff9f0a] animate-spin flex-shrink-0" />
                <span className="text-[12px] text-[rgba(235,235,245,0.5)]">
                  Bağlandı — host dosyaları alınıyor{dots}
                </span>
              </div>
              {/* Indeterminate bar while waiting */}
              <div className="w-full h-1 bg-[#3a3a3c] rounded-full overflow-hidden">
                <motion.div
                  className="h-full w-1/3 bg-[#ff9f0a] rounded-full"
                  animate={{ x: ["0%", "200%", "0%"] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Folder options (always visible) ── */}
        {!busy && (
          <div className="space-y-3">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-[rgba(235,235,245,0.3)] uppercase tracking-widest px-1">
                Proje zaten bu bilgisayarda var mı?
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <FolderOpen size={13} weight="fill"
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[rgba(235,235,245,0.3)] pointer-events-none" />
                  <input
                    type="text"
                    value={existingPath}
                    onChange={(e) => { setExistingPath(e.target.value); setError(""); }}
                    placeholder="C:\Projects\MyApp"
                    className="w-full bg-[#2c2c2e] border border-[rgba(84,84,88,0.6)] rounded-[10px] text-[12px] font-mono text-[rgba(235,235,245,0.85)] placeholder-[rgba(235,235,245,0.2)] py-2.5 pl-9 pr-3 focus:outline-none focus:border-[rgba(10,132,255,0.6)] transition-all"
                    spellCheck={false} autoComplete="off"
                  />
                </div>
                <button type="button" onClick={handleBrowse}
                  className="flex items-center justify-center w-10 bg-[#2c2c2e] border border-[rgba(84,84,88,0.6)] rounded-[10px] hover:bg-[#3a3a3c] transition-all focus:outline-none flex-shrink-0">
                  <FolderOpen size={14} weight="fill" className="text-[rgba(235,235,245,0.45)]" />
                </button>
              </div>
              <button
                onClick={handleSelectExisting}
                disabled={!existingPath.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#2c2c2e] border border-[rgba(84,84,88,0.5)] hover:bg-[#3a3a3c] disabled:opacity-40 text-[rgba(235,235,245,0.75)] font-semibold text-[13px] rounded-full transition-all focus:outline-none"
              >
                Mevcut Klasörü Kullan
                <ArrowRight size={13} weight="bold" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[rgba(84,84,88,0.35)]" />
              <span className="text-[10px] text-[rgba(235,235,245,0.2)] font-mono">ya da</span>
              <div className="flex-1 h-px bg-[rgba(84,84,88,0.35)]" />
            </div>

            <button
              onClick={handleDownload}
              disabled={!hasFiles}
              className={`w-full flex items-center justify-center gap-2 py-3 font-semibold text-[15px] tracking-[-0.01em] rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-all focus:outline-none ${
                hasFiles
                  ? "bg-[#0a84ff] hover:bg-[#1a90ff] active:bg-[#0070d8] text-white"
                  : "bg-[#2c2c2e] text-[rgba(235,235,245,0.25)] cursor-not-allowed"
              }`}
            >
              {hasFiles ? (
                <>
                  <DownloadSimple size={15} weight="bold" />
                  Dosyaları İndir
                  <span className="text-[12px] opacity-70">({yjsFileCount})</span>
                </>
              ) : (
                <>
                  <CircleNotch size={14} weight="bold" className="animate-spin opacity-40" />
                  Host bekleniyor…
                </>
              )}
            </button>
          </div>
        )}

        {busy && (
          <div className="flex items-center justify-center gap-2.5 py-3">
            <CircleNotch size={14} weight="bold" className="text-[#0a84ff] animate-spin" />
            <span className="text-[13px] text-[rgba(235,235,245,0.5)]">Hazırlanıyor…</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-1.5">
            <Warning size={12} weight="fill" className="text-[#ff453a]" />
            <span className="text-[12px] text-[#ff453a]">{error}</span>
          </div>
        )}

        <button onClick={onCancel}
          className="w-full text-center text-[12px] text-[rgba(235,235,245,0.25)] hover:text-[rgba(235,235,245,0.5)] transition-colors">
          İptal et
        </button>
      </div>
    </motion.div>
  );
}
