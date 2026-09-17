import TradingViewChart from "./TradingViewChart";

export default function TechnicalChartPanel({
  symbol,
  height = 420,
  exchange,
  // kept for API compatibility with callers — not used with TradingView widget
  preferSource: _preferSource,
  onSymbolChange: _onSymbolChange,
}: {
  symbol: string;
  height?: number;
  exchange?: string;
  preferSource?: string;
  onSymbolChange?: (symbol: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
      <TradingViewChart symbol={symbol} exchange={exchange} height={height} />
    </div>
  );
}
