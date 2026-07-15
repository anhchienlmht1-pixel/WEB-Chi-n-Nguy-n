"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import clsx from "clsx";
import { X } from "lucide-react";
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
      <div className="rounded-xl border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500">
        {emptyMessage}
      </div>
    );
  }

  if (error || (!isLoading && data && rows.length === 0)) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Không thể tải bảng giá từ VNDirect. Vui lòng thử lại sau.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
            <Th onClick={() => toggleSort("symbol")}>Mã CK</Th>
            <th className="px-3 py-2 text-left">Sàn</th>
            <Th onClick={() => toggleSort("price")} align="right">
              Giá
            </Th>
            <Th onClick={() => toggleSort("changePercent")} align="right">
              +/- %
            </Th>
            <th className="px-3 py-2 text-right">Trần</th>
            <th className="px-3 py-2 text-right">Sàn</th>
            <th className="px-3 py-2 text-right">TC</th>
            <Th onClick={() => toggleSort("volume")} align="right">
              KL
            </Th>
            <th className="px-3 py-2 text-center">Theo dõi</th>
            {onRemove && <th className="px-3 py-2" />}
          </tr>
        </thead>
        <tbody>
          {isLoading &&
            symbols.map((s) => (
              <tr key={s} className="border-b border-neutral-100">
                <td colSpan={onRemove ? 9 : 8} className="px-3 py-3">
                  <div className="h-4 w-full animate-pulse rounded bg-neutral-100" />
                </td>
              </tr>
            ))}
          {!isLoading &&
            rows.map((q) => {
              const meta = findStock(q.symbol);
              const state = priceState(q.price, q.refPrice, q.ceilingPrice, q.floorPrice);
              return (
                <tr key={q.symbol} className="border-b border-neutral-100 hover:bg-neutral-50">
                  <td className="px-3 py-2">
                    <Link href={`/co-phieu/${q.symbol}`} className="font-semibold text-neutral-900 hover:underline">
                      {q.symbol}
                    </Link>
                    {meta && <div className="text-xs text-neutral-400 truncate max-w-[180px]">{meta.name}</div>}
                  </td>
                  <td className="px-3 py-2 text-neutral-500">{meta?.exchange ?? "--"}</td>
                  <td className={clsx("px-3 py-2 text-right font-semibold tabular-nums", PRICE_COLOR[state])}>
                    {formatPrice(q.price)}
                  </td>
                  <td className={clsx("px-3 py-2 text-right tabular-nums", PRICE_COLOR[state])}>
                    {formatChange(q.change)} ({formatPercent(q.changePercent)})
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-fuchsia-500">
                    {formatPrice(q.ceilingPrice)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-sky-400">{formatPrice(q.floorPrice)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-amber-500">{formatPrice(q.refPrice)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-neutral-600">{formatVolume(q.volume)}</td>
                  <td className="px-3 py-2 text-center">
                    <WatchlistButton symbol={q.symbol} />
                  </td>
                  {onRemove && (
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        aria-label="Xóa khỏi danh mục"
                        onClick={() => onRemove(q.symbol)}
                        className="rounded p-1 text-neutral-300 hover:bg-neutral-100 hover:text-neutral-600"
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
  );
}

function Th({
  children,
  onClick,
  align = "left",
}: {
  children: React.ReactNode;
  onClick: () => void;
  align?: "left" | "right";
}) {
  return (
    <th
      onClick={onClick}
      className={clsx(
        "cursor-pointer select-none px-3 py-2 hover:text-neutral-700",
        align === "right" && "text-right"
      )}
    >
      {children}
    </th>
  );
}
