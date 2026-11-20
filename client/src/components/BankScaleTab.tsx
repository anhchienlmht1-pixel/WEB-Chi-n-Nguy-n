import { useState } from "react";
import { Link } from "react-router-dom";
import { CHARTER_CAPITAL, PROFIT, SCALE, type BankScale } from "../data/bankValuation";
import { BANKS } from "../data/bankSector";
import { BANK_BRAND } from "../data/bankBrand";

const brand = (b: string) => BANK_BRAND[b];
import BankBarChart from "./BankBarChart";
import { Seg, Tile, banksIn, groupOf, heat, stats, vn, type GroupFilter } from "./bankUi";

// Quy mô & lợi nhuận Q3/2026: tài sản, cho vay, tiền gửi, vốn, thu nhập và lợi nhuận
// trước thuế trong quý (tỷ đồng), thị phần tổng tài sản trong nhóm đang xem.

type Key = keyof BankScale | "npat";
type Row = { bank: string; npat: number } & BankScale;
const COLS: { key: Key; label: string; title: string }[] = [
  { key: "tts", label: "Tổng tài sản", title: "Tổng tài sản cuối Q3/2026" },
  { key: "loan", label: "Cho vay KH", title: "Dư nợ cho vay khách hàng" },
  { key: "dep", label: "Tiền gửi KH", title: "Tiền gửi của khách hàng" },
  { key: "eq", label: "Vốn chủ sở hữu", title: "Vốn chủ sở hữu" },
  { key: "cap", label: "Vốn điều lệ (tỷ đồng)", title: "Vốn điều lệ cuối Q3/2026, tỷ đồng (bảng cân đối kế toán, SSI)" },
  { key: "toi", label: "Thu nhập HĐ quý", title: "Tổng thu nhập hoạt động trong Q3/2026" },
  { key: "pbt", label: "LNTT quý", title: "Lợi nhuận trước thuế trong Q3/2026" },
  { key: "npat", label: "LNST quý", title: "Lợi nhuận sau thuế trong Q3/2026 (SSI)" },
];
const SORTS = ["Tổng tài sản", "Cho vay KH", "Tiền gửi KH", "LNTT quý", "Tăng trưởng LNTT", "Tăng trưởng TD & HĐ"] as const;
type Sort = (typeof SORTS)[number];
// Tăng trưởng tín dụng / huy động từ đầu năm (%), từ bank.xlsm Q3/2026.
const GROWTH: Record<string, { credit: number; deposit: number }> = Object.fromEntries(
  BANKS.map((b) => [b.bank, { credit: b.v.credit ?? 0, deposit: b.v.deposit ?? 0 }]),
);
const SORT_KEY: Record<Exclude<Sort, "Tăng trưởng TD & HĐ">, Key> = {
  "Tổng tài sản": "tts",
  "Cho vay KH": "loan",
  "Tiền gửi KH": "dep",
  "LNTT quý": "pbt",
  "Tăng trưởng LNTT": "pbtYoy",
};

// tỷ đồng → "2.682 nghìn tỷ" / "185 tỷ"
const money = (ty: number) => (Math.abs(ty) >= 1000 ? `${vn(ty / 1000, ty >= 100000 ? 0 : 1)} nghìn tỷ` : `${vn(ty, 0)} tỷ`);
// Bảng: luôn 2 chữ số thập phân (nghìn tỷ đồng), cột thẳng hàng như bảng tài chính.
const short = (ty: number) => vn(ty / 1000, 2);

