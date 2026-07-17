import { useEffect, useState } from "react";
import { fetchHistory } from "../api/client";
import { useWatchlist } from "../hooks/useWatchlist";
import type { HistoryRange } from "../types";
import SymbolPicker from "../components/SymbolPicker";
import PerformanceBarChart from "../components/PerformanceBarChart";

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

export interface PerformanceItem {
  symbol: string;
  returnPercent: number;
}

export default function PerformanceCompare() {
  const { symbols: watchlistSymbols } = useWatchlist();
  const [symbols, setSymbols] = useState<string[]>(
    watchlistSymbols.length > 0 ? watchlistSymbols.slice(0, MAX_SYMBOLS) : DEFAULT_SYMBOLS
  );
  const [range, setRange] = useState<HistoryRange>("1M");
  const [items, setItems] = useState<PerformanceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skippedSymbols, setSkippedSymbols] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (symbols.length === 0) {
        setItems([]);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);

      const results = await Promise.allSettled(
        symbols.map(async (symbol) => {
          const { points } = await fetchHistory(symbol, range);
          if (points.length < 2) throw new Error(`Không đủ dữ liệu cho ${symbol}`);
          const first = points[0].close;
          const last = points[points.length - 1].close;
          return { symbol, returnPercent: ((last - first) / first) * 100 };
        })
      );

      if (cancelled) return;

      const ok: PerformanceItem[] = [];
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

      ok.sort((a, b) => b.returnPercent - a.returnPercent);
      setItems(ok);
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

  function addSymbol(symbol: string) {
    const upper = symbol.toUpperCase();
    setSymbols((prev) => (prev.includes(upper) || prev.length >= MAX_SYMBOLS ? prev : [...prev, upper]));
  }

  function removeSymbol(symbol: string) {
    setSymbols((prev) => prev.filter((s) => s !== symbol));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">So sánh hiệu suất</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        % thay đổi giá đóng cửa từ đầu đến cuối khoảng thời gian đã chọn, cho từng mã.
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
        {symbols.map((s) => (
          <span
            key={s}
            className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {s}
            <button
              type="button"
              onClick={() => removeSymbol(s)}
              className="text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              aria-label={`Bỏ ${s}`}
            >
              ×
            </button>
          </span>
        ))}
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

        {!loading && !error && items.length > 0 && (
          <>
            <div className="p-4">
              <PerformanceBarChart items={items} />
            </div>
            {skippedSymbols.length > 0 && (
              <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
                Bỏ qua {skippedSymbols.length} mã thiếu dữ liệu: {skippedSymbols.join(", ")}.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
