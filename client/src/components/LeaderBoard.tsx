import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePolling } from "../hooks/usePolling";
import { fetchStockStrength, fetchMarketBoard } from "../api/client";
import { STRENGTH_BANDS, bandFor } from "../utils/stockStrength";
import { formatPercent, formatPrice, formatVolume, trendClass } from "../utils/format";
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
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/40">
        <div>
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Leader Board</h2>
            <span className="text-sm text-slate-500 dark:text-slate-400">sức mạnh cổ phiếu theo ngành</span>
          </div>
          <LegendChips activeBand={activeBand} onToggle={(l) => setActiveBand((cur) => (cur === l ? null : l))} />
        </div>
        {data && (
          <div className="text-right text-xs text-slate-400 dark:text-slate-500">
            <div>
              {data.asOfDate && <>Cập nhật: {data.asOfDate} · </>}
              {totalCount} mã
            </div>
            <div>Bấm vào mã để xem chi tiết</div>
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
        <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3">
          {visibleSectors.map((s) => {
            const rows = s.stocks.map((st) => ({ ...st, quote: quoteBySymbol.get(st.symbol) }));
            const changes = rows
              .map((r) => r.quote?.changePercent)
              .filter((v): v is number => v != null);
            const avgChange = changes.length > 0 ? changes.reduce((a, b) => a + b, 0) / changes.length : null;

            return (
              <div key={s.sector} className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-2.5 py-1.5 dark:border-slate-800 dark:bg-slate-800/60">
                  <span className="truncate text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                    {s.sector}
                  </span>
                  {avgChange != null && (
                    <span className={`shrink-0 text-xs font-semibold tabular-nums ${trendClass(avgChange)}`}>
                      {formatPercent(avgChange)}
                    </span>
                  )}
                </div>
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="text-slate-400 dark:text-slate-500">
                      <th className="px-2 py-1 text-left font-medium">Mã</th>
                      <th className="px-1.5 py-1 text-right font-medium">SM</th>
                      <th className="px-1.5 py-1 text-right font-medium">Giá</th>
                      <th className="px-1.5 py-1 text-right font-medium">+/-</th>
                      <th className="px-2 py-1 text-right font-medium">KL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const band = bandFor(r.score);
                      return (
                        <tr
                          key={r.symbol}
                          onClick={() => navigate(`/stock/${r.symbol}`)}
                          title={`${r.symbol} — ${band.label} (${r.score})`}
                          className={`cursor-pointer border-t border-black/5 transition-opacity last:border-0 hover:opacity-80 dark:border-white/5 ${band.className}`}
                        >
                          <td className="px-2 py-1 font-semibold">{r.symbol}</td>
                          <td className="px-1.5 py-1 text-right tabular-nums">{r.score}</td>
                          <td className="px-1.5 py-1 text-right tabular-nums">
                            {r.quote ? formatPrice(r.quote.price, r.quote.currency) : "—"}
                          </td>
                          <td className="px-1.5 py-1 text-right tabular-nums">
                            {r.quote ? formatPercent(r.quote.changePercent) : "—"}
                          </td>
                          <td className="px-2 py-1 text-right tabular-nums">
                            {r.quote ? formatVolume(r.quote.volume) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
