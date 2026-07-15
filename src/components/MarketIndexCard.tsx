"use client";

import useSWR from "swr";
import clsx from "clsx";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
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
          <div key={i} className="h-32 rounded-2xl border border-neutral-200 bg-white animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || !data || data.indices.length === 0) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Không thể tải dữ liệu chỉ số thị trường từ VNDirect. Vui lòng thử lại sau.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {data.indices.map((idx) => {
        const positive = idx.change >= 0;
        return (
          <div
            key={idx.code}
            className="group rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm shadow-neutral-900/[0.02] transition-shadow hover:shadow-md hover:shadow-neutral-900/[0.04]"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-medium text-neutral-500">{idx.name}</div>
                <div className="mt-1.5 text-[26px] font-bold leading-none tabular-nums text-neutral-900">
                  {formatIndexValue(idx.value)}
                </div>
                <div
                  className={clsx(
                    "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-semibold tabular-nums",
                    positive ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                  )}
                >
                  {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
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
