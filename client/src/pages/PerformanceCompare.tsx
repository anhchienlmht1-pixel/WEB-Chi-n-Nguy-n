import { useEffect, useMemo, useState } from "react";
import { fetchHistory } from "../api/client";
import { useWatchlist } from "../hooks/useWatchlist";
import type { HistoryRange } from "../types";
import SymbolPicker from "../components/SymbolPicker";
import PerformanceLineChart, { type PerfLineSpec } from "../components/PerformanceLineChart";
import { toCumulativeReturns, computePortfolioAverage, type ReturnSeries } from "../utils/portfolio";

const RANGES: { value: HistoryRange; label: string }[] = [
  { value: "1W", label: "1 tuần" },
  { value: "1M", label: "1 tháng" },
  { value: "3M", label: "3 tháng" },
  { value: "6M", label: "6 tháng" },
  { value: "1Y", label: "1 năm" },
  { value: "MAX", label: "Toàn bộ" },
];

const DEFAULT_SYMBOLS = ["VCB", "TCB", "MBB", "ACB"];
const MAX_SYMBOLS = 15;
const PORTFOLIO_KEY = "__portfolio__";
const PALETTE = [
  "#0ea5e9", "#22c55e", "#f97316", "#a78bfa", "#f472b6",
  "#facc15", "#2dd4bf", "#f87171", "#818cf8", "#34d399",
  "#fb923c", "#60a5fa", "#e879f9", "#a3e635", "#f472b6",
];
const PORTFOLIO_COLOR = "#f59e0b";

export default function PerformanceCompare() {
  const { symbols: watchlistSymbols } = useWatchlist();
  const [symbols, setSymbols] = useState<string[]>(
    watchlistSymbols.length > 0 ? watchlistSymbols.slice(0, MAX_SYMBOLS) : DEFAULT_SYMBOLS
  );
  const [range, setRange] = useState<HistoryRange>("3M");
  const [returnSeries, setReturnSeries] = useState<ReturnSeries[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skippedSymbols, setSkippedSymbols] = useState<string[]>([]);
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (symbols.length === 0) {
        setReturnSeries([]);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);

      const results = await Promise.allSettled(
        symbols.map(async (symbol) => {
          const { points } = await fetchHistory(symbol, range);
          if (points.length < 2) throw new Error(`Không đủ dữ liệu cho ${symbol}`);
          return toCumulativeReturns(symbol, points);
        })
      );

      if (cancelled) return;

      const ok: ReturnSeries[] = [];
      const skipped: string[] = [];
      let firstError: string | null = null;
      results.forEach((r, i) => {
        if (r.status === "fulfilled") {
          ok.push(r.value);
        } else {
          skipped.push(symbols[i]);
          if (!firstError) firstError = r.reason instanceof Error ? r.reason.message : String(r.reason);
        }
      });

      setReturnSeries(ok);
      setSkippedSymbols(skipped);
      if (ok.length === 0) {
        setError(firstError ? `Không tải được dữ liệu: ${firstError}` : "Không có dữ liệu.");
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [symbols, range]);

  const portfolioPoints = useMemo(
    () => (returnSeries.length >= 2 ? computePortfolioAverage(returnSeries) : []),
    [returnSeries]
  );

  const chartSeries: PerfLineSpec[] = useMemo(() => {
    const lines: PerfLineSpec[] = returnSeries.map((s, i) => ({
      key: s.symbol,
      label: s.symbol,
      color: PALETTE[symbols.indexOf(s.symbol) % PALETTE.length] ?? PALETTE[i % PALETTE.length],
      data: hiddenKeys.has(s.symbol) ? [] : s.points,
    }));
    if (portfolioPoints.length > 0) {
      lines.push({
        key: PORTFOLIO_KEY,
        label: "Danh mục (bình quân)",
        color: PORTFOLIO_COLOR,
        bold: true,
        data: hiddenKeys.has(PORTFOLIO_KEY) ? [] : portfolioPoints,
      });
    }
    return lines;
  }, [returnSeries, portfolioPoints, hiddenKeys, symbols]);

  function addSymbol(symbol: string) {
    const upper = symbol.toUpperCase();
    setSymbols((prev) => (prev.includes(upper) || prev.length >= MAX_SYMBOLS ? prev : [...prev, upper]));
  }

  function removeSymbol(symbol: string) {
    setSymbols((prev) => prev.filter((s) => s !== symbol));
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      next.delete(symbol);
      return next;
    });
  }

  function toggleVisible(key: string) {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const hasChart = chartSeries.some((s) => s.data.length > 0);

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6">
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">So sánh hiệu suất</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        % lợi nhuận tích luỹ theo thời gian cho từng mã, và bình quân "danh mục" gồm các mã bạn chọn. Bấm vào một mã
        bên dưới để ẩn/hiện đường tương ứng trên biểu đồ.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <SymbolPicker value="" onChange={addSymbol} />
        <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 p-1 text-xs font-medium dark:border-slate-800">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRange(r.value)}
              className={`rounded-md px-3 py-1 transition-colors ${
                range === r.value
                  ? "bg-emerald-500 text-slate-950"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {symbols.map((s) => {
          const color = PALETTE[symbols.indexOf(s) % PALETTE.length];
          const hidden = hiddenKeys.has(s);
          return (
            <span
              key={s}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-opacity ${
                hidden
                  ? "border-slate-200 text-slate-400 opacity-50 dark:border-slate-800 dark:text-slate-500"
                  : "border-transparent bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
              }`}
            >
              <button
                type="button"
                onClick={() => toggleVisible(s)}
                className="flex items-center gap-1.5"
                title={hidden ? `Hiện đường ${s}` : `Ẩn đường ${s}`}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: hidden ? undefined : color }} />
                {s}
              </button>
              <button
                type="button"
                onClick={() => removeSymbol(s)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                aria-label={`Bỏ ${s}`}
              >
                ×
              </button>
            </span>
          );
        })}
        {portfolioPoints.length > 0 && (
          <button
            type="button"
            onClick={() => toggleVisible(PORTFOLIO_KEY)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-opacity ${
              hiddenKeys.has(PORTFOLIO_KEY)
                ? "border-slate-200 text-slate-400 opacity-50 dark:border-slate-800 dark:text-slate-500"
                : "border-transparent bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
            }`}
            title={hiddenKeys.has(PORTFOLIO_KEY) ? "Hiện danh mục" : "Ẩn danh mục"}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: hiddenKeys.has(PORTFOLIO_KEY) ? undefined : PORTFOLIO_COLOR }} />
            Danh mục (bình quân)
          </button>
        )}
        {symbols.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">Thêm mã cổ phiếu để bắt đầu so sánh.</p>
        )}
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
        {loading && (
          <div className="space-y-3 p-4">
            {symbols.map((s) => (
              <div key={s} className="h-6 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        )}

        {!loading && error && <div className="p-4 text-sm text-red-500 dark:text-red-400">{error}</div>}

        {!loading && !error && hasChart && (
          <>
            <div className="p-2">
              <PerformanceLineChart series={chartSeries} />
            </div>
            {skippedSymbols.length > 0 && (
              <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
                Bỏ qua {skippedSymbols.length} mã thiếu dữ liệu: {skippedSymbols.join(", ")}.
              </div>
            )}
          </>
        )}

        {!loading && !error && !hasChart && returnSeries.length > 0 && (
          <div className="p-4 text-sm text-slate-500 dark:text-slate-400">
            Tất cả đường đang bị ẩn — bấm vào một mã bên trên để hiện lại.
          </div>
        )}
      </div>
    </div>
  );
}
