import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { METRIC_META, formatMetricValue, type MetricFormat } from "../utils/bankData";
import type { BankData, BankMetricKey } from "../types/bank";
import CompanyLogo from "./CompanyLogo";

type PeriodType = "quarter" | "year";

const GROUP_ORDER = ["Quốc doanh", "Doanh nghiệp", "Cá nhân", "Quy mô nhỏ", ""];

const METRIC_KEYS = Object.keys(METRIC_META) as BankMetricKey[];

// Matches the source Excel's own "So sánh chỉ số" sheet: pick one ratio,
// see every bank's value for it across every quarter/year side by side —
// the inverse cut of "Bảng so sánh" (which fixes one period and shows all
// ratios). No new export needed: every bank's full quarter+year series is
// already fetched by the parent page.
export default function BankMetricComparisonTable({ banks }: { banks: BankData[] }) {
  const [metric, setMetric] = useState<BankMetricKey>("nim");
  const [periodType, setPeriodType] = useState<PeriodType>("quarter");

  const periods = useMemo(() => {
    if (banks.length === 0) return [];
    return (periodType === "quarter" ? banks[0].quarter : banks[0].year).periods;
  }, [banks, periodType]);

  const groupedBanks = useMemo(() => {
    const groups = new Map<string, BankData[]>();
    for (const bank of banks) {
      const key = bank.group || "";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(bank);
    }
    return groups;
  }, [banks]);

  const format = METRIC_META[metric].format;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">So sánh chỉ số</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Một chỉ số, toàn bộ 27 ngân hàng, theo thời gian.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as BankMetricKey)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            {METRIC_KEYS.map((key) => (
              <option key={key} value={key}>
                {METRIC_META[key].label}
              </option>
            ))}
          </select>
          <div className="flex gap-1 rounded-lg border border-slate-200 p-1 text-xs font-medium dark:border-slate-800">
            {(["quarter", "year"] as PeriodType[]).map((pt) => (
              <button
                key={pt}
                type="button"
                onClick={() => setPeriodType(pt)}
                className={`rounded-md px-3 py-1 transition-colors ${
                  periodType === pt
                    ? "bg-emerald-500 text-slate-950"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                }`}
              >
                {pt === "year" ? "Năm" : "Quý"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
              <th className="sticky left-0 z-10 bg-white px-4 py-3 font-medium text-slate-500">Ngân hàng</th>
              {periods.map((p, i) => (
                <th key={`${p}-${i}`} className="whitespace-nowrap px-3 py-3 text-right font-medium">
                  {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GROUP_ORDER.filter((g) => groupedBanks.has(g)).map((group) => (
              <GroupRows
                key={group || "khac"}
                group={group}
                banks={groupedBanks.get(group) ?? []}
                periodType={periodType}
                metric={metric}
                format={format}
                colSpan={periods.length + 1}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GroupRows({
  group,
  banks,
  periodType,
  metric,
  format,
  colSpan,
}: {
  group: string;
  banks: BankData[];
  periodType: PeriodType;
  metric: BankMetricKey;
  format: MetricFormat;
  colSpan: number;
}) {
  return (
    <>
      {group && (
        <tr>
          <td
            colSpan={colSpan}
            className="sticky left-0 bg-slate-50 px-4 py-1.5 text-xs font-semibold text-slate-500 dark:bg-slate-900/80 dark:text-slate-400"
          >
            {group}
          </td>
        </tr>
      )}
      {banks.map((bank) => {
        const values = (periodType === "quarter" ? bank.quarter : bank.year).metrics[metric];
        return (
          <tr
            key={bank.symbol}
            className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900/60"
          >
            <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-2.5">
              <Link to={`/stock/${bank.symbol}`} className="flex items-center gap-2">
                <CompanyLogo symbol={bank.symbol} />
                <span className="font-semibold text-slate-900 hover:text-emerald-600">{bank.symbol}</span>
                <span className="text-xs text-slate-400">{bank.exchange}</span>
              </Link>
            </td>
            {values.map((v, i) => (
              <td
                key={i}
                className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-300"
              >
                {formatMetricValue(v, format)}
              </td>
            ))}
          </tr>
        );
      })}
    </>
  );
}
