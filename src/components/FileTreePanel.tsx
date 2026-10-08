import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FolderSimple, FolderOpen,
  File, FileText, FileCode, FileHtml, FileCss,
  FileImage, BracketsCurly, Article, Gear, X,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import * as Y from "yjs";

interface Props {
  doc: Y.Doc | null;
  projectName: string;
  onClose: () => void;
}

/* ── Tree data model ───────────────────────────────────────────────────── */

interface TreeNode {
  name: string;
  isDir: boolean;
  children: Map<string, TreeNode>;
  path: string;
}

function buildTree(paths: string[]): TreeNode {
  const root: TreeNode = { name: "root", isDir: true, children: new Map(), path: "" };
  for (const p of paths) {
    const parts = p.split("/");
    let cur = root;
    let acc = "";
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      acc = acc ? `${acc}/${part}` : part;
      if (!cur.children.has(part)) {
        cur.children.set(part, {
          name: part,
          isDir: !isLast,
          children: new Map(),
          path: acc,
        });
      }
      if (!isLast) cur = cur.children.get(part)!;
    }
  }
  return root;
}

function sortedChildren(node: TreeNode): TreeNode[] {
  return Array.from(node.children.values()).sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/* ── File icon mapping ─────────────────────────────────────────────────── */

function fileIcon(name: string): { Icon: React.ElementType; color: string } {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "ts" || ext === "tsx")         return { Icon: FileCode,  color: "#5c9cf5" };
  if (ext === "js" || ext === "jsx" || ext === "mjs" || ext === "cjs")
                                              return { Icon: FileCode,  color: "#f5d76e" };
  if (ext === "json" || ext === "jsonc")     return { Icon: BracketsCurly, color: "#ff9f0a" };
  if (ext === "css" || ext === "scss" || ext === "sass" || ext === "less")
                                              return { Icon: FileCss,   color: "#af80ff" };
  if (ext === "html" || ext === "htm")       return { Icon: FileHtml,  color: "#ff6b35" };
  if (ext === "md"   || ext === "mdx")       return { Icon: Article,   color: "#8e8e93" };
  if (ext === "py")                          return { Icon: FileCode,  color: "#4ea8de" };
  if (ext === "rb")                          return { Icon: FileCode,  color: "#ff453a" };
  if (ext === "go")                          return { Icon: FileCode,  color: "#4ea8de" };
  if (ext === "rs")                          return { Icon: FileCode,  color: "#ff9f0a" };
  if (ext === "toml")                        return { Icon: Gear,      color: "#8e8e93" };
  if (ext === "yaml" || ext === "yml")       return { Icon: Gear,      color: "#8e8e93" };
  if (ext === "svg")                         return { Icon: FileImage, color: "#30d158" };
  if (ext === "txt")                         return { Icon: FileText,  color: "#8e8e93" };
  if (ext === "sh"   || ext === "bash")      return { Icon: FileCode,  color: "#30d158" };
  if (ext === "vue"  || ext === "svelte")    return { Icon: FileCode,  color: "#30d158" };
  if (ext === "astro")                       return { Icon: FileCode,  color: "#ff6b35" };
  return { Icon: File, color: "#636366" };
}

/* ── Single tree row ───────────────────────────────────────────────────── */

