import { MousePointer2, TrendingUp, Minus, Square, Type, Trash2, type LucideIcon } from "lucide-react";
import type { DrawingTool } from "./PriceChart";

const TOOLS: { id: DrawingTool; icon: LucideIcon; label: string }[] = [
  { id: null, icon: MousePointer2, label: "Con trỏ" },
  { id: "trendline", icon: TrendingUp, label: "Đường xu hướng" },
  { id: "hline", icon: Minus, label: "Đường ngang" },
  { id: "rectangle", icon: Square, label: "Hình chữ nhật" },
  { id: "text", icon: Type, label: "Văn bản" },
];

export default function DrawingToolbar({
  tool,
  onSelect,
  onClear,
}: {
  tool: DrawingTool;
  onSelect: (tool: DrawingTool) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex w-11 shrink-0 flex-col items-center gap-1 border-r border-slate-200 bg-white py-2 dark:border-slate-800 dark:bg-slate-900/40">
      {TOOLS.map((t) => (
        <button
          key={String(t.id)}
          type="button"
          title={t.label}
          onClick={() => onSelect(t.id)}
          className={`flex h-8 w-8 items-center justify-center rounded transition-colors duration-300 ${
            tool === t.id
              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
              : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          <t.icon className="h-4 w-4" strokeWidth={1.75} />
        </button>
      ))}
      <div className="my-1 h-px w-6 bg-slate-200 dark:bg-slate-700" />
      <button
        type="button"
        title="Xóa hết"
        onClick={onClear}
        className="flex h-8 w-8 items-center justify-center rounded text-slate-500 transition-colors duration-300 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        <Trash2 className="h-4 w-4" strokeWidth={1.75} />
      </button>
    </div>
  );
}
