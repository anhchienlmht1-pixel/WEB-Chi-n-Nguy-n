"use client";

import useSWR from "swr";
import clsx from "clsx";
import { fetcher } from "@/lib/fetcher";
import { IndexQuote } from "@/lib/types";
import { formatChange, formatIndexValue, formatPercent } from "@/lib/format";
import { Sparkline } from "./Sparkline";

interface Response {
  indices: IndexQuote[];
  failed: string[];
}

export function MarketIndexCards() {
  const { data, error, isLoading } = useSWR<Response>("/api/indices", fetcher, {
    refreshInterval: 20000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 rounded-xl border border-neutral-200 bg-white animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || !data || data.indices.length === 0) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Không thể tải dữ liệu chỉ số thị trường từ VNDirect. Vui lòng thử lại sau.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {data.indices.map((idx) => {
        const positive = idx.change >= 0;
        return (
          <div key={idx.code} className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-medium text-neutral-500">{idx.name}</div>
                <div className="mt-1 text-2xl font-bold tabular-nums text-neutral-900">
                  {formatIndexValue(idx.value)}
                </div>
                <div
                  className={clsx(
                    "mt-1 text-sm font-medium tabular-nums",
                    positive ? "text-rose-500" : "text-emerald-500"
                  )}
                >
                  {formatChange(idx.change)} ({formatPercent(idx.changePercent)})
                </div>
              </div>
              <Sparkline data={idx.history.map((h) => h.value)} positive={positive} />
            </div>
          </div>
        );
      })}
      {data.failed.length > 0 && (
        <div className="sm:col-span-3 text-xs text-amber-600">
          Không lấy được dữ liệu cho: {data.failed.join(", ")}
        </div>
      )}
    </div>
  );
}
