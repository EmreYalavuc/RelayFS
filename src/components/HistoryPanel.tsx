import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { motion, AnimatePresence } from "motion/react";
import {
  X, MagnifyingGlass, Funnel, Trash,
  FilePlus, PencilSimple, FileX,
  ShieldCheck, Warning, WarningOctagon,
  Monitor, ArrowClockwise, ClockCounterClockwise,
} from "@phosphor-icons/react";
import type { ActivityEntry, ActivityEventType } from "../types";
import { useSyncStore } from "../store/syncStore";

interface Props {
  onClose: () => void;
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

function peerColor(peerId: string | undefined): string {
  if (!peerId) return "#636366";
  const COLORS = ["#0a84ff", "#30d158", "#ff9f0a", "#ff453a", "#af80ff", "#5ac8fa", "#ff6b35", "#64d2ff"];
  let h = 0;
  for (let i = 0; i < peerId.length; i++) h = (h * 31 + peerId.charCodeAt(i)) & 0xffff;
  return COLORS[h % COLORS.length];
}

function peerInitial(peerName: string | undefined): string {
  if (!peerName || peerName === "unknown") return "?";
  return peerName.slice(0, 2).toUpperCase();
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateLabel(ts: number): string {
  const now  = new Date();
  const date = new Date(ts);
  const diffDays = Math.floor(
    (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
     Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())) / 86_400_000
  );
  if (diffDays === 0) return "Bugün";
  if (diffDays === 1) return "Dün";
  const months = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function dateKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

const TYPE_META: Record<ActivityEventType, { label: string; Icon: React.ElementType; color: string }> = {
  added:    { label: "eklendi",    Icon: FilePlus,        color: "#30d158" },
  modified: { label: "değişti",   Icon: PencilSimple,    color: "#0a84ff" },
  deleted:  { label: "silindi",   Icon: FileX,           color: "#ff453a" },
  verified: { label: "doğrulndı", Icon: ShieldCheck,     color: "#30d158" },
  mismatch: { label: "uyuşmuyor", Icon: Warning,         color: "#ff9f0a" },
  conflict: { label: "çakışma",   Icon: WarningOctagon,  color: "#ff9f0a" },
  error:    { label: "hata",      Icon: WarningOctagon,  color: "#ff453a" },
};

function formatBytes(b: number | undefined): string {
  if (!b) return "";
  if (b < 1024) return `${b}B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)}KB`;
  return `${(b / (1024 * 1024)).toFixed(1)}MB`;
}

/* ── Peer avatar chip ─────────────────────────────────────────────────── */

function PeerAvatar({ peerId, peerName }: { peerId?: string; peerName?: string }) {
  const color = peerColor(peerId);
  return (
    <div
      className="w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
      style={{ background: color + "33", border: `1.5px solid ${color}60` }}
      title={peerName}
    >
      <span style={{ color }}>{peerInitial(peerName)}</span>
    </div>
  );
}

/* ── Single history entry row ─────────────────────────────────────────── */

function EntryRow({ entry }: { entry: ActivityEntry }) {
  const meta = TYPE_META[entry.type] ?? TYPE_META.modified;
  const { Icon, color, label } = meta;
  const peerC = peerColor(entry.peerId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors group border-b border-[rgba(84,84,88,0.15)] last:border-0"
    >
      <PeerAvatar peerId={entry.peerId} peerName={entry.peerName} />

      <div className="flex-1 min-w-0">
        {/* Peer name + IP */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11.5px] font-semibold" style={{ color: peerC }}>
            {entry.peerName && entry.peerName !== "unknown"
              ? entry.peerName
              : entry.side === "local" ? "Ben" : "Peer"}
          </span>
          {entry.peerIp && entry.peerIp !== "unknown" && (
            <span className="text-[10px] font-mono text-[rgba(235,235,245,0.28)] px-1.5 py-0.5 bg-[#2c2c2e] rounded-full">
              {entry.peerIp}
            </span>
          )}
          {entry.roomCode && (
            <span className="text-[10px] font-mono text-[rgba(235,235,245,0.22)] px-1.5 py-0.5 bg-[#1c1c1e] rounded-full border border-[rgba(84,84,88,0.3)]">
              {entry.roomCode}
            </span>
          )}
        </div>

        {/* Action + file */}
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span
            className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-[5px]"
            style={{ color, background: color + "18" }}
          >
            <Icon size={9} weight="fill" />
            {label}
          </span>
          <span className="text-[11px] font-mono text-[rgba(235,235,245,0.6)] truncate max-w-[340px]">
            {entry.path}
          </span>
          {entry.size != null && entry.size > 0 && (
            <span className="text-[10px] font-mono text-[rgba(235,235,245,0.25)]">
              {formatBytes(entry.size)}
            </span>
          )}
        </div>
      </div>

      {/* Time */}
      <div className="flex-shrink-0 flex flex-col items-end gap-1">
        <span className="text-[10px] font-mono text-[rgba(235,235,245,0.3)]">
          {formatTime(entry.ts)}
        </span>
        <span className="text-[9px] font-mono text-[rgba(235,235,245,0.15)]">
          {entry.side === "local" ? "local" : "sync"}
        </span>
      </div>
    </motion.div>
  );
}

/* ── Date section header ──────────────────────────────────────────────── */

function DateHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 sticky top-0 bg-[#111113]/90 backdrop-blur-sm z-10 border-b border-[rgba(84,84,88,0.25)]">
      <span className="text-[11px] font-semibold text-[rgba(235,235,245,0.5)]">{label}</span>
      <div className="flex-1 h-px bg-[rgba(84,84,88,0.25)]" />
      <span className="text-[10px] font-mono text-[rgba(235,235,245,0.25)]">{count} değişiklik</span>
    </div>
  );
}

/* ── Peer filter chip ─────────────────────────────────────────────────── */

function PeerChip({
  peerId, peerName, peerIp, active, onClick,
}: { peerId?: string; peerName?: string; peerIp?: string; active: boolean; onClick: () => void }) {
  const color = peerColor(peerId);
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
        active
          ? "text-white"
          : "text-[rgba(235,235,245,0.45)] hover:text-[rgba(235,235,245,0.7)]"
      }`}
      style={active
        ? { background: color + "25", border: `1px solid ${color}50`, color }
        : { background: "transparent", border: "1px solid rgba(84,84,88,0.35)" }
      }
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: active ? color : "rgba(84,84,88,0.6)" }}
      />
      {peerName && peerName !== "unknown" ? peerName : "Peer"}
      {peerIp && peerIp !== "unknown" && (
        <span className="opacity-60 text-[10px]">{peerIp}</span>
      )}
    </button>
  );
}

/* ── Main panel ───────────────────────────────────────────────────────── */

export function HistoryPanel({ onClose }: Props) {
  const liveLog     = useSyncStore((s) => s.activityLog);
  const localPeer   = useSyncStore((s) => s.localPeerInfo);

  const [diskEntries,  setDiskEntries]  = useState<ActivityEntry[]>([]);
  const [loadedDisk,   setLoadedDisk]   = useState(false);
  const [query,        setQuery]        = useState("");
  const [filterPeer,   setFilterPeer]   = useState<string | null>(null);
  const [filterType,   setFilterType]   = useState<ActivityEventType | null>(null);
  const [showFilters,  setShowFilters]  = useState(false);
  const [clearing,     setClearing]     = useState(false);

  // Load persisted history from disk on first open
  useEffect(() => {
    invoke<string[]>("load_history")
      .then((lines) => {
        const parsed: ActivityEntry[] = [];
        const seen = new Set<string>();
        for (const line of lines) {
          try {
            const e = JSON.parse(line) as ActivityEntry;
            if (e.id && !seen.has(e.id)) { seen.add(e.id); parsed.push(e); }
          } catch {}
        }
        setDiskEntries(parsed.sort((a, b) => b.ts - a.ts));
      })
      .catch(() => {})
      .finally(() => setLoadedDisk(true));
  }, []);

  // Merge disk entries with live in-session log (deduplicate by id)
  const allEntries = useMemo(() => {
    const seen  = new Set<string>();
    const merged: ActivityEntry[] = [];
    for (const e of [...liveLog, ...diskEntries]) {
      if (!seen.has(e.id)) { seen.add(e.id); merged.push(e); }
    }
    return merged.sort((a, b) => b.ts - a.ts);
  }, [liveLog, diskEntries]);

  // Unique peers
  const peers = useMemo(() => {
    const map = new Map<string, { peerId?: string; peerName?: string; peerIp?: string }>();
    for (const e of allEntries) {
      const key = e.peerId ?? (e.side === "local" ? "me" : "unknown");
      if (!map.has(key)) map.set(key, { peerId: e.peerId, peerName: e.peerName, peerIp: e.peerIp });
    }
    return Array.from(map.entries()).map(([k, v]) => ({ key: k, ...v }));
  }, [allEntries]);

  // Apply filters
  const filtered = useMemo(() => {
    let list = allEntries;
    if (filterPeer) {
      list = list.filter((e) => {
        const key = e.peerId ?? (e.side === "local" ? "me" : "unknown");
        return key === filterPeer;
      });
    }
    if (filterType) list = list.filter((e) => e.type === filterType);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (e) =>
          e.path.toLowerCase().includes(q) ||
          e.peerName?.toLowerCase().includes(q) ||
          e.peerIp?.includes(q) ||
          e.roomCode?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allEntries, filterPeer, filterType, query]);

  // Group by date
  const groups = useMemo(() => {
    const byDate = new Map<string, ActivityEntry[]>();
    for (const e of filtered) {
      const key = dateKey(e.ts);
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key)!.push(e);
    }
    return Array.from(byDate.entries()).map(([, entries]) => ({
      label: formatDateLabel(entries[0].ts),
      entries,
    }));
  }, [filtered]);

  const handleClear = async () => {
    if (!window.confirm("Tüm geçmiş silinsin mi? Bu işlem geri alınamaz.")) return;
    setClearing(true);
    await invoke("clear_history").catch(() => {});
    setDiskEntries([]);
    useSyncStore.getState().clearActivity();
    setClearing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="w-full h-full bg-[#111113] border border-white/[0.07] rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
    >
      {/* ── Top bar ── */}
      <div
        data-tauri-drag-region
        className="flex items-center gap-2.5 px-4 py-3 border-b border-[rgba(84,84,88,0.4)] bg-black/50 backdrop-blur-xl flex-shrink-0"
      >
        <ClockCounterClockwise size={15} weight="duotone" className="text-[rgba(235,235,245,0.4)] flex-shrink-0" />
        <span className="text-[13px] font-semibold text-[rgba(235,235,245,0.85)] flex-shrink-0" data-tauri-drag-region>
          Değişiklik Geçmişi
        </span>
        <span className="text-[11px] font-mono text-[rgba(235,235,245,0.25)] flex-shrink-0">
          {allEntries.length} kayıt
        </span>

        <div className="flex-1" data-tauri-drag-region />

        {/* Search */}
        <div className="relative flex-shrink-0" data-tauri-drag-region="false">
          <MagnifyingGlass size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[rgba(235,235,245,0.25)] pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Dosya, peer, IP ara…"
            className="w-44 bg-[#2c2c2e] border border-[rgba(84,84,88,0.5)] rounded-[8px] text-[11px] text-[rgba(235,235,245,0.8)] placeholder-[rgba(235,235,245,0.2)] py-1.5 pl-6 pr-2 focus:outline-none focus:border-[rgba(10,132,255,0.5)] transition-all"
            spellCheck={false}
          />
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`w-7 h-7 flex items-center justify-center rounded-full transition-all flex-shrink-0 ${
            showFilters || filterPeer || filterType
              ? "text-[#0a84ff] bg-[#0a84ff]/15"
              : "text-[rgba(235,235,245,0.4)] hover:bg-white/[0.07]"
          }`}
          data-tauri-drag-region="false"
        >
          <Funnel size={12} weight="fill" />
        </button>

        {/* Clear */}
        <button
          onClick={handleClear}
          disabled={clearing || allEntries.length === 0}
          className="w-7 h-7 flex items-center justify-center rounded-full text-[rgba(235,235,245,0.3)] hover:text-[#ff453a] hover:bg-[#ff453a]/10 disabled:opacity-20 transition-all flex-shrink-0"
          title="Geçmişi temizle"
          data-tauri-drag-region="false"
        >
          <Trash size={12} weight="bold" />
        </button>

        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-full text-[rgba(235,235,245,0.4)] hover:text-white hover:bg-[#ff453a] transition-all flex-shrink-0"
          data-tauri-drag-region="false"
        >
          <X size={13} weight="bold" />
        </button>
      </div>

      {/* ── Filters ── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden border-b border-[rgba(84,84,88,0.3)] flex-shrink-0"
          >
            <div className="px-4 py-3 space-y-2.5">
              {/* Peer filter */}
              {peers.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-semibold text-[rgba(235,235,245,0.3)] uppercase tracking-widest w-10 flex-shrink-0">Peer</span>
                  <button
                    onClick={() => setFilterPeer(null)}
                    className={`px-2.5 py-1 rounded-full text-[11px] border transition-all ${
                      !filterPeer
                        ? "text-white bg-white/10 border-white/20"
                        : "text-[rgba(235,235,245,0.4)] border-[rgba(84,84,88,0.35)] hover:text-white"
                    }`}
                  >Hepsi</button>
                  {peers.map(({ key, peerId, peerName, peerIp }) => (
                    <PeerChip
                      key={key}
                      peerId={peerId}
                      peerName={peerName}
                      peerIp={peerIp}
                      active={filterPeer === key}
                      onClick={() => setFilterPeer(filterPeer === key ? null : key)}
                    />
                  ))}
                </div>
              )}
              {/* Type filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-semibold text-[rgba(235,235,245,0.3)] uppercase tracking-widest w-10 flex-shrink-0">Tür</span>
                {(["added","modified","deleted","conflict","error"] as ActivityEventType[]).map((t) => {
                  const m = TYPE_META[t];
                  return (
                    <button
                      key={t}
                      onClick={() => setFilterType(filterType === t ? null : t)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${
                        filterType === t
                          ? "text-white"
                          : "text-[rgba(235,235,245,0.45)] border-[rgba(84,84,88,0.35)] hover:text-white"
                      }`}
                      style={filterType === t
                        ? { color: m.color, background: m.color + "20", borderColor: m.color + "40" }
                        : {}}
                    >
                      <m.Icon size={9} weight="fill" style={{ color: filterType === t ? m.color : undefined }} />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto">
        {!loadedDisk ? (
          <div className="flex items-center justify-center h-full gap-2 text-[12px] text-[rgba(235,235,245,0.25)]">
            <ArrowClockwise size={14} weight="bold" className="animate-spin" />
            Yükleniyor…
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-30">
            <Monitor size={40} weight="duotone" />
            <span className="text-[13px]">Henüz değişiklik yok</span>
            {(filterPeer || filterType || query) && (
              <button
                onClick={() => { setFilterPeer(null); setFilterType(null); setQuery(""); }}
                className="text-[12px] text-[#0a84ff] hover:underline"
              >
                Filtreleri temizle
              </button>
            )}
          </div>
        ) : (
          <div>
            {groups.map(({ label, entries }) => (
              <div key={label}>
                <DateHeader label={label} count={entries.length} />
                {entries.map((e) => <EntryRow key={e.id} entry={e} />)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Status bar ── */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-[rgba(84,84,88,0.3)] bg-black/30 flex-shrink-0">
        <span className="text-[10px] font-mono text-[rgba(235,235,245,0.25)]">
          {localPeer ? `${localPeer.peerName} · ${localPeer.peerIp}` : "—"}
        </span>
        <span className="text-[10px] font-mono text-[rgba(235,235,245,0.2)]">
          {filtered.length !== allEntries.length
            ? `${filtered.length} / ${allEntries.length} gösteriliyor`
            : `${allEntries.length} toplam kayıt`}
        </span>
      </div>
    </motion.div>
  );
}
