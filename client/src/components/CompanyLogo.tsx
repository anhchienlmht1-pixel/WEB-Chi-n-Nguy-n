// No real logo artwork is available offline, so this renders a small
// deterministic-color badge with the ticker's initials instead — same
// idea as GitHub/Slack's default avatars, and stable across reloads
// since the color is derived from the symbol itself, not random.
const PALETTE = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e", "#10b981", "#14b8a6",
  "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e",
];

function colorFor(symbol: string): string {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export default function CompanyLogo({ symbol, size = 24 }: { symbol: string; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, backgroundColor: colorFor(symbol), fontSize: size * 0.36 }}
    >
      {symbol.slice(0, 2)}
    </span>
  );
}
