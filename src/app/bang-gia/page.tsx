"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { StockTable } from "@/components/StockTable";
import { STOCKS } from "@/lib/symbols";
import { Exchange } from "@/lib/types";

const FILTERS: { label: string; value: Exchange | "ALL" }[] = [
  { label: "Tất cả", value: "ALL" },
  { label: "HOSE", value: "HOSE" },
  { label: "HNX", value: "HNX" },
  { label: "UPCOM", value: "UPCOM" },
];

export default function BangGiaPage() {
  const [filter, setFilter] = useState<Exchange | "ALL">("ALL");

  const symbols = useMemo(() => {
    return STOCKS.filter((s) => filter === "ALL" || s.exchange === filter).map((s) => s.symbol);
  }, [filter]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">Bảng giá cổ phiếu</h1>
        <div className="flex items-center gap-1 rounded-full border border-neutral-200 bg-white p-1 shadow-sm shadow-neutral-900/[0.02] dark:border-neutral-800 dark:bg-neutral-900/60 dark:shadow-lg dark:shadow-black/20">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={clsx(
                "rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
                filter === f.value
                  ? "bg-brand-600 text-white"
                  : "text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-neutral-500">
        Xanh lá: tăng giá · Đỏ: giảm giá · Vàng: giá tham chiếu · Tím: giá trần · Xanh lam: giá sàn.
      </p>
      <StockTable symbols={symbols} />
    </div>
  );
}
