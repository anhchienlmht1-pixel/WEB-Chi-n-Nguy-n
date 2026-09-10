import { useMemo, useState } from "react";
import { usePolling } from "../hooks/usePolling";
import { fetchBankPbHistory, fetchSecuritiesPbHistory, fetchRealEstatePbHistory, type PbHistoryTable } from "../api/client";
import { computePbStatsFromHistory, getPbDataCoverage, pbWindowExceedsCoverage, type PbLookbackYears } from "../utils/pbHistory";
import PbRangeChart from "../components/PbRangeChart";

const PB_POLL_MS = 5 * 60 * 1000; // server caches the underlying VCI scan for 1h — no point polling faster

type Group = "bank" | "securities" | "realestate";

const GROUPS: { value: Group; label: string; title: string; fetcher: () => Promise<PbHistoryTable> }[] = [
  { value: "bank", label: "Ngân hàng", title: "So sánh P/B ngành ngân hàng", fetcher: fetchBankPbHistory },
  { value: "securities", label: "Chứng khoán", title: "So sánh P/B ngành chứng khoán", fetcher: fetchSecuritiesPbHistory },
  { value: "realestate", label: "Bất động sản", title: "So sánh P/B ngành bất động sản", fetcher: fetchRealEstatePbHistory },
];

// P/B pulled live from VCI's ratio endpoint (quarterly) for each sector —
// no Excel-sourced fundamentals here (that data was cleared), just the
// live comparison chart.
export default function PbCompare() {
  const [group, setGroup] = useState<Group>("bank");
  const [pbYears, setPbYears] = useState<PbLookbackYears>(1);
  const activeGroup = GROUPS.find((g) => g.value === group)!;

  const { data: pbHistory, error: pbError, loading: pbLoading } = usePolling(
    () => activeGroup.fetcher(),
    [group],
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
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">So sánh P/B theo ngành</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">So sánh P/B các doanh nghiệp niêm yết theo nhóm ngành.</p>

      <div className="mt-4 flex w-fit gap-1 rounded-lg border border-slate-200 p-1 text-sm font-medium dark:border-slate-800">
        {GROUPS.map((g) => (
          <button
            key={g.value}
            type="button"
            onClick={() => setGroup(g.value)}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              group === g.value
                ? "bg-slate-1000 text-slate-950"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

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
                  ? "bg-slate-1000 text-slate-950"
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
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-1000 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
            Không tải được dữ liệu P/B{pbError ? `: ${pbError}` : ""}.
          </div>
        )}
        {pbStats && pbCoverage && pbWindowCapped && (
          <div className="mb-3 rounded-lg border border-amber-300 bg-slate-100 p-3 text-xs text-slate-600 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-slate-300">
            Nguồn dữ liệu hiện chỉ có P/B từ <strong>{pbCoverage.earliestLabel}</strong> — khoảng "{pbYears} Năm" đã
            hiển thị toàn bộ lịch sử có sẵn, nên có thể giống với khoảng thời gian ngắn hơn.
          </div>
        )}
        {pbStats && (
          <>
            <PbRangeChart data={pbStats} title={activeGroup.title} />
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              Dữ liệu P/B theo quý, lấy trực tiếp từ báo cáo tài chính công bố (nguồn: Vietcap) — không phải khuyến
              nghị đầu tư từ hệ thống.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
