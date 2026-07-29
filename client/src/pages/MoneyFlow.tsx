import { Link } from "react-router-dom";
import { fetchMoneyFlow } from "../api/client";
import { usePolling } from "../hooks/usePolling";

export default function MoneyFlow() {
  // Matches the server's own 5 min cache TTL (server/src/routes/stocks.ts's
  // /money-flow) — no point polling faster than the sheet can change.
  const { data, error, loading } = usePolling(fetchMoneyFlow, [], 5 * 60 * 1000);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Sức mạnh dòng tiền</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Xếp hạng theo nhóm ngành, điểm cao nhất đứng đầu — dữ liệu từ Google Sheet.
          </p>
        </div>
        {data?.updatedAt && (
          <span className="rounded-full border border-slate-300 px-2.5 py-1 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Cập nhật: {data.updatedAt}
          </span>
        )}
      </div>

      {loading && !data && <p className="text-slate-500 dark:text-slate-400">Đang tải dữ liệu...</p>}

      {error && !data && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
          <p className="font-medium text-red-600 dark:text-red-400">Lỗi tải dữ liệu</p>
          <p className="mt-1 text-sm text-red-500 dark:text-red-300/90">{error}</p>
        </div>
      )}

      {data && data.items.length === 0 && (
        <p className="text-slate-500 dark:text-slate-400">Chưa có dữ liệu.</p>
      )}

      {data && data.items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.sectors.map((sector) => {
            const items = data.items
              .filter((r) => r.sector === sector)
              .sort((a, b) => a.rank - b.rank);
            const maxScore = Math.max(...items.map((r) => r.score), 1);

            return (
              <div
                key={sector}
                className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-slate-100">
                  {sector}
                </h2>
                <div className="space-y-2">
                  {items.map((r) => (
                    <Link
                      key={r.symbol}
                      to={`/stock/${r.symbol}`}
                      className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <span className="w-4 shrink-0 text-right text-xs text-slate-400 dark:text-slate-500">
                        {r.rank}
                      </span>
                      <span className="w-12 shrink-0 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {r.symbol}
                      </span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <span
                          className="block h-full rounded-full bg-emerald-500"
                          style={{ width: `${(r.score / maxScore) * 100}%` }}
                        />
                      </span>
                      <span className="w-10 shrink-0 text-right text-sm tabular-nums text-slate-600 dark:text-slate-300">
                        {r.score}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
