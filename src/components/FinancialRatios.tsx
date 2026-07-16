"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import clsx from "clsx";
import { Download } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { RatioPoint, StatementPoint } from "@/lib/types";
import { RATIO_FIELDS } from "@/lib/ratioFields";
import {
  formatBillionVnd,
  formatGrowthPercent,
  formatRatioNumber,
  formatRatioPercent,
  formatVndPerShare,
} from "@/lib/format";
import { RatioBarChart } from "./RatioBarChart";

// Server data always sets every field key explicitly (number or null), but
// don't assume that holds everywhere a value is read — treat anything
// that isn't a finite number as "no data" rather than `=== null` only.
function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

interface Response {
  symbol: string;
  points: RatioPoint[];
  statement: StatementPoint[];
  statementError: string | null;
}

// Headline metrics matching a typical brokerage "Phân tích tài chính"
// ratio page — the rest of RATIO_FIELDS is still shown below as extra rows.
const HEADLINE_KEYS = [
  "netInterestMargin",
  "depositGrowth",
  "loansGrowth",
  "equityToLiabilities",
  "ldrLoanDepositRatio",
  "npl",
  "loansLossReservesToNPLs",
];

const CHART_PRIORITY = ["roe", "roa", "netInterestMargin", "npl", "casaRatio", "cir", "pe", "pb"];
const CHART_WINDOW = 20;

function growthColor(value: number | null): string {
  if (!isNum(value)) return "text-neutral-400 dark:text-neutral-500";
  return value >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";
}

