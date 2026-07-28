// No real logo artwork is available (logo.clearbit.com's free lookup no
// longer serves images — confirmed by it silently falling back to this
// badge for every symbol in practice), so this renders a deterministic
// initials badge instead. Tinted-background + matching-darker-text pattern
// — same family as Notion/Linear tags — hue varies per symbol,
// saturation/lightness stay fixed so every badge reads as one cohesive set.
const HUES = [212, 250, 280, 320, 350, 18, 40, 160, 185, 145];

function hueFor(symbol: string): number {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  return HUES[Math.abs(hash) % HUES.length];
}

export default function CompanyLogo({ symbol, size = 26 }: { symbol: string; size?: number }) {
  const upper = symbol.toUpperCase();
  const hue = hueFor(upper);
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
      {upper.slice(0, 2)}
    </span>
  );
}
