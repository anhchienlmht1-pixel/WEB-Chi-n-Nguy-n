import { fetchMarketOverview } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import StockTable from "../components/StockTable";
import TopTraded from "../components/TopTraded";

export default function Dashboard() {
  const { data, error, loading } = usePolling(fetchMarketOverview, [], 30000);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <TopTraded />

      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Tổng quan thị trường
        </h1>
        {data?.provider && (
          <span className="rounded-full border border-slate-300 px-2.5 py-1 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Nguồn dữ liệu: {data.provider}
          </span>
        )}
      </div>

      {loading && !data && (
        <p className="text-slate-500 dark:text-slate-400">Đang tải dữ liệu...</p>
      )}
      {error && !data && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
          <p className="font-medium text-red-600 dark:text-red-400">Lỗi tải dữ liệu</p>
          <p className="mt-1 text-sm text-red-500 dark:text-red-300/90">{error}</p>
          <p className="mt-2 text-xs text-slate-500">
            Kiểm tra cấu hình DATA_PROVIDER trên server (Vercel → Settings → Environment
            Variables), sau đó Redeploy.
          </p>
        </div>
      )}
      {data && data.quotes.length === 0 && (
        <p className="text-slate-500 dark:text-slate-400">Không có mã nào để hiển thị.</p>
      )}
      {data && data.quotes.length > 0 && <StockTable quotes={data.quotes} />}
    </div>
  );
}
