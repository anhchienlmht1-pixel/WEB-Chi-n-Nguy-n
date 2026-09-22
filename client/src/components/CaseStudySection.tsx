import { Link } from "react-router-dom";
import { usePolling } from "../hooks/usePolling";
import { fetchClosedTrades } from "../api/client";
import { formatPrice, formatPercent } from "../utils/format";

const POLL_MS = 5 * 60 * 1000; // server caches the scan for 1h

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Real trade outcomes from the trend-following scanner (see
// server/src/signals/trendScanner.ts's scanClosedTrades), not fabricated
// testimonials — this platform doesn't have customer reviews to show, so
// "case study" here means actual historical signal performance instead.
export default function CaseStudySection() {
  const { data: trades, loading } = usePolling(() => fetchClosedTrades(), [], POLL_MS);

  const top = (trades ?? [])
    .filter((t) => t.returnPercent > 0)
    .sort((a, b) => b.returnPercent - a.returnPercent)
    .slice(0, 3);

  if (!loading && top.length === 0) return null;

  return (
    <section className="mb-12">
      <div className="mb-6 text-center">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Case study</h2>
        <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">Tín hiệu thực tế, kết quả thực tế</h3>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500 dark:text-slate-400">
          Không phải lời chứng thực dàn dựng — đây là các giao dịch đã đóng thật sự từ hệ thống trend-following trong 30
          ngày gần nhất.
        </p>
      </div>

      {loading && top.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {top.map((t) => (
            <Link
              key={`${t.symbol}-${t.sellDate}`}
              to={`/stock/${t.symbol}`}
              className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-5 transition-shadow hover:shadow-md dark:border-emerald-900/40 dark:bg-emerald-500/5"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-slate-100">{t.symbol}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">{t.exchange}</span>
              </div>
              <div className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">{formatPercent(t.returnPercent)}</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t.holdingDays} ngày nắm giữ</div>
              <div className="mt-3 space-y-1 border-t border-emerald-200/60 pt-3 text-xs text-slate-500 dark:border-emerald-900/40 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>Mua {formatDate(t.buyDate)}</span>
                  <span className="tabular-nums">{formatPrice(t.buyPrice, t.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bán {formatDate(t.sellDate)}</span>
                  <span className="tabular-nums">{formatPrice(t.sellPrice, t.currency)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <p className="mt-4 text-center text-[11px] text-slate-400 dark:text-slate-500">
        Kết quả trong quá khứ không đảm bảo cho tương lai. Không phải khuyến nghị đầu tư.{" "}
        <Link to="/thi-truong" className="underline hover:text-emerald-600 dark:hover:text-emerald-400">
          Xem toàn bộ lịch sử giao dịch →
        </Link>
      </p>
    </section>
  );
}
