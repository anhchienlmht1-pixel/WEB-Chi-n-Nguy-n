import { useState } from "react";
import TrendSignalScanner from "../components/TrendSignalScanner";
import TechnicalChartPanel from "../components/TechnicalChartPanel";

const DEFAULT_CHART_SYMBOL = "VNINDEX";

// "THỰC CHIẾN CỔ PHIẾU" — chart + trend-following buy signals in one
// place. The sector-by-sector Leader Board used to live here too; it's
// now on the Thị trường page instead (see components/LeaderBoard.tsx).
export default function StockStrength() {
  const [chartSymbol, setChartSymbol] = useState(DEFAULT_CHART_SYMBOL);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-4">
      <div className="mb-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          THỰC CHIẾN CỔ PHIẾU
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Biểu đồ kỹ thuật và tín hiệu MUA trend-following — tất cả trong một trang.
        </p>
      </div>

      <div className="mb-4">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Biểu đồ kỹ thuật
        </h2>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            <TechnicalChartPanel symbol={chartSymbol} onSymbolChange={setChartSymbol} height={420} />
          </div>
          <div className="w-full shrink-0 lg:w-80">
            <TrendSignalScanner onSelectSymbol={setChartSymbol} />
          </div>
        </div>
      </div>
    </div>
  );
}
