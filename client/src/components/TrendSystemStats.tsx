import { useMemo } from "react";
import type { TradingSignal } from "../utils/signals";

interface Props {
  signals: TradingSignal[];
  symbol: string;
}

function formatDay(seconds: number): string {
  return new Date(seconds * 1000).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

// Tile: label over a big number.
function Tile({ label, value, tone }: { label: string; value: string | number; tone?: "up" | "down" }) {
  const color = tone === "up" ? "text-gain" : tone === "down" ? "text-[#c0392b]" : "text-slate-900";
  return (
    <div className="flex-[1_1_9rem] border-l border-slate-200 px-4 py-3 first:border-l-0">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-0.5 text-2xl font-bold leading-tight tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

// Trend Following results for the symbol on the chart: completed trades only
// ("Đóng deal" sells), straight from the same signal list the chart's markers
// are drawn from.
export default function TrendSystemStats({ signals, symbol }: Props) {
  const stats = useMemo(() => {
    // All "Đóng deal" signals — always a full close of the position (whatever
    // tranches were still open), which mark the end of a trade.
    const closes = signals.filter((s) => s.type === "sell" && s.note?.includes("Đóng deal"));
    // P&L sits in the note: "Đóng deal 2/3 (+12.4%)" -> 12.4
    const trades = closes
      .map((s) => {
        const match = s.note?.match(/([+-]?\d+\.?\d*)%/);
        return match ? { pnl: parseFloat(match[1]), time: s.time } : null;
      })
      .filter((t): t is { pnl: number; time: number } => t !== null);
    if (trades.length === 0) return null;

    const pnl = trades.map((t) => t.pnl);
    const wins = pnl.filter((v) => v > 0).length;
    const losses = pnl.filter((v) => v < 0).length;
    // Period: first buy signal to the last closed trade.
    const firstBuy = signals.find((s) => s.type === "buy")?.time ?? trades[0].time;
    const lastClose = Math.max(...trades.map((t) => t.time));
    return {
      total: pnl.length,
      wins,
      losses,
      breakeven: pnl.filter((v) => v === 0).length,
      winRate: (wins / pnl.length) * 100,
      avgPnl: pnl.reduce((a, b) => a + b, 0) / pnl.length,
      from: formatDay(firstBuy),
      to: formatDay(lastClose),
    };
  }, [signals]);

  // VNINDEX never carries signals; nothing to show without a closed trade.
  if (symbol === "VNINDEX" || !stats) return null;

  const pct = (n: number, digits: number) =>
    `${n < 0 ? "−" : ""}${Math.abs(n).toLocaleString("vi-VN", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;

  return (
    <section aria-label={`Thống kê hệ thống ${symbol}`}>
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h3 className="text-xl font-bold leading-snug text-brand-700">Kết quả các lệnh đã đóng · {symbol}</h3>
        <p className="text-sm text-slate-500">
          Giai đoạn: {stats.from} – {stats.to}
        </p>
      </div>
      <div className="flex flex-wrap rounded-md border border-slate-200">
        <Tile label="Tổng giao dịch" value={stats.total} />
        <Tile label="Thắng" value={stats.wins} tone="up" />
        <Tile label="Thua" value={stats.losses} tone="down" />
        <Tile label="Hòa" value={stats.breakeven} />
        <Tile label="Tỷ lệ thắng" value={pct(stats.winRate, 1)} tone="up" />
        <Tile
          label="P&L trung bình"
          value={pct(stats.avgPnl, 2)}
          tone={stats.avgPnl > 0 ? "up" : stats.avgPnl < 0 ? "down" : undefined}
        />
      </div>
      <p className="mt-3 text-sm leading-normal text-slate-500">
        Dựa trên các giao dịch đã đóng theo tín hiệu Trend Following (SMA20 &gt; SMA50, ADX(14) &gt; 25, Supertrend(10,3)).
        P&L trung bình là trung bình đơn giản trên các lệnh đã đóng. Chỉ mang tính chất minh họa, không phải lời khuyên đầu
        tư.
      </p>
    </section>
  );
}
