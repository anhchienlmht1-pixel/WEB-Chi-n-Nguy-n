import { Link } from "react-router-dom";
import { usePolling } from "../hooks/usePolling";
import { useLivePoll, useMarketClock } from "../hooks/useMarketClock";
import { fetchHistory, fetchMarketOverview, fetchQuote } from "../api/client";
import Flash from "./Flash";
import type { Quote } from "../types";

// Dải giá chạy ngang dưới thanh đầu trang: trạng thái phiên + đồng hồ giờ VN,
// các chỉ số và một nhóm cổ phiếu lớn. Giá nháy xanh/đỏ khi đổi. Trong phiên
// hỏi lại mỗi 15 giây, ngoài phiên 5 phút. Rê chuột vào dải để dừng chạy.

const INDICES = [
  { symbol: "VNINDEX", label: "VN-Index" },
  { symbol: "VN30", label: "VN30" },
  { symbol: "HNXINDEX", label: "HNX" },
];
const STOCKS = [
  "VCB", "BID", "CTG", "TCB", "VPB", "MBB", "ACB", "HDB", "STB", "SHB", "LPB", "VIB", "TPB",
  "FPT", "HPG", "VNM", "MWG", "VIC", "VHM", "GAS", "MSN", "SSI",
];

const fmt = (n: number, d = 2) => n.toLocaleString("vi-VN", { minimumFractionDigits: d, maximumFractionDigits: d });

function Item({ to, label, q, index }: { to: string; label: string; q: Quote; index?: boolean }) {
  const ch = q.prevClose > 0 && q.price > 0 ? q.price - q.prevClose : q.change ?? 0;
  const pct = q.prevClose > 0 ? (ch / q.prevClose) * 100 : q.changePercent ?? 0;
  const color = ch > 0 ? "var(--ab-up)" : ch < 0 ? "var(--ab-down)" : "#e0b24a";
  const price = !index && q.price >= 1000 ? q.price / 1000 : q.price;
  return (
    <Link to={to} className="flex shrink-0 items-center gap-1.5 px-3.5 text-[0.8rem] whitespace-nowrap hover:bg-white/5">
      <b className="text-[var(--sm-egg2)]">{label}</b>
      <Flash value={q.price} className="tabular-nums text-[var(--sm-egg)]">
        {fmt(price)}
      </Flash>
      <span className="tabular-nums" style={{ color }}>
        {ch > 0 ? "▲" : ch < 0 ? "▼" : "■"} {fmt(Math.abs(pct))}%
      </span>
    </Link>
  );
}

function SessionPill() {
  const s = useMarketClock();
  // Weekday, in session, but VN-Index has no bar for today → holiday / no trading.
  const { data: hist } = usePolling(() => fetchHistory("VNINDEX", "1D"), [], 5 * 60 * 1000);
  const pts = hist?.points ?? [];
  const lastDay = pts.length ? pts[pts.length - 1].time.slice(0, 10) : null;
  const afterOpen = s.clock >= "09:20:00";
  const noTrading = s.live && afterOpen && lastDay != null && lastDay !== s.date;
  const live = s.live && !noTrading;
  const label = noTrading ? "Không có giao dịch" : s.label;
  const dot = live ? "var(--ab-up)" : s.id === "pre" || s.id === "lunch" || s.id === "pt" ? "#e0b24a" : "#8fa882";
  return (
    <div className="flex shrink-0 items-center gap-2 border-r border-[rgba(201,162,74,0.18)] pr-3 text-[0.78rem] text-[var(--sm-egg2)]">
      <span aria-hidden="true" className={`inline-block h-2 w-2 rounded-full ${live ? "hero-pulse" : ""}`} style={{ background: dot }} />
      <span className="font-bold whitespace-nowrap">{label}</span>
      <span className="hidden tabular-nums text-[var(--sm-mut)] sm:inline">{s.clock}</span>
    </div>
  );
}

export default function TickerTape() {
  const poll = useLivePoll(30 * 1000);
  const idx = usePolling(
    async () => {
      const res = await Promise.allSettled(INDICES.map((i) => fetchQuote(i.symbol)));
      return res.flatMap((r, i) => (r.status === "fulfilled" && r.value?.price > 0 ? [{ ...INDICES[i], q: r.value }] : []));
    },
    [],
    poll,
  );
  const board = usePolling(fetchMarketOverview, [], poll);
  const bySym = new Map((board.data?.quotes ?? []).map((q) => [q.symbol, q]));
  const stocks = STOCKS.flatMap((s) => {
    const q = bySym.get(s);
    return q && q.price > 0 ? [q] : [];
  });
  const items = [
    ...(idx.data ?? []).map((i) => <Item key={i.symbol} to={`/stock/${i.symbol}`} label={i.label} q={i.q} index />),
    ...stocks.map((q) => <Item key={q.symbol} to={`/stock/${q.symbol}`} label={q.symbol} q={q} />),
  ];

  return (
    <div className="gutter-x mx-auto flex h-8 max-w-[1920px] items-center gap-3 border-t border-[rgba(201,162,74,0.18)]">
      <SessionPill />
      <div className="ticker relative min-w-0 flex-1 overflow-hidden" aria-label="Bảng giá chạy">
        {items.length > 0 && (
          <div className="ticker-track" style={{ animationDuration: `${Math.max(30, items.length * 4)}s` }}>
            <div className="flex">{items}</div>
            <div className="flex" aria-hidden="true">
              {items}
            </div>
          </div>
        )}
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-[#121a11] to-transparent" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-[#121a11] to-transparent" />
      </div>
    </div>
  );
}
