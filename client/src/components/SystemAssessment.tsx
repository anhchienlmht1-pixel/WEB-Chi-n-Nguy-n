import { useMemo } from "react";
import { LineChart } from "lucide-react";
import { usePolling } from "../hooks/usePolling";
import { fetchHistory } from "../api/client";
import { aggregatePoints } from "../utils/aggregate";
import { buildSystemAssessment, type SystemStatus } from "../utils/systemAssessment";

const STATUS_INFO: Record<SystemStatus, { label: string; className: string }> = {
  buy: { label: "ĐANG MUA", className: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400" },
  watch: { label: "CHỜ ĐIỂM MUA", className: "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" },
  avoid: { label: "ĐỨNG NGOÀI", className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
};

// Auto-generated per-symbol commentary from the platform's own
// trend-following system — same combo as the chart's Mua/Bán markers, read
// off the latest bar. Complements TrendSignalScanner (whole-universe list)
// by answering "what does the system say about THIS symbol right now".
export default function SystemAssessment({ symbol }: { symbol: string }) {
  const { data, loading } = usePolling(() => fetchHistory(symbol, "MAX"), [symbol], 5 * 60 * 1000);

  const assessment = useMemo(() => {
    if (!data) return null;
    const daily = aggregatePoints(data.points, "D");
    return buildSystemAssessment(daily);
  }, [data]);

  if (loading && !assessment) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="h-24 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      </div>
    );
  }

  if (!assessment) return null;

  const statusInfo = STATUS_INFO[assessment.status];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <LineChart className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
          Nhận định hệ thống
        </h3>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusInfo.className}`}>{statusInfo.label}</span>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{assessment.narrative}</p>
      <p className="mt-3 text-xs font-medium leading-relaxed text-slate-800 dark:text-slate-200">{assessment.actionLine}</p>
      <p className="mt-3 text-[10px] text-slate-400 dark:text-slate-500">
        Tự động sinh từ hệ thống Trend Following (SMA20/50, ADX(14), Supertrend(10,3)) tại thời điểm hiện tại — không
        phải khuyến nghị đầu tư.
      </p>
    </div>
  );
}
