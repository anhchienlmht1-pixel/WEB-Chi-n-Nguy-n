import { useMemo } from "react";
import type { FinancialReport } from "../types";
import { findEquityItem } from "../utils/financials";
import { sortPeriodIndices } from "../utils/period";
import BarLineComboChart from "./BarLineComboChart";

export default function EquityBarLineChart({
  data,
  loading,
  error,
}: {
  data: FinancialReport | null;
  loading: boolean;
  error: string | null;
}) {
  const chart = useMemo(() => {
    if (!data) return null;
    const item = findEquityItem(data);
    if (!item) return null;
    const order = sortPeriodIndices(data.periods, "asc");
    return {
      periods: order.map((i) => data.periods[i]),
      values: order.map((i) => item.values[i]),
      unit: item.unit || "Tỷ VNĐ",
    };
  }, [data]);

  if (loading) return <div className="h-[260px] animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />;
  if (error || !chart) return null;
  return (
    <BarLineComboChart
      title="Vốn chủ sở hữu"
      periods={chart.periods}
      values={chart.values}
      unit={chart.unit}
    />
  );
}
