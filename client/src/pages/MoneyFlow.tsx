import { Link } from "react-router-dom";
import type { MoneyFlowRecord } from "../types";
import { fetchMoneyFlow } from "../api/client";
import { usePolling } from "../hooks/usePolling";

// Score bands + colors copied straight from the sheet's own "Chú Thích"
// legend box (bottom of the source spreadsheet) — same thresholds, same
// color family (blue → plain → light green → dark green → purple).
const BANDS: { min: number; max: number | null; label: string; swatch: string }[] = [
  { min: -Infinity, max: 400, label: "Yếu", swatch: "bg-sky-200 dark:bg-sky-500/30" },
  {
    min: 400,
    max: 500,
    label: "Trung bình",
    swatch: "bg-white border border-slate-300 dark:bg-slate-900 dark:border-slate-700",
  },
  { min: 500, max: 550, label: "Khá", swatch: "bg-emerald-200 dark:bg-emerald-500/30" },
  { min: 550, max: 600, label: "Khỏe", swatch: "bg-emerald-500 dark:bg-emerald-600" },
  { min: 600, max: null, label: "Rất khỏe", swatch: "bg-purple-300 dark:bg-purple-500/40" },
];

function bandFor(score: number) {
  return BANDS.find((b) => score >= b.min && (b.max === null || score < b.max)) ?? BANDS[1];
}

function cellClass(score: number): string {
  const band = bandFor(score);
  if (band.label === "Yếu") return "bg-sky-200 text-sky-900 dark:bg-sky-500/25 dark:text-sky-100";
  if (band.label === "Khá") return "bg-emerald-200 text-emerald-900 dark:bg-emerald-500/30 dark:text-emerald-100";
  if (band.label === "Khỏe") return "bg-emerald-500 text-slate-950 dark:bg-emerald-600 dark:text-slate-950";
  if (band.label === "Rất khỏe") return "bg-purple-300 text-purple-950 dark:bg-purple-500/40 dark:text-purple-100";
  return "text-slate-700 dark:text-slate-300";
}

function Legend() {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
        Chú thích
      </span>
      {BANDS.map((b) => (
        <span key={b.label} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
          <span className={`h-3.5 w-3.5 shrink-0 rounded-sm ${b.swatch}`} />
          <span className="tabular-nums text-slate-400 dark:text-slate-500">
            {b.max === null ? `>${b.min}` : b.min === -Infinity ? `<${b.max}` : `${b.min}–${b.max}`}
          </span>
          <span className="font-medium">{b.label}</span>
        </span>
      ))}
    </div>
  );
}

function SectorColumn({ sector, items }: { sector: string; items: MoneyFlowRecord[] }) {
  return (
    <div className="w-[130px] shrink-0 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
      <div className="border-b border-slate-200 bg-slate-100 px-2 py-2 text-center text-xs font-bold uppercase tracking-wide text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200">
        {sector}
      </div>
      <div>
        {items.map((r) => (
          <Link
            key={r.symbol}
            to={`/stock/${r.symbol}`}
            title={`${r.symbol} — ${bandFor(r.score).label} (${r.score})`}
            className={`flex items-center justify-between border-b border-slate-100 px-2 py-1 text-xs transition-opacity last:border-0 hover:opacity-80 dark:border-slate-900/60 ${cellClass(
              r.score
            )}`}
          >
            <span className="font-semibold">{r.symbol}</span>
            <span className="tabular-nums">{r.score}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function MoneyFlow() {
  // Matches the server's own 5 min cache TTL (server/src/routes/stocks.ts's
  // /money-flow) — no point polling faster than the sheet can change.
  const { data, error, loading } = usePolling(fetchMoneyFlow, [], 5 * 60 * 1000);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Sức mạnh dòng tiền</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Xếp hạng theo nhóm ngành, điểm cao nhất đứng đầu — dữ liệu từ Google Sheet.
          </p>
        </div>
        {data?.updatedAt && (
          <span className="rounded-full border border-slate-300 px-2.5 py-1 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Cập nhật: {data.updatedAt}
          </span>
        )}
      </div>

      {loading && !data && <p className="text-slate-500 dark:text-slate-400">Đang tải dữ liệu...</p>}

      {error && !data && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
          <p className="font-medium text-red-600 dark:text-red-400">Lỗi tải dữ liệu</p>
          <p className="mt-1 text-sm text-red-500 dark:text-red-300/90">{error}</p>
        </div>
      )}

      {data && data.items.length === 0 && (
        <p className="text-slate-500 dark:text-slate-400">Chưa có dữ liệu.</p>
      )}

      {data && data.items.length > 0 && (
        <>
          <Legend />
          <div className="flex items-start gap-3 overflow-x-auto pb-2">
            {data.sectors.map((sector) => {
              const items = data.items.filter((r) => r.sector === sector).sort((a, b) => a.rank - b.rank);
              return <SectorColumn key={sector} sector={sector} items={items} />;
            })}
          </div>
        </>
      )}
    </div>
  );
}
