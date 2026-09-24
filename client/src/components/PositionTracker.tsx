import { useMemo, useState } from "react";
import { Wallet, X } from "lucide-react";
import { usePolling } from "../hooks/usePolling";
import { usePositions } from "../hooks/usePositions";
import { fetchHistory } from "../api/client";
import { aggregatePoints } from "../utils/aggregate";
import { formatPrice, formatPercent } from "../utils/format";

// Standard settlement cycle on HOSE/HNX/UPCOM — shares bought today aren't
// tradable until T+2, so a fresh position can't be sold no matter what the
// system's own Mua/Bán signal says until then.
const SETTLEMENT_DAYS = 2;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

// Purely personal bookkeeping ("giá vốn của tôi cho mã này") saved to this
// browser only (see hooks/usePositions.ts) — separate from and doesn't
// affect the platform's own Trend Following Mua/Bán system. Lets a visitor
// see their own lãi/lỗ and a settlement-aware "chờ hàng về" reminder right
// next to the chart, instead of doing that math by hand.
export default function PositionTracker({ symbol, currency }: { symbol: string; currency: string }) {
  const { get, save, clear } = usePositions();
  const position = get(symbol);
  const [editing, setEditing] = useState(false);
  const [priceInput, setPriceInput] = useState("");
  const [dateInput, setDateInput] = useState(todayKey());

  const { data } = usePolling(() => fetchHistory(symbol, "MAX"), [symbol], 5 * 60 * 1000);
  const daily = useMemo(() => (data ? aggregatePoints(data.points, "D") : []), [data]);

  const stats = useMemo(() => {
    if (!position || daily.length === 0) return null;
    const buyIdx = daily.findIndex((p) => dayKey(p.time) >= position.buyDate);
    if (buyIdx === -1) return null; // buyDate is after the latest available bar
    const latest = daily[daily.length - 1];
    return {
      daysHeld: daily.length - 1 - buyIdx,
      returnPercent: ((latest.close - position.buyPrice) / position.buyPrice) * 100,
      latestClose: latest.close,
    };
  }, [position, daily]);

  function startEditing() {
    setPriceInput(position ? String(position.buyPrice) : "");
    setDateInput(position?.buyDate ?? todayKey());
    setEditing(true);
  }

  function submit() {
    const price = Number(priceInput.replace(",", "."));
    if (!Number.isFinite(price) || price <= 0) return;
    save(symbol, price, dateInput || todayKey());
    setEditing(false);
  }

  if (!position || editing) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <Wallet className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
          Vị thế của bạn
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Đang nắm giữ {symbol}? Nhập giá vốn để tự theo dõi lãi/lỗ ngay tại đây.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
            Giá vốn
            <input
              type="text"
              inputMode="decimal"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              placeholder={formatPrice(0, currency).replace(/[\d.,]/g, "0")}
              className="w-28 rounded-md border border-slate-300 px-2 py-1.5 text-sm tabular-nums text-slate-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
            Ngày mua
            <input
              type="date"
              value={dateInput}
              max={todayKey()}
              onChange={(e) => setDateInput(e.target.value)}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>
          <button
            type="button"
            onClick={submit}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors duration-300 hover:bg-emerald-700"
          >
            Lưu
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors duration-300 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Hủy
            </button>
          )}
        </div>
        <p className="mt-3 text-[10px] text-slate-400 dark:text-slate-500">
          Chỉ lưu trên trình duyệt này, không đồng bộ giữa các thiết bị — không phải lời khuyên đầu tư.
        </p>
      </div>
    );
  }

  const waitingSettlement = stats !== null && stats.daysHeld < SETTLEMENT_DAYS;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="flex items-start justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <Wallet className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
          Vị thế của bạn
        </h3>
        <button
          type="button"
          onClick={() => clear(symbol)}
          title="Xóa vị thế"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 transition-colors duration-300 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>
      </div>

      {stats ? (
        <>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-bold text-green-700 dark:bg-green-950/40 dark:text-green-400">
              ĐANG NẮM GIỮ — T+{stats.daysHeld}
            </span>
            <span
              className={`text-sm font-bold tabular-nums ${
                stats.returnPercent > 0
                  ? "text-green-600 dark:text-green-400"
                  : stats.returnPercent < 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-slate-500"
              }`}
            >
              {formatPercent(stats.returnPercent)}
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            Giá vốn {formatPrice(position.buyPrice, currency)}.{" "}
            {waitingSettlement ? (
              <>
                Chờ hàng về — T+{SETTLEMENT_DAYS}: đóng cửa ≤ {formatPrice(position.buyPrice, currency)} là BÁN toàn
                bộ để bảo toàn vốn.
              </>
            ) : (
              <>Cổ phiếu đã về tài khoản — theo dõi tab Tín hiệu để biết khi hệ thống báo Bán.</>
            )}
          </p>
        </>
      ) : (
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
          Ngày mua {position.buyDate} chưa có dữ liệu giá — đang tải hoặc mã chưa giao dịch từ ngày đó.
        </p>
      )}

      <button
        type="button"
        onClick={startEditing}
        className="mt-3 text-[11px] font-medium text-slate-500 underline decoration-dotted hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
      >
        Sửa giá vốn / ngày mua
      </button>

      <p className="mt-3 text-[10px] text-slate-400 dark:text-slate-500">
        Chỉ lưu trên trình duyệt này, không đồng bộ giữa các thiết bị — không phải lời khuyên đầu tư.
      </p>
    </div>
  );
}
