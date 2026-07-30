import { Link } from "react-router-dom";
import { usePolling } from "../hooks/usePolling";
import { fetchStockStrength } from "../api/client";
import { STRENGTH_BANDS, bandFor } from "../utils/stockStrength";

const POLL_MS = 5 * 60 * 1000; // server caches the underlying sheet read for 5 min

// Mirrors the user's own "Sức mạnh cổ phiếu" Google Sheet: one column per
// sector, each row a symbol + its strength score, colored by the same
// bands as the sheet's own legend. The score itself isn't computed here —
// it's read straight from the sheet, whatever the owner has there.
// Columns wrap onto extra rows instead of needing horizontal scroll, so
// every sector stays visible on one page regardless of screen width.
export default function StockStrength() {
  const { data, error, loading } = usePolling(() => fetchStockStrength(), [], POLL_MS);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-4">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Sức mạnh cổ phiếu theo ngành</h1>
        {data?.asOfDate && (
          <span className="text-xs text-slate-400 dark:text-slate-500">Cập nhật: {data.asOfDate}</span>
        )}
      </div>
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
        Đồng bộ trực tiếp từ Google Sheets của người quản lý trang — không phải chỉ số tự tính từ hệ thống.
      </p>

      {loading && !data && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-6 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      )}

      {!loading && (error || !data) && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400">
          Không tải được dữ liệu sức mạnh cổ phiếu{error ? `: ${error}` : ""}.
        </div>
      )}

      {data && data.sectors.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">Không đọc được nhóm ngành nào từ trang tính.</p>
      )}

      {data && data.sectors.length > 0 && (
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex flex-wrap gap-2">
            {data.sectors.map((s) => (
              <div
                key={s.sector}
                className="w-28 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40"
              >
                <div className="border-b border-slate-200 bg-slate-50 px-1.5 py-1 text-center text-[10px] font-bold uppercase leading-tight tracking-wide text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                  {s.sector}
                </div>
                <div>
                  {s.stocks.map((st) => {
                    const band = bandFor(st.score);
                    return (
                      <Link
                        key={st.symbol}
                        to={`/stock/${st.symbol}`}
                        className="flex items-center justify-between gap-1 border-b border-slate-100 px-1.5 py-1 text-xs last:border-0 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900/60"
                      >
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{st.symbol}</span>
                        <span className={`rounded px-1 py-0.5 text-[10px] font-semibold tabular-nums ${band.className}`}>
                          {st.score}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="w-40 shrink-0 overflow-hidden rounded-md border border-slate-200 dark:border-slate-800">
            <div className="border-b border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              Chú thích SM
            </div>
            {STRENGTH_BANDS.map((b) => (
              <div
                key={b.label}
                className="flex items-center justify-between gap-2 border-b border-slate-100 px-2 py-1 text-[10px] last:border-0 dark:border-slate-900"
              >
                <span className={`rounded px-1 py-0.5 font-semibold ${b.className}`}>
                  {b.min === null && `< ${b.max}`}
                  {b.min !== null && b.max !== null && `${b.min}–${b.max}`}
                  {b.max === null && `> ${b.min}`}
                </span>
                <span className="text-slate-600 dark:text-slate-400">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
