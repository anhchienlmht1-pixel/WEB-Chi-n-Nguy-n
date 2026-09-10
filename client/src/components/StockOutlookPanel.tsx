import { fetchInvestmentOutlook } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { StockOutlookRecordView } from "./StockOutlookRecordView";

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vT81Bi4SZ33zZ6URMkTxl_yB158q89qIwVE27W_8Pxt8gGd2-obA4NV2EPQI_EqYAJn8DzdC34vwzpx/pubhtml";
const POLL_MS = 3 * 60 * 1000;

// The "Triển vọng đầu tư" Google Sheet is a single-selection dashboard — it
// always reflects whichever stock is currently picked in its own "MÃ"
// dropdown, not a per-symbol lookup. So this only shows the card when that
// happens to be the same stock as the page being viewed; for every other
// symbol it stays hidden rather than showing another stock's outlook here.
export default function StockOutlookPanel({ symbol }: { symbol: string }) {
  const { data } = usePolling(() => fetchInvestmentOutlook(), [], POLL_MS);

  if (!data || data.symbol.trim().toUpperCase() !== symbol.toUpperCase()) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Triển vọng cổ phiếu</h2>
        <a
          href={SHEET_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-slate-600 hover:underline dark:text-slate-300"
        >
          Mở trang tính ↗
        </a>
      </div>
      <StockOutlookRecordView record={data} />
    </div>
  );
}
