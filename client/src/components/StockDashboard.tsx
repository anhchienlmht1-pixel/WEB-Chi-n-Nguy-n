import { useState } from "react";
import type { FinancialPeriodType } from "../types";
import { fetchFinancials } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import RevenueBarLineChart from "./RevenueBarLineChart";
import ProfitBarLineChart from "./ProfitBarLineChart";
import AssetsBarLineChart from "./AssetsBarLineChart";

// Bar (absolute value) + line (growth %) combo panels, one shared Quý/Năm
// toggle governing all three — matching the layout used by VN brokerage
// report pages (KAFI, FiinTrade, VNDirect...) rather than each panel
// picking its own period type independently. The growth line always
// compares to the immediately previous column, which reads as QoQ in the
// quarterly view and YoY in the yearly view.
//
// Revenue and profit are two line items off the *same* KQKD report, so
// that report is fetched once here and handed to both panels — each still
// falls back independently if its own line item isn't found (e.g. a
// holding company's revenue is there but its consolidated profit line
// isn't, or vice versa), instead of one missing metric hiding both.
export default function StockDashboard({ symbol }: { symbol: string }) {
  const [periodType, setPeriodType] = useState<FinancialPeriodType>("quarter");

  const { data: kqkd, error: kqkdError, loading: kqkdLoading } = usePolling(
    () => fetchFinancials(symbol, "KQKD", periodType),
    [symbol, periodType]
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Báo cáo tài chính</h3>
        <div className="flex gap-1 rounded-lg border border-slate-200 p-1 text-xs font-medium dark:border-slate-800">
          {(["quarter", "year"] as FinancialPeriodType[]).map((pt) => (
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
              {pt === "quarter" ? "Theo quý" : "Theo năm"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <RevenueBarLineChart symbol={symbol} data={kqkd ?? null} loading={kqkdLoading} error={kqkdError} />
        <ProfitBarLineChart data={kqkd ?? null} loading={kqkdLoading} error={kqkdError} />
        <AssetsBarLineChart symbol={symbol} periodType={periodType} />
      </div>
    </div>
  );
}
