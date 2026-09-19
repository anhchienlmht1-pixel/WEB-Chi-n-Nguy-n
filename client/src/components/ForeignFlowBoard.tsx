import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Quote } from "../types";
import { formatPrice, formatPercent, formatVolume, trendClass } from "../utils/format";

type FilterTab = "all" | "buy" | "sell";

interface FlowRow {
  quote: Quote;
  netVolume: number;
  netValue: number;
}

function formatNetVolume(net: number): string {
  const sign = net > 0 ? "+" : net < 0 ? "−" : "";
  return `${sign}${formatVolume(Math.abs(net))}`;
}

// KBS's price board only carries foreign buy/sell VOLUME (shares), not a
// separate value field — value here is volume × current price, an estimate
// (each foreign trade may have matched at a different price during the
// session), not the exchange's own reported turnover value. Same caveat as
// ForeignFlowPanel (per-symbol detail view) — this is the market-wide table.
function formatNetValue(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  const abs = Math.abs(value);
  const billions = abs / 1_000_000_000;
  const text =
    billions >= 1
      ? `${billions.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tỷ`
      : `${(abs / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 0 })} triệu`;
  return `${sign}${text}`;
}

// Reuses whatever market-overview quotes the caller already fetched (same
// 10s poll as the rest of the Dashboard) — no separate fetch/cache needed,
// this is purely a client-side view over KBS's FB/FS fields already on
// each quote. Only today's session snapshot is available (KBS doesn't
// expose historical daily foreign-flow, same limitation as
// ForeignFlowPanel), so "mỗi ngày" here means the current trading day.
export default function ForeignFlowBoard({ quotes }: { quotes: Quote[] }) {
  const [tab, setTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const rows = useMemo<FlowRow[]>(() => {
    return quotes
      .filter((q) => q.exchange !== "Chỉ số" && q.exchange !== "Phái sinh")
      .filter((q) => q.foreignBuyVolume != null && q.foreignSellVolume != null)
      .map((q) => {
        const netVolume = (q.foreignBuyVolume ?? 0) - (q.foreignSellVolume ?? 0);
        return { quote: q, netVolume, netValue: netVolume * q.price };
      });
  }, [quotes]);

  const summary = useMemo(() => {
    const buyValue = rows.reduce((sum, r) => sum + Math.max(r.netValue, 0), 0);
    const sellValue = rows.reduce((sum, r) => sum + Math.min(r.netValue, 0), 0);
    const buyCount = rows.filter((r) => r.netVolume > 0).length;
    const sellCount = rows.filter((r) => r.netVolume < 0).length;
    return { netValue: buyValue + sellValue, buyValue, sellValue, buyCount, sellCount };
  }, [rows]);

  const filtered = useMemo(() => {
    let list = rows;
    if (tab === "buy") list = list.filter((r) => r.netVolume > 0);
    if (tab === "sell") list = list.filter((r) => r.netVolume < 0);
    if (search.trim()) {
      const q = search.trim().toUpperCase();
      list = list.filter((r) => r.quote.symbol.includes(q));
    }
    return [...list].sort((a, b) => Math.abs(b.netValue) - Math.abs(a.netValue));
  }, [rows, tab, search]);

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900/40">
        <p className="text-sm text-slate-500 dark:text-slate-400">Nguồn dữ liệu hiện tại chưa cung cấp giao dịch khối ngoại.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Mua-Bán ròng</div>
          <div className={`mt-1 text-xl font-bold tabular-nums ${trendClass(summary.netValue)}`}>{formatNetValue(summary.netValue)}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">GT mua</div>
          <div className="mt-1 text-xl font-bold tabular-nums text-green-600 dark:text-green-400">{formatNetValue(summary.buyValue)}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">GT bán</div>
          <div className="mt-1 text-xl font-bold tabular-nums text-red-600 dark:text-red-400">{formatNetValue(summary.sellValue)}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Số mã mua/bán ròng</div>
          <div className="mt-1 text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            <span className="text-green-600 dark:text-green-400">{summary.buyCount}</span>
            {" / "}
            <span className="text-red-600 dark:text-red-400">{summary.sellCount}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg border border-slate-200 p-1 dark:border-slate-800">
          {([
            { key: "all", label: "Tất cả" },
            { key: "buy", label: "🟢 Mua ròng" },
            { key: "sell", label: "🔴 Bán ròng" },
          ] as { key: FilterTab; label: string }[]).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                tab === t.key
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm mã cổ phiếu..."
          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
        />
        <span className="text-xs text-slate-400 dark:text-slate-500">{filtered.length} mã</span>
      </div>

      {/* Table */}
      <div className="max-h-[480px] overflow-y-auto overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full min-w-[560px] border-collapse text-xs">
          <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/90">
            <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <th className="px-3 py-2 font-medium">Mã</th>
              <th className="px-3 py-2 text-right font-medium">Giá</th>
              <th className="px-3 py-2 text-right font-medium">%</th>
              <th className="px-3 py-2 text-right font-medium">KL mua</th>
              <th className="px-3 py-2 text-right font-medium">KL bán</th>
              <th className="px-3 py-2 text-right font-medium">KL ròng</th>
              <th className="px-3 py-2 text-right font-medium">GT ròng</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr
                key={r.quote.symbol}
                onClick={() => navigate(`/stock/${r.quote.symbol}`)}
                className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900/60"
              >
                <td className="px-3 py-1.5 font-semibold text-slate-900 dark:text-slate-100">{r.quote.symbol}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-slate-900 dark:text-slate-100">
                  {formatPrice(r.quote.price, r.quote.currency)}
                </td>
                <td className={`px-3 py-1.5 text-right tabular-nums ${trendClass(r.quote.changePercent)}`}>
                  {formatPercent(r.quote.changePercent)}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums text-green-600 dark:text-green-400">
                  {formatVolume(r.quote.foreignBuyVolume ?? 0)}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums text-red-600 dark:text-red-400">
                  {formatVolume(r.quote.foreignSellVolume ?? 0)}
                </td>
                <td className={`px-3 py-1.5 text-right tabular-nums font-semibold ${trendClass(r.netVolume)}`}>
                  {formatNetVolume(r.netVolume)}
                </td>
                <td className={`px-3 py-1.5 text-right tabular-nums font-semibold ${trendClass(r.netValue)}`}>
                  {formatNetValue(r.netValue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-slate-400 dark:text-slate-500">
        Dữ liệu khối ngoại là khối lượng khớp lệnh trong phiên hiện tại (nguồn KBS), GT ròng = KL ròng × giá hiện tại
        (giá trị ước tính). Chưa có nguồn dữ liệu lịch sử giao dịch khối ngoại theo nhiều ngày.
      </p>
    </div>
  );
}
