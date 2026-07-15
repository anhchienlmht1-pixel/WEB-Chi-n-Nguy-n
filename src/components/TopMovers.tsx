"use client";

import useSWR from "swr";
import Link from "next/link";
import clsx from "clsx";
import { fetcher } from "@/lib/fetcher";
import { StockQuote } from "@/lib/types";
import { DEFAULT_BOARD_SYMBOLS, findStock } from "@/lib/symbols";
import { formatPercent, formatPrice } from "@/lib/format";

interface Response {
  quotes: StockQuote[];
}

export function TopMovers() {
  const { data, error, isLoading } = useSWR<Response>(
    `/api/quotes?symbols=${DEFAULT_BOARD_SYMBOLS.join(",")}`,
    fetcher,
    { refreshInterval: 20000 }
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="h-64 rounded-2xl border border-neutral-200 bg-white animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || !data || data.quotes.length === 0) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Không thể tải danh sách tăng/giảm mạnh nhất.
      </div>
    );
  }

  const sorted = [...data.quotes].sort((a, b) => b.changePercent - a.changePercent);
  const gainers = sorted.slice(0, 5);
  const losers = sorted.slice(-5).reverse();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <MoversCard title="Tăng mạnh nhất" items={gainers} positive />
      <MoversCard title="Giảm mạnh nhất" items={losers} positive={false} />
    </div>
  );
}

function MoversCard({
  title,
  items,
  positive,
}: {
  title: string;
  items: StockQuote[];
  positive: boolean;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm shadow-neutral-900/[0.02]">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-700">
        <span className={clsx("h-1.5 w-1.5 rounded-full", positive ? "bg-rose-500" : "bg-emerald-500")} />
        {title}
      </h3>
      <ul className="divide-y divide-neutral-100">
        {items.map((q) => {
          const meta = findStock(q.symbol);
          return (
            <li key={q.symbol}>
              <Link
                href={`/co-phieu/${q.symbol}`}
                className="flex items-center justify-between rounded-lg px-1.5 py-2.5 text-sm transition-colors hover:bg-brand-50/50"
              >
                <div>
                  <span className="font-semibold text-neutral-900">{q.symbol}</span>
                  {meta && <span className="ml-2 text-xs text-neutral-400">{meta.exchange}</span>}
                </div>
                <div className="text-right">
                  <div className="tabular-nums font-medium text-neutral-900">{formatPrice(q.price)}</div>
                  <div
                    className={clsx(
                      "tabular-nums text-xs font-medium",
                      positive ? "text-rose-500" : "text-emerald-500"
                    )}
                  >
                    {formatPercent(q.changePercent)}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
