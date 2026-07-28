import { useState } from "react";
import { COMPANY_PROFILES } from "../data/companyProfiles";

// Tinted-background + matching-darker-text initials badge — same family as
// Notion/Linear tags. Used both as the default (symbols with no known
// domain) and as the fallback when a real logo image fails to load.
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
  const domain = COMPANY_PROFILES[upper]?.website;
  const [imgFailed, setImgFailed] = useState(false);

  // This sandbox's own network policy blocks logo.clearbit.com (like most
  // external hosts), so the image request itself could never be verified
  // from here — but it's a real browser <img> request made from the end
  // user's browser at runtime, same as this app's TradingView widgets, not
  // something fetched/checked by the server. If the domain has no logo
  // there (or the request fails for any reason), onError falls back to the
  // initials badge below rather than showing a broken image.
  if (!domain || imgFailed) return <InitialsBadge symbol={upper} size={size} />;

  return (
    <img
      src={`https://logo.clearbit.com/${domain}?size=${size * 2}`}
      alt={`Logo ${upper}`}
      width={size}
      height={size}
      className="shrink-0 rounded-md object-contain"
      style={{ width: size, height: size }}
      onError={() => setImgFailed(true)}
    />
  );
}
