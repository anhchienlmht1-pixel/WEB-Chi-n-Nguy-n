import { useMemo } from "react";
import { Link } from "react-router-dom";
import { fetchInvestmentOutlook } from "../api/client";
import { usePolling } from "../hooks/usePolling";

const POLL_MS = 3 * 60 * 1000;

// Shows the row from the "Triển vọng đầu tư" Google Sheet that matches this
// stock, if any — the sheet's owner decides which symbols are covered and
// what columns exist, so this looks for the symbol anywhere in the row
// rather than assuming a fixed column position. Renders nothing when the
// sheet has no row for this symbol, so it stays invisible on stocks the
// sheet doesn't cover.
export default function StockOutlookPanel({ symbol }: { symbol: string }) {
  const { data } = usePolling(() => fetchInvestmentOutlook(), [], POLL_MS);

  const match = useMemo(() => {
    if (!data) return null;
    return (
      data.rows.find((row) => row.some((cell) => cell.trim().toUpperCase() === symbol.toUpperCase())) ?? null
    );
  }, [data, symbol]);

  if (!data || !match) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Triển vọng cổ phiếu</h2>
        <Link
          to="/trien-vong-dau-tu"
          className="text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
        >
          Xem đầy đủ ↗
        </Link>
      </div>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        {data.headers.map((h, i) => (
          <div key={i}>
            <dt className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {h || `Cột ${i + 1}`}
            </dt>
            <dd className="whitespace-pre-line text-sm text-slate-700 dark:text-slate-300">{match[i] || "—"}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
        Nội dung do người quản lý trang tính tự biên soạn, không phải khuyến nghị đầu tư từ hệ thống.
      </p>
    </div>
  );
}
