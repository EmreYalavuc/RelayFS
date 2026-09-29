import { clsx } from "clsx";
import type { ConnectionState } from "../types";

interface Props {
  state: ConnectionState;
}

const CONFIG: Record<ConnectionState, { label: string; dot: string; text: string }> = {
  offline:    { label: "OFFLINE",     dot: "bg-gray-600",                   text: "text-gray-500" },
  connecting: { label: "CONNECTING",  dot: "bg-yellow-400 animate-pulse",   text: "text-yellow-400" },
  connected:  { label: "CONNECTED",   dot: "bg-emerald-400",                text: "text-emerald-400" },
  syncing:    { label: "SYNCING",     dot: "bg-blue-400 animate-pulse",     text: "text-blue-400" },
  converged:  { label: "CONVERGED",   dot: "bg-emerald-400",                text: "text-emerald-400" },
  diverged:   { label: "DIVERGED",    dot: "bg-red-400 animate-pulse",      text: "text-red-400" },
};

export function ConnectionStatus({ state }: Props) {
  const { label, dot, text } = CONFIG[state];
  return (
    <div className="flex items-center gap-2">
      <span className={clsx("w-2 h-2 rounded-full flex-shrink-0", dot)} />
      <span className={clsx("text-xs font-mono font-bold tracking-[0.2em]", text)}>
        {label}
      </span>
    </div>
  );
}
