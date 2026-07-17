"use client";

import { useState } from "react";
import { useMemo } from "react";
import useSWR from "swr";
import clsx from "clsx";
import { fetcher } from "@/lib/fetcher";
import { FinancialReport } from "@/lib/types";
import { formatFinancialValue } from "@/lib/format";
import { KbsPeriodType, KbsReportType } from "@/lib/kbs";
import { ProfitChart } from "./ProfitChart";
import { RatioTrendChart } from "./RatioTrendChart";

const REPORT_TABS: { value: KbsReportType; label: string }[] = [
  { value: "CSTC", label: "Chỉ số tài chính" },
  { value: "KQKD", label: "Kết quả kinh doanh" },
  { value: "CDKT", label: "Cân đối kế toán" },
  { value: "LCTT", label: "Lưu chuyển tiền tệ" },
];

export function FinancialRatios({ symbol }: { symbol: string }) {
  const [reportType, setReportType] = useState<KbsReportType>("CSTC");
  const [periodType, setPeriodType] = useState<KbsPeriodType>("year");

  const { data, error, isLoading } = useSWR<FinancialReport>(
    `/api/financials?symbol=${symbol}&type=${reportType}&periodType=${periodType}`,
    fetcher
  );

  // KBS returns oldest-first; show newest periods first, capped so the
  // table stays readable — full history back to founding is still fetched
  // and available for CSV/scroll, this just controls initial display order.
  const displayPeriods = useMemo(() => {
    if (!data) return [];
    return data.periods.map((p, i) => ({ label: p, index: i })).reverse();
  }, [data]);

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm shadow-neutral-900/[0.02] dark:border-neutral-800 dark:bg-neutral-900/60 dark:shadow-lg dark:shadow-black/20">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 p-4 dark:border-neutral-800">
        <div className="flex flex-wrap gap-1.5">
          {REPORT_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setReportType(tab.value)}
              className={clsx(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                reportType === tab.value
                  ? "bg-brand-600 text-white"
                  : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-full bg-neutral-100 p-1 text-xs font-semibold dark:bg-neutral-800">
          {(["year", "quarter"] as KbsPeriodType[]).map((pt) => (
            <button
              key={pt}
              type="button"
              onClick={() => setPeriodType(pt)}
              className={clsx(
                "rounded-full px-3 py-1 transition-colors",
                periodType === pt
                  ? "bg-white text-brand-700 shadow-sm dark:bg-neutral-700 dark:text-brand-300"
                  : "text-neutral-500 dark:text-neutral-400"
              )}
            >
              {pt === "year" ? "Năm" : "Quý"}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-2 p-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-5 w-full animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
          ))}
        </div>
      )}

      {!isLoading && (error || !data) && (
        <div className="p-4 text-sm text-red-600 dark:text-red-400">
          Không thể tải dữ liệu tài chính cho {symbol}.
        </div>
      )}

      {!isLoading && data && data.items.length === 0 && (
        <div className="p-4 text-sm text-neutral-500 dark:text-neutral-400">Chưa có dữ liệu.</div>
      )}

      {!isLoading && data && data.items.length > 0 && reportType === "KQKD" && <ProfitChart report={data} />}
      {!isLoading && data && data.items.length > 0 && reportType === "CSTC" && <RatioTrendChart report={data} />}

      {!isLoading && data && data.items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/80 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900">
                <th className="sticky left-0 z-10 bg-neutral-50/80 px-4 py-3 text-left dark:bg-neutral-900">
                  Chỉ tiêu
                </th>
                {displayPeriods.map((p) => (
                  <th key={p.index} className="whitespace-nowrap px-4 py-3 text-right">
                    {p.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-neutral-100 last:border-0 hover:bg-brand-50/60 dark:border-neutral-800 dark:hover:bg-brand-500/10"
                >
                  <td
                    className="sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-2.5 text-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-300"
                    style={{ paddingLeft: `${1 + item.levels * 1}rem` }}
                  >
                    <span className={clsx(item.levels === 0 && "font-semibold text-neutral-900 dark:text-neutral-100")}>
                      {item.name}
                    </span>
                    {item.unit && (
                      <span className="ml-1.5 text-xs text-neutral-400 dark:text-neutral-500">({item.unit})</span>
                    )}
                  </td>
                  {displayPeriods.map((p) => (
                    <td key={p.index} className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-neutral-700 dark:text-neutral-300">
                      {formatFinancialValue(item.values[p.index], item.unit)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
