import { useEffect, useRef, useState } from "react";
import type { Quote } from "../types";
import { formatPercent, formatVolume } from "../utils/format";

interface FlowPoint {
  time: number; // ms epoch
  net: number; // foreignBuyVolume - foreignSellVolume at that poll
}

const MAX_POINTS = 120; // 1 hour of history at StockDetail's 30s poll cadence
const W = 640;
const H = 90;
const PAD = { top: 8, right: 8, bottom: 4, left: 8 };

function formatNet(net: number): string {
  const sign = net > 0 ? "+" : net < 0 ? "−" : "";
  return `${sign}${formatVolume(Math.abs(net))}`;
}

function netClass(net: number): string {
  if (net > 0) return "text-slate-600 dark:text-slate-300";
  if (net < 0) return "text-slate-1000 dark:text-slate-400";
  return "text-slate-500 dark:text-slate-400";
}

function formatNetValue(net: number): string {
  const sign = net > 0 ? "+" : net < 0 ? "−" : "";
  return `${sign}${formatValueVnd(Math.abs(net))}`;
}

// KBS's price board only carries foreign buy/sell VOLUME (shares), not a
// separate value field — so "giá trị" here is volume × current price, an
// estimate (each foreign trade may have matched at a different price during
// the session), not the exchange's own reported turnover value.
function formatValueVnd(value: number): string {
  const billions = value / 1_000_000_000;
  if (billions >= 1) return `${billions.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tỷ`;
  const millions = value / 1_000_000;
  return `${millions.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} triệu`;
}

// KBS's live price board exposes today's foreign buy/sell volume, but
// there's no historical daily foreign-flow endpoint available in this
// environment (CafeF's own "Giao dịch khối ngoại" history page and VCI/VND's
// equivalents are all blocked by network policy, same as everywhere else in
// this app) — so "time series" here means literally what's observable: each
// poll's snapshot appended to an in-memory series for as long as this tab
// stays open. Real data, honestly scoped, not a multi-day history.
//
// Takes the already-polled `quote` from StockDetail rather than fetching its
// own copy — StockDetail already re-fetches this same quote every 30s for
// the header, so a second independent poll here would just double the
// request rate for no benefit.
export default function ForeignFlowPanel({ quote }: { quote: Quote }) {
  const [history, setHistory] = useState<FlowPoint[]>([]);
  const symbolRef = useRef(quote.symbol);

  useEffect(() => {
    if (symbolRef.current !== quote.symbol) {
      symbolRef.current = quote.symbol;
      setHistory([]);
    }
    if (quote.foreignBuyVolume == null || quote.foreignSellVolume == null) return;
    const net = quote.foreignBuyVolume - quote.foreignSellVolume;
    setHistory((prev) => [...prev, { time: Date.now(), net }].slice(-MAX_POINTS));
    // Re-runs whenever StockDetail's poll delivers a fresh quote (new
    // updatedAt) — not on every render of an unchanged quote object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote.symbol, quote.updatedAt]);

  if (quote.foreignBuyVolume == null || quote.foreignSellVolume == null) return null;

  const snapshot = { buy: quote.foreignBuyVolume, sell: quote.foreignSellVolume };
  const net = snapshot.buy - snapshot.sell;
  const buyValue = snapshot.buy * quote.price;
  const sellValue = snapshot.sell * quote.price;
  const netValue = buyValue - sellValue;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const nets = history.map((p) => p.net);
  const min = Math.min(0, ...nets);
  const max = Math.max(0, ...nets) || 1;
  const xFor = (i: number) => PAD.left + (history.length <= 1 ? plotW / 2 : (i / (history.length - 1)) * plotW);
  const yFor = (v: number) => PAD.top + plotH - ((v - min) / (max - min || 1)) * plotH;
  const zeroY = yFor(0);
  const pathD = history.map((p, i) => `${i === 0 ? "M" : "L"}${xFor(i)},${yFor(p.net)}`).join(" ");

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
      <h4 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Giao dịch khối ngoại</h4>

      <div className="mb-3 overflow-hidden rounded-md border border-slate-200 dark:border-slate-800">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
              <th className="px-3 py-2 text-left"></th>
              <th className="px-3 py-2 text-right">Mua</th>
              <th className="px-3 py-2 text-right">Bán</th>
              <th className="px-3 py-2 text-right">Mua-Bán</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100 dark:border-slate-900">
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400">KL</th>
              <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-600 dark:text-slate-300">
                {formatVolume(snapshot.buy)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-1000 dark:text-slate-400">
                {formatVolume(snapshot.sell)}
              </td>
              <td className={`px-3 py-2 text-right tabular-nums font-semibold ${netClass(net)}`}>{formatNet(net)}</td>
            </tr>
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400">GT</th>
              <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-600 dark:text-slate-300">
                {formatValueVnd(buyValue)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-1000 dark:text-slate-400">
                {formatValueVnd(sellValue)}
              </td>
              <td className={`px-3 py-2 text-right tabular-nums font-semibold ${netClass(netValue)}`}>
                {formatNetValue(netValue)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-slate-400 dark:text-slate-500">Sở hữu NN</div>
          <div className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {quote.foreignOwnershipPercent != null ? formatPercent(quote.foreignOwnershipPercent).replace("+", "") : "—"}
            {quote.foreignSharesOwned != null && (
              <span className="ml-1 text-xs font-normal text-slate-400">
                (đã sở hữu {formatVolume(quote.foreignSharesOwned)})
              </span>
            )}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-400 dark:text-slate-500">Room còn lại</div>
          <div className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {quote.foreignRoomPercent != null ? formatPercent(quote.foreignRoomPercent).replace("+", "") : "—"}
            {quote.foreignRoom != null && (
              <span className="ml-1 text-xs font-normal text-slate-400">({formatVolume(quote.foreignRoom)})</span>
            )}
          </div>
        </div>
      </div>

      <p className="mb-3 text-[10px] text-slate-400 dark:text-slate-500">
        GT Mua/Bán = khối lượng × giá hiện tại (ước tính, KBS không cung cấp giá trị khớp lệnh thực của khối ngoại).
      </p>

      {history.length >= 2 && (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className="h-[90px] w-full" role="img" aria-label="Xu hướng mua/bán ròng khối ngoại trong phiên">
            <line x1={PAD.left} x2={W - PAD.right} y1={zeroY} y2={zeroY} className="stroke-slate-200 dark:stroke-slate-800" strokeWidth={1} />
            <path d={pathD} fill="none" stroke="#0ea5e9" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {history.map((p, i) => (
              <circle key={p.time} cx={xFor(i)} cy={yFor(p.net)} r={i === history.length - 1 ? 3 : 0} fill="#0ea5e9" />
            ))}
          </svg>
          <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
            Theo dõi mua/bán ròng NN trong phiên hiện tại (cập nhật mỗi 30 giây, mất khi tải lại trang) — nguồn dữ liệu
            lịch sử khối ngoại theo ngày (CafeF/VCI/VND) hiện không truy cập được trong môi trường này.
          </p>
        </>
      )}
    </div>
  );
}
