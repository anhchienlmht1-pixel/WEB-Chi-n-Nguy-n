import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchTopTraded } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import type { TopExchange } from "../types";
import { formatPercent, formatPrice, formatVolume, trendClass } from "../utils/format";

type TimePeriod = "day" | "week" | "month";

const EXCHANGE_TABS: { key: TopExchange; label: string }[] = [
  { key: "ALL", label: "Cả 3 sàn" },
  { key: "HOSE", label: "HOSE" },
  { key: "HNX", label: "HNX" },
  { key: "UPCOM", label: "UPCOM" },
];

const TIME_PERIOD_TABS: { key: TimePeriod; label: string }[] = [
  { key: "day", label: "Ngày" },
  { key: "week", label: "Tuần" },
  { key: "month", label: "Tháng" },
];

function formatValue(value?: number): string {
  if (value == null) return "—";
  if (value >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(2)} nghìn tỷ`;
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} tr`;
  return new Intl.NumberFormat("vi-VN").format(Math.round(value));
}

export default function TopTraded() {
  const [exchange, setExchange] = useState<TopExchange>("ALL");
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("day");
  // Real-time polling: cập nhật mỗi 10 giây để có dữ liệu real-time
  const { data, error, loading } = usePolling(() => fetchTopTraded(exchange, timePeriod), [exchange, timePeriod], 10000);
  const navigate = useNavigate();

  return (
    <section className="mb-8">
      <div className="mb-3">
        <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-slate-100">
          🔥 Top 10 giao dịch nhiều nhất
        </h2>
        <div className="flex flex-wrap gap-3">
          {/* Exchange tabs */}
          <div className="flex gap-1 rounded-lg border border-slate-200 p-1 dark:border-slate-800">
            {EXCHANGE_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setExchange(tab.key)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  exchange === tab.key
                    ? "bg-slate-1000 text-slate-950"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {/* Time period tabs */}
          <div className="flex gap-1 rounded-lg border border-slate-200 p-1 dark:border-slate-800">
            {TIME_PERIOD_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setTimePeriod(tab.key)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  timePeriod === tab.key
                    ? "bg-slate-1000 text-slate-950"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && !data && (
        <p className="text-slate-500 dark:text-slate-400">Đang tải...</p>
      )}
      {error && !data && (
        <p className="text-sm text-slate-1000 dark:text-slate-400">Lỗi tải top giao dịch: {error}</p>
      )}
      {data && data.items.length === 0 && (
        <p className="text-slate-500 dark:text-slate-400">Chưa có dữ liệu cho sàn này.</p>
      )}
      {data && data.items.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[380px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wide text-slate-500 dark:border-slate-800">
                <th className="px-2 py-1.5 font-medium">#</th>
                <th className="px-2 py-1.5 font-medium">Mã</th>
                <th className="px-2 py-1.5 text-right font-medium">Giá</th>
                <th className="px-2 py-1.5 text-right font-medium">%</th>
                <th className="px-2 py-1.5 text-right font-medium">KL</th>
                <th className="px-2 py-1.5 text-right font-medium">GT GD</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, i) => (
                <tr
                  key={item.symbol}
                  onClick={() => navigate(`/stock/${item.symbol}`)}
                  className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900/60"
                >
                  <td className="px-2 py-1 text-slate-400 dark:text-slate-500">{i + 1}</td>
                  <td className="px-2 py-1 font-semibold text-slate-900 dark:text-slate-100">{item.symbol}</td>
                  <td className="px-2 py-1 text-right tabular-nums text-slate-900 dark:text-slate-100">
                    {item.price != null ? formatPrice(item.price, "VND") : "—"}
                  </td>
                  <td
                    className={`px-2 py-1 text-right tabular-nums ${
                      item.changePercent != null ? trendClass(item.changePercent) : "text-slate-400"
                    }`}
                  >
                    {item.changePercent != null ? formatPercent(item.changePercent) : "—"}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums text-slate-500 dark:text-slate-400">
                    {item.volume != null ? formatVolume(item.volume) : "—"}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums text-slate-500 dark:text-slate-400">
                    {formatValue(item.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
