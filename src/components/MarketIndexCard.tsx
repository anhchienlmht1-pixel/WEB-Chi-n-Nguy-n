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
          <div key={i} className="h-32 rounded-2xl border border-neutral-800 bg-neutral-900/60 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || !data || data.indices.length === 0) {
    return (
      <div className="rounded-2xl border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-300">
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
            className="group relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-lg shadow-black/20 backdrop-blur-sm transition-colors hover:border-brand-700"
          >
            <div className="glow-radial pointer-events-none absolute inset-0 opacity-60" />
            <div className="relative flex items-start justify-between">
              <div>
                <div className="text-sm font-medium text-neutral-400">{idx.name}</div>
                <div className="mt-1.5 text-[26px] font-bold leading-none tabular-nums text-neutral-50">
                  {formatIndexValue(idx.value)}
                </div>
                <div
                  className={clsx(
                    "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-semibold tabular-nums",
                    positive ? "bg-rose-400/10 text-rose-400" : "bg-emerald-400/10 text-emerald-400"
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
        <div className="sm:col-span-3 text-xs text-amber-400">
          Không lấy được dữ liệu cho: {data.failed.join(", ")}
        </div>
      )}
    </div>
  );
}
