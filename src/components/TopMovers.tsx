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
          <div key={i} className="h-64 rounded-2xl border border-neutral-800 bg-neutral-900/60 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || !data || data.quotes.length === 0) {
    return (
      <div className="rounded-2xl border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-300">
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
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-lg shadow-black/20">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-300">
        <span className={clsx("h-1.5 w-1.5 rounded-full", positive ? "bg-emerald-400" : "bg-rose-400")} />
        {title}
      </h3>
      <ul className="divide-y divide-neutral-800">
        {items.map((q) => {
          const meta = findStock(q.symbol);
          return (
            <li key={q.symbol}>
              <Link
                href={`/co-phieu/${q.symbol}`}
                className="flex items-center justify-between rounded-lg px-1.5 py-2.5 text-sm transition-colors hover:bg-brand-500/10"
              >
                <div>
                  <span className="font-semibold text-neutral-100">{q.symbol}</span>
                  {meta && <span className="ml-2 text-xs text-neutral-500">{meta.exchange}</span>}
                </div>
                <div className="text-right">
                  <div className="tabular-nums font-medium text-neutral-100">{formatPrice(q.price)}</div>
                  <div
                    className={clsx(
                      "tabular-nums text-xs font-medium",
                      positive ? "text-emerald-400" : "text-rose-400"
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
