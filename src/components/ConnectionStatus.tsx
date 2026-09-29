import { motion } from "motion/react";
import { clsx } from "clsx";
import type { ConnectionState } from "../types";

interface StateConfig {
  label: string;
  color: string;
  bg: string;
  border: string;
  text: string;
  pulse: boolean;
}

// Apple system colors — dark mode
const CONFIG: Record<ConnectionState, StateConfig> = {
  offline: {
    label: "Offline",
    color: "bg-[#636366]",
    bg: "bg-[#2c2c2e]",
    border: "border-[rgba(99,99,102,0.3)]",
    text: "text-[rgba(235,235,245,0.4)]",
    pulse: false,
  },
  connecting: {
    label: "Connecting",
    color: "bg-[#ff9f0a]",
    bg: "bg-[#ff9f0a]/10",
    border: "border-[rgba(255,159,10,0.25)]",
    text: "text-[#ff9f0a]",
    pulse: true,
  },
  connected: {
    label: "Connected",
    color: "bg-[#30d158]",
    bg: "bg-[#30d158]/10",
    border: "border-[rgba(48,209,88,0.25)]",
    text: "text-[#30d158]",
    pulse: false,
  },
  syncing: {
    label: "Syncing",
    color: "bg-[#0a84ff]",
    bg: "bg-[#0a84ff]/10",
    border: "border-[rgba(10,132,255,0.25)]",
    text: "text-[#0a84ff]",
    pulse: true,
  },
  converged: {
    label: "Converged",
    color: "bg-[#30d158]",
    bg: "bg-[#30d158]/10",
    border: "border-[rgba(48,209,88,0.25)]",
    text: "text-[#30d158]",
    pulse: false,
  },
  diverged: {
    label: "Diverged",
    color: "bg-[#ff453a]",
    bg: "bg-[#ff453a]/10",
    border: "border-[rgba(255,69,58,0.25)]",
    text: "text-[#ff453a]",
    pulse: true,
  },
};

export function ConnectionStatus({ state }: { state: ConnectionState }) {
  const { label, color, bg, border, text, pulse } = CONFIG[state];

  return (
    <motion.div
      key={state}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={clsx(
        "inline-flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-full border",
        bg, border
      )}
    >
      <motion.span
        className={clsx("w-[7px] h-[7px] rounded-full flex-shrink-0", color)}
        animate={pulse ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
        transition={pulse ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" } : {}}
      />
      <span className={clsx("text-[11px] font-medium tracking-normal", text)}>
        {label}
      </span>
    </motion.div>
  );
}
