import { fetchOrderBook, fetchTrades } from "../api/client";
import { usePolling } from "../hooks/usePolling";

// Bước giá 3 mức và lệnh khớp gần nhất trong phiên (datafeed bảng giá VPS).
// Trong giờ giao dịch cập nhật 3 giây một lần; ngoài giờ 1 phút.

function inSession(): boolean {
  const now = new Date(Date.now() + 7 * 3600_000); // giờ Việt Nam
  const d = now.getUTCDay();
  const m = now.getUTCHours() * 60 + now.getUTCMinutes();
  return d >= 1 && d <= 5 && m >= 9 * 60 && m <= 15 * 60 + 5;
}

const vol = (n: number) => n.toLocaleString("vi-VN");

export default function OrderBookPanel({ symbol, fmt }: { symbol: string; fmt: (n: number) => string }) {
  const every = inSession() ? 3000 : 60_000;
  const book = usePolling(() => fetchOrderBook(symbol), [symbol], every);
  const trades = usePolling(() => fetchTrades(symbol), [symbol], every);
  const b = book.data;
  const ref = b?.ref ?? 0;
  const color = (p: number) =>
    b?.ceiling && p >= b.ceiling ? "#a24bd0" : b?.floor && p <= b.floor ? "#1f8fc2" : !ref || p === ref ? "#b8890f" : p > ref ? "var(--sm-up)" : "var(--sm-dn)";
  const maxVol = Math.max(1, ...(b ? [...b.bids, ...b.asks].map((x) => x.volume) : [1]));
  const rows = [0, 1, 2];
  const list = trades.data?.trades ?? [];
  const buy = list.filter((t) => t.side === "B").reduce((a, t) => a + t.volume, 0);
  const sell = list.filter((t) => t.side === "S").reduce((a, t) => a + t.volume, 0);

  if (book.error && trades.error) return null;

  return (
    <section aria-label="Bước giá và lệnh khớp" className="mt-4 grid gap-4 lg:grid-cols-12">
      <div className="rounded-md border border-[var(--sm-line)] bg-[var(--sm-panel)] p-4 lg:col-span-5">
        <div className="flex items-baseline justify-between">
          <h3 className="text-[1.05rem] text-[var(--sm-egg)]">Bước giá</h3>
          <span className="flex items-center gap-1.5 text-[0.75rem] text-[var(--sm-mut)]">
            {inSession() && <i className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--sm-up)]" aria-hidden="true" />}
            {inSession() ? "Trực tiếp" : "Phiên gần nhất"}
          </span>
        </div>
        <table className="mt-2 w-full text-[0.9rem] tabular-nums">
          <thead>
            <tr className="text-[0.75rem] text-[var(--sm-mut)]">
              <th className="py-1 text-left font-normal">KL mua</th>
              <th className="py-1 text-right font-normal">Giá mua</th>
              <th className="py-1 pl-4 text-left font-normal">Giá bán</th>
              <th className="py-1 text-right font-normal">KL bán</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => {
              const bid = b?.bids[i];
              const ask = b?.asks[i];
              return (
                <tr key={i} className="border-t border-[var(--sm-line2)]">
                  <td className="relative py-1.5 text-left">
                    {bid && <i className="absolute inset-y-1 right-0 rounded-l-sm bg-[rgba(23,128,79,0.12)]" style={{ width: `${(bid.volume / maxVol) * 100}%` }} aria-hidden="true" />}
                    <span className="relative">{bid ? vol(bid.volume) : "—"}</span>
                  </td>
                  <td className="py-1.5 text-right font-semibold" style={{ color: bid ? color(bid.price) : undefined }}>
                    {bid ? fmt(bid.price) : "—"}
                  </td>
                  <td className="py-1.5 pl-4 text-left font-semibold" style={{ color: ask ? color(ask.price) : undefined }}>
                    {ask ? fmt(ask.price) : "—"}
                  </td>
                  <td className="relative py-1.5 text-right">
                    {ask && <i className="absolute inset-y-1 left-0 rounded-r-sm bg-[rgba(192,57,43,0.12)]" style={{ width: `${(ask.volume / maxVol) * 100}%` }} aria-hidden="true" />}
                    <span className="relative">{ask ? vol(ask.volume) : "—"}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {b && (
          <p className="mt-3 flex flex-wrap gap-x-4 text-[0.8rem] text-[var(--sm-mut)]">
            <span>
              Trần <b style={{ color: "#a24bd0" }}>{b.ceiling ? fmt(b.ceiling) : "—"}</b>
            </span>
            <span>
              T.chiếu <b style={{ color: "#b8890f" }}>{b.ref ? fmt(b.ref) : "—"}</b>
            </span>
            <span>
              Sàn <b style={{ color: "#1f8fc2" }}>{b.floor ? fmt(b.floor) : "—"}</b>
            </span>
          </p>
        )}
      </div>

      <div className="rounded-md border border-[var(--sm-line)] bg-[var(--sm-panel)] p-4 lg:col-span-7">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[1.05rem] text-[var(--sm-egg)]">Lệnh khớp gần nhất</h3>
          {buy + sell > 0 && (
            <span className="text-[0.8rem] text-[var(--sm-mut)]">
              Mua chủ động <b className="up">{vol(buy)}</b> · Bán chủ động <b className="down">{vol(sell)}</b>
            </span>
          )}
        </div>
        {buy + sell > 0 && (
          <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-[var(--sm-line2)]" aria-hidden="true">
            <i className="block h-full bg-[var(--sm-up)]" style={{ width: `${(buy / (buy + sell)) * 100}%` }} />
            <i className="block h-full flex-1 bg-[var(--sm-dn)]" />
          </div>
        )}
        <div className="mt-2 max-h-[232px] overflow-y-auto">
          <table className="w-full text-[0.86rem] tabular-nums">
            <thead className="sticky top-0 bg-[var(--sm-panel)]">
              <tr className="text-[0.75rem] text-[var(--sm-mut)]">
                <th className="py-1 text-left font-normal">Thời gian</th>
                <th className="py-1 text-right font-normal">Giá</th>
                <th className="py-1 text-right font-normal">Khối lượng</th>
                <th className="py-1 text-right font-normal">M/B</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-[var(--sm-mut)]">
                    {trades.loading ? "Đang tải…" : "Chưa có lệnh khớp trong phiên."}
                  </td>
                </tr>
              )}
              {list.map((t, i) => (
                <tr key={`${t.time}-${i}`} className="border-t border-[var(--sm-line2)]">
                  <td className="py-1 text-[var(--sm-egg2)]">{t.time}</td>
                  <td className="py-1 text-right font-semibold" style={{ color: color(t.price) }}>
                    {fmt(t.price)}
                  </td>
                  <td className="py-1 text-right">{vol(t.volume)}</td>
                  <td className={`py-1 text-right font-semibold ${t.side === "B" ? "up" : t.side === "S" ? "down" : "text-[var(--sm-mut)]"}`}>
                    {t.side === "B" ? "M" : t.side === "S" ? "B" : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[0.72rem] text-[var(--sm-mut)]">Nguồn: bảng giá VPS. M: mua chủ động, B: bán chủ động.</p>
      </div>
    </section>
  );
}