export default function BankScaleTab({ group }: { group: GroupFilter }) {
  const [sort, setSort] = useState<Sort>("Tổng tài sản");
  const [tax, setTax] = useState<"Trước thuế" | "Sau thuế">("Trước thuế");
  // Lợi nhuận quý 3/2026 và tăng trưởng so với Q3/2025, trước hoặc sau thuế (SSI).
  const prof = (b: string) => {
    const p = PROFIT[b];
    if (!p) return null;
    const cur = tax === "Trước thuế" ? p.pbt : p.npat;
    const prev = tax === "Trước thuế" ? p.pbtPrev : p.npatPrev;
    return { cur, yoy: prev ? (cur / prev - 1) * 100 : 0 };
  };
  const growthMode = sort === "Tăng trưởng TD & HĐ";
  const sk: Key = growthMode ? "loan" : SORT_KEY[sort];
  const banks = banksIn(group);
  const sortVal = (r: Row) => (growthMode ? GROWTH[r.bank]?.credit ?? 0 : r[sk]);
  const rows: Row[] = banks.map((b) => ({ bank: b, ...SCALE[b], npat: PROFIT[b]?.npat ?? 0 })).sort((a, b) => sortVal(b) - sortVal(a));
  const total = (k: Key) => rows.reduce((a, r) => a + r[k], 0);
  const ttsAll = total("tts");
  const maxSort = Math.max(...rows.map((r) => Math.abs(sortVal(r))), 1);
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

      {/* Tất cả biểu đồ hiện cùng lúc, 2 biểu đồ một hàng trên màn hình rộng;
          mỗi biểu đồ tự sắp từ cao xuống thấp. */}
      <div className="grid gap-4 xl:grid-cols-2">
        {(["tts", "loan", "dep"] as const).map((k) => (
          <BankBarChart
          colorOf={brand}
            key={k}
            title={COLS.find((c) => c.key === k)!.title}
            subtitle={`Q3/2026 · nghìn tỷ đồng · ${rows.length} ngân hàng`}
            items={[...rows].sort((a, b) => b[k] - a[k]).map((r) => ({ bank: r.bank, v: r[k] / 1000 }))}
            fmt={(n) => `${vn(n, n >= 100 ? 0 : 1)} nghìn tỷ`}
            axisFmt={(n) => vn(n, n >= 100 || n === 0 ? 0 : 1)}
            label1={COLS.find((c) => c.key === k)!.label}
            compact
          />
        ))}
        <BankBarChart
          colorOf={brand}
          title="Tăng trưởng tín dụng và huy động"
          subtitle="Từ đầu năm đến cuối Q3/2026 · sắp theo tăng trưởng tín dụng"
          items={[...rows]
            .sort((a, b) => (GROWTH[b.bank]?.credit ?? 0) - (GROWTH[a.bank]?.credit ?? 0))
            .map((r) => ({ bank: r.bank, v: GROWTH[r.bank]?.credit ?? 0, v2: GROWTH[r.bank]?.deposit ?? 0 }))}
          fmt={(n) => `${vn(n, 1)}%`}
          axisFmt={(n) => `${vn(n, 0)}%`}
          label1="Tăng trưởng tín dụng"
          label2="Tăng trưởng huy động"
          compact
        />
        <div className="xl:col-span-2">
          <BankBarChart
          colorOf={brand}
            title={`Lợi nhuận ${tax === "Trước thuế" ? "trước" : "sau"} thuế và tăng trưởng`}
            subtitle="Q3/2026 · cột: nghìn tỷ đồng · chấm: % so với Q3/2025 · sắp theo lợi nhuận"
            items={[...rows]
              .map((r) => ({ bank: r.bank, p: prof(r.bank) }))
              .filter((x) => x.p)
              .sort((a, b) => b.p!.cur - a.p!.cur)
              .map((x) => ({ bank: x.bank, v: x.p!.cur / 1000, v2: x.p!.yoy }))}
            fmt={(n) => `${vn(n, 2)} nghìn tỷ`}
            axisFmt={(n) => vn(n, Number.isInteger(n) ? 0 : 1)}
            label1={`LN${tax === "Trước thuế" ? "TT" : "ST"} quý 3`}
            label2="Tăng trưởng so với cùng kỳ"
            v2Kind="dot"
            fmt2={(n) => `${n > 0 ? "+" : ""}${vn(n, 1)}%`}
            axisFmt2={(n) => `${vn(n, 0)}%`}
            controls={<Seg items={["Trước thuế", "Sau thuế"] as const} value={tax} onChange={setTax} label="Lợi nhuận trước hay sau thuế" />}
          />
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-[var(--ab-strong)]">Bảng số liệu</h2>
        <div className="flex flex-wrap items-center gap-2 text-[0.82rem] text-[var(--ab-muted)]">
          Sắp xếp bảng theo <Seg items={SORTS} value={sort} onChange={setSort} label="Sắp xếp bảng theo" />
        </div>
      </div>

      <section className="overflow-x-auto rounded-[10px] border border-[var(--ab-line)] bg-[var(--ab-card)]">
        <table className="w-full min-w-[1080px] border-collapse text-[0.92rem]">
          <thead>
            <tr className="sm-thead">
              <th className="px-3 py-2.5 text-left font-bold">Ngân hàng</th>
              <th className="px-2 py-2.5 text-left font-bold">{growthMode ? "Tăng trưởng tín dụng YTD" : sort}</th>
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
              const v = growthMode ? GROWTH[r.bank]?.credit ?? 0 : r[sk];
              const z = (r.pbtYoy - yoy.m) / yoy.sd;
              const isYoy = sk === "pbtYoy" || growthMode;
              return (
                <tr key={r.bank} className="border-t border-[var(--ab-line)]">
                  <td className="px-3 py-1.5 whitespace-nowrap">
                    <Link to={`/stock/${r.bank}`} className="inline-block w-11 font-bold text-[var(--ab-strong)] hover:underline">
                      {r.bank}
                    </Link>
                    <span className="text-xs text-[var(--ab-muted)]">{groupOf(r.bank)}</span>
                  </td>
                  <td className="w-[230px] px-2 py-1.5">
                    {/* Số % căn phải trong cột cố định, thanh bắt đầu cùng một mốc.
                        Tăng trưởng: xanh/đỏ, càng mạnh càng đậm. */}
                    <div className="flex items-center gap-2">
                      <span className="w-16 shrink-0 text-right text-xs tabular-nums text-[var(--ab-muted)]">
                        {isYoy ? `${v > 0 ? "+" : ""}${vn(v, 2)}%` : `${vn((v / total(sk)) * 100, 2)}%`}
                      </span>
                      <span className="relative h-3 w-[130px] shrink-0">
                        <span
                          className="absolute inset-y-0 left-0 rounded-[3px]"
                          style={{
                            width: `${Math.max(2, (Math.abs(v) / maxSort) * 130)}px`,
                            background: isYoy ? (v >= 0 ? "var(--heat-up)" : "var(--heat-down)") : "var(--ab-accent)",
                            opacity: isYoy ? 0.3 + 0.7 * (Math.abs(v) / maxSort) : 0.85,
                          }}
                        />
                      </span>
                    </div>
                  </td>
                  {COLS.map((c) => (
                    <td key={c.key} className="px-2 py-1.5 text-right tabular-nums">
                      {c.key === "cap" ? vn(CHARTER_CAPITAL[r.bank] ?? r.cap, 2) : short(r[c.key])}
                    </td>
                  ))}
                  <td className="px-2 py-1.5 text-center tabular-nums" style={heat(r.pbtYoy, Math.max(Math.abs(z), Math.abs(r.pbtYoy) / 25))}>
                    {r.pbtYoy > 0 ? "+" : r.pbtYoy < 0 ? "−" : ""}
                    {vn(Math.abs(r.pbtYoy), 2)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <p className="-mt-1 text-[0.8rem] leading-relaxed text-[var(--ab-muted)]">
        Đơn vị: nghìn tỷ đồng (riêng vốn điều lệ: tỷ đồng). Cột thứ hai: tỷ trọng trong {rows.length} ngân hàng đang xem (khi sắp theo tăng trưởng thì là % LNTT tăng/giảm). Thu nhập
        hoạt động và LNTT là số riêng quý 3/2026. Nguồn: tổng hợp báo cáo tài chính Q3/2026. Chỉ để tham khảo, không phải khuyến nghị mua bán.
      </p>
    </div>
  );
}
