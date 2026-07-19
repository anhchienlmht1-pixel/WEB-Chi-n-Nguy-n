// No real logo artwork is available offline (this environment's network
// policy blocks fetching from cafef.vn and other external sites — see
// AGENTS.md / session notes), so this renders a small deterministic
// initials badge instead. A tinted-background + matching-darker-text
// pattern (same family as Notion/Linear tags) reads as one cohesive set
// sitting in a column, rather than a row of clashing solid fills — the
// hue varies per symbol but saturation/lightness stay fixed, so every
// badge belongs to the same visual "family" instead of competing.
const HUES = [212, 250, 280, 320, 350, 18, 40, 160, 185, 145];

function hueFor(symbol: string): number {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  return HUES[Math.abs(hash) % HUES.length];
}

export default function CompanyLogo({ symbol, size = 26 }: { symbol: string; size?: number }) {
  const hue = hueFor(symbol);
  return (
    <span
      className="inline-flex shrink-0 select-none items-center justify-center rounded-md font-bold"
      style={{
        width: size,
        height: size,
        backgroundColor: `hsl(${hue} 60% 94%)`,
        color: `hsl(${hue} 55% 34%)`,
        fontSize: size * 0.34,
      }}
    >
      {symbol.slice(0, 2)}
    </span>
  );
}
