import { useEffect, useState } from "react";
import { fetchFinancials, fetchMarketOverview } from "../api/client";
import { mapWithConcurrency } from "../utils/concurrency";
import { extractPeEpsGrowth, sampleItemNames, type PeEpsPoint } from "../utils/screener";
import PeEpsScatterChart from "../components/PeEpsScatterChart";

const CONCURRENCY = 5;

export default function PeEpsScreener() {
  const [points, setPoints] = useState<PeEpsPoint[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [skippedCount, setSkippedCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setPoints([]);
      setSkippedCount(0);

      let symbols: string[];
      try {
        const overview = await fetchMarketOverview();
        symbols = overview.quotes.map((q) => q.symbol);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Không tải được danh sách mã cổ phiếu.");
          setLoading(false);
        }
        return;
      }
      if (cancelled) return;
      setProgress({ done: 0, total: symbols.length });

      const collected: PeEpsPoint[] = [];
      let skipped = 0;
      // Plain `let`s reassigned from inside the concurrent worker below trip
      // a TS control-flow-analysis bug (narrows to `never` on later reads) —
      // an object holder sidesteps it since property reads aren't narrowed.
      const diagnostics: { firstFetchError: string | null; names: string[] | null } = {
        firstFetchError: null,
        names: null,
      };

      await mapWithConcurrency(symbols, CONCURRENCY, async (symbol) => {
        try {
          const report = await fetchFinancials(symbol, "CSTC", "year");
          const point = extractPeEpsGrowth(symbol, report);
          if (point) {
            collected.push(point);
          } else {
            skipped++;
            if (!diagnostics.names) diagnostics.names = sampleItemNames(report);
          }
        } catch (err) {
          skipped++;
          if (!diagnostics.firstFetchError) {
            diagnostics.firstFetchError = err instanceof Error ? err.message : String(err);
          }
        } finally {
          if (!cancelled) setProgress((p) => ({ ...p, done: p.done + 1 }));
        }
      });

      if (cancelled) return;

      if (collected.length === 0) {
        const { firstFetchError, names } = diagnostics;
        setError(
          firstFetchError
            ? `Không lấy được dữ liệu chỉ số tài chính cho mã nào. Lỗi mẫu: ${firstFetchError}`
            : names
              ? `Có dữ liệu chỉ số tài chính nhưng không tìm thấy chỉ tiêu P/E hoặc EPS phù hợp. Các chỉ tiêu thực tế nhận được: ${names.join(", ")}`
              : "Không có dữ liệu."
        );
      }
      setSkippedCount(skipped);
      setPoints(collected.sort((a, b) => a.symbol.localeCompare(b.symbol)));
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
        Tương quan P/E &amp; Tăng trưởng EPS
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Mỗi điểm là một mã cổ phiếu — trục ngang là P/E, trục dọc là % tăng trưởng EPS theo năm gần nhất
        (dữ liệu chỉ số tài chính thật, không mô phỏng). Bấm vào một điểm để xem chi tiết mã đó.
      </p>

      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 p-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-500 dark:border-slate-700" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Đang tải chỉ số tài chính: {progress.done}/{progress.total} mã...
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="p-4 text-sm text-red-500 dark:text-red-400">{error}</div>
        )}

        {!loading && !error && points.length > 0 && (
          <>
            <div className="p-4">
              <PeEpsScatterChart points={points} />
            </div>
            <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
              Hiển thị {points.length} mã có đủ dữ liệu
              {skippedCount > 0 ? ` (bỏ qua ${skippedCount} mã thiếu chỉ số P/E hoặc EPS)` : ""}.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
