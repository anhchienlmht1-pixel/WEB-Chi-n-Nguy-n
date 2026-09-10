import { useState } from "react";
import type { IndicatorDef } from "../utils/indicatorCatalog";

export default function IndicatorSettings({
  def,
  initialParams,
  onApply,
  onClose,
}: {
  def: IndicatorDef;
  initialParams: Record<string, number>;
  onApply: (params: Record<string, number>) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(def.params.map((p) => [p.key, String(initialParams[p.key] ?? p.default)]))
  );

  function apply() {
    const params: Record<string, number> = {};
    for (const p of def.params) {
      const n = Number(values[p.key]);
      params[p.key] = Number.isFinite(n) && n > 0 ? n : p.default;
    }
    onApply(params);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-24" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-lg bg-white shadow-xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Cài đặt: {def.nameEn} <span className="text-slate-400">({def.name})</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          {def.params.length === 0 && (
            <p className="text-sm text-slate-400 dark:text-slate-500">Chỉ báo này không có tham số điều chỉnh.</p>
          )}
          {def.params.map((p) => (
            <label key={p.key} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-600 dark:text-slate-300">{p.label}</span>
              <input
                type="number"
                min={1}
                step={p.key.toLowerCase().includes("stddev") || p.key.toLowerCase().includes("multiplier") ? 0.1 : 1}
                value={values[p.key] ?? ""}
                onChange={(e) => setValues((prev) => ({ ...prev, [p.key]: e.target.value }))}
                className="w-24 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-right text-sm text-slate-900 outline-none focus:border-slate-1000 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={apply}
            className="rounded-md bg-slate-1000 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-slate-300"
          >
            Áp dụng
          </button>
        </div>
      </div>
    </div>
  );
}
