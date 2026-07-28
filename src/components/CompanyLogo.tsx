// No real logo artwork is available offline (this environment's network
// policy blocks fetching from external logo CDNs), so this renders a small
// deterministic initials badge instead — same hue-per-symbol idea as an
// avatar, not a stand-in for a real brand asset.
const HUES = [212, 250, 280, 320, 350, 18, 40, 160, 185, 145];

function hueFor(symbol: string): number {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  return HUES[Math.abs(hash) % HUES.length];
}

export function CompanyLogo({ symbol, size = 32 }: { symbol: string; size?: number }) {
  const hue = hueFor(symbol);
  return (
    <span
      className="inline-flex shrink-0 select-none items-center justify-center rounded-lg font-bold"
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
