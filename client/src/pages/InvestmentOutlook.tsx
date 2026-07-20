import { fetchInvestmentOutlook, type StockOutlookRecord } from "../api/client";
import { usePolling } from "../hooks/usePolling";

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vT81Bi4SZ33zZ6URMkTxl_yB158q89qIwVE27W_8Pxt8gGd2-obA4NV2EPQI_EqYAJn8DzdC34vwzpx/pubhtml";
const POLL_MS = 3 * 60 * 1000; // server itself caches 5 min — this just re-checks that cache periodically

// The sheet is a single-selection dashboard: a "MÃ" dropdown picks one
// stock and the rest of the sheet shows that stock's outlook — so this
// page always mirrors whichever stock is currently selected there, not a
// list of all stocks. To view a different stock, change the dropdown in
// the sheet itself (link below).
export default function InvestmentOutlook() {
  const { data, error, loading } = usePolling(() => fetchInvestmentOutlook(), [], POLL_MS);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Triển vọng đầu tư</h1>
        <a
          href={SHEET_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
        >
          Mở trang tính ↗
        </a>
      </div>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        Đồng bộ trực tiếp từ Google Sheets — hiển thị đúng mã đang được chọn trong trang tính. Muốn xem mã khác, đổi
        ô "MÃ" trong trang tính.
      </p>

      {loading && !data && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-6 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      )}

      {error && !data && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {data && <StockOutlookRecordView record={data} />}
    </div>
  );
}

export function StockOutlookRecordView({ record }: { record: StockOutlookRecord }) {
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
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
