import { useEffect, useState } from "react";
import { fetchVnindexPb, type VnindexPbData } from "../api/client";

export default function VnindexPbCard() {
  const [data, setData] = useState<VnindexPbData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchVnindexPb();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="h-32 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="text-center">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">⏳ Không tải được P/B VN-Index</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  const pbStatus = () => {
    if (data.pbRatio === null) return "N/A";
    if (data.pbRatio < 0.8) return "🟢 Rẻ";
    if (data.pbRatio < 1.0) return "🟡 Hợp lý";
    if (data.pbRatio < 1.5) return "🟠 Bình thường";
    return "🔴 Đắt";
  };

  const topUndervalued = data.memberPbs
    .filter((m) => m.pb !== null && m.pb > 0)
    .sort((a, b) => (a.pb || 999) - (b.pb || 999))
    .slice(0, 5);

  const topOvervalued = data.memberPbs
    .filter((m) => m.pb !== null && m.pb > 0)
    .sort((a, b) => (b.pb || 0) - (a.pb || 0))
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Main Card */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
        <div className="border-b border-slate-200 bg-gradient-to-r from-blue-50/70 to-transparent p-4 dark:border-slate-800 dark:from-blue-950/20">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-blue-600 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
              VN-Index P/B
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Định giá chỉ số {data.vn30Members} cổ phiếu VN30
            </span>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {/* P/B Ratio */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                P/B Ratio
              </div>
              <div className="mt-2 text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {data.pbRatio !== null ? data.pbRatio.toFixed(2) : "—"}
              </div>
              <div className="mt-1 text-sm">{pbStatus()}</div>
            </div>

            {/* Market Cap */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                Vốn hóa
              </div>
              <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {(data.totalMarketCap / 1_000_000).toFixed(1)}T
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">tỷ VND</div>
            </div>

            {/* Book Value */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                Giá trị sổ sách
              </div>
              <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {(data.totalBookValue / 1_000_000).toFixed(1)}T
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">tỷ VND</div>
            </div>

            {/* Members */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                Cổ phiếu
              </div>
              <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {data.memberPbs.filter((m) => m.pb).length}/{data.vn30Members}
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">có dữ liệu</div>
            </div>
          </div>

          <div className="mt-6 rounded-lg border-l-4 border-blue-500 bg-blue-50/50 px-3 py-2 text-xs leading-relaxed text-slate-600 dark:bg-blue-950/10 dark:text-slate-400">
            <span className="font-semibold text-slate-800 dark:text-slate-200">P/B {data.pbRatio?.toFixed(2)}</span>{" "}
            {data.pbRatio && data.pbRatio < 1.0
              ? "← Chỉ số đang undervalued, giá dưới giá trị sổ sách"
              : data.pbRatio && data.pbRatio > 1.5
                ? "← Chỉ số đang overvalued, giá cao hơn giá trị sổ sách"
                : "← Định giá hợp lý so với giá trị tài sản"}
          </div>
        </div>
      </div>

      {/* Top Undervalued & Overvalued */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Undervalued */}
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
          <div className="border-b border-slate-200 bg-gradient-to-r from-green-50/70 to-transparent p-3 dark:border-slate-800 dark:from-green-950/20">
            <div className="text-xs font-bold uppercase tracking-wide text-green-700 dark:text-green-400">
              🟢 Rẻ nhất (P/B thấp)
            </div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {topUndervalued.map((stock) => (
              <div key={stock.symbol} className="flex items-center justify-between p-3">
                <span className="font-semibold text-slate-900 dark:text-slate-100">{stock.symbol}</span>
                <span className="text-sm font-semibold tabular-nums text-green-600 dark:text-green-400">
                  {stock.pb?.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Overvalued */}
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
          <div className="border-b border-slate-200 bg-gradient-to-r from-red-50/70 to-transparent p-3 dark:border-slate-800 dark:from-red-950/20">
            <div className="text-xs font-bold uppercase tracking-wide text-red-700 dark:text-red-400">
              🔴 Đắt nhất (P/B cao)
            </div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {topOvervalued.map((stock) => (
              <div key={stock.symbol} className="flex items-center justify-between p-3">
                <span className="font-semibold text-slate-900 dark:text-slate-100">{stock.symbol}</span>
                <span className="text-sm font-semibold tabular-nums text-red-600 dark:text-red-400">
                  {stock.pb?.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
