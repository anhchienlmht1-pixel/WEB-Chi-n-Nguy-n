import { useMemo, useState } from "react";
import { usePolling } from "../hooks/usePolling";
import { fetchRealEstatePbHistory } from "../api/client";
import { computePbStatsFromHistory, getPbDataCoverage, pbWindowExceedsCoverage, type PbLookbackYears } from "../utils/pbHistory";
import PbRangeChart from "../components/PbRangeChart";

const PB_POLL_MS = 3 * 60 * 1000; // matches the other Sheets-backed pages (server itself caches 5 min)

// Unlike BankCompare / SecuritiesCompare, there's no Excel-sourced
// fundamentals export for real estate companies yet — this page only has
// the sheet's "P/B ngành bất động sản" tab, so it's just that one chart
// rather than a multi-tab dashboard.
export default function RealEstateCompare() {
  const [pbYears, setPbYears] = useState<PbLookbackYears>(1);

  const { data: pbHistory, error: pbError, loading: pbLoading } = usePolling(
    () => fetchRealEstatePbHistory(),
    [],
    PB_POLL_MS
  );

  const pbStats = useMemo(() => {
    if (!pbHistory) return null;
    return computePbStatsFromHistory(pbHistory, pbYears);
  }, [pbHistory, pbYears]);

  const pbCoverage = useMemo(() => (pbHistory ? getPbDataCoverage(pbHistory) : null), [pbHistory]);
  const pbWindowCapped = pbCoverage !== null && pbWindowExceedsCoverage(pbCoverage, pbYears);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">So sánh bất động sản</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">So sánh P/B các doanh nghiệp bất động sản niêm yết.</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Thời gian</span>
        <div className="flex gap-1 rounded-lg border border-slate-200 p-1 text-xs font-medium dark:border-slate-800">
          {([1, 3, 5] as PbLookbackYears[]).map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setPbYears(y)}
              className={`rounded-md px-3 py-1 transition-colors ${
                pbYears === y
                  ? "bg-emerald-500 text-slate-950"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
            >
              {y} Năm
            </button>
          ))}
        </div>
        {pbCoverage && (
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Dữ liệu: {pbCoverage.earliestLabel} – {pbCoverage.latestLabel}
          </span>
        )}
      </div>

      <div className="mt-4">
        {pbLoading && !pbStats && (
          <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-6 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        )}
        {!pbLoading && (pbError || !pbStats) && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-red-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-red-400">
            Không tải được dữ liệu P/B{pbError ? `: ${pbError}` : ""}.
          </div>
        )}
        {pbStats && pbCoverage && pbWindowCapped && (
          <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-400">
            Trang tính hiện chỉ có dữ liệu P/B từ <strong>{pbCoverage.earliestLabel}</strong> — khoảng "{pbYears} Năm"
            đã hiển thị toàn bộ lịch sử có sẵn, nên có thể giống với khoảng thời gian ngắn hơn cho tới khi sheet có
            thêm dữ liệu cũ hơn.
          </div>
        )}
        {pbStats && (
          <>
            <PbRangeChart data={pbStats} title="So sánh P/B ngành bất động sản" />
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              Dữ liệu P/B theo ngày do người quản lý trang tính tự tính và cập nhật, đồng bộ trực tiếp từ Google
              Sheets — không phải khuyến nghị đầu tư từ hệ thống.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
