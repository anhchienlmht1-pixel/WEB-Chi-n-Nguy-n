import { fetchMacroIndicators } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import type { MacroIndicator } from "../types";

function formatValue(value: number, unit: string): string {
  const digits = unit.includes("VND") ? 0 : 1;
  return value.toLocaleString("vi-VN", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function Sparkline({ series }: { series: MacroIndicator["series"] }) {
  const width = 280;
  const height = 64;
  const pad = 4;
  if (series.length < 2) return null;

  const values = series.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = series.map((p, i) => {
    const x = pad + (i / (series.length - 1)) * (width - pad * 2);
    const y = height - pad - ((p.value - min) / range) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const last = series[series.length - 1];
  const first = series[0];
  const trendUp = last.value >= first.value;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={trendUp ? "#10b981" : "#ef4444"}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IndicatorCard({ indicator }: { indicator: MacroIndicator }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{indicator.name}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
        {formatValue(indicator.latestValue, indicator.unit)}
        <span className="ml-1.5 text-sm font-normal text-slate-400">{indicator.unit}</span>
      </p>
      <p className="text-xs text-slate-400 dark:text-slate-500">Năm {indicator.latestYear}</p>
      <div className="mt-3">
        <Sparkline series={indicator.series} />
      </div>
      <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
        {indicator.series[0]?.year}–{indicator.series[indicator.series.length - 1]?.year}
      </p>
    </div>
  );
}

export default function Macro() {
  const { data, error, loading } = usePolling(fetchMacroIndicators, [], 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Chỉ số vĩ mô Việt Nam</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Nguồn: World Bank Open Data. Dữ liệu công bố theo năm, thường trễ 1-2 năm so với hiện tại — khác với dữ liệu
        giá cổ phiếu thời gian thực ở các trang khác.
      </p>

      {loading && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
          <p className="font-medium text-red-600 dark:text-red-400">Không tải được dữ liệu vĩ mô</p>
          <p className="mt-1 text-sm text-red-500 dark:text-red-300/90">{error}</p>
        </div>
      )}

      {!loading && !error && data && data.indicators.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.indicators.map((ind) => (
            <IndicatorCard key={ind.code} indicator={ind} />
          ))}
        </div>
      )}
    </div>
  );
}