// BVPS = owners' equity / outstanding shares. Vietcap's "ownersEquity" is
// billion VND and "numberOfSharesMktCap" is million shares (per its own
// label), so scale to VND/share. Best-effort — the unit convention isn't
// documented, so implausible results are suppressed rather than shown.
function computeBvps(values: Record<string, number | null>): number | null {
  const equity = values.ownersEquity;
  const shares = values.numberOfSharesMktCap;
  if (!isNum(equity) || !isNum(shares) || shares === 0) return null;
  const bvps = (equity * 1000) / shares;
  return bvps > 100 && bvps < 1_000_000 ? bvps : null;
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function FinancialRatios({ symbol }: { symbol: string }) {
  const { data, error, isLoading } = useSWR<Response>(`/api/financials?symbol=${symbol}`, fetcher, {
    revalidateOnFocus: false,
  });
  const [periodType, setPeriodType] = useState<"quarter" | "year">("quarter");

  const points = useMemo(() => {
    const allPoints = data?.points ?? [];
    const filtered = allPoints.filter((p) => p.periodType === periodType);
    return filtered.length > 0 ? filtered : allPoints.filter((p) => p.periodType === "year");
  }, [data?.points, periodType]);

  const statementByPeriod = useMemo(() => {
    const allStatement = data?.statement ?? [];
    const map = new Map<string, StatementPoint>();
    for (const s of allStatement) if (s.periodType === periodType) map.set(s.period, s);
    return map;
  }, [data?.statement, periodType]);

  const periods = points.map((p) => p.period);
  const nii = points.map((p) => statementByPeriod.get(p.period)?.netInterestIncome ?? null);
  const pat = points.map((p) => statementByPeriod.get(p.period)?.profitAfterTax ?? null);
  const niiGrowth = nii.map((v, i) => {
    const prev = nii[i - 1];
    if (!isNum(v) || !isNum(prev) || prev === 0) return null;
    return (v - prev) / Math.abs(prev);
  });
  const yoyLag = periodType === "quarter" ? 4 : 1;
  const patGrowth = pat.map((v, i) => {
    const prev = pat[i - yoyLag];
    if (!isNum(v) || !isNum(prev) || prev === 0) return null;
    return (v - prev) / Math.abs(prev);
  });
  const bvps = points.map((p) => computeBvps(p.values));

  const visibleFields = RATIO_FIELDS.filter((field) => points.some((p) => isNum(p.values[field.key])));
  const headlineFields = HEADLINE_KEYS.map((key) => visibleFields.find((f) => f.key === key)).filter(
    (f): f is (typeof visibleFields)[number] => f !== undefined
  );
  const extraFields = visibleFields.filter((f) => !HEADLINE_KEYS.includes(f.key));
  const hasBvps = bvps.some((v) => isNum(v));
  const hasStatement = nii.some((v) => isNum(v)) || pat.some((v) => isNum(v));

  const chartPoints = points.slice(-CHART_WINDOW);
  const chartPeriods = chartPoints.map((p) => p.period);
  const chartFields = CHART_PRIORITY.map((key) => visibleFields.find((f) => f.key === key))
    .filter((f): f is (typeof visibleFields)[number] => f !== undefined)
    .slice(0, 4);

  function downloadCsv() {
    const header = ["Chỉ tiêu", ...periods];
    const rows: string[][] = [];
    if (hasStatement) {
      rows.push(["Thu nhập lãi thuần (tỷ VND)", ...nii.map((v) => (isNum(v) ? v.toFixed(2) : ""))]);
      rows.push(["Tăng trưởng thu nhập lãi thuần (%)", ...niiGrowth.map((v) => (isNum(v) ? (v * 100).toFixed(2) : ""))]);
      rows.push(["Lợi nhuận sau thuế (tỷ VND)", ...pat.map((v) => (isNum(v) ? v.toFixed(2) : ""))]);
      rows.push(["Tăng trưởng lợi nhuận (YoY %)", ...patGrowth.map((v) => (isNum(v) ? (v * 100).toFixed(2) : ""))]);
    }
    for (const field of [...headlineFields, ...extraFields]) {
      rows.push([
        field.label,
        ...points.map((p) => {
          const v = p.values[field.key];
          if (!isNum(v)) return "";
          return field.percent ? (v * 100).toFixed(2) : v.toFixed(2);
        }),
      ]);
    }
    if (hasBvps) {
      rows.push(["BVPS (VND)", ...bvps.map((v) => (isNum(v) ? Math.round(v).toString() : ""))]);
    }
    const csv = [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${symbol}-chi-so-tai-chinh.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm shadow-neutral-900/[0.02] dark:border-neutral-800 dark:bg-neutral-900/60 dark:shadow-lg dark:shadow-black/20">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-50">Chỉ số tài chính</h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-full bg-neutral-100 p-0.5 dark:bg-neutral-800">
            {(["quarter", "year"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setPeriodType(t)}
                className={clsx(
                  "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                  periodType === t
                    ? "bg-brand-600 text-white"
                    : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                )}
              >
                {t === "quarter" ? "Quý" : "Năm"}
              </button>
            ))}
          </div>
          {!isLoading && !error && points.length > 0 && (
            <button
              onClick={downloadCsv}
              className="flex items-center gap-1 rounded-full border border-neutral-200 px-3 py-1 text-xs font-semibold text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <Download size={12} /> Tải xuống
            </button>
          )}
          <span className="text-xs text-neutral-400 dark:text-neutral-500">Nguồn: Vietcap</span>
        </div>
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

      {!isLoading && !error && points.length === 0 && (
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-950/20 dark:text-amber-300">
          Chưa có dữ liệu chỉ số tài chính theo {periodType === "quarter" ? "quý" : "năm"} cho {symbol}.
        </div>
      )}

      {!isLoading && !error && points.length > 0 && chartFields.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-6 border-b border-neutral-100 pb-6 sm:grid-cols-2 dark:border-neutral-800">
          {chartFields.map((field) => (
            <RatioBarChart
              key={field.key}
              label={field.label}
              periods={chartPeriods}
              values={chartPoints.map((p) => p.values[field.key])}
              percent={field.percent}
            />
          ))}
        </div>
      )}

      {!isLoading && !error && points.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800">
                <th className="sticky left-0 bg-white py-2 pr-4 text-left font-semibold text-neutral-500 dark:bg-neutral-900/60 dark:text-neutral-400">
                  Chỉ tiêu
                </th>
                {periods.map((p) => (
                  <th
                    key={p}
                    className="whitespace-nowrap py-2 pl-4 text-right font-semibold text-neutral-500 dark:text-neutral-400"
                  >
                    {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hasStatement && (
                <>
                  <tr className="border-b border-neutral-50 dark:border-neutral-800/60">
                    <td className="sticky left-0 bg-inherit py-2 pr-4 font-medium text-neutral-700 dark:text-neutral-300">
                      Thu nhập lãi thuần (tỷ VND)
                    </td>
                    {nii.map((v, i) => (
                      <td key={i} className="whitespace-nowrap py-2 pl-4 text-right tabular-nums text-neutral-900 dark:text-neutral-100">
                        {formatBillionVnd(v)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-neutral-50 dark:border-neutral-800/60">
                    <td className="sticky left-0 bg-inherit py-1.5 pr-4 pl-3 text-xs italic text-neutral-400 dark:text-neutral-500">
                      Tăng trưởng thu nhập lãi thuần (%)
                    </td>
                    {niiGrowth.map((v, i) => (
                      <td key={i} className={clsx("whitespace-nowrap py-1.5 pl-4 text-right text-xs tabular-nums italic", growthColor(v))}>
                        {formatGrowthPercent(v)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-neutral-50 dark:border-neutral-800/60">
                    <td className="sticky left-0 bg-inherit py-2 pr-4 font-medium text-neutral-700 dark:text-neutral-300">
                      Lợi nhuận sau thuế (tỷ VND)
                    </td>
                    {pat.map((v, i) => (
                      <td key={i} className="whitespace-nowrap py-2 pl-4 text-right tabular-nums text-neutral-900 dark:text-neutral-100">
                        {formatBillionVnd(v)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-neutral-100 dark:border-neutral-800">
                    <td className="sticky left-0 bg-inherit py-1.5 pr-4 pl-3 text-xs italic text-neutral-400 dark:text-neutral-500">
                      Tăng trưởng lợi nhuận (YoY %)
                    </td>
                    {patGrowth.map((v, i) => (
                      <td key={i} className={clsx("whitespace-nowrap py-1.5 pl-4 text-right text-xs tabular-nums italic", growthColor(v))}>
                        {formatGrowthPercent(v)}
                      </td>
                    ))}
                  </tr>
                </>
              )}

              {headlineFields.map((field) => (
                <tr key={field.key} className="border-b border-neutral-50 dark:border-neutral-800/60">
                  <td className="sticky left-0 bg-inherit py-2 pr-4 font-medium text-neutral-700 dark:text-neutral-300">
                    {field.label}
                  </td>
                  {points.map((p) => (
                    <td
                      key={p.period}
                      className="whitespace-nowrap py-2 pl-4 text-right tabular-nums text-neutral-900 dark:text-neutral-100"
                    >
                      {field.percent ? formatRatioPercent(p.values[field.key]) : formatRatioNumber(p.values[field.key])}
                    </td>
                  ))}
                </tr>
              ))}

              {hasBvps && (
                <tr className="border-b border-neutral-50 dark:border-neutral-800/60">
                  <td className="sticky left-0 bg-inherit py-2 pr-4 font-medium text-neutral-700 dark:text-neutral-300">
                    BVPS (VND)
                  </td>
                  {bvps.map((v, i) => (
                    <td key={i} className="whitespace-nowrap py-2 pl-4 text-right tabular-nums text-neutral-900 dark:text-neutral-100">
                      {formatVndPerShare(v)}
                    </td>
                  ))}
                </tr>
              )}

              {extraFields.length > 0 && (
                <tr>
                  <td
                    colSpan={periods.length + 1}
                    className="sticky left-0 bg-inherit pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500"
                  >
                    Chỉ số bổ sung
                  </td>
                </tr>
              )}
              {extraFields.map((field, i) => (
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
                      {field.percent ? formatRatioPercent(p.values[field.key]) : formatRatioNumber(p.values[field.key])}
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
