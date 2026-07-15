"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import clsx from "clsx";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { StockQuote } from "@/lib/types";
import { findStock } from "@/lib/symbols";
import { formatChange, formatPercent, formatPrice, formatVolume } from "@/lib/format";
import { priceState, PRICE_COLOR } from "@/lib/market";
import { WatchlistButton } from "./WatchlistButton";

interface Response {
  quotes: StockQuote[];
  failed: string[];
}

type SortKey = "symbol" | "price" | "changePercent" | "volume";

export function StockTable({
  symbols,
  onRemove,
  emptyMessage = "Chưa có mã cổ phiếu nào.",
}: {
  symbols: string[];
  onRemove?: (symbol: string) => void;
  emptyMessage?: string;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("symbol");
  const [sortDir, setSortDir] = useState<1 | -1>(1);

  const query = symbols.join(",");
  const { data, error, isLoading } = useSWR<Response>(
    symbols.length > 0 ? `/api/quotes?symbols=${query}` : null,
    fetcher,
    { refreshInterval: 15000 }
  );

  const rows = useMemo(() => {
    if (!data) return [];
    const bySymbol = new Map(data.quotes.map((q) => [q.symbol, q]));
    const ordered = symbols.map((s) => bySymbol.get(s)).filter(Boolean) as StockQuote[];
    const sorted = [...ordered].sort((a, b) => {
      let diff = 0;
      if (sortKey === "symbol") diff = a.symbol.localeCompare(b.symbol);
      else diff = (a[sortKey] as number) - (b[sortKey] as number);
      return diff * sortDir;
    });
    return sorted;
  }, [data, symbols, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 1 ? -1 : 1));
    } else {
      setSortKey(key);
      setSortDir(1);
    }
  }

  if (symbols.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500 dark:border-neutral-700">
        {emptyMessage}
      </div>
    );
  }

  if (error || (!isLoading && data && rows.length === 0)) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
        Không thể tải bảng giá từ VNDirect. Vui lòng thử lại sau.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm shadow-neutral-900/[0.02] dark:border-neutral-800 dark:bg-neutral-900/60 dark:shadow-lg dark:shadow-black/20">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50/80 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900">
              <Th sortKey="symbol" active={sortKey} dir={sortDir} onClick={() => toggleSort("symbol")}>
                Mã CK
              </Th>
              <th className="px-4 py-3 text-left">Sàn</th>
              <Th sortKey="price" active={sortKey} dir={sortDir} onClick={() => toggleSort("price")} align="right">
                Giá
              </Th>
              <Th
                sortKey="changePercent"
                active={sortKey}
                dir={sortDir}
                onClick={() => toggleSort("changePercent")}
                align="right"
              >
                +/- %
              </Th>
              <th className="px-4 py-3 text-right">Trần</th>
              <th className="px-4 py-3 text-right">Sàn</th>
              <th className="px-4 py-3 text-right">TC</th>
              <Th sortKey="volume" active={sortKey} dir={sortDir} onClick={() => toggleSort("volume")} align="right">
                KL
              </Th>
              <th className="px-4 py-3 text-center">Theo dõi</th>
              {onRemove && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              symbols.map((s) => (
                <tr key={s} className="border-b border-neutral-100 dark:border-neutral-800">
                  <td colSpan={onRemove ? 9 : 8} className="px-4 py-3.5">
                    <div className="h-4 w-full animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
                  </td>
                </tr>
              ))}
            {!isLoading &&
              rows.map((q) => {
                const meta = findStock(q.symbol);
                const state = priceState(q.price, q.refPrice, q.ceilingPrice, q.floorPrice);
                return (
                  <tr
                    key={q.symbol}
                    className="border-b border-neutral-100 transition-colors last:border-0 hover:bg-brand-50/60 dark:border-neutral-800 dark:hover:bg-brand-500/10"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/co-phieu/${q.symbol}`}
                        className="font-semibold text-neutral-900 hover:text-brand-700 dark:text-neutral-100 dark:hover:text-brand-300"
                      >
                        {q.symbol}
                      </Link>
                      {meta && (
                        <div className="text-xs text-neutral-400 truncate max-w-[180px] dark:text-neutral-500">
                          {meta.name}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                        {meta?.exchange ?? "--"}
                      </span>
                    </td>
                    <td className={clsx("px-4 py-3 text-right font-semibold tabular-nums", PRICE_COLOR[state])}>
                      {formatPrice(q.price)}
                    </td>
                    <td className={clsx("px-4 py-3 text-right tabular-nums", PRICE_COLOR[state])}>
                      {formatChange(q.change)} ({formatPercent(q.changePercent)})
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-fuchsia-600 dark:text-fuchsia-400">
                      {formatPrice(q.ceilingPrice)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-sky-600 dark:text-sky-400">
                      {formatPrice(q.floorPrice)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-amber-600 dark:text-amber-300">
                      {formatPrice(q.refPrice)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-neutral-500 dark:text-neutral-400">
                      {formatVolume(q.volume)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <WatchlistButton symbol={q.symbol} />
                    </td>
                    {onRemove && (
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          aria-label="Xóa khỏi danh mục"
                          onClick={() => onRemove(q.symbol)}
                          className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                        >
                          <X size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  children,
  onClick,
  align = "left",
  sortKey,
  active,
  dir,
}: {
  children: React.ReactNode;
  onClick: () => void;
  align?: "left" | "right";
  sortKey: SortKey;
  active: SortKey;
  dir: 1 | -1;
}) {
  const isActive = sortKey === active;
  return (
    <th
      onClick={onClick}
      className={clsx(
        "cursor-pointer select-none px-4 py-3 hover:text-neutral-700 dark:hover:text-neutral-300",
        align === "right" && "text-right"
      )}
    >
      <span
        className={clsx(
          "inline-flex items-center gap-0.5",
          align === "right" && "flex-row-reverse",
          isActive && "text-brand-700 dark:text-brand-300"
        )}
      >
        {children}
        {isActive && (dir === 1 ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
      </span>
    </th>
  );
}