function TreeRow({
  node,
  depth,
  query,
  defaultOpen,
}: {
  node: TreeNode;
  depth: number;
  query: string;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  // Auto-open when searching
  useEffect(() => { if (query) setOpen(true); }, [query]);

  const children = sortedChildren(node);

  // Filter: a folder is visible if any descendant matches; a file if name matches
  const matches = (n: TreeNode): boolean => {
    if (!query) return true;
    if (!n.isDir) return n.name.toLowerCase().includes(query);
    return sortedChildren(n).some(matches);
  };

  const visibleChildren = children.filter(matches);
  const indent = depth * 14;

  if (node.isDir) {
    if (query && visibleChildren.length === 0) return null;
    const FolIcon = open ? FolderOpen : FolderSimple;
    return (
      <div>
        <div
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-[5px] py-[3px] cursor-pointer rounded-[5px] hover:bg-white/[0.06] transition-colors"
          style={{ paddingLeft: `${8 + indent}px`, paddingRight: "8px" }}
        >
          <span
            className="text-[8px] text-[rgba(235,235,245,0.3)] transition-transform duration-150 flex-shrink-0"
            style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)", display: "inline-block" }}
          >▾</span>
          <FolIcon size={13} weight="duotone" className="flex-shrink-0" style={{ color: "#ff9f0a" }} />
          <span className="text-[12px] text-[rgba(235,235,245,0.85)] truncate leading-none">{node.name}</span>
        </div>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.12 }}
              style={{ overflow: "hidden" }}
            >
              {visibleChildren.map((child) => (
                <TreeRow
                  key={child.path}
                  node={child}
                  depth={depth + 1}
                  query={query}
                  defaultOpen={depth < 1}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // File row
  if (query && !node.name.toLowerCase().includes(query)) return null;
  const { Icon, color } = fileIcon(node.name);
  return (
    <div
      className="flex items-center gap-[5px] py-[3px] rounded-[5px] hover:bg-white/[0.06] transition-colors cursor-default"
      style={{ paddingLeft: `${8 + indent + 14}px`, paddingRight: "8px" }}
    >
      <Icon size={12} weight="fill" className="flex-shrink-0" style={{ color }} />
      <span className="text-[11.5px] text-[rgba(235,235,245,0.6)] truncate leading-none">{node.name}</span>
    </div>
  );
}

/* ── Main panel ────────────────────────────────────────────────────────── */

export function FileTreePanel({ doc, projectName, onClose }: Props) {
  const [paths, setPaths]   = useState<string[]>([]);
  const [query, setQuery]   = useState("");

  useEffect(() => {
    if (!doc) return;
    const fileMap = doc.getMap<Y.Text>("files");
    const sync = () => setPaths(Array.from(fileMap.keys()));
    sync();
    fileMap.observe(sync);
    return () => fileMap.unobserve(sync);
  }, [doc]);

  const tree = useMemo(() => buildTree(paths), [paths]);
  const topNodes = useMemo(() => sortedChildren(tree), [tree]);
  const q = query.trim().toLowerCase();

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      className="w-[290px] flex-shrink-0 bg-[#161618] border border-white/[0.07] rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(84,84,88,0.4)] bg-black/40 flex-shrink-0">
        <div className="flex items-center gap-2">
          <FolderOpen size={14} weight="fill" className="text-[#ff9f0a]" />
          <span className="text-[13px] font-semibold text-[rgba(235,235,245,0.85)] truncate max-w-[160px]">
            {projectName || "Proje"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-[rgba(235,235,245,0.3)]">{paths.length} dosya</span>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-full text-[rgba(235,235,245,0.35)] hover:text-white hover:bg-white/[0.1] transition-all"
          >
            <X size={11} weight="bold" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2.5 border-b border-[rgba(84,84,88,0.25)] flex-shrink-0">
        <div className="relative">
          <MagnifyingGlass
            size={11}
            weight="bold"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[rgba(235,235,245,0.25)] pointer-events-none"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Dosya ara…"
            className="w-full bg-[#2c2c2e] border border-[rgba(84,84,88,0.5)] rounded-[8px] text-[11.5px] text-[rgba(235,235,245,0.8)] placeholder-[rgba(235,235,245,0.2)] py-1.5 pl-7 pr-3 focus:outline-none focus:border-[rgba(10,132,255,0.5)] transition-all"
            spellCheck={false}
          />
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-2 px-1 scrollbar-thin">
        {paths.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2 opacity-40">
            <FolderSimple size={28} weight="duotone" className="text-[rgba(235,235,245,0.3)]" />
            <span className="text-[11px] text-[rgba(235,235,245,0.4)]">Dosya bekleniyor…</span>
          </div>
        ) : (
          topNodes.map((node) => (
            <TreeRow
              key={node.path}
              node={node}
              depth={0}
              query={q}
              defaultOpen={true}
            />
          ))
        )}
      </div>
    </motion.div>
  );
}
