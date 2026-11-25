import { useState } from "react";
import { fetchOrderBook, fetchTrades } from "../api/client";
import { usePolling } from "../hooks/usePolling";

// Tab "Sổ lệnh" và "Mức giá" ở cột phải trang cổ phiếu (datafeed bảng giá VPS).
// Trong giờ giao dịch cập nhật 3 giây một lần, ngoài giờ 1 phút.

export function inSession(): boolean {
  const now = new Date(Date.now() + 7 * 3600_000); // giờ Việt Nam
  const d = now.getUTCDay();
  const m = now.getUTCHours() * 60 + now.getUTCMinutes();
  return d >= 1 && d <= 5 && m >= 9 * 60 && m <= 15 * 60 + 5;
}

const p2 = (n: number) => n.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const vol = (n: number) => n.toLocaleString("vi-VN");
const mil = (n: number) => `${(n / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} tr`;
const pct = (a: number, t: number) => (t ? Math.round((a / t) * 100) : 0);

const CEIL = "#a24bd0";
const FLOOR = "#1f8fc2";
const REF = "#b8890f";
function priceColor(p: number, ref: number | null, ceil: number | null, floor: number | null) {
  if (ceil && p >= ceil) return CEIL;
  if (floor && p <= floor) return FLOOR;
  if (!ref || p === ref) return REF;
  return p > ref ? "var(--sm-up)" : "var(--sm-dn)";
}

function useTape(symbol: string) {
  const every = inSession() ? 3000 : 60_000;
  return usePolling(() => fetchTrades(symbol), [symbol], every);
}
function useBook(symbol: string) {
  const every = inSession() ? 3000 : 60_000;
  return usePolling(() => fetchOrderBook(symbol), [symbol], every);
}

const TH = "py-1.5 text-[0.72rem] font-normal text-[var(--sm-mut)]";

/** Thanh tỷ lệ mua (xanh) / bán (đỏ) */
function Split({ a, b }: { a: number; b: number }) {
  const t = a + b;
  return (
    <div className="flex h-1.5 overflow-hidden rounded-full bg-[var(--sm-line2)]" aria-hidden="true">
      {t > 0 && <i className="block h-full bg-[var(--sm-up)]" style={{ width: `${(a / t) * 100}%` }} />}
      {t > 0 && <i className="ml-0.5 block h-full flex-1 bg-[var(--sm-dn)]" />}
    </div>
  );
}

