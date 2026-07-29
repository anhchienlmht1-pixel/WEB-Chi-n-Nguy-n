import { useMemo } from "react";
import type { FinancialReport } from "../types";
import { findProfitItem } from "../utils/financials";
import { sortPeriodIndices } from "../utils/period";
import BarLineComboChart from "./BarLineComboChart";

// Some symbols (VIC among them) have no row KBS's KQKD report matches as
// "lợi nhuận sau thuế" at all — rather than taking up a grid slot with a
// permanent "no data" placeholder, this just renders nothing for those,
// so the grid reflows around it instead of showing an empty box.
export default function ProfitBarLineChart({
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
  if (error || !chart) return null;
  return (
    <BarLineComboChart
      title="Lợi nhuận sau thuế"
      periods={chart.periods}
      values={chart.values}
      unit={chart.unit}
    />
  );
}
