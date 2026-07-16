"use client";

import useSWR from "swr";
import clsx from "clsx";
import { fetcher } from "@/lib/fetcher";
import { RatioPoint } from "@/lib/types";
import { RATIO_FIELDS } from "@/lib/ratioFields";
import { formatRatioNumber, formatRatioPercent } from "@/lib/format";
import { RatioBarChart } from "./RatioBarChart";

interface Response {
  symbol: string;
  points: RatioPoint[];
}

// Preferred headline metrics to chart, in priority order — whichever of
// these actually have data for a given symbol get charted (up to 4), so
// banks show CASA/NIM/NPL-style metrics and non-banks fall back to
// profitability/valuation ones instead of showing nothing.
const CHART_PRIORITY = ["roe", "roa", "netInterestMargin", "npl", "casaRatio", "cir", "pe", "pb"];

export function FinancialRatios({ symbol }: { symbol: string }) {
  const { data, error, isLoading } = useSWR<Response>(`/api/financials?symbol=${symbol}`, fetcher, {
    revalidateOnFocus: false,
  });

  const points = data?.points ?? [];

  // Only show rows that have at least one non-null value across the
  // returned periods — different symbol types (bank vs. non-bank) populate
  // different subsets of RATIO_FIELDS.
  const visibleFields = RATIO_FIELDS.filter((field) => points.some((p) => p.values[field.key] !== null));
  const chartFields = CHART_PRIORITY.map((key) => visibleFields.find((f) => f.key === key))
    .filter((f): f is (typeof visibleFields)[number] => f !== undefined)
    .slice(0, 4);
  const periods = points.map((p) => p.period);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm shadow-neutral-900/[0.02] dark:border-neutral-800 dark:bg-neutral-900/60 dark:shadow-lg dark:shadow-black/20">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-50">Chỉ số tài chính</h3>
        <span className="text-xs text-neutral-400 dark:text-neutral-500">Nguồn: Vietcap</span>
      </div>

      {isLoading && <div className="h-40 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />}

      {!isLoading && error && (
        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
          Không thể tải chỉ số tài chính cho {symbol}.
          {error instanceof Error && error.message && (
            <div className="mt-1 text-xs opacity-75">{error.message}</div>
          )}
        </div>
      )}

      {!isLoading && !error && visibleFields.length === 0 && (
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-950/20 dark:text-amber-300">
          Chưa có dữ liệu chỉ số tài chính cho {symbol}.
        </div>
      )}

      {!isLoading && !error && chartFields.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-6 border-b border-neutral-100 pb-6 sm:grid-cols-2 dark:border-neutral-800">
          {chartFields.map((field) => (
            <RatioBarChart
              key={field.key}
              label={field.label}
              periods={periods}
              values={points.map((p) => p.values[field.key])}
              percent={field.percent}
            />
          ))}
        </div>
      )}

      {!isLoading && !error && visibleFields.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800">
                <th className="sticky left-0 bg-white py-2 pr-4 text-left font-semibold text-neutral-500 dark:bg-neutral-900/60 dark:text-neutral-400">
                  Chỉ tiêu
                </th>
                {points.map((p) => (
                  <th
                    key={p.period}
                    className="whitespace-nowrap py-2 pl-4 text-right font-semibold text-neutral-500 dark:text-neutral-400"
                  >
                    {p.period}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleFields.map((field, i) => (
                <tr
                  key={field.key}
                  className={clsx(
                    "border-b border-neutral-50 dark:border-neutral-800/60",
                    i % 2 === 1 && "bg-neutral-50/60 dark:bg-neutral-950/30"
                  )}
                >
                  <td className="sticky left-0 bg-inherit py-2 pr-4 font-medium text-neutral-700 dark:text-neutral-300">
                    {field.label}
                  </td>
                  {points.map((p) => (
                    <td
                      key={p.period}
                      className="whitespace-nowrap py-2 pl-4 text-right tabular-nums text-neutral-900 dark:text-neutral-100"
                    >
                      {field.percent
                        ? formatRatioPercent(p.values[field.key])
                        : formatRatioNumber(p.values[field.key])}
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
