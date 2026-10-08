import { useEffect, useState, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { motion } from "motion/react";
import {
  X, Code, ArrowSquareOut, Copy, Check,
  File, FileImage,
} from "@phosphor-icons/react";
import * as Y from "yjs";
import hljs from "highlight.js/lib/core";
import tsLang   from "highlight.js/lib/languages/typescript";
import jsLang   from "highlight.js/lib/languages/javascript";
import cssLang  from "highlight.js/lib/languages/css";
import jsonLang from "highlight.js/lib/languages/json";
import rustLang from "highlight.js/lib/languages/rust";
import pyLang   from "highlight.js/lib/languages/python";
import bashLang from "highlight.js/lib/languages/bash";
import xmlLang  from "highlight.js/lib/languages/xml";
import yamlLang from "highlight.js/lib/languages/yaml";
import goLang   from "highlight.js/lib/languages/go";
import cLang    from "highlight.js/lib/languages/c";
import cppLang  from "highlight.js/lib/languages/cpp";
import javaLang from "highlight.js/lib/languages/java";

hljs.registerLanguage("typescript",  tsLang);
hljs.registerLanguage("javascript",  jsLang);
hljs.registerLanguage("css",         cssLang);
hljs.registerLanguage("json",        jsonLang);
hljs.registerLanguage("rust",        rustLang);
hljs.registerLanguage("python",      pyLang);
hljs.registerLanguage("bash",        bashLang);
hljs.registerLanguage("xml",         xmlLang);
hljs.registerLanguage("yaml",        yamlLang);
hljs.registerLanguage("go",          goLang);
hljs.registerLanguage("c",           cLang);
hljs.registerLanguage("cpp",         cppLang);
hljs.registerLanguage("java",        javaLang);

const EXT_LANG: Record<string, string> = {
  ts: "typescript", tsx: "typescript",
  js: "javascript", jsx: "javascript", mjs: "javascript", cjs: "javascript",
  css: "css", scss: "css", sass: "css", less: "css",
  json: "json", jsonc: "json",
  rs: "rust", toml: "xml",
  py: "python",
  sh: "bash", bash: "bash",
  html: "xml", htm: "xml", svg: "xml", xml: "xml",
  yaml: "yaml", yml: "yaml",
  go: "go",
  c: "c", h: "c",
  cpp: "cpp", hpp: "cpp",
  java: "java",
  vue: "xml", svelte: "xml", astro: "xml",
  md: "plaintext", mdx: "plaintext",
  txt: "plaintext",
};

const IMAGE_EXT = new Set(["png","jpg","jpeg","gif","webp","ico","bmp"]);


export interface PreviewItem {
  name: string;
  relativePath: string;
  isDir: boolean;
}

interface Props {
  doc: Y.Doc | null;
  item: PreviewItem;
  projectPath: string;
  onClose: () => void;
}

export function FilePreview({ doc, item, projectPath, onClose }: Props) {
  const [content, setContent] = useState<string | null>(null);
  const [copied, setCopied]   = useState(false);

  const ext     = item.name.split(".").pop()?.toLowerCase() ?? "";
  const isSvg   = ext === "svg";
  const isImage = IMAGE_EXT.has(ext);
  const absPath = `${projectPath}\\${item.relativePath.replace(/\//g, "\\")}`;

  // Live-sync content from Y.Doc
  useEffect(() => {
    if (!doc) return;
    const fileMap = doc.getMap<Y.Text>("files");
    const sync = () => {
      const yt = fileMap.get(item.relativePath);
      setContent(yt ? yt.toString() : null);
    };
    sync();
    fileMap.observeDeep(sync);
    return () => fileMap.unobserveDeep(sync);
  }, [doc, item.relativePath]);

  // Syntax highlight
  const highlighted = useMemo(() => {
    if (!content || isSvg) return "";
    const lang = EXT_LANG[ext];
    try {
      if (lang && lang !== "plaintext" && hljs.getLanguage(lang)) {
        return hljs.highlight(content, { language: lang, ignoreIllegals: true }).value;
      }
      return escapeHtml(content);
    } catch {
      return escapeHtml(content);
    }
  }, [content, ext, isSvg]);

  const copyPath = () => {
    navigator.clipboard.writeText(absPath).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <motion.div
      key={item.relativePath}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      className="flex flex-col h-full bg-[#111113] border-l border-[rgba(84,84,88,0.3)]"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 px-3 py-2.5 border-b border-[rgba(84,84,88,0.3)] flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {isSvg || isImage
            ? <FileImage size={15} weight="duotone" className="text-[#30d158] flex-shrink-0" />
            : <File size={15} weight="duotone" className="text-[#5c9cf5] flex-shrink-0" />
          }
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-white truncate leading-tight">{item.name}</p>
            <p className="text-[10px] font-mono text-[rgba(235,235,245,0.3)] truncate leading-tight mt-0.5">
              {item.relativePath}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-[rgba(235,235,245,0.3)] hover:text-white hover:bg-white/[0.1] transition-all"
        >
          <X size={11} weight="bold" />
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[rgba(84,84,88,0.2)] flex-shrink-0">
        <ActionBtn
          icon={Code}
          label="VS Code"
          onClick={() => invoke("open_in_vscode", { path: absPath }).catch(() => {})}
        />
        <ActionBtn
          icon={ArrowSquareOut}
          label="Aç"
          onClick={() => invoke("open_file_default", { path: absPath }).catch(() => {})}
        />
        <ActionBtn
          icon={copied ? Check : Copy}
          label="Kopyala"
          onClick={copyPath}
          active={copied}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {content === null ? (
          <div className="flex items-center justify-center h-full text-[12px] text-[rgba(235,235,245,0.2)]">
            {isImage ? "Binary dosya önizlenemiyor" : "İçerik bekleniyor…"}
          </div>
        ) : isSvg ? (
          <SvgPreview src={content} />
        ) : (
          <CodeBlock html={highlighted} plain={content} ext={ext} />
        )}
      </div>
    </motion.div>
  );
}

function ActionBtn({
  icon: Icon, label, onClick, active = false,
}: { icon: React.ElementType; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-[6px] text-[10px] font-medium transition-all ${
        active
          ? "text-[#30d158] bg-[#30d158]/10"
          : "text-[rgba(235,235,245,0.45)] hover:text-white hover:bg-white/[0.07]"
      }`}
    >
      <Icon size={11} weight="bold" />
      {label}
    </button>
  );
}

function SvgPreview({ src }: { src: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
      <div
        className="w-full max-h-[260px] flex items-center justify-center rounded-[12px] bg-[#1c1c1e] border border-[rgba(84,84,88,0.3)] p-4 overflow-hidden"
        dangerouslySetInnerHTML={{ __html: src }}
      />
      <p className="text-[10px] text-[rgba(235,235,245,0.2)]">SVG Önizleme</p>
    </div>
  );
}

function CodeBlock({ html, plain }: { html: string; plain: string; ext: string }) {
  const lines = plain.split("\n");

  return (
    <div className="relative h-full">
      <style>{HLJS_DARK_THEME}</style>
      <div className="flex h-full font-mono text-[11.5px] leading-[1.6]">
        {/* Line numbers */}
        <div
          className="select-none text-right text-[rgba(235,235,245,0.15)] bg-[#0d0d0f] border-r border-[rgba(84,84,88,0.2)] px-3 py-4 flex-shrink-0"
          style={{ minWidth: "3.2em" }}
        >
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        {/* Code */}
        <div className="flex-1 overflow-x-auto py-4 px-4">
          {html ? (
            <pre>
              <code
                className="hljs"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </pre>
          ) : (
            <pre className="text-[rgba(235,235,245,0.7)]">{plain}</pre>
          )}
        </div>
      </div>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Inline "Atom One Dark"-compatible theme (no external CSS file needed)
const HLJS_DARK_THEME = `
.hljs { color: #abb2bf; background: transparent; }
.hljs-comment, .hljs-quote { color: #5c6370; font-style: italic; }
.hljs-keyword, .hljs-selector-tag, .hljs-built_in, .hljs-name, .hljs-tag { color: #c678dd; }
.hljs-string, .hljs-title, .hljs-section, .hljs-attribute, .hljs-literal,
.hljs-template-tag, .hljs-template-variable, .hljs-type, .hljs-addition { color: #98c379; }
.hljs-deletion, .hljs-selector-attr, .hljs-selector-pseudo, .hljs-meta { color: #e06c75; }
.hljs-doctag { color: #c678dd; }
.hljs-attr { color: #d19a66; }
.hljs-symbol, .hljs-bullet, .hljs-link { color: #56b6c2; }
.hljs-emphasis { font-style: italic; }
.hljs-strong { font-weight: bold; }
.hljs-number { color: #d19a66; }
.hljs-variable, .hljs-template-variable { color: #e06c75; }
.hljs-function, .hljs-title.function_ { color: #61afef; }
.hljs-params { color: #abb2bf; }
.hljs-class .hljs-title, .hljs-title.class_ { color: #e5c07b; }
.hljs-property { color: #e06c75; }
`;
