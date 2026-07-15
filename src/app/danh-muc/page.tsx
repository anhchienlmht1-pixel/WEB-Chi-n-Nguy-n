"use client";

import { X } from "lucide-react";
import { TradingViewMarketOverview } from "@/components/TradingViewMarketOverview";
import { useWatchlist } from "@/lib/watchlist";
import { findStock, tvSymbol } from "@/lib/symbols";

export default function DanhMucPage() {
  const { symbols, remove } = useWatchlist();

  const tabs = [
    {
      title: "Theo dõi",
      symbols: symbols.map((symbol) => {
        const meta = findStock(symbol);
        return { s: meta ? tvSymbol(meta) : `HOSE:${symbol}`, d: meta?.name ?? symbol };
      }),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">Danh mục theo dõi</h1>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Danh sách được lưu trên trình duyệt của bạn. Bấm biểu tượng ngôi sao ở trang chi tiết mã để thêm/bớt.
      </p>

      {symbols.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500 dark:border-neutral-700">
          Danh mục theo dõi đang trống. Tìm một mã cổ phiếu và bấm biểu tượng ngôi sao để thêm vào đây.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {symbols.map((symbol) => (
              <button
                key={symbol}
                onClick={() => remove(symbol)}
                className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-semibold text-neutral-700 transition-colors hover:border-red-300 hover:text-red-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-red-800 dark:hover:text-red-400"
              >
                {symbol}
                <X size={12} />
              </button>
            ))}
          </div>
          <TradingViewMarketOverview tabs={tabs} height={Math.max(220, symbols.length * 46)} />
        </>
      )}
    </div>
  );
}
