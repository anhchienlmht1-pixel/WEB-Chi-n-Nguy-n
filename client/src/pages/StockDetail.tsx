import { useParams } from "react-router-dom";
import { useState } from "react";
import { fetchQuote } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import TechnicalChartPanel from "../components/TechnicalChartPanel";
import SeasonalityHeatmap from "../components/SeasonalityHeatmap";
import NewsFeed from "../components/NewsFeed";
import BankFundamentals from "../components/BankFundamentals";
import { isBankSymbol } from "../utils/bankData";
import SecuritiesFundamentals from "../components/SecuritiesFundamentals";
import SecuritiesDetailView from "../components/SecuritiesDetailView";
import { isSecuritiesSymbol } from "../utils/securitiesData";
import CompanyProfileCard from "../components/CompanyProfileCard";
import ForeignFlowPanel from "../components/ForeignFlowPanel";
import StockOutlookPanel from "../components/StockOutlookPanel";
import SystemAssessment from "../components/SystemAssessment";
import PositionTracker from "../components/PositionTracker";
import AdvisorContactBar from "../components/AdvisorContactBar";
import FinancialSnapshot from "../components/FinancialSnapshot";
import StockSummary from "../components/StockSummary";

const SIDEBAR_TABS = [
  { key: "tong-quan", label: "Tổng quan" },
  { key: "tin-hieu", label: "Tín hiệu" },
  { key: "ctck-kn", label: "CTCK KN" },
  { key: "tin-tuc", label: "Tin tức" },
] as const;
type SidebarTabKey = (typeof SIDEBAR_TABS)[number]["key"];

export default function StockDetail() {
  const { symbol = "" } = useParams();
  const quoteState = usePolling(() => fetchQuote(symbol), [symbol], 30000);
  const quote = quoteState.data;
  const isIndexOrFutures = quote?.exchange === "Chỉ số" || quote?.exchange === "Phái sinh";
  const [activeTab, setActiveTab] = useState<SidebarTabKey>("tong-quan");

  if (quoteState.error && !quote) {
    return (
      <div className="gutter-x mx-auto max-w-[1800px] py-10 text-center">
        <p className="text-slate-500 dark:text-slate-400">
          Không tải được mã "{symbol}": {quoteState.error}
        </p>
      </div>
    );
  }

  return (
    <div className="gutter-x mx-auto max-w-[1800px] py-6">
      {/* The chart only needs the symbol from the URL, so it starts loading its
          history right away, in parallel with the quote. It used to wait for
          the quote (to pin the same data source), so the two network round
          trips ran one after the other. Everything that needs the quote
          (summary, side panels, tables) still waits for it. */}
      {quote ? (
        <StockSummary quote={quote} isIndexOrFutures={isIndexOrFutures} />
      ) : (
        <div
          aria-hidden
          className="mb-8 h-[30rem] animate-pulse rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40 lg:h-48"
        />
      )}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[2fr_1fr]">
        <div>
          <TechnicalChartPanel symbol={symbol} height={440} />

          {quote && (
            <p className="mt-4 text-xs text-slate-400 dark:text-slate-600">
              Cập nhật lúc {new Date(quote.updatedAt).toLocaleTimeString("vi-VN")}
            </p>
          )}
        </div>

        <div className="space-y-3">
          {quote && !isIndexOrFutures && (
            <>
              <div className="flex gap-1 overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900/40">
                {SIDEBAR_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`shrink-0 rounded px-3 py-1.5 text-xs font-semibold transition-colors duration-300 ${
                      activeTab === tab.key
                        ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100"
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === "tong-quan" && (
                <div className="space-y-3">
                  <PositionTracker symbol={quote.symbol} currency={quote.currency} />
                  <CompanyProfileCard symbol={quote.symbol} fallbackName={quote.name} />
                  <ForeignFlowPanel quote={quote} />
                </div>
              )}
              {activeTab === "tin-hieu" && <SystemAssessment symbol={quote.symbol} />}
              {activeTab === "ctck-kn" && <StockOutlookPanel symbol={quote.symbol} />}
              {activeTab === "tin-tuc" && <NewsFeed symbol={quote.symbol} />}
            </>
          )}
        </div>
      </div>

      {quote && (
        <>
          {!isIndexOrFutures && (
            <div className="mt-6">
              <FinancialSnapshot symbol={quote.symbol} />
            </div>
          )}

          {isBankSymbol(quote.symbol) && (
            <div className="mt-6">
              <BankFundamentals symbol={quote.symbol} />
            </div>
          )}

          {isSecuritiesSymbol(quote.symbol) && (
            <div className="mt-6">
              <SecuritiesFundamentals symbol={quote.symbol} />
            </div>
          )}

          {isSecuritiesSymbol(quote.symbol) && (
            <div className="mt-6 overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
              <SecuritiesDetailView symbol={quote.symbol} />
            </div>
          )}

          <div className="mt-6">
            <SeasonalityHeatmap symbol={quote.symbol} />
          </div>

          <AdvisorContactBar />
        </>
      )}
    </div>
  );
}
