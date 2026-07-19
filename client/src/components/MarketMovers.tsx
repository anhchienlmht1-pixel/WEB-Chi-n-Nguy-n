import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Quote } from "../types";
import { formatPercent, formatPrice, formatVolume, trendClass } from "../utils/format";

type MoverTab = "gainers" | "losers" | "foreign";

const TABS: { key: MoverTab; label: string; icon: string }[] = [
  { key: "gainers", label: "Tăng mạnh", icon: "📈" },
  { key: "losers", label: "Giảm mạnh", icon: "📉" },
  { key: "foreign", label: "Khối ngoại mua ròng", icon: "🌐" },
];

function foreignNet(q: Quote): number | null {
  if (q.foreignBuyVolume == null || q.foreignSellVolume == null) return null;
  return q.foreignBuyVolume - q.foreignSellVolume;
}

// formatVolume() only handles non-negative volumes (no K/M suffixing below
// zero), so a net-sell figure needs its sign split off before formatting.
function formatNet(net: number): string {
  const sign = net > 0 ? "+" : net < 0 ? "−" : "";
  return `${sign}${formatVolume(Math.abs(net))}`;
}

// Reuses whatever market-overview quotes the caller already fetched — top
// gainers/losers are just a client-side sort of data already on the page, no
// extra request. Khối ngoại mua ròng (foreign net buy) needs KBS's FB/FS
// fields specifically (kbsMarketProvider maps them; providers that don't
// expose foreign flow leave every quote's net at null, so that tab is empty
// rather than showing wrong data).
export default function MarketMovers({ quotes }: { quotes: Quote[] }) {
  const [tab, setTab] = useState<MoverTab>("gainers");
  const navigate = useNavigate();

  const rows = useMemo(() => {
    const eligible = quotes.filter((q) => q.exchange !== "Chỉ số" && q.exchange !== "Phái sinh");
    if (tab === "gainers") {
      return [...eligible].sort((a, b) => b.changePercent - a.changePercent).slice(0, 10);
    }
    if (tab === "losers") {
      return [...eligible].sort((a, b) => a.changePercent - b.changePercent).slice(0, 10);
    }
    return [...eligible]
      .filter((q) => foreignNet(q) != null)
      .sort((a, b) => (foreignNet(b) ?? 0) - (foreignNet(a) ?? 0))
      .slice(0, 10);
  }, [quotes, tab]);

  return (
    <section className="mb-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Diễn biến thị trường</h2>
        <div className="flex gap-1 rounded-lg border border-slate-200 p-1 dark:border-slate-800">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                tab === t.key
                  ? "bg-emerald-500 text-slate-950"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 && (
        <p className="text-slate-500 dark:text-slate-400">
          {tab === "foreign"
            ? "Nguồn dữ liệu hiện tại chưa cung cấp giao dịch khối ngoại."
            : "Chưa có dữ liệu."}
        </p>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
                <th className="px-4 py-2.5 font-medium">#</th>
                <th className="px-4 py-2.5 font-medium">Mã</th>
                <th className="px-4 py-2.5 text-right font-medium">Giá</th>
                <th className="px-4 py-2.5 text-right font-medium">%</th>
                {tab === "foreign" ? (
                  <th className="px-4 py-2.5 text-right font-medium">KL mua ròng</th>
                ) : (
                  <th className="px-4 py-2.5 text-right font-medium">KL</th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((q, i) => (
                <tr
                  key={q.symbol}
                  onClick={() => navigate(`/stock/${q.symbol}`)}
                  className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900/60"
                >
                  <td className="px-4 py-2.5 text-slate-400 dark:text-slate-500">{i + 1}</td>
                  <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">
                    {q.symbol}
                    <span className="ml-2 hidden text-xs font-normal text-slate-400 sm:inline dark:text-slate-500">
                      {q.name}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-900 dark:text-slate-100">
                    {formatPrice(q.price, q.currency)}
                  </td>
                  <td className={`px-4 py-2.5 text-right tabular-nums ${trendClass(q.changePercent)}`}>
                    {formatPercent(q.changePercent)}
                  </td>
                  {tab === "foreign" ? (
                    <td className={`px-4 py-2.5 text-right tabular-nums ${trendClass(foreignNet(q) ?? 0)}`}>
                      {formatNet(foreignNet(q) ?? 0)}
                    </td>
                  ) : (
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-500 dark:text-slate-400">
                      {formatVolume(q.volume)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
