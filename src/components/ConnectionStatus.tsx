import { clsx } from "clsx";
import {
  WifiHigh,
  WifiSlash,
  WifiMedium,
  ArrowsClockwise,
  CheckCircle,
  WarningCircle,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import type { ConnectionState } from "../types";

interface Props {
  state: ConnectionState;
}

const CONFIG: Record<
  ConnectionState,
  {
    label: string;
    Icon: React.ElementType;
    color: string;
    pulse: boolean;
  }
> = {
  offline:    { label: "OFFLINE",    Icon: WifiSlash,        color: "text-zinc-500",   pulse: false },
  connecting: { label: "CONNECTING", Icon: WifiMedium,       color: "text-yellow-400", pulse: true  },
  connected:  { label: "CONNECTED",  Icon: WifiHigh,         color: "text-emerald-400",pulse: false },
  syncing:    { label: "SYNCING",    Icon: ArrowsClockwise,  color: "text-blue-400",   pulse: true  },
  converged:  { label: "CONVERGED",  Icon: CheckCircle,      color: "text-emerald-400",pulse: false },
  diverged:   { label: "DIVERGED",   Icon: WarningCircle,    color: "text-red-400",    pulse: true  },
};

export function ConnectionStatus({ state }: Props) {
  const { label, Icon, color, pulse } = CONFIG[state];
  return (
    <motion.div
      className="flex items-center gap-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      key={state}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        animate={pulse ? { opacity: [1, 0.4, 1] } : { opacity: 1 }}
        transition={pulse ? { duration: 1.2, repeat: Infinity } : {}}
      >
        <Icon weight="fill" size={14} className={color} />
      </motion.div>
      <span className={clsx("text-[11px] font-mono tracking-[0.2em] font-semibold", color)}>
        {label}
      </span>
    </motion.div>
  );
}
