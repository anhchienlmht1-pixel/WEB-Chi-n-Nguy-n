import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchQuote } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import type { Quote } from "../types";
import { formatPercent, formatPrice, formatVolume, trendClass } from "../utils/format";

export default function StockComparator() {
  const [input, setInput] = useState("");
  const [symbols, setSymbols] = useState<string[]>(["FPT", "VIC", "TCB"]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Fetch quotes for all selected symbols
  const { data: quotes, loading } = usePolling(
    async () => {
      const results = await Promise.all(
        symbols.map(async (symbol) => {
          try {
            return await fetchQuote(symbol);
          } catch {
            return null;
          }
        })
      );
      return results.filter((q) => q !== null) as Quote[];
    },
    [symbols],
    10000 // Real-time: update every 10 seconds
  );

  const sortedQuotes = useMemo(() => {
    if (!quotes) return [];
    return [...quotes].sort((a, b) => (b.price * b.volume) - (a.price * a.volume));
  }, [quotes]);

  function addStock() {
    const symbol = input.trim().toUpperCase();
    if (!symbol) {
      setError("Nhập mã cổ phiếu");
      return;
    }
    if (symbols.includes(symbol)) {
      setError("Cổ phiếu đã có trong danh sách");
      return;
    }
    setSymbols([...symbols, symbol]);
    setInput("");
    setError("");
  }

  function removeStock(symbol: string) {
    setSymbols(symbols.filter((s) => s !== symbol));
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      addStock();
    }
  }

  return (
    <section>
      {/* Input Section */}
      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/40">
        <h3 className="mb-3 text-lg font-bold text-slate-900 dark:text-slate-100">Thêm Cổ Phiếu</h3>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError("");
            }}
            onKeyPress={handleKeyPress}
            placeholder="Nhập mã cổ phiếu (vd: FPT, VIC, TCB)"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <button
            onClick={addStock}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400"
          >
            Thêm
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-500 dark:text-red-400">{error}</p>}
      </div>

      {/* Selected Stocks Tags */}
      <div className="mb-6 flex flex-wrap gap-2">
        {symbols.map((symbol) => (
          <div
            key={symbol}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
          >
            {symbol}
            <button
              onClick={() => removeStock(symbol)}
              className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-200"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Comparison Table */}
      {loading && !quotes ? (
        <p className="text-slate-500 dark:text-slate-400">Đang tải dữ liệu...</p>
      ) : sortedQuotes.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400">Không có dữ liệu để so sánh</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[600px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                <th className="px-4 py-3 font-medium">Mã</th>
                <th className="px-4 py-3 font-medium">Tên</th>
                <th className="px-4 py-3 text-right font-medium">Giá</th>
                <th className="px-4 py-3 text-right font-medium">Thay Đổi</th>
                <th className="px-4 py-3 text-right font-medium">%</th>
                <th className="px-4 py-3 text-right font-medium">KL</th>
                <th className="px-4 py-3 text-right font-medium">GT GD</th>
              </tr>
            </thead>
            <tbody>
              {sortedQuotes.map((quote) => (
                <tr
                  key={quote.symbol}
                  onClick={() => navigate(`/stock/${quote.symbol}`)}
                  className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900/60"
                >
                  <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">{quote.symbol}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{quote.name}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-900 dark:text-slate-100">
                    {formatPrice(quote.price, quote.currency)}
                  </td>
                  <td className={`px-4 py-3 text-right tabular-nums ${trendClass(quote.change)}`}>
                    {quote.change >= 0 ? "+" : ""}{quote.change.toFixed(2)}
                  </td>
                  <td className={`px-4 py-3 text-right tabular-nums font-semibold ${trendClass(quote.changePercent)}`}>
                    {formatPercent(quote.changePercent)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-500 dark:text-slate-400">
                    {formatVolume(quote.volume)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-500 dark:text-slate-400">
                    {(quote.price * quote.volume / 1_000_000_000).toFixed(1)}tỷ
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
