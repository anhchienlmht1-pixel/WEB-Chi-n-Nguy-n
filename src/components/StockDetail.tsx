"use client";

import { CompanyProfileCard } from "./CompanyProfileCard";
import { FinancialRatios } from "./FinancialRatios";
import { StockChart } from "./StockChart";

export function StockDetail({ symbol }: { symbol: string }) {
  return (
    <div className="flex flex-col gap-6">
      <CompanyProfileCard symbol={symbol} />

      <StockChart symbol={symbol} />

      <div id="financial-ratios">
        <FinancialRatios symbol={symbol} />
      </div>
    </div>
  );
}
