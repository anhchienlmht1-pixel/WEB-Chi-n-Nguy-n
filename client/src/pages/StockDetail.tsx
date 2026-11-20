import { useParams } from "react-router-dom";
import { useLivePoll } from "../hooks/useMarketClock";
import { useState } from "react";
import { fetchQuote } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import SeasonalityHeatmap from "../components/SeasonalityHeatmap";
import BankFundamentals from "../components/BankFundamentals";
import { isBankSymbol } from "../utils/bankData";
import SecuritiesFundamentals from "../components/SecuritiesFundamentals";
import SecuritiesDetailView from "../components/SecuritiesDetailView";
import { isSecuritiesSymbol } from "../utils/securitiesData";
import StockOutlookPanel from "../components/StockOutlookPanel";
import SystemAssessment from "../components/SystemAssessment";
import AdvisorContactBar from "../components/AdvisorContactBar";
import FinancialSnapshot from "../components/FinancialSnapshot";
import BankDetailSection, { DETAIL_BANKS } from "../components/BankDetailSection";
import StockSummary from "../components/StockSummary";

const SIDEBAR_TABS = [
  { key: "tin-hieu", label: "Tín hiệu" },
  { key: "ctck-kn", label: "CTCK KN" },
] as const;
type SidebarTabKey = (typeof SIDEBAR_TABS)[number]["key"];

export default function StockDetail() {
  const { symbol = "" } = useParams();
  const quoteState = usePolling(() => fetchQuote(symbol), [symbol], useLivePoll(15000));
  const quote = quoteState.data;
  const isIndexOrFutures = quote?.exchange === "Chỉ số" || quote?.exchange === "Phái sinh";
  const [activeTab, setActiveTab] = useState<SidebarTabKey>("tin-hieu");

  if (quoteState.error && !quote) {
    return (
      <div className="gutter-x mx-auto max-w-[1280px] py-10 text-center">
        <p className="text-slate-500 dark:text-slate-400">
          Không tải được mã "{symbol}": {quoteState.error}
        </p>
      </div>
    );
  }

  return (
    <div className="gutter-x mx-auto max-w-[1280px] py-10">
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

      {/* Biểu đồ giá nằm trong phần tổng quan ở trên; bên dưới là các thẻ
          thông tin trải rộng hết trang. */}
      {quote && !isIndexOrFutures && (
        <section aria-label="Thông tin mã">
          <div role="tablist" aria-label="Thông tin mã" className="flex gap-1 overflow-x-auto border-b border-[var(--sm-line)]">
            {SIDEBAR_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                role="tab"
                aria-selected={activeTab === tab.key}
                className={`-mb-px min-h-11 shrink-0 border-b-2 px-4 text-base font-semibold transition-colors duration-200 ${
                  activeTab === tab.key
                    ? "border-[var(--sm-gold)] text-[var(--sm-egg)]"
                    : "border-transparent text-[var(--sm-mut)] hover:text-[var(--sm-egg)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {activeTab === "tin-hieu" && <SystemAssessment symbol={quote.symbol} />}
            {activeTab === "ctck-kn" && <StockOutlookPanel symbol={quote.symbol} />}
          </div>
        </section>
      )}

      {quote && (
        <>
          {!isIndexOrFutures && (
            <div className="mt-6">
              {DETAIL_BANKS.has(quote.symbol) ? <BankDetailSection symbol={quote.symbol} /> : <FinancialSnapshot symbol={quote.symbol} />}
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
