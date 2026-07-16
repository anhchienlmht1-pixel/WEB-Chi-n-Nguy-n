import { useState } from "react";
import type { ChartResolution } from "../utils/aggregate";
import type { ChartType } from "./PriceChart";

const RESOLUTIONS: { value: ChartResolution; label: string }[] = [
  { value: "D", label: "Ngày" },
  { value: "W", label: "Tuần" },
  { value: "M", label: "Tháng" },
];

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: "candlestick", label: "Nến" },
  { value: "bar", label: "Thanh" },
  { value: "line", label: "Đường" },
  { value: "area", label: "Vùng" },
];

export default function ChartToolbar({
  symbol,
  resolution,
  onResolutionChange,
  chartType,
  onChartTypeChange,
  onOpenIndicators,
  onScreenshot,
  onFullscreen,
}: {
  symbol: string;
  resolution: ChartResolution;
  onResolutionChange: (r: ChartResolution) => void;
  chartType: ChartType;
  onChartTypeChange: (t: ChartType) => void;
  onOpenIndicators: () => void;
  onScreenshot: () => void;
  onFullscreen: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [chartTypeOpen, setChartTypeOpen] = useState(false);

  function share() {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-2 py-1.5 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {symbol}
        </span>

        <div className="flex gap-0.5 rounded-md border border-slate-200 p-0.5 text-xs font-medium dark:border-slate-700">
          {RESOLUTIONS.map((r) => (
            <button
              key={r.value}
              onClick={() => onResolutionChange(r.value)}
              className={`rounded px-2 py-1 transition-colors ${
                resolution === r.value
                  ? "bg-emerald-500 text-slate-950"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onOpenIndicators}
          className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Chỉ báo
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setChartTypeOpen((v) => !v)}
            className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Biểu đồ: {CHART_TYPES.find((c) => c.value === chartType)?.label} ▾
          </button>
          {chartTypeOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setChartTypeOpen(false)} />
              <div className="absolute left-0 top-full z-20 mt-1 w-32 rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                {CHART_TYPES.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => {
                      onChartTypeChange(c.value);
                      setChartTypeOpen(false);
                    }}
                    className={`block w-full px-3 py-1.5 text-left text-xs ${
                      chartType === c.value
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          title="Chụp ảnh biểu đồ"
          onClick={onScreenshot}
          className="flex h-7 w-7 items-center justify-center rounded text-sm text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          📷
        </button>
        <button
          type="button"
          title="Toàn màn hình"
          onClick={onFullscreen}
          className="flex h-7 w-7 items-center justify-center rounded text-sm text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          ⛶
        </button>
        <button
          type="button"
          title="Chia sẻ"
          onClick={share}
          className="flex h-7 items-center justify-center rounded px-2 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          {copied ? "Đã sao chép" : "🔗 Chia sẻ"}
        </button>
      </div>
    </div>
  );
}
