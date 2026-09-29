import { useState } from "react";
import { motion } from "motion/react";
import { FolderOpen, ArrowRight, Warning } from "@phosphor-icons/react";

interface Props {
  onOpen: (path: string) => void;
}

export function SetupView({ onOpen }: Props) {
  const [path, setPath] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = path.trim();
    if (!trimmed) {
      setError("path required");
      return;
    }
    setError("");
    onOpen(trimmed);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="w-[360px] bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-950/60">
        <span className="text-[10px] text-zinc-500 font-mono tracking-[0.15em] uppercase">
          relay<span className="text-blue-500">fs</span>
          <span className="text-zinc-600 ml-2">v0.1.0</span>
        </span>
        <span className="text-[9px] text-zinc-700 font-mono">CRDT sync</span>
      </div>

      <div className="px-5 py-6">
        {/* Tagline */}
        <p className="text-[11px] text-zinc-500 font-mono mb-6 leading-relaxed">
          offline-first file collaboration<br />
          <span className="text-zinc-600">open a project folder to begin</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Input */}
          <div className="relative">
            <FolderOpen
              size={12}
              weight="fill"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
            />
            <input
              type="text"
              value={path}
              onChange={(e) => {
                setPath(e.target.value);
                if (error) setError("");
              }}
              placeholder="C:\Projects\MyApp"
              className="w-full bg-zinc-800/60 border border-zinc-700/60 rounded text-[11px] text-zinc-200 font-mono placeholder-zinc-600 py-2.5 pl-8 pr-3 focus:outline-none focus:border-blue-500/60 focus:bg-zinc-800 transition-colors"
              spellCheck={false}
              autoComplete="off"
            />
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex items-center gap-1.5"
            >
              <Warning size={10} weight="fill" className="text-red-400" />
              <span className="text-[10px] text-red-400 font-mono">{error}</span>
            </motion.div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600/90 hover:bg-blue-500 text-white font-mono font-semibold text-[11px] tracking-[0.15em] rounded transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-zinc-900"
          >
            OPEN PROJECT
            <ArrowRight size={12} weight="bold" />
          </button>
        </form>
      </div>
    </motion.div>
  );
}
