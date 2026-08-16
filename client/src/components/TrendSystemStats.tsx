import { useMemo } from "react";
import type { TradingSignal } from "../utils/signals";

interface Props {
  signals: TradingSignal[];
  symbol: string;
}

export default function TrendSystemStats({ signals, symbol }: Props) {
  // Don't show stats for VNINDEX or if no signals
  if (symbol === "VNINDEX" || signals.length === 0) {
    return null;
  }

  const stats = useMemo(() => {
    // Find all "Bán hết" (sell all) signals which mark the end of a trade
    const sellSignals = signals.filter((s) => s.type === "sell" && s.note?.includes("Bán hết"));

    if (sellSignals.length === 0) {
      return null;
    }

    // Extract P&L from the note: "Bán hết 2/3 (+12.4%)" -> 12.4
    const pnlValues = sellSignals
      .map((signal) => {
        const match = signal.note?.match(/([+-]?\d+\.?\d*)\%/);
        if (match) {
          return parseFloat(match[1]);
        }
        return null;
      })
      .filter((v) => v !== null) as number[];

    if (pnlValues.length === 0) {
      return null;
    }

    const wins = pnlValues.filter((v) => v > 0).length;
    const losses = pnlValues.filter((v) => v < 0).length;
    const breakeven = pnlValues.filter((v) => v === 0).length;
    const totalTrades = pnlValues.length;
    const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : "0";
    const avgPnl = (pnlValues.reduce((a, b) => a + b, 0) / totalTrades).toFixed(2);

    return {
      totalTrades,
      wins,
      losses,
      breakeven,
      winRate,
      avgPnl,
      pnlValues,
    };
  }, [signals]);

  if (!stats) {
    return null;
  }

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/30">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
        Thống kê hệ thống Trend Following
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Tổng giao dịch</div>
          <div className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-slate-100">
            {stats.totalTrades}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Thắng</div>
          <div className="mt-0.5 text-lg font-semibold text-emerald-600 dark:text-emerald-400">
            {stats.wins}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Thua</div>
          <div className="mt-0.5 text-lg font-semibold text-red-500 dark:text-red-400">
            {stats.losses}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Hòa</div>
          <div className="mt-0.5 text-lg font-semibold text-slate-500 dark:text-slate-400">
            {stats.breakeven}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Tỷ lệ thắng</div>
          <div className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-slate-100">
            {stats.winRate}%
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400">P&L trung bình</div>
          <div
            className={`mt-0.5 text-lg font-semibold ${
              parseFloat(stats.avgPnl) > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : parseFloat(stats.avgPnl) < 0
                  ? "text-red-500 dark:text-red-400"
                  : "text-slate-900 dark:text-slate-100"
            }`}
          >
            {stats.avgPnl}%
          </div>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
        ⓘ Thống kê dựa trên các giao dịch hoàn thành theo tín hiệu Trend Following (SMA20 &gt; SMA50, ADX(14) &gt; 25,
        Supertrend(10,3)). Chỉ mang tính chất minh họa, không phải lời khuyên đầu tư.
      </p>
    </div>
  );
}
