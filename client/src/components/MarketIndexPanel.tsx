import { fetchQuote } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { formatChange, formatPercent, formatPrice, formatVolume, trendClass } from "../utils/format";

// Compact "market info" widget for an index (VNINDEX, VN30, ...) — modeled
// after the reference layout the user shared (name/value header, a
// "Tổng quan" stat block below). Only shows fields KBS's index rows
// actually carry (price, open/high/low, prevClose, volume); KL thỏa thuận
// (negotiated volume) and Tổng giá trị (total traded value) aren't in this
// app's Quote type for ANY source, and there's no field-level KBS
// documentation distinguishing matched-only vs. matched+negotiated volume —
// so "Khối lượng" here is deliberately not labeled "KL khớp" to avoid
// claiming a precision the data doesn't have.
export default function MarketIndexPanel({ symbol }: { symbol: string }) {
  const { data: quote, error, loading } = usePolling(() => fetchQuote(symbol), [symbol], 30000);
  const current = quote && quote.symbol === symbol ? quote : null;

  if (loading && !current) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="h-20 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      </div>
    );
  }

  if (error && !current) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-red-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-red-400">
        Không tải được thông tin thị trường: {error}
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
      <div className="border-b border-slate-200 p-4 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span className="h-2 w-2 rounded-full bg-sky-500" />
          {current.name}
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {formatPrice(current.price, current.currency)}
          </span>
          <span className={`text-sm font-medium tabular-nums ${trendClass(current.change)}`}>
            {formatChange(current.change, current.currency)} ({formatPercent(current.changePercent)})
          </span>
        </div>
      </div>

      <div className="p-4">
        <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Tổng quan
        </h5>
        <dl className="space-y-2 text-sm">
          <Row label="Tham chiếu" value={formatPrice(current.prevClose, current.currency)} />
          <Row label="Mở cửa" value={formatPrice(current.open, current.currency)} />
          <Row
            label="Thấp - Cao"
            value={`${formatPrice(current.low, current.currency)} - ${formatPrice(current.high, current.currency)}`}
          />
          <Row label="Khối lượng" value={formatVolume(current.volume)} />
        </dl>
        <p className="mt-3 text-[10px] text-slate-400 dark:text-slate-500">
          Chưa có dữ liệu KL thỏa thuận / tổng giá trị khớp lệnh riêng biệt từ nguồn dữ liệu hiện tại.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-400 dark:text-slate-500">{label}</dt>
      <dd className="font-medium tabular-nums text-slate-900 dark:text-slate-100">{value}</dd>
    </div>
  );
}