export function OrderBookTab({ symbol }: { symbol: string }) {
  const book = useBook(symbol);
  const tape = useTape(symbol);
  const [bigOnly, setBigOnly] = useState(false);
  const b = book.data;
  const t = tape.data;
  const color = (p: number) => priceColor(p, b?.ref ?? null, b?.ceiling ?? null, b?.floor ?? null);
  const maxVol = Math.max(1, ...(b ? [...b.bids, ...b.asks].map((x) => x.volume) : [1]));
  const bidSum = b?.bids.reduce((a, x) => a + x.volume, 0) ?? 0;
  const askSum = b?.asks.reduce((a, x) => a + x.volume, 0) ?? 0;
  const spread = b?.bids[0] && b?.asks[0] ? b.asks[0].price - b.bids[0].price : null;
  const imb = bidSum + askSum ? (bidSum - askSum) / (bidSum + askSum) : 0;
  // lệnh lớn: từ 5 lần khối lượng trung bình mỗi lệnh trở lên
  const bigMin = t ? Math.max(t.summary.avg * 5, 1000) : 0;
  const list = (t?.trades ?? []).filter((x) => !bigOnly || x.volume >= bigMin);
  const s = t?.summary;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Bước giá */}
      <table className="w-full text-[0.86rem] tabular-nums">
        <thead>
          <tr>
            <th className={`${TH} text-left`}>KL mua</th>
            <th className={`${TH} text-right`}>Giá mua</th>
            <th className={`${TH} pl-3 text-left`}>Giá bán</th>
            <th className={`${TH} text-right`}>KL bán</th>
          </tr>
        </thead>
        <tbody>
          {[0, 1, 2].map((i) => {
            const bid = b?.bids[i];
            const ask = b?.asks[i];
            return (
              <tr key={i} className="border-t border-[var(--sm-line2)]">
                <td className="relative py-1.5 pr-1" colSpan={2}>
                  {bid && (
                    <i
                      className="absolute inset-y-1 right-0 rounded-l-[4px] bg-[rgba(23,128,79,0.13)] transition-[width] duration-300"
                      style={{ width: `${(bid.volume / maxVol) * 100}%` }}
                      aria-hidden="true"
                    />
                  )}
                  <span className="relative flex justify-between">
                    <span>{bid ? vol(bid.volume) : "—"}</span>
                    <b style={{ color: bid ? color(bid.price) : undefined }}>{bid ? p2(bid.price) : "—"}</b>
                  </span>
                </td>
                <td className="relative py-1.5 pl-1" colSpan={2}>
                  {ask && (
                    <i
                      className="absolute inset-y-1 left-0 rounded-r-[4px] bg-[rgba(192,57,43,0.12)] transition-[width] duration-300"
                      style={{ width: `${(ask.volume / maxVol) * 100}%` }}
                      aria-hidden="true"
                    />
                  )}
                  <span className="relative flex justify-between pl-2">
                    <b style={{ color: ask ? color(ask.price) : undefined }}>{ask ? p2(ask.price) : "—"}</b>
                    <span>{ask ? vol(ask.volume) : "—"}</span>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {b && (
        <div className="mt-2 border-b border-[var(--sm-line2)] pb-3 text-[0.75rem] text-[var(--sm-mut)]">
          <div className="flex items-center gap-2">
            <span>
              Đặt mua <b className="up">{mil(bidSum)}</b>
            </span>
            <span className="flex-1">
              <Split a={bidSum} b={askSum} />
            </span>
            <span>
              <b className="down">{mil(askSum)}</b> đặt bán
            </span>
          </div>
          <div className="mt-1 flex justify-between">
            <span>
              Chênh lệch giá {spread != null ? `${p2(spread)} · ${b.bids[0] ? ((spread / b.bids[0].price) * 100).toLocaleString("vi-VN", { maximumFractionDigits: 2 }) : 0}%` : "—"}
            </span>
            <span>{Math.abs(imb) < 0.15 ? "Cung cầu cân bằng" : imb > 0 ? "Bên mua áp đảo" : "Bên bán áp đảo"}</span>
          </div>
          <div className="mt-1 flex gap-3">
            <span>
              Trần <b style={{ color: CEIL }}>{b.ceiling ? p2(b.ceiling) : "—"}</b>
            </span>
            <span>
              T.chiếu <b style={{ color: REF }}>{b.ref ? p2(b.ref) : "—"}</b>
            </span>
            <span>
              Sàn <b style={{ color: FLOOR }}>{b.floor ? p2(b.floor) : "—"}</b>
            </span>
          </div>
        </div>
      )}

      {/* Khớp lệnh */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[0.8rem] font-semibold text-[var(--sm-egg)]">Khớp lệnh</span>
        <span className="flex items-center gap-2 text-[0.72rem] text-[var(--sm-mut)]">
          {s && `${vol(s.count)} lệnh · TB ${vol(s.avg)}/lệnh`}
          <button
            type="button"
            aria-pressed={bigOnly}
            onClick={() => setBigOnly((v) => !v)}
            title={`Chỉ hiện lệnh từ ${vol(bigMin)} cp (5 lần khối lượng trung bình)`}
            className={`rounded-full border px-2 py-0.5 text-[0.7rem] font-semibold ${bigOnly ? "border-[var(--sm-gold)] bg-[rgba(201,162,74,0.16)] text-[var(--sm-egg)]" : "border-[var(--sm-line)] text-[var(--sm-egg2)] hover:text-[var(--sm-egg)]"}`}
          >
            Lệnh lớn
          </button>
        </span>
      </div>
      <div className="mt-1 min-h-[180px] flex-1 overflow-y-auto">
        <table className="w-full text-[0.82rem] tabular-nums">
          <thead className="sticky top-0 z-[1] bg-[var(--sm-panel)]">
            <tr>
              <th className={`${TH} text-left`}>Giờ</th>
              <th className={`${TH} text-right`}>Giá</th>
              <th className={`${TH} text-right`}>+/−</th>
              <th className={`${TH} text-right`}>KL</th>
              <th className={`${TH} w-8 text-right`}>M/B</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-[var(--sm-mut)]">
                  {tape.loading ? "Đang tải…" : bigOnly ? "Chưa có lệnh lớn." : "Chưa có lệnh khớp trong phiên."}
                </td>
              </tr>
            )}
            {list.map((x, i) => (
              <tr key={`${x.time}-${i}`} className="border-t border-[var(--sm-line2)]">
                <td className="py-1 text-[var(--sm-egg2)]">{x.time}</td>
                <td className="py-1 text-right font-semibold" style={{ color: color(x.price) }}>
                  {p2(x.price)}
                </td>
                <td className="py-1 text-right" style={{ color: color(x.price) }}>
                  {x.change > 0 ? "+" : ""}
                  {p2(x.change)}
                </td>
                <td className={`py-1 text-right ${x.volume >= bigMin ? "font-semibold text-[var(--sm-egg)]" : ""}`}>{vol(x.volume)}</td>
                <td className={`py-1 text-right font-semibold ${x.side === "B" ? "up" : x.side === "S" ? "down" : "text-[var(--sm-mut)]"}`}>
                  {x.side === "B" ? "M" : x.side === "S" ? "B" : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {s && s.total > 0 && (
        <div className="mt-2 border-t border-[var(--sm-line2)] pt-2 text-[0.75rem] text-[var(--sm-mut)]">
          <div className="flex justify-between">
            <span>
              Mua CĐ <b className="up">{pct(s.buy, s.buy + s.sell)}%</b> · {vol(s.buy)}
            </span>
            <span>
              {vol(s.sell)} · <b className="down">{pct(s.sell, s.buy + s.sell)}%</b> Bán CĐ
            </span>
          </div>
          <div className="mt-1">
            <Split a={s.buy} b={s.sell} />
          </div>
          <div className="mt-1 flex justify-between">
            <span>
              Tổng KL khớp <b className="text-[var(--sm-egg)]">{vol(s.total)}</b>
            </span>
            <span>
              Chênh lệch M−B <b className={s.buy - s.sell >= 0 ? "up" : "down"}>{(s.buy - s.sell >= 0 ? "+" : "−") + mil(Math.abs(s.buy - s.sell))}</b>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function PriceLevelsTab({ symbol }: { symbol: string }) {
  const tape = useTape(symbol);
  const book = useBook(symbol);
  const t = tape.data;
  const b = book.data;
  const color = (p: number) => priceColor(p, b?.ref ?? null, b?.ceiling ?? null, b?.floor ?? null);
  const max = Math.max(1, ...(t?.levels.map((l) => l.total) ?? [1]));
  const top = t?.levels.reduce((m, l) => (l.total > (m?.total ?? 0) ? l : m), t?.levels[0]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="text-[0.78rem] leading-relaxed text-[var(--sm-mut)]">
        Khối lượng khớp trong phiên theo từng mức giá: xanh là mua chủ động, đỏ là bán chủ động, xám là lệnh ATO/ATC.
        {top && (
          <>
            {" "}
            Khớp nhiều nhất ở <b style={{ color: color(top.price) }}>{p2(top.price)}</b>.
          </>
        )}
      </p>
      <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
        <table className="w-full text-[0.82rem] tabular-nums">
          <thead className="sticky top-0 z-[1] bg-[var(--sm-panel)]">
            <tr>
              <th className={`${TH} text-left`}>Giá</th>
              <th className={`${TH} text-left`} />
              <th className={`${TH} text-right`}>KL</th>
              <th className={`${TH} text-right`}>%</th>
            </tr>
          </thead>
          <tbody>
            {(t?.levels ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-[var(--sm-mut)]">
                  {tape.loading ? "Đang tải…" : "Chưa có lệnh khớp trong phiên."}
                </td>
              </tr>
            )}
            {(t?.levels ?? []).map((l) => (
              <tr key={l.price} className="border-t border-[var(--sm-line2)]">
                <td className="w-14 py-1.5 font-semibold" style={{ color: color(l.price) }}>
                  {p2(l.price)}
                </td>
                <td className="py-1.5 pr-2">
                  <div className="flex h-3 overflow-hidden rounded-[3px]" style={{ width: `${(l.total / max) * 100}%` }} title={`Mua CĐ ${vol(l.buy)} · Bán CĐ ${vol(l.sell)}${l.other ? ` · ATO/ATC ${vol(l.other)}` : ""}`}>
                    <i className="block h-full bg-[var(--sm-up)]" style={{ width: `${(l.buy / l.total) * 100}%` }} />
                    <i className="block h-full bg-[var(--sm-dn)]" style={{ width: `${(l.sell / l.total) * 100}%` }} />
                    <i className="block h-full flex-1 bg-[var(--sm-mut)] opacity-50" />
                  </div>
                </td>
                <td className="py-1.5 text-right">{vol(l.total)}</td>
                <td className="w-10 py-1.5 text-right text-[var(--sm-mut)]">{t ? pct(l.total, t.summary.total) : 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[0.7rem] text-[var(--sm-mut)]">Nguồn: bảng giá VPS.</p>
    </div>
  );
}
