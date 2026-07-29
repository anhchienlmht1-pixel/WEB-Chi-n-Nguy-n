import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { MoneyFlowRecord, Quote } from "../types";
import { formatChange, formatPercent, formatPrice, formatVolume, trendClass } from "../utils/format";
import type { KeyRatios } from "../utils/ratios";
import WatchButton from "./WatchButton";

type SortKey = "symbol" | "price" | "changePercent" | "volume" | "pe" | "pb" | "roe" | "roa";
type SortDir = "asc" | "desc";

function ratioValue(ratios: KeyRatios | undefined, key: "pe" | "pb" | "roe" | "roa"): number | null {
  return ratios?.[key]?.value ?? null;
}

function formatRatio(v: number | null): string {
  return v == null ? "—" : v.toLocaleString("vi-VN", { maximumFractionDigits: 1 });
}

// `ratios` is optional and keyed by symbol — Dashboard's market overview
// passes none (fetching P/E/ROE/ROA for hundreds of symbols at once isn't
// worth the request fan-out), so those columns just don't render there.
// Watchlist already fetches ratios per symbol anyway, so it gets a genuine
// sortable P/E · ROE · ROA valuation comparison for free.
//
// `moneyFlow` is likewise optional and keyed by symbol — one column showing
// whichever column the sheet's own header called "sức mạnh dòng tiền" (see
// server/src/providers/moneyFlowSheet.ts), title-tooltip on hover for the
// rest of that row's columns from the sheet.
export default function StockTable({
  quotes,
  ratios,
  moneyFlow,
}: {
  quotes: Quote[];
  ratios?: Record<string, KeyRatios>;
  moneyFlow?: Record<string, MoneyFlowRecord>;
}) {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>("symbol");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const hasRatios = Boolean(ratios);
  const hasMoneyFlow = Boolean(moneyFlow);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "symbol" ? "asc" : "desc");
    }
  }

  const sorted = useMemo(() => {
    const list = [...quotes];
    list.sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      switch (sortKey) {
        case "symbol":
          av = a.symbol;
          bv = b.symbol;
          break;
        case "price":
          av = a.price;
          bv = b.price;
          break;
        case "changePercent":
          av = a.changePercent;
          bv = b.changePercent;
          break;
        case "volume":
          av = a.volume;
          bv = b.volume;
          break;
        default:
          av = ratioValue(ratios?.[a.symbol], sortKey) ?? -Infinity;
          bv = ratioValue(ratios?.[b.symbol], sortKey) ?? -Infinity;
      }
      if (typeof av === "string" || typeof bv === "string") {
        const cmp = String(av).localeCompare(String(bv));
        return sortDir === "asc" ? cmp : -cmp;
      }
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return list;
  }, [quotes, ratios, sortKey, sortDir]);

  function SortHeader({ label, sortKeyValue, align = "right" }: { label: string; sortKeyValue: SortKey; align?: "left" | "right" }) {
    return (
      <th className={`px-4 py-3 font-medium ${align === "right" ? "text-right" : "text-left"}`}>
        <button
          type="button"
          onClick={() => toggleSort(sortKeyValue)}
          className={`inline-flex items-center gap-1 transition-colors ${
            sortKey === sortKeyValue
              ? "text-emerald-600 dark:text-emerald-400"
              : "hover:text-slate-900 dark:hover:text-slate-100"
          }`}
        >
          {label}
          {sortKey === sortKeyValue && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
        </button>
      </th>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
            <SortHeader label="Mã" sortKeyValue="symbol" align="left" />
            <th className="px-4 py-3 font-medium">Tên</th>
            <SortHeader label="Giá" sortKeyValue="price" />
            <th className="px-4 py-3 text-right font-medium">Thay đổi</th>
            <SortHeader label="%" sortKeyValue="changePercent" />
            <SortHeader label="KL" sortKeyValue="volume" />
            {hasRatios && <SortHeader label="P/E" sortKeyValue="pe" />}
            {hasRatios && <SortHeader label="P/B" sortKeyValue="pb" />}
            {hasRatios && <SortHeader label="ROE" sortKeyValue="roe" />}
            {hasRatios && <SortHeader label="ROA" sortKeyValue="roa" />}
            {hasMoneyFlow && <th className="px-4 py-3 text-right font-medium">Dòng tiền</th>}
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((q) => {
            const r = ratios?.[q.symbol];
            const mf = moneyFlow?.[q.symbol];
            const otherMetrics = mf
              ? Object.entries(mf.metrics).filter(([label]) => label !== mf.primaryLabel)
              : [];
            return (
              <tr
                key={q.symbol}
                onClick={() => navigate(`/stock/${q.symbol}`)}
                className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900/60"
              >
                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                  {q.symbol}
                </td>
                <td className="max-w-[240px] truncate px-4 py-3 text-slate-500 dark:text-slate-400">
                  {q.name}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-900 dark:text-slate-100">
                  {formatPrice(q.price, q.currency)}
                </td>
                <td className={`px-4 py-3 text-right tabular-nums ${trendClass(q.change)}`}>
                  {formatChange(q.change, q.currency)}
                </td>
                <td className={`px-4 py-3 text-right tabular-nums ${trendClass(q.changePercent)}`}>
                  {formatPercent(q.changePercent)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-500 dark:text-slate-400">
                  {formatVolume(q.volume)}
                </td>
                {hasRatios && (
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                    {formatRatio(ratioValue(r, "pe"))}
                  </td>
                )}
                {hasRatios && (
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                    {formatRatio(ratioValue(r, "pb"))}
                  </td>
                )}
                {hasRatios && (
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                    {formatRatio(ratioValue(r, "roe"))}
                    {r?.roe && <span className="ml-0.5 text-[10px] text-slate-400">%</span>}
                  </td>
                )}
                {hasRatios && (
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                    {formatRatio(ratioValue(r, "roa"))}
                    {r?.roa && <span className="ml-0.5 text-[10px] text-slate-400">%</span>}
                  </td>
                )}
                {hasMoneyFlow && (
                  <td
                    className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-300"
                    title={
                      otherMetrics.length > 0
                        ? otherMetrics.map(([label, value]) => `${label}: ${value}`).join("\n")
                        : undefined
                    }
                  >
                    {mf?.primaryValue ?? "—"}
                  </td>
                )}
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <WatchButton symbol={q.symbol} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
