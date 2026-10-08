import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";

export interface ContextMenuItem {
  label: string;
  icon?: React.ElementType;
  action: () => void;
  danger?: boolean;
  divider?: boolean; // thin line drawn BEFORE this item
}

interface Props {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

const ITEM_H   = 30;
const MENU_W   = 200;
const PADDING  = 8; // px from viewport edge

export function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Clamp to viewport
  const totalH = items.length * ITEM_H + (items.filter((i) => i.divider).length * 9) + 10;
  const cx = Math.max(PADDING, Math.min(x, window.innerWidth  - MENU_W   - PADDING));
  const cy = Math.max(PADDING, Math.min(y, window.innerHeight - totalH   - PADDING));

  useEffect(() => {
    const down = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
    };
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.94, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: -4 }}
      transition={{ duration: 0.1, ease: "easeOut" }}
      className="fixed z-[9999] bg-[#2c2c2e]/95 backdrop-blur-xl border border-[rgba(84,84,88,0.55)] rounded-[10px] shadow-[0_8px_32px_rgba(0,0,0,0.6)] py-1.5 overflow-hidden"
      style={{ left: cx, top: cy, minWidth: MENU_W }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {items.map((item, i) => (
        <div key={i}>
          {item.divider && (
            <div className="mx-3 my-1 h-px bg-[rgba(84,84,88,0.45)]" />
          )}
          <button
            className={`w-full flex items-center gap-2.5 px-3.5 py-[7px] text-[12px] text-left transition-colors select-none ${
              item.danger
                ? "text-[#ff453a] hover:bg-[#ff453a]/10"
                : "text-[rgba(235,235,245,0.82)] hover:bg-white/[0.09]"
            }`}
            onClick={() => { item.action(); onClose(); }}
          >
            {item.icon && <item.icon size={13} weight="bold" className="flex-shrink-0 opacity-70" />}
            {item.label}
          </button>
        </div>
      ))}
    </motion.div>
  );
}

// Thin wrapper that handles AnimatePresence automatically
interface ControlledProps {
  menu: { x: number; y: number; items: ContextMenuItem[] } | null;
  onClose: () => void;
}

export function ContextMenuPortal({ menu, onClose }: ControlledProps) {
  return (
    <AnimatePresence>
      {menu && <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={onClose} />}
    </AnimatePresence>
  );
}
