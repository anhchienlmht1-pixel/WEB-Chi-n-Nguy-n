import type { DrawingTool } from "./PriceChart";

const TOOLS: { id: DrawingTool; icon: string; label: string }[] = [
  { id: null, icon: "↖", label: "Con trỏ" },
  { id: "trendline", icon: "╱", label: "Đường xu hướng" },
  { id: "hline", icon: "―", label: "Đường ngang" },
  { id: "rectangle", icon: "▭", label: "Hình chữ nhật" },
  { id: "text", icon: "T", label: "Văn bản" },
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
          className={`flex h-8 w-8 items-center justify-center rounded text-base transition-colors ${
            tool === t.id
              ? "bg-slate-1000 text-slate-950"
              : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          {t.icon}
        </button>
      ))}
      <div className="my-1 h-px w-6 bg-slate-200 dark:bg-slate-700" />
      <button
        type="button"
        title="Xóa hết"
        onClick={onClear}
        className="flex h-8 w-8 items-center justify-center rounded text-base text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        🗑
      </button>
    </div>
  );
}
