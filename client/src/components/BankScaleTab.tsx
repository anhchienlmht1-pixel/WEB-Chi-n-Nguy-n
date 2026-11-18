import { useState } from "react";
import { Link } from "react-router-dom";
import { SCALE, type BankScale } from "../data/bankValuation";
import { Seg, Tile, banksIn, groupOf, heat, stats, vn, type GroupFilter } from "./bankUi";

// Quy mô & lợi nhuận Q3/2026: tài sản, cho vay, tiền gửi, vốn, thu nhập và lợi nhuận
// trước thuế trong quý (tỷ đồng), thị phần tổng tài sản trong nhóm đang xem.

type Key = keyof BankScale;
const COLS: { key: Key; label: string; title: string }[] = [
  { key: "tts", label: "Tổng tài sản", title: "Tổng tài sản cuối Q3/2026" },
  { key: "loan", label: "Cho vay KH", title: "Dư nợ cho vay khách hàng" },
  { key: "dep", label: "Tiền gửi KH", title: "Tiền gửi của khách hàng" },
  { key: "eq", label: "Vốn chủ sở hữu", title: "Vốn chủ sở hữu" },
  { key: "cap", label: "Vốn điều lệ", title: "Vốn điều lệ" },
  { key: "toi", label: "Thu nhập HĐ quý", title: "Tổng thu nhập hoạt động trong Q3/2026" },
  { key: "pbt", label: "LNTT quý", title: "Lợi nhuận trước thuế trong Q3/2026" },
];
const SORTS = ["Tổng tài sản", "Cho vay KH", "Tiền gửi KH", "LNTT quý", "Tăng trưởng LNTT"] as const;
type Sort = (typeof SORTS)[number];
const SORT_KEY: Record<Sort, Key> = {
  "Tổng tài sản": "tts",
  "Cho vay KH": "loan",
  "Tiền gửi KH": "dep",
  "LNTT quý": "pbt",
  "Tăng trưởng LNTT": "pbtYoy",
};

// tỷ đồng → "2.682 nghìn tỷ" / "185 tỷ"
const money = (ty: number) => (Math.abs(ty) >= 1000 ? `${vn(ty / 1000, ty >= 100000 ? 0 : 1)} nghìn tỷ` : `${vn(ty, 0)} tỷ`);
const short = (ty: number) => vn(ty / 1000, ty >= 100000 ? 0 : 1);

export default function BankScaleTab({ group }: { group: GroupFilter }) {
  const [sort, setSort] = useState<Sort>("Tổng tài sản");
  const sk = SORT_KEY[sort];
  const banks = banksIn(group);
  const rows = banks.map((b) => ({ bank: b, ...SCALE[b] })).sort((a, b) => b[sk] - a[sk]);
  const total = (k: Key) => rows.reduce((a, r) => a + r[k], 0);
  const ttsAll = total("tts");
  const maxSort = Math.max(...rows.map((r) => Math.abs(r[sk])), 1);
  const yoy = stats(Object.values(SCALE).map((r) => r.pbtYoy));
  const pbtTotal = total("pbt");
  const top = rows.reduce((a, r) => (r.pbt > a.pbt ? r : a), rows[0]);
  const up = rows.filter((r) => r.pbtYoy > 0).length;

  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Tổng quan quy mô" className="flex flex-wrap rounded-[10px] border border-[var(--ab-line)] bg-[var(--ab-card)]">
        <Tile label="Tổng tài sản" value={`${vn(ttsAll / 1e6, 2)} triệu tỷ`} sub={`${rows.length} ngân hàng · cuối Q3/2026`} />
        <Tile label="LNTT quý 3" value={money(pbtTotal)} sub={`Lớn nhất ${top.bank} ${money(top.pbt)}`} />
        <Tile label="Lợi nhuận tăng so với cùng kỳ" value={`${up}/${rows.length}`} sub="Số ngân hàng có LNTT quý tăng" />
        <Tile label="Cho vay / tiền gửi chung" value={`${vn((total("loan") / total("dep")) * 100, 1)}%`} sub="Tổng cho vay KH / tổng tiền gửi KH" />
      </section>

      <div className="flex flex-wrap items-center justify-end gap-2 text-[0.82rem] text-[var(--ab-muted)]">
        Sắp xếp theo <Seg items={SORTS} value={sort} onChange={setSort} label="Sắp xếp theo" />
      </div>

      <section className="overflow-x-auto rounded-[10px] border border-[var(--ab-line)] bg-[var(--ab-card)]">
        <table className="w-full min-w-[1080px] border-collapse text-[0.92rem]">
          <thead>
            <tr className="bg-[var(--ab-accent)] text-[var(--ab-bg)]">
              <th className="px-3 py-2.5 text-left font-bold">Ngân hàng</th>
              <th className="px-2 py-2.5 text-left font-bold">{sort}</th>
              {COLS.map((c) => (
                <th key={c.key} title={c.title} className="px-2 py-2.5 text-right font-bold leading-tight">
                  {c.label}
                </th>
              ))}
              <th className="px-2 py-2.5 text-center font-bold">LNTT so với cùng kỳ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const v = r[sk];
              const z = (r.pbtYoy - yoy.m) / yoy.sd;
              const isYoy = sk === "pbtYoy";
              return (
                <tr key={r.bank} className="border-t border-[var(--ab-line)]">
                  <td className="px-3 py-1.5 whitespace-nowrap">
                    <Link to={`/stock/${r.bank}`} className="font-bold text-[var(--ab-strong)] hover:underline">
                      {r.bank}
                    </Link>
                    <span className="ml-2 text-xs text-[var(--ab-muted)]">{groupOf(r.bank)}</span>
                  </td>
                  <td className="w-[210px] px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 rounded-[3px]"
                        style={{
                          width: `${(Math.abs(v) / maxSort) * 130}px`,
                          minWidth: 2,
                          background: isYoy ? (v >= 0 ? "var(--heat-up)" : "var(--heat-down)") : "var(--ab-accent)",
                          opacity: 0.85,
                        }}
                      />
                      <span className="text-xs tabular-nums text-[var(--ab-muted)]">
                        {isYoy ? `${v > 0 ? "+" : ""}${vn(v, 0)}%` : `${vn((v / total(sk)) * 100, 1)}%`}
                      </span>
                    </div>
                  </td>
                  {COLS.map((c) => (
                    <td key={c.key} className="px-2 py-1.5 text-right tabular-nums">
                      {short(r[c.key])}
                    </td>
                  ))}
                  <td className="px-2 py-1.5 text-center tabular-nums" style={heat(r.pbtYoy, Math.max(Math.abs(z), Math.abs(r.pbtYoy) / 25))}>
                    {r.pbtYoy > 0 ? "+" : r.pbtYoy < 0 ? "−" : ""}
                    {vn(Math.abs(r.pbtYoy), 1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <p className="-mt-1 text-[0.8rem] leading-relaxed text-[var(--ab-muted)]">
        Đơn vị: nghìn tỷ đồng. Cột thứ hai: tỷ trọng trong {rows.length} ngân hàng đang xem (khi sắp theo tăng trưởng thì là % LNTT tăng/giảm). Thu nhập
        hoạt động và LNTT là số riêng quý 3/2026. Nguồn: tổng hợp báo cáo tài chính Q3/2026. Chỉ để tham khảo, không phải khuyến nghị mua bán.
      </p>
    </div>
  );
}
