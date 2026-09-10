import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMarketNews, fetchTopTraded } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import type { TopExchange } from "../types";
import { formatPercent, formatPrice, formatVolume, trendClass } from "../utils/format";

type NewsTab = "tin-tuc" | "thanh-khoan-dot-biet";

const TABS: { key: NewsTab; label: string; icon: string }[] = [
  { key: "tin-tuc", label: "Tin tức", icon: "📰" },
  { key: "thanh-khoan-dot-biet", label: "Thanh khoản đột biến", icon: "💹" },
];

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("vi-VN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function MarketNews() {
  const [tab, setTab] = useState<NewsTab>("tin-tuc");
  const [exchange, setExchange] = useState<TopExchange>("ALL");

  // Fetch news from cafe.f
  const { data: newsData, loading: newsLoading, error: newsError } = usePolling(
    () => fetchMarketNews(30),
    [],
    5 * 60 * 1000 // 5 minutes
  );

  // Fetch top traded for unusual volume
  const { data: tradedData, loading: tradedLoading, error: tradedError } = usePolling(
    () => fetchTopTraded(exchange),
    [exchange],
    60000 // 1 minute
  );

  const navigate = useNavigate();

  // Extract symbols from top traded stocks (most volume = unusual activity)
  const topVolumes = useMemo(
    () => (tradedData?.items ?? []).slice(0, 10),
    [tradedData]
  );

  // Extract symbols mentioned in news for context
  const newsItems = useMemo(() => newsData?.items ?? [], [newsData]);

  const loading = tab === "tin-tuc" ? newsLoading : tradedLoading;
  const error = tab === "tin-tuc" ? newsError : tradedError;

  return (
    <section className="mb-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Cập nhật thị trường</h2>
        <div className="flex gap-1 rounded-lg border border-slate-200 p-1 dark:border-slate-800">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                tab === t.key
                  ? "bg-slate-1000 text-slate-950"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* News Tab */}
      {tab === "tin-tuc" && (
        <>
          {loading && !newsItems.length && (
            <p className="text-slate-500 dark:text-slate-400">Đang tải...</p>
          )}
          {error && !newsItems.length && (
            <p className="text-sm text-slate-1000 dark:text-slate-400">Lỗi tải tin tức: {error}</p>
          )}
          {newsItems.length === 0 && !loading && (
            <p className="text-slate-500 dark:text-slate-400">Chưa có tin tức mới.</p>
          )}
          {newsItems.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full min-w-[500px] border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wide text-slate-500 dark:border-slate-800">
                    <th className="px-3 py-2 font-medium">Tiêu đề</th>
                    <th className="px-3 py-2 font-medium">Nguồn</th>
                    <th className="px-3 py-2 font-medium">Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  {newsItems.map((item, i) => (
                    <tr
                      key={`${item.source}-${i}`}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900/60"
                    >
                      <td className="px-3 py-2">
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="line-clamp-2 text-slate-900 hover:text-slate-600 dark:text-slate-100 dark:hover:text-slate-300"
                        >
                          {item.title}
                        </a>
                        {item.description && (
                          <p className="mt-0.5 line-clamp-1 text-slate-400 dark:text-slate-500">
                            {item.description}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-500 dark:text-slate-400">
                        {item.source}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-400 dark:text-slate-500">
                        {formatDate(item.pubDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Unusual Volume Tab */}
      {tab === "thanh-khoan-dot-biet" && (
        <>
          <div className="mb-3 flex gap-1 rounded-lg border border-slate-200 p-1 dark:border-slate-800">
            {(["ALL", "HOSE", "HNX", "UPCOM"] as const).map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setExchange(ex)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  exchange === ex
                    ? "bg-slate-1000 text-slate-950"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                }`}
              >
                {ex}
              </button>
            ))}
          </div>

          {tradedLoading && !topVolumes.length && (
            <p className="text-slate-500 dark:text-slate-400">Đang tải...</p>
          )}
          {tradedError && !topVolumes.length && (
            <p className="text-sm text-slate-1000 dark:text-slate-400">
              Lỗi tải mã giao dịch nhiều: {tradedError}
            </p>
          )}
          {topVolumes.length === 0 && !tradedLoading && (
            <p className="text-slate-500 dark:text-slate-400">Chưa có dữ liệu cho sàn này.</p>
          )}
          {topVolumes.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full min-w-[400px] border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wide text-slate-500 dark:border-slate-800">
                    <th className="px-2 py-1.5 font-medium">#</th>
                    <th className="px-2 py-1.5 font-medium">Mã</th>
                    <th className="px-2 py-1.5 font-medium">Tên</th>
                    <th className="px-2 py-1.5 text-right font-medium">Giá</th>
                    <th className="px-2 py-1.5 text-right font-medium">%</th>
                    <th className="px-2 py-1.5 text-right font-medium">Thanh khoản</th>
                  </tr>
                </thead>
                <tbody>
                  {topVolumes.map((item, i) => (
                    <tr
                      key={item.symbol}
                      onClick={() => navigate(`/stock/${item.symbol}`)}
                      className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900/60"
                    >
                      <td className="px-2 py-1 text-slate-400 dark:text-slate-500">{i + 1}</td>
                      <td className="px-2 py-1 font-semibold text-slate-900 dark:text-slate-100">
                        {item.symbol}
                      </td>
                      <td className="px-2 py-1 truncate text-slate-600 dark:text-slate-300">
                        {item.name ?? "—"}
                      </td>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
