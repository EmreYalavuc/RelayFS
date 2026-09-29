// No ambiguous chars (0/O, 1/I/L)
const CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateRoomCode(): string {
  const pick = () => CHARS[Math.floor(Math.random() * CHARS.length)];
  const half = () => Array.from({ length: 4 }, pick).join("");
  return `${half()}-${half()}`;
}

export function codeToRoomId(code: string): string {
  return `relayfs-${code.toLowerCase().replace(/-/g, "")}`;
}

export function formatCode(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (clean.length <= 4) return clean;
  return `${clean.slice(0, 4)}-${clean.slice(4, 8)}`;
}
