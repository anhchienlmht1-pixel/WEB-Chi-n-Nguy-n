"use client";

import { useTheme } from "@/lib/theme";

interface Props {
  label: string;
  periods: string[];
  values: (number | null)[];
  percent: boolean;
  height?: number;
}

const UP_COLOR = { light: "#059669", dark: "#34d399" };
const DOWN_COLOR = { light: "#e11d48", dark: "#fb7185" };

export function RatioBarChart({ label, periods, values, percent, height = 120 }: Props) {
  const { theme } = useTheme();
  const numeric = values.filter((v): v is number => v !== null);
  if (numeric.length === 0) return null;

  const max = Math.max(...numeric, 0);
  const min = Math.min(...numeric, 0);
  const range = max - min || 1;
  const zeroFromBottom = ((0 - min) / range) * height;

  const upColor = theme === "dark" ? UP_COLOR.dark : UP_COLOR.light;
  const downColor = theme === "dark" ? DOWN_COLOR.dark : DOWN_COLOR.light;

  return (
    <div>
      <div className="mb-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400">{label}</div>
      <div className="flex items-end gap-1.5" style={{ height }}>
        {values.map((value, i) => {
          if (value === null) return <div key={i} className="flex-1" />;

          const barHeight = Math.max((Math.abs(value) / range) * height, 2);
          const prev = values[i - 1];
          const isUp = i === 0 || prev === null || prev === undefined || prev <= value;
          const bottom = value >= 0 ? zeroFromBottom : zeroFromBottom - barHeight;

          return (
            <div key={i} className="group relative flex-1" style={{ height }}>
              <div
                className="absolute w-full rounded-sm transition-opacity group-hover:opacity-80"
                style={{ height: barHeight, bottom, backgroundColor: isUp ? upColor : downColor }}
              />
              <div className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] text-white group-hover:block dark:bg-neutral-100 dark:text-neutral-900">
                {percent ? `${(value * 100).toFixed(2)}%` : value.toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-1.5 text-[10px] text-neutral-400 dark:text-neutral-500">
        {periods.map((p, i) => (
          <div key={i} className="flex-1 truncate text-center">
            {i % 2 === 0 ? p : ""}
          </div>
        ))}
      </div>
    </div>
  );
}
