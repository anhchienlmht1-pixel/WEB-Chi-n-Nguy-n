import { useState } from "react";
import type { FinancialPeriodType } from "../types";
import type { GrowthMode } from "../utils/financials";
import ProfitBarLineChart from "./ProfitBarLineChart";
import AssetsBarLineChart from "./AssetsBarLineChart";
import ValuationChart from "./ValuationChart";

// Bar (absolute value) + line (growth %) combo panels, one shared Quý/Năm
// toggle governing all of them — matching the layout used by VN brokerage
// report pages (KAFI, FiinTrade, VNDirect...) rather than each panel
// picking its own period type independently. The growth line can compare
// either to the immediately previous quarter (QoQ) or the same quarter a
// year back (YoY) — that choice only means anything on quarterly data, so
// it's hidden on the yearly view instead of offering a no-op control.
export default function StockDashboard({ symbol }: { symbol: string }) {
  const [periodType, setPeriodType] = useState<FinancialPeriodType>("year");
  const [growthMode, setGrowthMode] = useState<GrowthMode>("qoq");

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Báo cáo tài chính</h3>
        <div className="flex flex-wrap items-center gap-2">
          {periodType === "quarter" && (
            <div className="flex gap-1 rounded-lg border border-slate-200 p-1 text-xs font-medium dark:border-slate-800">
              {(["qoq", "yoy"] as GrowthMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setGrowthMode(mode)}
                  title={mode === "qoq" ? "So với quý liền trước" : "So với cùng kỳ năm trước"}
                  className={`rounded-md px-3 py-1 transition-colors ${
                    growthMode === mode
                      ? "bg-violet-500 text-slate-950"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                  }`}
                >
                  {mode === "qoq" ? "QoQ" : "YoY"}
                </button>
              ))}
            </div>
          )}
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
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ProfitBarLineChart symbol={symbol} periodType={periodType} growthMode={growthMode} />
        <AssetsBarLineChart symbol={symbol} periodType={periodType} growthMode={growthMode} />
        <div className="lg:col-span-2">
          <ValuationChart symbol={symbol} periodType={periodType} />
        </div>
      </div>
    </div>
  );
}
