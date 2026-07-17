import { useState } from "react";
import type { FinancialPeriodType } from "../types";
import ProfitBarLineChart from "./ProfitBarLineChart";
import AssetsBarLineChart from "./AssetsBarLineChart";
import ValuationChart from "./ValuationChart";

// Bar (absolute value) + line (period-over-period growth %) combo panels,
// one shared Quý/Năm toggle governing all of them — matching the layout
// used by VN brokerage report pages (KAFI, FiinTrade, VNDirect...) rather
// than each panel picking its own period type independently.
export default function StockDashboard({ symbol }: { symbol: string }) {
  const [periodType, setPeriodType] = useState<FinancialPeriodType>("year");

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ProfitBarLineChart symbol={symbol} periodType={periodType} />
        <AssetsBarLineChart symbol={symbol} periodType={periodType} />
        <div className="lg:col-span-2">
          <ValuationChart symbol={symbol} periodType={periodType} />
        </div>
      </div>
    </div>
  );
}
