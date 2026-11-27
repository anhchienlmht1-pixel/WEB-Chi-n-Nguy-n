import { useParams } from "react-router-dom";
import { useLivePoll } from "../hooks/useMarketClock";
import { fetchQuote } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import SeasonalityHeatmap from "../components/SeasonalityHeatmap";
import BankFundamentals from "../components/BankFundamentals";
import { isBankSymbol } from "../utils/bankData";
import SecuritiesFundamentals from "../components/SecuritiesFundamentals";
import SecuritiesDetailView from "../components/SecuritiesDetailView";
import { isSecuritiesSymbol } from "../utils/securitiesData";
import AdvisorContactBar from "../components/AdvisorContactBar";
import FinancialSnapshot from "../components/FinancialSnapshot";
import BankDetailSection, { DETAIL_BANKS } from "../components/BankDetailSection";
import SecuritiesDetailSection from "../components/SecuritiesDetailSection";
import { SEC_SYMBOLS } from "../data/securities";
import RealEstateDetailSection from "../components/RealEstateDetailSection";
import { RE_SYMBOLS } from "../data/realestate";
import StockSummary from "../components/StockSummary";


export default function StockDetail() {
  const { symbol = "" } = useParams();
  const quoteState = usePolling(() => fetchQuote(symbol), [symbol], useLivePoll(5000));
  const quote = quoteState.data;
  const isIndexOrFutures = quote?.exchange === "Chỉ số" || quote?.exchange === "Phái sinh";

  if (quoteState.error && !quote) {
    return (
      <div className="gutter-x mx-auto max-w-[1920px] py-10 text-center">
        <p className="text-slate-500 dark:text-slate-400">
          Không tải được mã "{symbol}": {quoteState.error}
        </p>
      </div>
    );
  }

  return (
    <div className="gutter-x mx-auto max-w-[1920px] py-10">
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

      {quote && (
        <>
          {!isIndexOrFutures && (
            <div className="mt-6">
              {DETAIL_BANKS.has(quote.symbol) ? (
                <BankDetailSection symbol={quote.symbol} />
              ) : SEC_SYMBOLS.has(quote.symbol) ? (
                <SecuritiesDetailSection symbol={quote.symbol} />
              ) : RE_SYMBOLS.has(quote.symbol) ? (
                <RealEstateDetailSection symbol={quote.symbol} />
              ) : (
                <FinancialSnapshot symbol={quote.symbol} />
              )}
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
