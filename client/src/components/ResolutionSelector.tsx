import type { ChartResolution } from "../utils/aggregate";

const RESOLUTIONS: { value: ChartResolution; label: string }[] = [
  { value: "D", label: "Ngày" },
  { value: "W", label: "Tuần" },
  { value: "M", label: "Tháng" },
];

export default function ResolutionSelector({
  value,
  onChange,
}: {
  value: ChartResolution;
  onChange: (resolution: ChartResolution) => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg border border-slate-200 p-1 dark:border-slate-800">
      {RESOLUTIONS.map((r) => (
        <button
          key={r.value}
          onClick={() => onChange(r.value)}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
            value === r.value
              ? "bg-emerald-500 text-slate-950"
              : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
