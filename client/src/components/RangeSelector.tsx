import type { HistoryRange } from "../types";

const RANGES: HistoryRange[] = ["1D", "1W", "1M", "3M", "6M", "1Y", "5Y"];

export default function RangeSelector({
  value,
  onChange,
}: {
  value: HistoryRange;
  onChange: (range: HistoryRange) => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg border border-slate-800 p-1">
      {RANGES.map((r) => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
            value === r ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:text-slate-100"
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  );
}
