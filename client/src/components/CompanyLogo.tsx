import { useState } from "react";
import { useCompanyLogoMap } from "../utils/companyLogos";

// Tinted-background + matching-darker-text initials badge — same family as
// Notion/Linear tags. Shown while the logo map hasn't loaded yet, when a
// symbol has no logo in it, and as the fallback if the image itself fails
// to load.
const HUES = [212, 250, 280, 320, 350, 18, 40, 160, 185, 145];

function hueFor(symbol: string): number {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  return HUES[Math.abs(hash) % HUES.length];
}

function InitialsBadge({ symbol, size }: { symbol: string; size: number }) {
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

export default function CompanyLogo({ symbol, size = 26 }: { symbol: string; size?: number }) {
  const upper = symbol.toUpperCase();
  const logoMap = useCompanyLogoMap();
  const logoUrl = logoMap?.[upper]?.logoUrl ?? null;
  const [imgFailed, setImgFailed] = useState(false);

  if (!logoUrl || imgFailed) return <InitialsBadge symbol={upper} size={size} />;

  return (
    <img
      src={logoUrl}
      alt={`Logo ${upper}`}
      width={size}
      height={size}
      className="shrink-0 rounded-md bg-white object-contain"
      style={{ width: size, height: size }}
      onError={() => setImgFailed(true)}
    />
  );
}
