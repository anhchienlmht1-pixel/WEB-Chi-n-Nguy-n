import { usePolling } from "../hooks/usePolling";
import { fetchHistory, fetchQuote } from "../api/client";

// Three index cards for the top of the Giới thiệu hero (VN-Index, VN100, VN30):
// the session's 15-minute line against the reference price (green above, red
// below), the level, the change, the matched value (or volume) and — when the
// server reads SSI FastConnect — the number of stocks up / unchanged / down.

const UP = "#3fd07a";
const DOWN = "#ff5c5c";
const FLAT = "#e0b24a";
const POLL_MS = 60 * 1000;

// VN100 only comes from SSI FastConnect; without it the card falls back to HNX-Index.
const INDICES: { symbol: string; label: string; fallback?: { symbol: string; label: string } }[] = [
  { symbol: "VNINDEX", label: "VN-Index" },
  { symbol: "VN100", label: "VN100", fallback: { symbol: "HNXINDEX", label: "HNX-Index" } },
  { symbol: "VN30", label: "VN30" },
];

const num = (n: number, d = 2) => n.toLocaleString("vi-VN", { minimumFractionDigits: d, maximumFractionDigits: d });
function vol(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n >= 1e9) return `${num(n / 1e9, 2)} tỷ CP`;
  if (n >= 1e6) return `${num(n / 1e6, 0)} tr CP`;
  return `${num(n, 0)} CP`;
}

function Intraday({ symbol, refPrice }: { symbol: string; refPrice: number }) {
  const { data } = usePolling(() => fetchHistory(symbol, "1D"), [symbol], POLL_MS);
  const all = data?.points ?? [];
  // The 1D range returns the last few sessions of 15-minute bars: keep the latest day.
  const lastDay = all.length ? all[all.length - 1].time.slice(0, 10) : "";
  const pts = all.filter((p) => p.time.slice(0, 10) === lastDay && Number.isFinite(p.close)).map((p) => p.close);
  const W = 200;
  const H = 54;
  if (pts.length < 2 || !(refPrice > 0)) return <div className="h-[54px]" aria-hidden="true" />;
  const mn = Math.min(refPrice, ...pts);
  const mx = Math.max(refPrice, ...pts);
  const span = mx - mn || 1;
  const x = (i: number) => (i / (pts.length - 1)) * W;
  const y = (v: number) => 2 + (1 - (v - mn) / span) * (H - 4);
  const line = pts.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const yr = y(refPrice);
  const id = `ix-${symbol}`;
  const area = `M0,${yr.toFixed(1)} L${line.replace(/ /g, " L")} L${W},${yr.toFixed(1)} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-[54px] w-full" aria-hidden="true">
      <defs>
        <clipPath id={`${id}-up`}>
          <rect x="0" y="0" width={W} height={yr} />
        </clipPath>
        <clipPath id={`${id}-dn`}>
          <rect x="0" y={yr} width={W} height={H - yr} />
        </clipPath>
      </defs>
      <path d={area} fill={UP} opacity="0.22" clipPath={`url(#${id}-up)`} />
      <path d={area} fill={DOWN} opacity="0.22" clipPath={`url(#${id}-dn)`} />
      <polyline points={line} fill="none" stroke={UP} strokeWidth="1.4" clipPath={`url(#${id}-up)`} vectorEffect="non-scaling-stroke" />
      <polyline points={line} fill="none" stroke={DOWN} strokeWidth="1.4" clipPath={`url(#${id}-dn)`} vectorEffect="non-scaling-stroke" />
      <line x1="0" x2={W} y1={yr} y2={yr} stroke={FLAT} strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function IndexCard({
  symbol,
  label,
  fallback,
}: {
  symbol: string;
  label: string;
  fallback?: { symbol: string; label: string };
}) {
  const { data: q, error } = usePolling(() => fetchQuote(symbol), [symbol], POLL_MS);
  if (error && !q && fallback) return <IndexCard {...fallback} />;
  const ch = q?.change ?? 0;
  const color = ch > 0 ? UP : ch < 0 ? DOWN : FLAT;
  const arrow = ch > 0 ? "▲" : ch < 0 ? "▼" : "■";
  return (
    <div className="min-w-[11.5rem] shrink-0 snap-start rounded-lg border sm:min-w-0 sm:shrink border-[rgba(213,223,204,0.14)] bg-[rgba(14,21,15,0.85)] px-3 pt-2.5 pb-2.5">
      <Intraday symbol={symbol} refPrice={q?.prevClose ?? 0} />
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <b className="text-[0.95rem] text-[#fff]">{label}</b>
        {q ? (
          <b className="text-[0.95rem] tabular-nums" style={{ color }}>
            {num(q.price)}
          </b>
        ) : (
          <span className="h-4 w-16 animate-pulse rounded bg-[rgba(255,255,255,0.06)]" />
        )}
      </div>
      <div className="mt-0.5 flex items-baseline justify-between gap-2 text-xs">
        <span className="truncate text-[#8fa882]">
          {q ? (q.value ? `${num(q.value / 1e9, 0)} tỷ` : vol(q.volume)) : ""}
        </span>
        {q && (
          <span className="shrink-0 tabular-nums" style={{ color }}>
            {arrow} {num(Math.abs(ch))} ({ch < 0 ? "−" : ch > 0 ? "+" : ""}
            {num(Math.abs(q.changePercent))}%)
          </span>
        )}
      </div>
      {q && q.advances != null && q.declines != null && (
        <div className="mt-1 flex justify-end gap-2.5 text-xs tabular-nums">
          <span style={{ color: UP }}>▲{q.advances}</span>
          <span style={{ color: FLAT }}>■{q.noChanges ?? 0}</span>
          <span style={{ color: DOWN }}>▼{q.declines}</span>
        </div>
      )}
    </div>
  );
}

export default function MarketIndexCards() {
  return (
    <section
      aria-label="Chỉ số thị trường"
      className="-mx-1 flex max-w-[600px] snap-x gap-2.5 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0"
    >
      {INDICES.map((i) => (
        <IndexCard key={i.symbol} {...i} />
      ))}
    </section>
  );
}
