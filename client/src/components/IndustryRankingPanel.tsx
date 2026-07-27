import { Link } from "react-router-dom";
import { usePolling } from "../hooks/usePolling";
import { fetchIndustryRanking } from "../api/client";

function formatRoe(v: number | null): string {
  return v == null ? "—" : `${v.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
}

// Ranks the current symbol against its ICB-industry peers by latest annual
// ROE — a simple, single-metric ranking (not a reconstruction of
// FiinTrade's proprietary Value/Growth/Momentum scoring). Peer coverage is
// limited to this app's stock universe, so the panel always says "trong N
// mã cùng ngành có dữ liệu" rather than claiming a full-market rank.
export default function IndustryRankingPanel({ symbol }: { symbol: string }) {
  const { data: ranking, error, loading } = usePolling(() => fetchIndustryRanking(symbol), [symbol], 0);

  if (loading && !ranking) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
        <h4 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Xếp hạng theo ngành</h4>
        <div className="h-16 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      </div>
    );
  }

  if (error && !ranking) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-red-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-red-400">
        Không tải được xếp hạng ngành: {error}
      </div>
    );
  }

  // No industry classification for this symbol, or too few in-universe
  // peers to rank against — panel simply doesn't render rather than showing
  // an empty/misleading box.
  if (!ranking) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
      <div className="border-b border-slate-200 p-4 dark:border-slate-800">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Xếp hạng ROE — ngành {ranking.industry}
        </h4>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          {ranking.rank
            ? `Hạng ${ranking.rank}/${ranking.rankedCount} theo ROE gần nhất, trong số các mã cùng ngành có dữ liệu.`
            : `Chưa có số liệu ROE cho ${ranking.symbol} để xếp hạng.`}
        </p>
      </div>

      <div className="max-h-72 overflow-y-auto">
        {ranking.peers.map((p, i) => (
          <Link
            key={p.symbol}
            to={`/stock/${p.symbol}`}
            className={`flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2 text-sm last:border-0 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900/60 ${
              p.symbol === ranking.symbol ? "bg-emerald-50 dark:bg-emerald-500/10" : ""
            }`}
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="w-5 shrink-0 text-right text-xs tabular-nums text-slate-400 dark:text-slate-500">
                {p.roe != null ? i + 1 : "—"}
              </span>
              <span
                className={`font-medium ${
                  p.symbol === ranking.symbol
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-slate-900 dark:text-slate-100"
                }`}
              >
                {p.symbol}
              </span>
              <span className="truncate text-xs text-slate-400 dark:text-slate-500">{p.name}</span>
            </div>
            <span className="shrink-0 tabular-nums text-slate-600 dark:text-slate-300">{formatRoe(p.roe)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
