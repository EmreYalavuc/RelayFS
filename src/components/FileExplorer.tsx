import { useState, useEffect, useMemo, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { motion, AnimatePresence } from "motion/react";
import {
  FolderSimple, FolderOpen,
  File, FileText, FileCode, FileHtml, FileCss, FileImage,
  BracketsCurly, Article, Gear,
  ArrowLeft, X, MagnifyingGlass, CaretRight,
  Code, ArrowSquareOut, Copy, Trash,
} from "@phosphor-icons/react";
import * as Y from "yjs";
import { ContextMenuPortal, ContextMenuItem } from "./ContextMenu";
import { FilePreview, PreviewItem } from "./FilePreview";

interface Props {
  doc: Y.Doc | null;
  projectName: string;
  projectPath: string;
  onClose: () => void;
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

interface Item { name: string; isDir: boolean; path: string; }

function getContents(paths: string[], dir: string): Item[] {
  const prefix = dir ? dir + "/" : "";
  const seen   = new Set<string>();
  const items: Item[] = [];

  for (const p of paths) {
    if (!p.startsWith(prefix)) continue;
    const rest     = p.slice(prefix.length);
    const slashIdx = rest.indexOf("/");

    if (slashIdx === -1) {
      if (!seen.has(rest)) {
        seen.add(rest);
        items.push({ name: rest, isDir: false, path: prefix + rest });
      }
    } else {
      const folder = rest.slice(0, slashIdx);
      if (!seen.has(folder)) {
        seen.add(folder);
        items.push({ name: folder, isDir: true, path: prefix + folder });
      }
    }
  }

  return items.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function formatBytes(b: number): string {
  if (!b) return "";
  if (b < 1024) return `${b}B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)}KB`;
  return `${(b / (1024 * 1024)).toFixed(1)}MB`;
}

function formatRelDate(ts: number): string {
  if (!ts) return "";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "şimdi";
  if (s < 3600) return `${Math.floor(s / 60)}dk`;
  if (s < 86400) return `${Math.floor(s / 3600)}sa`;
  return `${Math.floor(s / 86400)}g`;
}

/* ── File icon ───────────────────────────────────────────────────────────── */

type IconDef = { Icon: React.ElementType; color: string };

function fileIconDef(name: string): IconDef {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "ts" || ext === "tsx")                   return { Icon: FileCode,      color: "#5c9cf5" };
  if (ext === "js" || ext === "jsx" || ext === "mjs")  return { Icon: FileCode,      color: "#f5d76e" };
  if (ext === "json" || ext === "jsonc")               return { Icon: BracketsCurly, color: "#ff9f0a" };
  if (ext === "css" || ext === "scss" || ext === "sass" || ext === "less")
                                                        return { Icon: FileCss,       color: "#af80ff" };
  if (ext === "html" || ext === "htm")                 return { Icon: FileHtml,      color: "#ff6b35" };
  if (ext === "md" || ext === "mdx")                   return { Icon: Article,       color: "#8e8e93" };
  if (ext === "py")                                    return { Icon: FileCode,      color: "#4ea8de" };
  if (ext === "rs")                                    return { Icon: FileCode,      color: "#ff9f0a" };
  if (ext === "go")                                    return { Icon: FileCode,      color: "#4ea8de" };
  if (ext === "rb")                                    return { Icon: FileCode,      color: "#ff453a" };
  if (ext === "toml" || ext === "yaml" || ext === "yml") return { Icon: Gear,       color: "#8e8e93" };
  if (ext === "svg")                                   return { Icon: FileImage,     color: "#30d158" };
  if (ext === "txt")                                   return { Icon: FileText,      color: "#8e8e93" };
  if (ext === "sh" || ext === "bash")                  return { Icon: FileCode,      color: "#30d158" };
  if (ext === "vue" || ext === "svelte" || ext === "astro") return { Icon: FileCode, color: "#30d158" };
  return { Icon: File, color: "#636366" };
}

/* ── Left sidebar folder row ─────────────────────────────────────────────── */

function SidebarRow({
  name, path, depth, paths, selectedDir, onSelect,
}: {
  name: string; path: string; depth: number;
  paths: string[]; selectedDir: string;
  onSelect: (p: string) => void;
}) {
  const [open, setOpen] = useState(depth === 0);
  const isSelected      = selectedDir === path;
  const subFolders      = getContents(paths, path).filter((i) => i.isDir);
  const expandable      = subFolders.length > 0;

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-[4px] pr-2 rounded-[6px] cursor-pointer select-none transition-colors ${
          isSelected
            ? "bg-[#0a84ff]/20 text-white"
            : "text-[rgba(235,235,245,0.7)] hover:bg-white/[0.06]"
        }`}
        style={{ paddingLeft: `${10 + depth * 14}px` }}
        onClick={() => { onSelect(path); setOpen(true); }}
      >
        {expandable ? (
          <span
            className="flex-shrink-0 text-[rgba(235,235,245,0.35)] transition-transform duration-100"
            style={{ display: "inline-block", transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
            onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
          >
            <CaretRight size={10} weight="fill" />
          </span>
        ) : (
          <span className="w-[10px] flex-shrink-0" />
        )}
        {open
          ? <FolderOpen   size={14} weight="duotone" className="flex-shrink-0 text-[#ff9f0a]" />
          : <FolderSimple size={14} weight="duotone" className="flex-shrink-0 text-[#ff9f0a]" />
        }
        <span className="text-[12px] truncate">{name}</span>
      </div>
      {open && subFolders.map((f) => (
        <SidebarRow
          key={f.path}
          name={f.name}
          path={f.path}
          depth={depth + 1}
          paths={paths}
          selectedDir={selectedDir}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

/* ── Right pane grid item ─────────────────────────────────────────────────── */

function GridItem({
  item, selected, meta, onSelect, onNavigate, onContextMenu,
}: {
  item: Item;
  selected: boolean;
  meta?: { size: number; modified: number };
  onSelect: (item: Item) => void;
  onNavigate: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, item: Item) => void;
}) {
  const { Icon, color } = fileIconDef(item.name);

  return (
    <div
      className={`flex flex-col items-center gap-1 p-2.5 rounded-[10px] transition-colors select-none cursor-pointer
        ${selected
          ? "bg-[#0a84ff]/20 ring-1 ring-[#0a84ff]/40"
          : "hover:bg-white/[0.06]"
        }`}
      style={{ width: "86px" }}
      onClick={() => {
        if (item.isDir) onNavigate(item.path);
        else onSelect(item);
      }}
      onDoubleClick={() => { if (item.isDir) onNavigate(item.path); }}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, item); }}
    >
      {item.isDir
        ? <FolderOpen size={42} weight="duotone" style={{ color: "#ff9f0a" }} />
        : <Icon      size={42} weight="duotone" style={{ color }} />
      }
      <span
        className="text-[11px] text-[rgba(235,235,245,0.78)] text-center leading-tight"
        style={{ maxWidth: "78px", wordBreak: "break-word", display: "-webkit-box",
          WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
      >
        {item.name}
      </span>
      {!item.isDir && meta && (
        <div className="flex items-center gap-1 mt-0.5">
          {meta.size > 0 && (
            <span className="text-[9px] font-mono text-[rgba(235,235,245,0.28)]">
              {formatBytes(meta.size)}
            </span>
          )}
          {meta.modified > 0 && (
            <span className="text-[9px] font-mono text-[rgba(235,235,245,0.2)]">
              · {formatRelDate(meta.modified)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main explorer ──────────────────────────────────────────────────────── */

export function FileExplorer({ doc, projectName, projectPath, onClose }: Props) {
  const [paths, setPaths]           = useState<string[]>([]);
  const [fileMetas, setFileMetas]   = useState<Map<string, { size: number; modified: number }>>(new Map());
  const [selectedDir, setSelectedDir] = useState("");
  const [selectedFile, setSelectedFile] = useState<PreviewItem | null>(null);
  const [query, setQuery]           = useState("");
  const [history, setHistory]       = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    x: number; y: number; items: ContextMenuItem[];
  } | null>(null);

  // Sync file list from Y.Doc
  useEffect(() => {
    if (!doc) return;
    const fileMap = doc.getMap<Y.Text>("files");
    const sync = () => setPaths(Array.from(fileMap.keys()));
    sync();
    fileMap.observe(sync);
    return () => fileMap.unobserve(sync);
  }, [doc]);

  // Sync file-meta from Y.Doc
  useEffect(() => {
    if (!doc) return;
    const metaMap = doc.getMap<string>("file-meta");
    const sync = () => {
      const m = new Map<string, { size: number; modified: number }>();
      metaMap.forEach((val, key) => {
        try {
          const p = JSON.parse(val);
          m.set(key, { size: p.size ?? 0, modified: p.modified ?? 0 });
        } catch {}
      });
      setFileMetas(m);
    };
    sync();
    metaMap.observe(sync);
    return () => metaMap.unobserve(sync);
  }, [doc]);

  const navigate = useCallback((path: string) => {
    setHistory((h) => [...h, selectedDir]);
    setSelectedDir(path);
    setSelectedFile(null);
    setQuery("");
  }, [selectedDir]);

  const goBack = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setSelectedDir(prev);
      setSelectedFile(null);
      return h.slice(0, -1);
    });
    setQuery("");
  }, []);

  const breadcrumbs = useMemo(() => {
    if (!selectedDir) return [projectName || "Proje"];
    return [projectName || "Proje", ...selectedDir.split("/")];
  }, [selectedDir, projectName]);

  const contents = useMemo(() => {
    const items = getContents(paths, selectedDir);
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [paths, selectedDir, query]);

  const rootFolders = useMemo(
    () => getContents(paths, "").filter((i) => i.isDir),
    [paths]
  );

  // Build absolute path for an Item
  const absPath = useCallback((item: Item) => {
    if (!projectPath) return item.path;
    return `${projectPath}\\${item.path.replace(/\//g, "\\")}`;
  }, [projectPath]);

  const deleteFile = useCallback((item: Item) => {
    if (!doc) return;
    if (!window.confirm(`"${item.name}" dosyasını silmek istediğinize emin misiniz?`)) return;
    doc.transact(() => {
      doc.getMap<Y.Text>("files").delete(item.path);
    });
    if (selectedFile?.relativePath === item.path) setSelectedFile(null);
  }, [doc, selectedFile]);

  const openContextMenu = useCallback((e: React.MouseEvent, item: Item) => {
    e.preventDefault();
    e.stopPropagation();

    const ap = absPath(item);
    const items: ContextMenuItem[] = item.isDir
      ? [
          {
            label: "Explorer'da Göster",
            icon: ArrowSquareOut,
            action: () => invoke("reveal_in_explorer", { path: ap }).catch(() => {}),
          },
          {
            label: "Yolu Kopyala",
            icon: Copy,
            action: () => navigator.clipboard.writeText(ap),
          },
        ]
      : [
          {
            label: "VS Code'da Aç",
            icon: Code,
            action: () => invoke("open_in_vscode", { path: ap }).catch(() => {}),
          },
          {
            label: "Varsayılan Uygulama ile Aç",
            icon: ArrowSquareOut,
            action: () => invoke("open_file_default", { path: ap }).catch(() => {}),
          },
          {
            label: "Explorer'da Göster",
            icon: ArrowSquareOut,
            divider: true,
            action: () => invoke("reveal_in_explorer", { path: ap }).catch(() => {}),
          },
          {
            label: "Yolu Kopyala",
            icon: Copy,
            action: () => navigator.clipboard.writeText(ap),
          },
          {
            label: "Sil",
            icon: Trash,
            divider: true,
            danger: true,
            action: () => deleteFile(item),
          },
        ];

    setContextMenu({ x: e.clientX, y: e.clientY, items });
  }, [absPath, deleteFile]);

  const hasPreview = selectedFile !== null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="w-full h-full bg-[#161618] border border-white/[0.07] rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
    >
      {/* ── Top bar ── */}
      <div
        data-tauri-drag-region
        className="flex items-center gap-2 px-4 py-3 border-b border-[rgba(84,84,88,0.4)] bg-black/50 backdrop-blur-xl flex-shrink-0"
      >
        <button
          onClick={goBack}
          disabled={history.length === 0}
          className="w-7 h-7 flex items-center justify-center rounded-full text-[rgba(235,235,245,0.4)] hover:bg-white/[0.08] disabled:opacity-20 transition-all flex-shrink-0"
          data-tauri-drag-region="false"
        >
          <ArrowLeft size={13} weight="bold" />
        </button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 flex-1 min-w-0" data-tauri-drag-region>
          {breadcrumbs.map((seg, i) => (
            <span key={i} className="flex items-center gap-1 min-w-0">
              {i > 0 && <CaretRight size={9} weight="bold" className="text-[rgba(235,235,245,0.25)] flex-shrink-0" />}
              <button
                onClick={() => {
                  if (i === 0) { setHistory([]); setSelectedDir(""); setSelectedFile(null); }
                  else {
                    const p = breadcrumbs.slice(1, i + 1).join("/");
                    setHistory([]);
                    setSelectedDir(p);
                  }
                }}
                className={`text-[12px] truncate transition-colors flex-shrink-0 ${
                  i === breadcrumbs.length - 1
                    ? "text-white font-semibold"
                    : "text-[rgba(235,235,245,0.45)] hover:text-[rgba(235,235,245,0.75)]"
                }`}
                data-tauri-drag-region="false"
              >
                {seg}
              </button>
            </span>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-shrink-0" data-tauri-drag-region="false">
          <MagnifyingGlass size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[rgba(235,235,245,0.25)] pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ara…"
            className="w-28 bg-[#2c2c2e] border border-[rgba(84,84,88,0.5)] rounded-[8px] text-[11px] text-[rgba(235,235,245,0.8)] placeholder-[rgba(235,235,245,0.2)] py-1.5 pl-6 pr-2 focus:outline-none focus:border-[rgba(10,132,255,0.5)] transition-all"
            spellCheck={false}
          />
        </div>

        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-full text-[rgba(235,235,245,0.4)] hover:text-white hover:bg-[#ff453a] transition-all flex-shrink-0"
          data-tauri-drag-region="false"
        >
          <X size={13} weight="bold" />
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0">

        {/* Sidebar */}
        <div className="w-[185px] flex-shrink-0 border-r border-[rgba(84,84,88,0.3)] py-2 px-1 overflow-y-auto bg-[#111113]">
          <div
            className={`flex items-center gap-1.5 px-3 py-[4px] rounded-[6px] cursor-pointer select-none transition-colors mb-0.5 ${
              selectedDir === "" ? "bg-[#0a84ff]/20 text-white" : "text-[rgba(235,235,245,0.6)] hover:bg-white/[0.06]"
            }`}
            onClick={() => { setSelectedDir(""); setHistory([]); setSelectedFile(null); }}
          >
            <FolderOpen size={14} weight="fill" className="text-[#ff9f0a] flex-shrink-0" />
            <span className="text-[12px] font-semibold truncate">{projectName || "Proje"}</span>
          </div>

          {rootFolders.map((f) => (
            <SidebarRow
              key={f.path}
              name={f.name}
              path={f.path}
              depth={1}
              paths={paths}
              selectedDir={selectedDir}
              onSelect={(p) => { setSelectedDir(p); setHistory([]); setSelectedFile(null); }}
            />
          ))}
        </div>

        {/* Main content: grid + optional preview */}
        <div className="flex flex-1 min-w-0 min-h-0">

          {/* Icon grid */}
          <div className="flex-1 overflow-y-auto p-3 min-w-0">
            {paths.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 opacity-30">
                <FolderSimple size={48} weight="duotone" className="text-[rgba(235,235,245,0.3)]" />
                <span className="text-[13px] text-[rgba(235,235,245,0.4)]">Dosya bekleniyor…</span>
              </div>
            ) : contents.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-[12px] text-[rgba(235,235,245,0.25)]">
                Bu klasörde öğe yok
              </div>
            ) : (
              <div className="flex flex-wrap gap-0.5">
                {contents.map((item) => (
                  <GridItem
                    key={item.path}
                    item={item}
                    selected={selectedFile?.relativePath === item.path}
                    meta={!item.isDir ? fileMetas.get(item.path) : undefined}
                    onSelect={(it) => setSelectedFile({ name: it.name, relativePath: it.path, isDir: false })}
                    onNavigate={navigate}
                    onContextMenu={openContextMenu}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Preview panel */}
          <AnimatePresence>
            {hasPreview && selectedFile && (
              <div className="w-[360px] flex-shrink-0 h-full overflow-hidden">
                <FilePreview
                  doc={doc}
                  item={selectedFile}
                  projectPath={projectPath}
                  onClose={() => setSelectedFile(null)}
                />
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-[rgba(84,84,88,0.3)] bg-black/30 flex-shrink-0">
        <span className="text-[10px] font-mono text-[rgba(235,235,245,0.3)]">
          {contents.length} öğe
        </span>
        {selectedFile && (
          <span className="text-[10px] font-mono text-[rgba(235,235,245,0.3)] truncate max-w-[300px]">
            {selectedFile.relativePath}
          </span>
        )}
        <span className="text-[10px] font-mono text-[rgba(235,235,245,0.2)]">
          {paths.length} toplam dosya
        </span>
      </div>

      {/* Context menu */}
      <ContextMenuPortal
        menu={contextMenu}
        onClose={() => setContextMenu(null)}
      />
    </motion.div>
  );
}
