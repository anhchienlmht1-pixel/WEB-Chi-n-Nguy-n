import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePolling } from "../hooks/usePolling";
import { fetchStockStrength, fetchMarketBoard } from "../api/client";
import { STRENGTH_BANDS, bandFor } from "../utils/stockStrength";
import { formatPercent } from "../utils/format";
import type { Quote } from "../types";

const POLL_MS = 5 * 60 * 1000; // server caches the underlying sheet read for 5 min

function bandRangeLabel(min: number | null, max: number | null): string {
  if (min === null) return `<${max}`;
  if (max === null) return `>${min}`;
  return `${min}-${max}`;
}

function LegendChips({
  activeBand,
  onToggle,
}: {
  activeBand: string | null;
  onToggle: (label: string) => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
      <span className="mr-1 font-medium text-slate-500 dark:text-slate-400">Thang điểm:</span>
      {STRENGTH_BANDS.map((b) => (
        <button
          key={b.label}
          type="button"
          onClick={() => onToggle(b.label)}
          className={`rounded px-2 py-1 font-semibold transition-shadow ${b.className} ${
            activeBand === b.label ? "ring-2 ring-offset-1 ring-slate-400 dark:ring-slate-500" : ""
          }`}
        >
          {bandRangeLabel(b.min, b.max)} {b.label}
        </button>
      ))}
    </div>
  );
}

// Mirrors the user's own "Sức mạnh cổ phiếu" Google Sheet: one small,
// compact card per sector (Mã/SM/Giá/+−/KL, rows shaded by the same
// strength bands as the legend). Score comes straight from the sheet;
// price/change/volume are joined in from the full exchange board so every
// sector's symbols (not just the curated ~70-mã watchlist) get a quote.
export default function LeaderBoard() {
  const { data, error, loading } = usePolling(() => fetchStockStrength(), [], POLL_MS);
  const { data: boardData } = usePolling(() => fetchMarketBoard("ALL"), [], POLL_MS);
  const [activeBand, setActiveBand] = useState<string | null>(null);
  const navigate = useNavigate();

  const quoteBySymbol = useMemo(() => {
    const map = new Map<string, Quote>();
    if (boardData) for (const q of boardData.quotes) map.set(q.symbol, q);
    return map;
  }, [boardData]);

  const totalCount = useMemo(
    () => (data ? data.sectors.reduce((sum, s) => sum + s.stocks.length, 0) : 0),
    [data]
  );

  const visibleSectors = useMemo(() => {
    if (!data) return [];
    const base = data.sectors.filter((s) => s.sector.trim() !== "" && s.stocks.length > 0);
    if (!activeBand) return base;
    return base
      .map((s) => ({ ...s, stocks: s.stocks.filter((st) => bandFor(st.score).label === activeBand) }))
      .filter((s) => s.stocks.length > 0);
  }, [data, activeBand]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
        <div>
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">🏆 Leader Board</h2>
            <span className="text-sm text-slate-600 dark:text-slate-400">sức mạnh cổ phiếu theo ngành</span>
          </div>
          <LegendChips activeBand={activeBand} onToggle={(l) => setActiveBand((cur) => (cur === l ? null : l))} />
        </div>
        {data && (
          <div className="text-right text-xs text-slate-500 dark:text-slate-400">
            <div>
              {data.asOfDate && <>Cập nhật: {data.asOfDate} · </>}
              {totalCount} mã
            </div>
            <div className="mt-1 font-medium">Bấm vào mã để xem chi tiết</div>
          </div>
        )}
      </div>

      {loading && !data && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-6 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      )}

      {!loading && (error || !data) && (
        <div className="rounded-lg border border-slate-300 bg-slate-100 p-4 text-sm text-slate-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-slate-400">
          Không tải được dữ liệu sức mạnh cổ phiếu{error ? `: ${error}` : ""}.
        </div>
      )}

      {data && data.sectors.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">Không đọc được nhóm ngành nào từ trang tính.</p>
      )}

      {data && data.sectors.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
          {visibleSectors.map((s) => {
            const rows = s.stocks.map((st) => ({ ...st, quote: quoteBySymbol.get(st.symbol) }));
            return (
              <div key={s.sector} className="min-w-0">
                <div className="mb-1.5 border-b-2 border-slate-300 pb-1 dark:border-slate-600">
                  <span className="block truncate text-[11px] font-bold uppercase tracking-wide text-slate-800 dark:text-slate-100">
                    {s.sector}
                  </span>
                </div>
                <ul className="space-y-1">
                  {rows.map((r) => {
                    const band = bandFor(r.score);
                    const changePct = r.quote?.changePercent;
                    return (
                      <li
                        key={r.symbol}
                        onClick={() => navigate(`/stock/${r.symbol}`)}
                        title={`${r.symbol} — ${band.label} (${r.score})${
                          changePct != null ? ` · ${formatPercent(changePct)} hôm nay` : ""
                        }`}
                        className="flex cursor-pointer items-center gap-1 text-[11px] transition-opacity hover:opacity-70"
                      >
                        <span className="min-w-0 flex-1 truncate font-semibold text-slate-700 dark:text-slate-200">
                          {r.symbol}
                        </span>
                        <span
                          className={`w-[42px] shrink-0 rounded-sm px-1.5 py-0.5 text-right font-semibold tabular-nums ${band.className}`}
                        >
                          {r.score}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {data && data.sectors.length > 0 && (
        <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
          Dữ liệu tổng hợp từ Google Sheets của người quản lý trang — chỉ mang tính tham khảo, không phải khuyến nghị
          đầu tư.
        </p>
      )}
    </div>
  );
}
