import { useMemo } from "react";
import { fetchFinancials } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import type { FinancialPeriodType } from "../types";
import { findProfitItem, growthOffset, type GrowthMode } from "../utils/financials";
import { sortPeriodIndices } from "../utils/period";
import BarLineComboChart from "./BarLineComboChart";

export default function ProfitBarLineChart({
  symbol,
  periodType,
  growthMode,
}: {
  symbol: string;
  periodType: FinancialPeriodType;
  growthMode: GrowthMode;
}) {
  const { data, error, loading } = usePolling(() => fetchFinancials(symbol, "KQKD", periodType), [symbol, periodType]);

  const chart = useMemo(() => {
    if (!data) return null;
    const item = findProfitItem(data);
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
        Chưa có đủ dữ liệu lợi nhuận cho {symbol}.
      </div>
    );
  }
  return (
    <BarLineComboChart
      title="Lợi nhuận sau thuế"
      periods={chart.periods}
      values={chart.values}
      unit={chart.unit}
      growthOffset={growthOffset(periodType, growthMode)}
      growthLabel={growthMode === "yoy" ? "Tăng trưởng YoY (%)" : "Tăng trưởng QoQ (%)"}
    />
  );
}
