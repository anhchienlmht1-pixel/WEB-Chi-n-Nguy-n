import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchHistory } from "../api/client";
import type { HistoryRange } from "../types";
import SymbolPicker from "../components/SymbolPicker";
import {
  DEFAULT_BACKTEST_PARAMS,
  DEFAULT_LONG_PERIODS,
  DEFAULT_SHORT_PERIODS,
  optimizeSmaCrossover,
  runRsiAtrBacktest,
  type BacktestParams,
  type BacktestResult,
  type SmaOptimizationRow,
} from "../utils/backtest";
import { formatPrice } from "../utils/format";

type Tab = "rsi-atr" | "sma-optimize";

const RANGES: { value: HistoryRange; label: string }[] = [
  { value: "1Y", label: "1 năm" },
  { value: "5Y", label: "5 năm" },
  { value: "MAX", label: "Toàn bộ" },
];

function formatPnl(v: number): string {
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function pnlClass(v: number): string {
  if (v > 0) return "text-emerald-600 dark:text-emerald-400";
  if (v < 0) return "text-red-500 dark:text-red-400";
  return "text-slate-500 dark:text-slate-400";
}

function ParamField({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        min={min}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      />
    </label>
  );
}

function Stat({ label, value, valueClass, wide }: { label: string; value: string; valueClass?: string; wide?: boolean }) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/40 ${wide ? "sm:max-w-xs" : ""}`}>
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`mt-1 font-semibold tabular-nums text-slate-900 dark:text-slate-100 ${valueClass ?? ""}`}>{value}</div>
    </div>
  );
}

function TopBar({
  symbol,
  onSymbol,
  range,
  onRange,
}: {
  symbol: string;
  onSymbol: (s: string) => void;
  range: HistoryRange;
  onRange: (r: HistoryRange) => void;
}) {
  return (
    <>
      <div className="col-span-2">
        <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Mã cổ phiếu</span>
        <SymbolPicker value={symbol} onChange={onSymbol} />
      </div>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Khoảng thời gian</span>
        <select
          value={range}
          onChange={(e) => onRange(e.target.value as HistoryRange)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          {RANGES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

// Client-side backtest tools — run entirely on price history already
// fetched from /api/history, no separate backtest endpoint. Both
// strategies below are ported 1:1 from user-supplied Python references.
export default function Backtest() {
  const [tab, setTab] = useState<Tab>("rsi-atr");
  const [searchParams] = useSearchParams();
  // Linked in from "🧪 Backtest {symbol}" next to the technical chart on
  // Thị trường / stock detail pages — remounting the tab (via `key`) on a
  // new ?symbol= picks it up even when Backtest is already the current
  // route, since useState's initial value alone wouldn't re-run.
  const initialSymbol = searchParams.get("symbol")?.toUpperCase() || "VCB";

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Backtest chiến lược</h1>

      <div className="mt-4 flex w-fit gap-1 rounded-lg border border-slate-200 p-1 text-xs font-medium dark:border-slate-800">
        {(
          [
            ["rsi-atr", "RSI quá bán + ATR SL/TP"],
            ["sma-optimize", "Tối ưu SMA cắt nhau"],
          ] as [Tab, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              tab === value
                ? "bg-emerald-500 text-slate-950"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "rsi-atr" && <RsiAtrTab key={initialSymbol} initialSymbol={initialSymbol} />}
      {tab === "sma-optimize" && <SmaOptimizeTab key={initialSymbol} initialSymbol={initialSymbol} />}

      <p className="mt-6 text-[11px] text-slate-400 dark:text-slate-500">
        Backtest lịch sử, không phải khuyến nghị đầu tư — hiệu suất quá khứ không đảm bảo kết quả tương lai. Không tính
        phí giao dịch, trượt giá hay thuế.
      </p>
    </div>
  );
}

function RsiAtrTab({ initialSymbol }: { initialSymbol: string }) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [range, setRange] = useState<HistoryRange>("5Y");
  const [params, setParams] = useState<BacktestParams>(DEFAULT_BACKTEST_PARAMS);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [barCount, setBarCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const { points } = await fetchHistory(symbol, range);
      setBarCount(points.length);
      setResult(runRsiAtrBacktest(points, params));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được dữ liệu giá.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const sortedTrades = useMemo(
    () => (result ? [...result.trades].sort((a, b) => b.entryDate.localeCompare(a.entryDate)) : []),
    [result]
  );

  // Runs once on mount so arriving via the "🧪 Backtest {symbol}" link next
  // to a technical chart shows a result immediately instead of requiring an
  // extra click.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    run();
  }, []);

  return (
    <>
      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
        Vào lệnh khi RSI vào vùng quá bán, thoát bằng Stop Loss / Take Profit tính theo ATR.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800 sm:grid-cols-4 lg:grid-cols-7">
        <TopBar symbol={symbol} onSymbol={setSymbol} range={range} onRange={setRange} />
        <ParamField label="Chu kỳ RSI" value={params.rsiPeriod} min={2} onChange={(v) => setParams((p) => ({ ...p, rsiPeriod: v }))} />
        <ParamField
          label="Ngưỡng quá bán RSI"
          value={params.rsiThreshold}
          min={1}
          onChange={(v) => setParams((p) => ({ ...p, rsiThreshold: v }))}
        />
        <ParamField label="Chu kỳ ATR" value={params.atrPeriod} min={2} onChange={(v) => setParams((p) => ({ ...p, atrPeriod: v }))} />
        <ParamField
          label="Hệ số Stop Loss (×ATR)"
          value={params.slMultiplier}
          step={0.5}
          min={0.5}
          onChange={(v) => setParams((p) => ({ ...p, slMultiplier: v }))}
        />
        <ParamField
          label="Hệ số Take Profit (×ATR)"
          value={params.tpMultiplier}
          step={0.5}
          min={0.5}
          onChange={(v) => setParams((p) => ({ ...p, tpMultiplier: v }))}
        />
        <div className="col-span-2 flex items-end sm:col-span-4 lg:col-span-7">
          <button
            type="button"
            onClick={run}
            disabled={loading || !symbol.trim()}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Đang chạy..." : "Chạy backtest"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {result && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
            <Stat label="Số phiên dữ liệu" value={String(barCount)} />
            <Stat label="Số lệnh" value={String(result.stats.totalTrades)} />
            <Stat label="Tỷ lệ thắng" value={`${result.stats.winRate.toFixed(1)}%`} />
            <Stat label="Lãi TB / lệnh thắng" value={formatPnl(result.stats.avgWin)} valueClass={pnlClass(result.stats.avgWin)} />
            <Stat label="Lỗ TB / lệnh thua" value={formatPnl(result.stats.avgLoss)} valueClass={pnlClass(result.stats.avgLoss)} />
          </div>
          <div className="mt-3">
            <Stat label="Tổng PnL (tổng % từng lệnh, không kép lãi)" value={formatPnl(result.stats.totalPnl)} valueClass={pnlClass(result.stats.totalPnl)} wide />
          </div>

          {result.trades.length === 0 && (
            <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
              Không có lệnh nào khớp điều kiện chiến lược trong khoảng thời gian này.
            </p>
          )}

          {result.trades.length > 0 && (
            <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
                    <th className="px-4 py-2.5 font-medium">Ngày vào</th>
                    <th className="px-4 py-2.5 text-right font-medium">Giá vào</th>
                    <th className="px-4 py-2.5 font-medium">Ngày ra</th>
                    <th className="px-4 py-2.5 text-right font-medium">Giá ra</th>
                    <th className="px-4 py-2.5 font-medium">Lý do</th>
                    <th className="px-4 py-2.5 text-right font-medium">PnL</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTrades.map((t, i) => (
                    <tr
                      key={`${t.entryDate}-${i}`}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900/60"
                    >
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{t.entryDate.slice(0, 10)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-900 dark:text-slate-100">
                        {formatPrice(t.entryPrice, "VND")}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{t.exitDate.slice(0, 10)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-900 dark:text-slate-100">
                        {formatPrice(t.exitPrice, "VND")}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            t.exitReason === "TP"
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                              : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                          }`}
                        >
                          {t.exitReason === "TP" ? "Take Profit" : "Stop Loss"}
                        </span>
                      </td>
                      <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${pnlClass(t.pnlPercent)}`}>
                        {formatPnl(t.pnlPercent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}

function SmaOptimizeTab({ initialSymbol }: { initialSymbol: string }) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [range, setRange] = useState<HistoryRange>("5Y");
  const [rows, setRows] = useState<SmaOptimizationRow[] | null>(null);
  const [barCount, setBarCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const { points } = await fetchHistory(symbol, range);
      setBarCount(points.length);
      setRows(optimizeSmaCrossover(points, DEFAULT_SHORT_PERIODS, DEFAULT_LONG_PERIODS));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được dữ liệu giá.");
      setRows(null);
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    run();
  }, []);

  return (
    <>
      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
        Grid search mọi cặp SMA ngắn ({DEFAULT_SHORT_PERIODS.join("/")}) và dài ({DEFAULT_LONG_PERIODS.join("/")}) — vào
        lệnh khi SMA ngắn cắt lên trên SMA dài, thoát khi cắt xuống — xếp hạng theo tổng lợi nhuận chiến lược.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800 sm:grid-cols-4">
        <TopBar symbol={symbol} onSymbol={setSymbol} range={range} onRange={setRange} />
        <div className="col-span-2 flex items-end sm:col-span-2">
          <button
            type="button"
            onClick={run}
            disabled={loading || !symbol.trim()}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Đang tính..." : "Chạy tối ưu hoá"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {rows && (
        <>
          <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">{barCount} phiên dữ liệu · {rows.length} cặp SMA</p>

          {rows.length === 0 && (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Không đủ dữ liệu để tính SMA dài nhất.</p>
          )}

          {rows.length > 0 && (
            <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
                    <th className="px-4 py-2.5 font-medium">#</th>
                    <th className="px-4 py-2.5 text-right font-medium">SMA ngắn</th>
                    <th className="px-4 py-2.5 text-right font-medium">SMA dài</th>
                    <th className="px-4 py-2.5 text-right font-medium">Số lần cắt</th>
                    <th className="px-4 py-2.5 text-right font-medium">Tổng lợi nhuận</th>
                    <th className="px-4 py-2.5 text-right font-medium">LN / lần cắt</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr
                      key={`${r.short}-${r.long}`}
                      className={`border-b border-slate-100 last:border-0 dark:border-slate-900 ${
                        i === 0 ? "bg-emerald-50/60 dark:bg-emerald-500/5" : ""
                      }`}
                    >
                      <td className="px-4 py-2.5 text-slate-400 dark:text-slate-500">{i + 1}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-900 dark:text-slate-100">{r.short}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-900 dark:text-slate-100">{r.long}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-500 dark:text-slate-400">{r.crossovers}</td>
                      <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${pnlClass(r.totalReturnPercent)}`}>
                        {formatPnl(r.totalReturnPercent)}
                      </td>
                      <td className={`px-4 py-2.5 text-right tabular-nums ${pnlClass(r.returnPerTradePercent)}`}>
                        {formatPnl(r.returnPerTradePercent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
