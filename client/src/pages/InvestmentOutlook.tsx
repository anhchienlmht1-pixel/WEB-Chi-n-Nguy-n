import { fetchInvestmentOutlook } from "../api/client";
import { usePolling } from "../hooks/usePolling";

const SHEET_URL = "https://docs.google.com/spreadsheets/d/167qd-YmY3wa6bnvjjAPMHnd_DqR-pMTYQVV79fPdrKs/edit";
const POLL_MS = 3 * 60 * 1000; // server itself caches 5 min — this just re-checks that cache periodically

// Renders whatever columns/rows are in the linked Google Sheet directly —
// no assumed schema, since the sheet's own owner controls the content and
// can add/remove/reorder columns freely. The server reads it via the
// sheet's public CSV export (docs.google.com/.../export?format=csv), which
// requires the sheet to be shared "Anyone with the link" → Viewer; a sheet
// that isn't gets a specific error explaining that rather than a generic
// fetch failure.
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
        Đồng bộ trực tiếp từ Google Sheets — chỉnh sửa trang tính, trang này tự cập nhật trong vài phút.
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

      {data && data.rows.length === 0 && (
        <p className="text-slate-500 dark:text-slate-400">Trang tính chưa có dữ liệu.</p>
      )}

      {data && data.rows.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  {data.headers.map((h, i) => (
                    <th key={i} className="whitespace-nowrap px-4 py-2.5 font-medium">
                      {h || `Cột ${i + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900/60"
                  >
                    {data.headers.map((_, ci) => (
                      <td
                        key={ci}
                        className={`px-4 py-2.5 align-top ${
                          ci === 0
                            ? "font-semibold text-slate-900 dark:text-slate-100"
                            : "text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {row[ci] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
            Cập nhật lúc {new Date(data.updatedAt).toLocaleString("vi-VN")} — nội dung do người quản lý trang tính tự
            biên soạn, không phải khuyến nghị đầu tư từ hệ thống.
          </p>
        </>
      )}
    </div>
  );
}
