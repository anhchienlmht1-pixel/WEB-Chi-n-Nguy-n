import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { usePolling } from "../hooks/usePolling";
import { fetchStockStrength } from "../api/client";
import { STRENGTH_BANDS, bandFor } from "../utils/stockStrength";

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

// Mirrors the user's own "Sức mạnh cổ phiếu" Google Sheet: one column per
// sector, each row a symbol + its strength score, colored by the same
// bands as the sheet's own legend. The score itself isn't computed here —
// it's read straight from the sheet, whatever the owner has there. Bands
// double as click-to-filter chips (click again to clear).
export default function StockStrength() {
  const { data, error, loading } = usePolling(() => fetchStockStrength(), [], POLL_MS);
  const [activeBand, setActiveBand] = useState<string | null>(null);

  const totalCount = useMemo(
    () => (data ? data.sectors.reduce((sum, s) => sum + s.stocks.length, 0) : 0),
    [data]
  );

  const visibleSectors = useMemo(() => {
    if (!data) return [];
    if (!activeBand) return data.sectors;
    return data.sectors
      .map((s) => ({ ...s, stocks: s.stocks.filter((st) => bandFor(st.score).label === activeBand) }))
      .filter((s) => s.stocks.length > 0);
  }, [data, activeBand]);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/40">
        <div>
          <div className="flex flex-wrap items-baseline gap-2">
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Leader Board</h1>
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

      <div className="mt-3">
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
          <div className="flex flex-wrap gap-2">
            {visibleSectors.map((s) => (
              <div
                key={s.sector}
                className="w-28 shrink-0 overflow-hidden rounded-md border border-slate-200 dark:border-slate-800"
              >
                <div className="border-b border-slate-200 bg-slate-100 px-1.5 py-1 text-center text-[10px] font-bold uppercase leading-tight tracking-wide text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200">
                  {s.sector}
                </div>
                <div>
                  {s.stocks.map((st) => {
                    const band = bandFor(st.score);
                    return (
                      <Link
                        key={st.symbol}
                        to={`/stock/${st.symbol}`}
                        title={`${st.symbol} — ${band.label} (${st.score})`}
                        className={`flex items-center justify-between gap-1 border-b border-slate-100 px-1.5 py-1 text-xs transition-opacity last:border-0 hover:opacity-80 dark:border-slate-900/60 ${band.className}`}
                      >
                        <span className="font-semibold">{st.symbol}</span>
                        <span className="tabular-nums">{st.score}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {data && data.sectors.length > 0 && (
        <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
          Dữ liệu tổng hợp từ Google Sheets của người quản lý trang — chỉ mang tính tham khảo, không phải khuyến nghị
          đầu tư.
        </p>
      )}
    </div>
  );
}
