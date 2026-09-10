import type { StockOutlookRecord } from "../api/client";

export function StockOutlookRecordView({ record }: { record: StockOutlookRecord }) {
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-slate-200 px-3 py-1 text-sm font-bold text-slate-700 dark:bg-slate-1000/10 dark:text-slate-300">
          {record.symbol}
        </span>
        {record.updatedAt && (
          <span className="text-xs text-slate-500 dark:text-slate-400">Ngày cập nhật: {record.updatedAt}</span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Triển vọng đầu tư
          </h2>
          {record.outlookText ? (
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {record.outlookText}
            </p>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500">Chưa có nội dung.</p>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Giá khuyến nghị
          </h2>
          {record.recommendations.length > 0 ? (
            <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
              {record.recommendations.map((r, i) => (
                <li key={i} className="flex items-center justify-between py-1.5">
                  <span className="text-slate-600 dark:text-slate-400">{r.broker}</span>
                  <span className="font-medium tabular-nums text-slate-900 dark:text-slate-100">
                    {r.price || "—"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500">Chưa có khuyến nghị.</p>
          )}
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
        Nội dung do người quản lý trang tính tự biên soạn, không phải khuyến nghị đầu tư từ hệ thống.
      </p>
    </>
  );
}
