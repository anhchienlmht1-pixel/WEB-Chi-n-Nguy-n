import { useMemo } from "react";
import type { FinancialReport } from "../types";
import { findRevenueItem } from "../utils/financials";
import { sortPeriodIndices } from "../utils/period";
import BarLineComboChart from "./BarLineComboChart";

export default function RevenueBarLineChart({
  symbol,
  data,
  loading,
  error,
}: {
  symbol: string;
  data: FinancialReport | null;
  loading: boolean;
  error: string | null;
}) {
  const chart = useMemo(() => {
    if (!data) return null;
    const item = findRevenueItem(data);
    if (!item) return null;
    const order = sortPeriodIndices(data.periods, "asc");
    return {
      periods: order.map((i) => data.periods[i]),
      values: order.map((i) => item.values[i]),
      unit: item.unit || "Tỷ VNĐ",
    };
  }, [data]);

  if (loading) return <div className="h-[260px] animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />;
  if (error || !chart) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-lg border border-slate-200 text-sm text-slate-400 dark:border-slate-800 dark:text-slate-500">
        Chưa có đủ dữ liệu doanh thu cho {symbol}.
      </div>
    );
  }
  return (
    <BarLineComboChart
      title="Doanh thu thuần"
      periods={chart.periods}
      values={chart.values}
      unit={chart.unit}
    />
  );
}
