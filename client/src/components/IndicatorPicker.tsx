import { useMemo, useState } from "react";
import { INDICATOR_CATALOG } from "../utils/indicatorCatalog";

export default function IndicatorPicker({
  activeIds,
  onAdd,
  onClose,
}: {
  activeIds: Set<string>;
  onAdd: (indicatorId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? INDICATOR_CATALOG.filter(
          (d) => d.name.toLowerCase().includes(q) || d.nameEn.toLowerCase().includes(q) || d.id.includes(q)
        )
      : INDICATOR_CATALOG;
    return [...list].sort((a, b) => a.nameEn.localeCompare(b.nameEn));
  }, [query]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-16"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-lg bg-white shadow-xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Các chỉ báo</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-800">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kiếm"
            className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="overflow-y-auto px-2 py-2">
          <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Tên script
          </div>
          {results.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
              Không tìm thấy chỉ báo phù hợp.
            </div>
          )}
          {results.map((def) => {
            const active = activeIds.has(def.id);
            return (
              <button
                key={def.id}
                type="button"
                onClick={() => onAdd(def.id)}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  active
                    ? "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <span>
                  {def.nameEn}
                  <span className="text-slate-400 dark:text-slate-500"> - {def.name}</span>
                </span>
                {active && <span className="ml-2 shrink-0 text-orange-600 dark:text-orange-400">✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
