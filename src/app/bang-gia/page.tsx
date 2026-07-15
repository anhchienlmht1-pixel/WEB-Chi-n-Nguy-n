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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-800">Bảng giá cổ phiếu</h1>
        <div className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white p-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={clsx(
                "rounded-md px-3 py-1 text-sm font-medium",
                filter === f.value ? "bg-neutral-900 text-white" : "text-neutral-500 hover:bg-neutral-100"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-neutral-400">
        Đỏ: tăng giá · Xanh lá: giảm giá · Vàng: giá tham chiếu · Tím: giá trần · Xanh lam: giá sàn.
      </p>
      <StockTable symbols={symbols} />
    </div>
  );
}
