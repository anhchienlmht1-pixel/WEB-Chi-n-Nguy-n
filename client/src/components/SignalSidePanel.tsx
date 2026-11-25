import { useState } from "react";
import { Link } from "react-router-dom";
import type { TradeJournal, TrendBuyResult } from "../api/client";
import { formatPrice } from "../utils/format";
import { dm, dmy, pct } from "./SonMaiHome";
import { OrderBookTab, PriceLevelsTab, inSession } from "./StockTapeTabs";

// Cột phải trang Tín hiệu: Danh mục / Nhật ký / Sổ lệnh / Mức giá.
// Bấm một mã trong Danh mục hoặc Nhật ký để đổi biểu đồ bên trái.

type Tab = "hold" | "log" | "book" | "levels";
type Filter = "Tất cả" | "Mua mới" | "Đang giữ";
const tone = (n: number) => (n > 0 ? "up" : n < 0 ? "down" : "");
const TH = "py-1.5 text-[0.72rem] font-normal text-[var(--sm-mut)]";

export default function SignalSidePanel({
  scan,
  journal,
  symbol,
  onPick,
}: {
  scan?: TrendBuyResult | null;
  journal?: TradeJournal | null;
  symbol: string;
  onPick: (s: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("hold");
  const [f, setF] = useState<Filter>("Tất cả");
  const session = scan?.sessionDate.slice(0, 10) ?? "";
  const isNew = (d: string) => d.slice(0, 10) === session;
  const items = (scan?.items ?? [])
    .filter((h) => (f === "Tất cả" ? true : f === "Mua mới" ? isNew(h.buyDate) : !isNew(h.buyDate)))
    .sort((a, b) => (a.buyDate < b.buyDate ? 1 : -1));
  const closed = [...(journal?.closed ?? [])].sort((a, b) => (a.sellDate < b.sellDate ? 1 : -1));
  const isIndex = symbol === "VNINDEX";
  const tabs: { v: Tab; t: string; n?: number; live?: boolean }[] = [
    { v: "hold", t: "Danh mục", n: scan?.items.length },
    { v: "log", t: "Nhật ký", n: closed.length || undefined },
    { v: "book", t: "Sổ lệnh", live: true },
    { v: "levels", t: "Mức giá", live: true },
  ];

  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-md border border-[var(--sm-line)] bg-[var(--sm-panel)] lg:h-[760px]">
      <div role="tablist" aria-label="Tín hiệu" className="flex shrink-0 border-b border-[var(--sm-line)]">
        {tabs.map((x) => (
          <button
            key={x.v}
            type="button"
            role="tab"
            aria-selected={tab === x.v}
            onClick={() => setTab(x.v)}
            className={`relative flex-1 px-1.5 py-3 text-[0.86rem] font-semibold ${tab === x.v ? "text-[var(--sm-egg)]" : "text-[var(--sm-mut)] hover:text-[var(--sm-egg)]"}`}
          >
            <span className="inline-flex items-center gap-1.5">
              {x.t}
              {x.n != null && <span className="rounded-full bg-[rgba(127,120,90,0.14)] px-1.5 text-[0.7rem] tabular-nums text-[var(--sm-egg2)]">{x.n}</span>}
              {x.live && !isIndex && inSession() && <i className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--sm-up)]" aria-hidden="true" />}
            </span>
            {tab === x.v && <i className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-[var(--sm-gold)]" aria-hidden="true" />}
          </button>
        ))}
      </div>

      {tab === "hold" && (
        <div className="flex min-h-0 flex-1 flex-col p-4">
          <div role="group" aria-label="Lọc danh mục" className="inline-flex self-start rounded-full bg-[rgba(127,120,90,0.12)] p-0.5 text-[0.8rem]">
            {(["Tất cả", "Mua mới", "Đang giữ"] as Filter[]).map((x) => (
              <button
                key={x}
                type="button"
                aria-pressed={f === x}
                onClick={() => setF(x)}
                className={`rounded-full px-3 py-1 font-semibold ${f === x ? "bg-[var(--sm-pop)] text-[var(--sm-egg)]" : "text-[var(--sm-mut)] hover:text-[var(--sm-egg)]"}`}
              >
                {x}
              </button>
            ))}
          </div>
          <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
            <table className="w-full text-[0.86rem] tabular-nums">
              <thead className="sticky top-0 z-[1] bg-[var(--sm-panel)]">
                <tr>
                  <th className={`${TH} text-left`}>Mã</th>
                  <th className={`${TH} text-right`}>Ngày mua</th>
                  <th className={`${TH} text-right`}>Giá hiện tại</th>
                  <th className={`${TH} pr-1 text-right`}>Lãi/lỗ</th>
                </tr>
              </thead>
              <tbody>
                {!scan ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-[var(--sm-mut)]">
                      Đang tải danh mục…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-[var(--sm-mut)]">
                      {f === "Mua mới" ? "Phiên gần nhất không có mã mua mới." : "Chưa có mã nào trong danh mục."}
                    </td>
                  </tr>
                ) : (
                  items.map((h) => {
                    const on = h.symbol === symbol;
                    return (
                      <tr
                        key={h.symbol}
                        onClick={() => onPick(h.symbol)}
                        className={`cursor-pointer border-t border-[var(--sm-line2)] ${on ? "bg-[rgba(201,162,74,0.12)]" : ""}`}
                        aria-current={on ? "true" : undefined}
                        title={`Xem biểu đồ ${h.symbol}`}
                      >
                        <td className="py-1.5">
                          <span className="flex items-center gap-1.5">
                            <b className="text-[var(--sm-egg)]">{h.symbol}</b>
                            {isNew(h.buyDate) && <span className="rounded-full bg-[rgba(23,128,79,0.14)] px-1.5 text-[0.66rem] font-semibold up">Mới</span>}
                          </span>
                          <span className="block max-w-[9rem] truncate text-[0.72rem] text-[var(--sm-mut)]">{h.sector ?? h.exchange}</span>
                        </td>
                        <td className="py-1.5 text-right text-[var(--sm-egg2)]">{dm(h.buyDate)}</td>
                        <td className="py-1.5 text-right">{h.price < 1000 ? h.price.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : formatPrice(h.price, h.currency)}</td>
                        <td className={`py-1.5 pr-1 text-right font-semibold ${tone(h.signalReturnPercent)}`}>{pct(h.signalReturnPercent)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[0.72rem] text-[var(--sm-mut)]">Bấm một mã để xem biểu đồ. Lãi/lỗ tính từ giá đóng cửa ngày mua.</p>
        </div>
      )}

      {tab === "log" && (
        <div className="flex min-h-0 flex-1 flex-col p-4">
          {journal && <p className="text-[0.78rem] text-[var(--sm-mut)]">Công khai mọi lệnh từ {dmy(journal.startDate)}, không chỉnh sửa về sau.</p>}
          <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
            <table className="w-full text-[0.86rem] tabular-nums">
              <thead className="sticky top-0 z-[1] bg-[var(--sm-panel)]">
                <tr>
                  <th className={`${TH} text-left`}>Mã</th>
                  <th className={`${TH} text-right`}>Mua</th>
                  <th className={`${TH} text-right`}>Đóng</th>
                  <th className={`${TH} text-right`}>Giữ</th>
                  <th className={`${TH} text-right`}>Kết quả</th>
                </tr>
              </thead>
              <tbody>
                {!journal ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[var(--sm-mut)]">
                      Đang tải…
                    </td>
                  </tr>
                ) : closed.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[var(--sm-mut)]">
                      Chưa có lệnh nào đóng.
                    </td>
                  </tr>
                ) : (
                  closed.map((t) => (
                    <tr
                      key={t.symbol + t.sellDate}
                      onClick={() => onPick(t.symbol)}
                      className={`cursor-pointer border-t border-[var(--sm-line2)] ${t.symbol === symbol ? "bg-[rgba(201,162,74,0.12)]" : ""}`}
                      title={`${t.symbol}: mua ${dmy(t.buyDate)}, đóng ${dmy(t.sellDate)}`}
                    >
                      <td className="py-1.5 font-semibold text-[var(--sm-egg)]">{t.symbol}</td>
                      <td className="py-1.5 text-right text-[var(--sm-egg2)]">{dm(t.buyDate)}</td>
                      <td className="py-1.5 text-right text-[var(--sm-egg2)]">{dm(t.sellDate)}</td>
                      <td className="py-1.5 text-right text-[var(--sm-mut)]">{t.holdingDays}n</td>
                      <td className={`py-1.5 text-right font-semibold ${tone(t.returnPercent)}`}>{pct(t.returnPercent)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[0.72rem] text-[var(--sm-mut)]">Đóng lệnh khi SMA20 cắt xuống SMA50 hoặc Supertrend đảo chiều. Giá đóng cửa, chưa trừ phí và thuế.</p>
        </div>
      )}

      {(tab === "book" || tab === "levels") &&
        (isIndex ? (
          <p className="p-6 text-center text-[0.9rem] text-[var(--sm-mut)]">Chọn một mã trong Danh mục để xem {tab === "book" ? "sổ lệnh" : "khối lượng theo mức giá"}.</p>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col p-4">
            <p className="mb-2 shrink-0 text-[0.8rem] text-[var(--sm-egg2)]">
              <b className="text-[var(--sm-egg)]">{symbol}</b> ·{" "}
              <Link to={`/stock/${symbol}`} className="text-[var(--sm-gold2)] hover:underline">
                mở trang mã
              </Link>
            </p>
            <div className="min-h-0 flex-1">{tab === "book" ? <OrderBookTab symbol={symbol} /> : <PriceLevelsTab symbol={symbol} />}</div>
          </div>
        ))}
    </div>
  );
}
