import { motion } from "motion/react";
import { clsx } from "clsx";
import type { ConnectionState } from "../types";

interface StateConfig {
  label: string;
  dot: string;
  glow: string;
  badge: string;
  pulse: boolean;
}

const CONFIG: Record<ConnectionState, StateConfig> = {
  offline: {
    label: "OFFLINE",
    dot: "bg-zinc-600",
    glow: "",
    badge: "text-zinc-500 border-zinc-700/50 bg-zinc-800/40",
    pulse: false,
  },
  connecting: {
    label: "CONNECTING",
    dot: "bg-amber-400",
    glow: "shadow-[0_0_7px_rgba(251,191,36,0.85)]",
    badge: "text-amber-400 border-amber-500/30 bg-amber-500/[0.08]",
    pulse: true,
  },
  connected: {
    label: "CONNECTED",
    dot: "bg-emerald-400",
    glow: "shadow-[0_0_7px_rgba(52,211,153,0.85)]",
    badge: "text-emerald-400 border-emerald-500/30 bg-emerald-500/[0.08]",
    pulse: false,
  },
  syncing: {
    label: "SYNCING",
    dot: "bg-blue-400",
    glow: "shadow-[0_0_7px_rgba(96,165,250,0.85)]",
    badge: "text-blue-400 border-blue-500/30 bg-blue-500/[0.08]",
    pulse: true,
  },
  converged: {
    label: "CONVERGED",
    dot: "bg-emerald-400",
    glow: "shadow-[0_0_7px_rgba(52,211,153,0.85)]",
    badge: "text-emerald-400 border-emerald-500/30 bg-emerald-500/[0.08]",
    pulse: false,
  },
  diverged: {
    label: "DIVERGED",
    dot: "bg-red-400",
    glow: "shadow-[0_0_7px_rgba(248,113,113,0.85)]",
    badge: "text-red-400 border-red-500/30 bg-red-500/[0.08]",
    pulse: true,
  },
};

export function ConnectionStatus({ state }: { state: ConnectionState }) {
  const { label, dot, glow, badge, pulse } = CONFIG[state];

  return (
    <motion.div
      key={state}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={clsx(
        "inline-flex items-center gap-2 pl-2 pr-3 py-1 rounded-full border",
        badge
      )}
    >
      <motion.span
        className={clsx("w-[7px] h-[7px] rounded-full flex-shrink-0", dot, glow)}
        animate={pulse ? { opacity: [1, 0.25, 1] } : { opacity: 1 }}
        transition={pulse ? { duration: 1.3, repeat: Infinity, ease: "easeInOut" } : {}}
      />
      <span className="text-[10px] font-mono font-semibold tracking-[0.12em]">
        {label}
      </span>
    </motion.div>
  );
}
