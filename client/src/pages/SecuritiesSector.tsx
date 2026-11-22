import { useMemo, useState } from "react";
import type React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import BankBarChart from "../components/BankBarChart";
import SecValuationTab from "../components/SecValuationTab";
import { STEPS, Seg, Tile, heat, mean, stats, vn } from "../components/bankUi";
import { SEC_GROUPS, qLabel, useSecSector, type SecGroupFilter, type SecMetric, type SecRow, type SecScale, type SecSector } from "../data/securities";

// Ngành chứng khoán: cùng khung với Ngành ngân hàng — bảng chỉ số 18 CTCK (màu ô
// = so với trung bình ngành, mũi tên = so với cùng kỳ), xếp hạng theo chỉ số,
// quy mô & lợi nhuận, thị phần môi giới. Số liệu từ file Excel tổng hợp BCTC.

interface Metric {
  key: SecMetric;
  label: string;
  short: string;
  /** 1 = cao là tốt, -1 = thấp là tốt, 0 = trung tính */
  dir: 1 | -1 | 0;
  /** "lần" cho các tỷ lệ bội số, còn lại là % */
  unit: "%" | "lần";
  digits: number;
  /** tăng trưởng: không có mũi tên so với cùng kỳ */
  growth?: boolean;
  what: string;
}

const METRICS: Metric[] = [
  { key: "roe", label: "ROE", short: "ROE", dir: 1, unit: "%", digits: 1, what: "Lợi nhuận sau thuế của cổ đông công ty mẹ trên vốn chủ sở hữu bình quân, quy năm (quý × 4)." },
  { key: "roa", label: "ROA", short: "ROA", dir: 1, unit: "%", digits: 1, what: "Lợi nhuận sau thuế trên tổng tài sản bình quân, quy năm (quý × 4)." },
  { key: "pbtMargin", label: "Biên LNTT", short: "Biên LNTT", dir: 1, unit: "%", digits: 1, what: "Lợi nhuận trước thuế trên doanh thu hoạt động trong quý." },
  { key: "brokerShare", label: "Tỷ trọng DT môi giới", short: "DT môi giới", dir: 0, unit: "%", digits: 1, what: "Doanh thu môi giới chiếm bao nhiêu phần doanh thu hoạt động. Cao nghĩa là phụ thuộc nhiều vào thanh khoản thị trường." },
  { key: "brokerMargin", label: "Biên LN môi giới", short: "Biên môi giới", dir: 1, unit: "%", digits: 1, what: "(Doanh thu môi giới − chi phí môi giới) / doanh thu môi giới. Âm nghĩa là mảng môi giới đang lỗ (thường do giảm phí để giành thị phần)." },
  { key: "takeRate", label: "Phí môi giới thực thu", short: "Take rate", dir: 1, unit: "%", digits: 3, what: "Doanh thu môi giới trên giá trị giao dịch của nhà đầu tư tại CTCK (take rate)." },
  { key: "marginYield", label: "Lãi suất margin", short: "Lãi suất margin", dir: 1, unit: "%", digits: 1, what: "Lãi từ cho vay và phải thu trên dư nợ cho vay, quy năm. Mức lãi bình quân CTCK thu được từ margin." },
  { key: "fundingCost", label: "Chi phí vốn vay", short: "Chi phí vốn", dir: -1, unit: "%", digits: 1, what: "Chi phí lãi vay trên tổng vay (vay ngắn hạn, vay tài sản tài chính, vay Quỹ hỗ trợ thanh toán, repo), quy năm. Thấp hơn là tốt." },
  { key: "spread", label: "Chênh lệch margin", short: "Chênh lệch", dir: 1, unit: "%", digits: 1, what: "Lãi suất margin trừ chi phí vốn vay (cùng quy năm). Khoảng lời trên mỗi đồng cho vay." },
  { key: "marginToEq", label: "Cho vay / VCSH", short: "Cho vay/VCSH", dir: 0, unit: "lần", digits: 2, what: "Dư nợ cho vay trên vốn chủ sở hữu. Luật giới hạn dư nợ margin tối đa 2 lần VCSH; gần 2 lần là dư địa cho vay hẹp." },
  { key: "marginGrowth", label: "Tăng trưởng margin quý", short: "Margin QoQ", dir: 1, unit: "%", digits: 1, growth: true, what: "Dư nợ margin thay đổi bao nhiêu so với quý trước." },
  { key: "propToEq", label: "Tự doanh / VCSH", short: "Tự doanh/VCSH", dir: 0, unit: "lần", digits: 2, what: "Tài sản tự doanh (FVTPL + HTM + AFS) trên vốn chủ sở hữu. Cao là dùng nhiều vốn cho tự doanh." },
  { key: "propProfitShare", label: "Tỷ trọng LN tự doanh", short: "LN tự doanh", dir: 0, unit: "%", digits: 1, what: "Lãi thuần tự doanh trên lợi nhuận gộp. Cao nghĩa là kết quả phụ thuộc nhiều vào diễn biến giá chứng khoán." },
  { key: "leverage", label: "Tổng TS / VCSH", short: "Đòn bẩy", dir: 0, unit: "lần", digits: 2, what: "Tổng tài sản trên vốn chủ sở hữu (đòn bẩy tài chính)." },
  { key: "revYoy", label: "Tăng trưởng doanh thu", short: "DT YoY", dir: 1, unit: "%", digits: 1, growth: true, what: "Doanh thu hoạt động quý so với cùng quý năm trước." },
  { key: "pbtYoy", label: "Tăng trưởng LNTT", short: "LNTT YoY", dir: 1, unit: "%", digits: 1, growth: true, what: "Lợi nhuận trước thuế quý so với cùng quý năm trước." },
];
// Bảng chính bỏ ROA và đòn bẩy cho vừa màn hình (vẫn có trong biểu đồ trang mã).
const TABLE = METRICS.filter((m) => m.key !== "roa" && m.key !== "leverage");
const RANK_KEYS: SecMetric[] = ["roe", "pbtMargin", "marginYield", "fundingCost", "spread", "marginToEq", "propProfitShare", "pbtYoy"];

const fmtM = (m: Metric, v: number) => `${vn(v, m.digits)}${m.unit === "%" ? "%" : " lần"}`;

function useRows(d: SecSector, group: SecGroupFilter) {
  return useMemo(() => (group === "Tất cả" ? d.rows : d.rows.filter((r) => r.group === group)), [d, group]);
}

/* ------------------------------------------------------------ Chỉ số hoạt động */

function OverviewTab({ d, group }: { d: SecSector; group: SecGroupFilter }) {
  const [rankKey, setRankKey] = useState<SecMetric>("roe");
  const st = useMemo(() => {
    const out = {} as Record<SecMetric, { m: number; sd: number }>;
    for (const m of METRICS) out[m.key] = stats(d.rows.flatMap((r) => (r.v[m.key] != null ? [r.v[m.key]!] : [])));
    return out;
  }, [d]);
  const rows = useRows(d, group);
  const vals = (k: SecMetric) => rows.flatMap((r) => (r.v[k] != null ? [{ sym: r.sym, v: r.v[k]! }] : []));
  const avg = (k: SecMetric) => mean(vals(k).map((x) => x.v));
  const best = (k: SecMetric, hi = true) => {
    const xs = vals(k);
    if (!xs.length) return "";
    const m = METRICS.find((x) => x.key === k)!;
    const b = xs.reduce((a, c) => ((hi ? c.v > a.v : c.v < a.v) ? c : a));
    return `${hi ? "Cao nhất" : "Thấp nhất"} ${b.sym} ${fmtM(m, b.v)}`;
  };
  const rm = METRICS.find((m) => m.key === rankKey)!;
  const ranked = vals(rankKey).sort((a, b) => (rm.dir === -1 ? a.v - b.v : b.v - a.v));
  const rankAvg = avg(rankKey);
  const lo = Math.min(0, ...ranked.map((x) => x.v));
  const hi = Math.max(0, ...ranked.map((x) => x.v), rankAvg);
  const span = hi - lo || 1;
  const groups = SEC_GROUPS.slice(1).filter((g) => rows.some((r) => r.group === g));
  const P = qLabel(d.period);

  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Trung bình ngành" className="flex flex-wrap rounded-[10px] border border-[var(--ab-line)] bg-[var(--ab-card)]">
        <Tile label="ROE trung bình (quy năm)" value={`${vn(avg("roe"), 1)}%`} sub={best("roe")} />
        <Tile label="Biên LNTT trung bình" value={`${vn(avg("pbtMargin"), 1)}%`} sub={best("pbtMargin")} />
        <Tile label="Lãi suất margin trung bình" value={`${vn(avg("marginYield"), 1)}%`} sub={best("marginYield")} />
        <Tile label="Chi phí vốn vay trung bình" value={`${vn(avg("fundingCost"), 1)}%`} sub={best("fundingCost", false)} />
      </section>

      <section className="overflow-x-auto rounded-[10px] border border-[var(--ab-line)] bg-[var(--ab-card)]">
        <table className="w-full min-w-[1240px] border-collapse text-[0.9rem]">
          <thead>
            <tr className="sm-thead">
              <th className="w-[104px]" />
              <th className="px-2 py-2.5 font-bold">CTCK</th>
              {TABLE.map((m) => (
                <th key={m.key} title={m.what} className="px-1.5 py-2.5 text-center text-[0.82rem] font-bold leading-tight">
                  {m.label} {m.unit === "%" ? "(%)" : "(lần)"}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => {
              const gr = rows.filter((r) => r.group === g);
              return gr.map((r, i) => (
                <tr key={r.sym} className={`border-t ${i === 0 ? "border-[var(--ab-line-strong)]" : "border-[var(--ab-line)]"}`}>
                  {i === 0 && (
                    <td rowSpan={gr.length} className="border-r border-[var(--ab-line)] px-2 text-center text-[0.85rem] font-bold leading-tight text-[var(--ab-text)]">
                      {g}
                    </td>
                  )}
                  <td className="border-r border-[var(--ab-line)] px-3 py-1.5 text-center">
                    <Link to={`/stock/${r.sym}`} className="font-bold text-[var(--ab-strong)] underline-offset-2 hover:underline">
                      {r.sym}
                    </Link>
                  </td>
                  {TABLE.map((m) => (
                    <Cell key={m.key} m={m} r={r} st={st[m.key]} />
                  ))}
                </tr>
              ));
            })}
          </tbody>
        </table>
      </section>
      <div className="-mt-1 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[0.8rem] text-[var(--ab-muted)]">
        <span className="flex items-center gap-2">
          Kém hơn
          <span className="flex overflow-hidden rounded-sm border border-[var(--ab-line)]" aria-hidden="true">
            {[4, 3, 2, 1].map((k) => (
              <i key={`d${k}`} className="block h-3 w-5" style={{ background: `color-mix(in srgb, var(--heat-down) ${STEPS[k]}%, transparent)` }} />
            ))}
            <i className="block h-3 w-5" />
            {[1, 2, 3, 4].map((k) => (
              <i key={`u${k}`} className="block h-3 w-5" style={{ background: `color-mix(in srgb, var(--heat-up) ${STEPS[k]}%, transparent)` }} />
            ))}
          </span>
          Tốt hơn
        </span>
      </div>

      <div className="rounded-[10px] border border-[var(--ab-line)] bg-[var(--ab-card)] px-4 py-3 text-[0.85rem] leading-relaxed">
        <b className="text-[var(--ab-strong)]">Cách đọc bảng</b>
        <ul className="mt-1.5 grid gap-x-8 gap-y-1 md:grid-cols-2">
          <li>
            <b>Màu ô</b>: so với <b>trung bình {d.rows.length} CTCK</b>. Xanh = tốt hơn mặt bằng ngành, đỏ = kém hơn, màu càng đậm thì chênh càng nhiều.
          </li>
          <li>
            <b>Mũi tên trong ô</b>: so với <b>cùng kỳ {qLabel(d.periodPrev)}</b>, ▲ tăng, ▼ giảm; mũi tên{" "}
            <span style={{ color: "var(--heat-up)" }}>xanh</span> là thay đổi tốt, <span style={{ color: "var(--heat-down)" }}>đỏ</span> là xấu. Các cột tăng trưởng không có mũi tên.
          </li>
          <li>
            <b>Không tô màu</b>: tỷ trọng môi giới, tỷ trọng LN tự doanh, cho vay/VCSH, tự doanh/VCSH — đây là đặc điểm mô hình kinh doanh, không có mức "càng cao càng tốt".
          </li>
          <li>
            <b>Nhóm</b> theo file tổng hợp: <b>Cho vay margin</b> (thu nhập chính từ cho vay ký quỹ) và <b>Tự doanh</b> (thu nhập chính từ đầu tư). LPS, KAI chưa được xếp nhóm trong file nên để ở "Khác".
          </li>
          <li className="text-[var(--ab-muted)] md:col-span-2">
            ROE, lãi suất margin, chi phí vốn vay đã quy năm (số quý × 4). Chênh lệch margin = lãi suất margin − chi phí vốn vay. Ô "—" là CTCK không phát sinh khoản đó
            (vd. không hạch toán chi phí lãi vay riêng). Rê chuột vào ô để xem trung bình ngành và số cùng kỳ. Nguồn: báo cáo tài chính {P}. Chỉ để tham khảo, không phải
            khuyến nghị mua bán.
          </li>
        </ul>
      </div>

      <section className="grid gap-7 rounded-[10px] border border-[var(--ab-line)] bg-[var(--ab-card)] p-5 lg:grid-cols-[1.2fr_1fr]">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-[var(--ab-strong)]">Xếp hạng theo chỉ số</h2>
          <div role="group" aria-label="Chọn chỉ số" className="mt-2.5 mb-4 flex flex-wrap gap-2">
            {RANK_KEYS.map((k) => {
              const m = METRICS.find((x) => x.key === k)!;
              const on = k === rankKey;
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setRankKey(k)}
                  className={`rounded-full px-3 py-1.5 text-[0.82rem] transition-colors ${
                    on ? "sm-on font-bold" : "border border-[var(--ab-line)] text-[var(--ab-muted)] hover:bg-[var(--ab-hover)]"
                  }`}
                >
                  {m.short}
                </button>
              );
            })}
          </div>
          <ol className="relative flex flex-col gap-1.5" aria-label={`Xếp hạng ${rm.label}`}>
            {ranked.map((x) => {
              const better = rm.dir === -1 ? x.v <= rankAvg : x.v >= rankAvg;
              const left = ((Math.min(x.v, 0) - lo) / span) * 100;
              const w = (Math.abs(x.v) / span) * 100;
              return (
                <li key={x.sym} className="grid grid-cols-[3rem_1fr_5.5rem] items-center gap-2 text-[0.85rem]">
                  <Link to={`/stock/${x.sym}`} className="font-bold text-[var(--ab-strong)] hover:underline">
                    {x.sym}
                  </Link>
                  <div className="relative h-4">
                    <span
                      className="absolute top-0 h-4 rounded-[3px]"
                      style={{
                        left: `${left}%`,
                        width: `${Math.max(w, 0.4)}%`,
                        background: rm.dir === 0 ? "var(--ab-accent)" : better ? "var(--heat-up)" : "var(--heat-down)",
                        opacity: 0.85,
                      }}
                    />
                  </div>
                  <span className="text-right tabular-nums text-[var(--ab-text)]">{fmtM(rm, x.v)}</span>
                </li>
              );
            })}
          </ol>
          <p className="mt-2 text-[0.8rem] text-[#e07b39]">
            Trung bình {ranked.length} CTCK: {fmtM(rm, rankAvg)}
          </p>
        </div>
        <div className="border-[var(--ab-line)] lg:border-l lg:pl-6">
          <h3 className="font-bold text-[var(--ab-strong)]">{rm.label} là gì</h3>
          <p className="mt-1.5 mb-4">{rm.what}</p>
          <h3 className="font-bold text-[var(--ab-strong)]">Đọc nhanh</h3>
          <ul className="mt-1.5 list-disc pl-5 leading-relaxed">
            {rm.dir !== 0 && <li>Cột xanh: {rm.dir === -1 ? "thấp hơn" : "cao hơn"} trung bình (tốt hơn). Cột đỏ: kém hơn trung bình.</li>}
            <li>Lọc theo nhóm ở góc trên để so trong cùng mô hình kinh doanh.</li>
            <li>Bấm mã CTCK để mở trang chi tiết.</li>
          </ul>
          <p className="mt-4 text-xs text-[var(--ab-muted)]">Nguồn: tổng hợp báo cáo tài chính {P} của các CTCK. Chỉ để tham khảo, không phải khuyến nghị mua bán.</p>
        </div>
      </section>
    </div>
  );
}

function Cell({ m, r, st }: { m: Metric; r: SecRow; st: { m: number; sd: number } }) {
  const v = r.v[m.key];
  const p = r.p[m.key];
  if (v == null) return <td className="px-1.5 py-1.5 text-center text-[var(--ab-muted)]">—</td>;
  const z = (v - st.m) / st.sd;
  const style: React.CSSProperties | undefined = m.dir === 0 ? undefined : heat(m.dir * z, z);
  const d = !m.growth && p != null ? v - p : null;
  const arrow = d == null || Math.abs(d) < 1e-9 ? "" : d > 0 ? "▲" : "▼";
  const arrowColor = m.dir === 0 ? "var(--ab-muted)" : m.dir * (d ?? 0) > 0 ? "var(--heat-up)" : "var(--heat-down)";
  const unit = m.unit === "%" ? "%" : " lần";
  const title = `TB ngành: ${vn(st.m, m.digits)}${unit}${p != null && !m.growth ? ` · cùng kỳ: ${vn(p, m.digits)}${unit}` : ""}`;
  return (
    <td title={title} className="px-1.5 py-1.5 text-center tabular-nums" style={style}>
      {vn(v, m.digits)}
      {arrow && (
        <span aria-hidden="true" className="ml-1 text-[0.6rem] opacity-80" style={{ color: arrowColor }}>
          {arrow}
        </span>
      )}
    </td>
  );
}

/* --------------------------------------------------------- Quy mô & lợi nhuận */

const money = (ty: number) => (Math.abs(ty) >= 1000 ? `${vn(ty / 1000, 1)} nghìn tỷ` : `${vn(ty, 0)} tỷ`);
const k2 = (ty: number | null) => (ty == null ? "—" : vn(ty / 1000, 2));

const SCALE_COLS: { key: keyof SecScale; label: string; title: string }[] = [
  { key: "tts", label: "Tổng tài sản", title: "Tổng tài sản cuối quý" },
  { key: "eq", label: "Vốn chủ sở hữu", title: "Vốn chủ sở hữu cuối quý" },
  { key: "charter", label: "Vốn điều lệ", title: "Vốn góp của chủ sở hữu" },
  { key: "margin", label: "Dư nợ margin", title: "Cho vay nghiệp vụ ký quỹ (thuyết minh BCTC)" },
  { key: "prop", label: "Tài sản tự doanh", title: "FVTPL + HTM + AFS" },
  { key: "borrow", label: "Nợ vay", title: "Vay ngắn hạn, vay tài sản tài chính, vay Quỹ hỗ trợ thanh toán, repo" },
  { key: "rev", label: "Doanh thu quý", title: "Doanh thu thuần hoạt động kinh doanh trong quý" },
  { key: "pbt", label: "LNTT quý", title: "Lợi nhuận trước thuế trong quý" },
  { key: "pat", label: "LNST quý", title: "Lợi nhuận sau thuế trong quý" },
];

function ScaleTab({ d, group }: { d: SecSector; group: SecGroupFilter }) {
  const [tax, setTax] = useState<"Trước thuế" | "Sau thuế">("Trước thuế");
  const syms = new Set(useRows(d, group).map((r) => r.sym));
  const rows = d.scale.filter((s) => syms.has(s.sym));
  const P = qLabel(d.period);
  const sum = (k: keyof SecScale) => rows.reduce((a, r) => a + ((r[k] as number | null) ?? 0), 0);
  const top = rows.reduce((a, r) => ((r.pbt ?? -Infinity) > (a.pbt ?? -Infinity) ? r : a), rows[0]);
  const yoy = (cur: number | null, prev: number | null) => (cur == null || !prev ? null : ((cur - prev) / Math.abs(prev)) * 100);
  const up = rows.filter((r) => (yoy(r.pbt, r.pbtPrev) ?? 0) > 0).length;
  const marginNow = sum("margin");
  const marginPrev = sum("marginPrev");
  const bar = (k: keyof SecScale, title: string) => (
    <BankBarChart
      key={k}
      title={title}
      subtitle={`${P} · nghìn tỷ đồng · ${rows.filter((r) => r[k] != null).length} CTCK`}
      items={rows
        .filter((r) => r[k] != null && (r[k] as number) !== 0)
        .sort((a, b) => (b[k] as number) - (a[k] as number))
        .map((r) => ({ bank: r.sym, v: (r[k] as number) / 1000 }))}
      fmt={(n) => `${vn(n, n >= 100 ? 0 : 1)} nghìn tỷ`}
      axisFmt={(n) => vn(n, n >= 100 || n === 0 ? 0 : 1)}
      label1={SCALE_COLS.find((c) => c.key === k)!.label}
      compact
    />
  );

  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Tổng quan quy mô" className="flex flex-wrap rounded-[10px] border border-[var(--ab-line)] bg-[var(--ab-card)]">
        <Tile label="Tổng dư nợ margin" value={money(marginNow)} sub={`${marginPrev ? `${vn(((marginNow - marginPrev) / marginPrev) * 100, 1)}% so với cùng kỳ` : ""}`} />
        <Tile label={`LNTT ${P}`} value={money(sum("pbt"))} sub={top ? `Lớn nhất ${top.sym} ${money(top.pbt ?? 0)}` : ""} />
        <Tile label="LNTT tăng so với cùng kỳ" value={`${up}/${rows.length}`} sub="Số CTCK có LNTT quý tăng" />
        <Tile label="Tổng tài sản" value={money(sum("tts"))} sub={`${rows.length} CTCK · cuối ${P}`} />
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        {bar("tts", "Tổng tài sản")}
        {bar("eq", "Vốn chủ sở hữu")}
        {bar("margin", "Dư nợ margin")}
        {bar("prop", "Tài sản tự doanh (FVTPL + HTM + AFS)")}
        <div className="xl:col-span-2">
          <BankBarChart
            title={`Lợi nhuận ${tax === "Trước thuế" ? "trước" : "sau"} thuế và tăng trưởng`}
            subtitle={`${P} · cột: nghìn tỷ đồng · chấm: % so với ${qLabel(d.periodPrev)} · sắp theo lợi nhuận`}
            items={rows
              .map((r) => {
                const cur = tax === "Trước thuế" ? r.pbt : r.pat;
                const prev = tax === "Trước thuế" ? r.pbtPrev : r.patPrev;
                return { sym: r.sym, cur, g: yoy(cur, prev) };
              })
              .filter((x) => x.cur != null)
              .sort((a, b) => b.cur! - a.cur!)
              .map((x) => ({ bank: x.sym, v: x.cur! / 1000, v2: x.g == null ? undefined : Math.max(-300, Math.min(300, x.g)) }))}
            fmt={(n) => `${vn(n, 2)} nghìn tỷ`}
            axisFmt={(n) => vn(n, Number.isInteger(n) ? 0 : 1)}
            label1={`LN${tax === "Trước thuế" ? "TT" : "ST"} quý`}
            label2="Tăng trưởng so với cùng kỳ (giới hạn ±300%)"
            v2Kind="dot"
            fmt2={(n) => `${n > 0 ? "+" : ""}${vn(n, 1)}%`}
            axisFmt2={(n) => `${vn(n, 0)}%`}
            controls={<Seg items={["Trước thuế", "Sau thuế"] as const} value={tax} onChange={setTax} label="Lợi nhuận trước hay sau thuế" />}
          />
        </div>
      </div>

      <h2 className="mt-2 text-lg font-bold text-[var(--ab-strong)]">Bảng số liệu (nghìn tỷ đồng)</h2>
      <section className="overflow-x-auto rounded-[10px] border border-[var(--ab-line)] bg-[var(--ab-card)]">
        <table className="w-full min-w-[1000px] border-collapse text-[0.9rem]">
          <thead>
            <tr className="sm-thead">
              <th className="px-3 py-2.5 text-left font-bold">CTCK</th>
              {SCALE_COLS.map((c) => (
                <th key={c.key} title={c.title} className="px-2 py-2.5 text-right font-bold leading-tight">
                  {c.label}
                </th>
              ))}
              <th className="px-3 py-2.5 text-right font-bold">LNTT so với cùng kỳ</th>
            </tr>
          </thead>
          <tbody>
            {[...rows]
              .sort((a, b) => (b.tts ?? 0) - (a.tts ?? 0))
              .map((r) => {
                const g = yoy(r.pbt, r.pbtPrev);
                return (
                  <tr key={r.sym} className="border-t border-[var(--ab-line)]">
                    <td className="px-3 py-1.5">
                      <Link to={`/stock/${r.sym}`} className="font-bold text-[var(--ab-strong)] hover:underline">
                        {r.sym}
                      </Link>
                    </td>
                    {SCALE_COLS.map((c) => (
                      <td key={c.key} className="px-2 py-1.5 text-right tabular-nums">
                        {k2(r[c.key] as number | null)}
                      </td>
                    ))}
                    <td className={`px-3 py-1.5 text-right tabular-nums ${g == null ? "" : g > 0 ? "up" : g < 0 ? "down" : ""}`}>
                      {g == null ? "—" : `${g > 0 ? "+" : ""}${vn(g, 1)}%`}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </section>

      {d.capitalPlans.length > 0 && (
        <>
          <h2 className="mt-2 text-lg font-bold text-[var(--ab-strong)]">Kế hoạch tăng vốn</h2>
          <section className="overflow-x-auto rounded-[10px] border border-[var(--ab-line)] bg-[var(--ab-card)]">
            <table className="w-full min-w-[640px] border-collapse text-[0.9rem]">
              <thead>
                <tr className="sm-thead">
                  <th className="px-3 py-2.5 text-left font-bold">Mã</th>
                  <th className="px-3 py-2.5 text-left font-bold">Phương thức</th>
                  <th className="px-3 py-2.5 text-right font-bold">% cổ phiếu lưu hành</th>
                  <th className="px-3 py-2.5 text-right font-bold">Số cổ phiếu (triệu)</th>
                  <th className="px-3 py-2.5 text-right font-bold">Giá trị (tỷ đồng)</th>
                </tr>
              </thead>
              <tbody>
                {d.capitalPlans.map((p, i) => (
                  <tr key={`${p.sym}${i}`} className="border-t border-[var(--ab-line)]">
                    <td className="px-3 py-1.5 font-bold text-[var(--ab-strong)]">{p.sym}</td>
                    <td className="px-3 py-1.5">{p.method}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{p.pct == null ? "—" : `${vn(p.pct, 1)}%`}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{p.shares == null ? "—" : vn(p.shares, 0)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{p.value == null ? "—" : vn(p.value, 0)}</td>
                  </tr>
                ))}
                <tr className="border-t border-[var(--ab-line-strong)] font-bold">
                  <td className="px-3 py-1.5" colSpan={4}>
                    Tổng
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{vn(d.capitalPlans.reduce((a, p) => a + (p.value ?? 0), 0), 0)}</td>
                </tr>
              </tbody>
            </table>
          </section>
        </>
      )}
      <p className="text-xs text-[var(--ab-muted)]">Nguồn: tổng hợp báo cáo tài chính {P} của các CTCK. Chỉ để tham khảo, không phải khuyến nghị mua bán.</p>
    </div>
  );
}

/* ------------------------------------------------------------ Thị phần môi giới */

const LINE_COLORS = ["#c9a24a", "#4f8a5b", "#2f7fd6", "#d6456b", "#8a5cc4", "#14a3a3", "#d08a1e", "#6b7b5e", "#a14f3a", "#5a6fb0", "#9b8f6a", "#3f9f86"];

function ShareTab({ d }: { d: SecSector }) {
  const sh = d.share;
  const [view, setView] = useState<"Theo quý" | "Theo năm">("Theo quý");
  const labels = view === "Theo quý" ? sh.quarters : sh.years;
  const pick = (r: { quarters: (number | null)[]; years: (number | null)[] }) => (view === "Theo quý" ? r.quarters : r.years);
  const lastIdx = labels.length - 1;
  const rows = [...sh.rows].sort((a, b) => (pick(b)[lastIdx] ?? -1) - (pick(a)[lastIdx] ?? -1));
  const data = labels.map((l, i) => {
    const o: Record<string, number | string | null> = { l };
    for (const r of rows) o[r.name] = pick(r)[i];
    return o;
  });
  const [hide, setHide] = useState<Set<string>>(new Set());

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-[10px] border border-[var(--ab-line)] bg-[var(--ab-card)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-[var(--ab-strong)]">Thị phần môi giới</h2>
            <p className="text-[0.82rem] text-[var(--ab-muted)]">Bấm tên trong chú thích để ẩn/hiện. Ô trống là kỳ CTCK không nằm trong nhóm dẫn đầu được công bố.</p>
          </div>
          <Seg items={["Theo quý", "Theo năm"] as const} value={view} onChange={setView} label="Kỳ thị phần" />
        </div>
        <div className="mt-3 h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
              <CartesianGrid vertical={false} stroke="var(--ab-line)" />
              <XAxis dataKey="l" tick={{ fontSize: 11, fill: "var(--ab-muted)" }} tickLine={false} axisLine={{ stroke: "var(--ab-line)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--ab-muted)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${vn(v, 0)}%`} width={44} />
              <Tooltip
                formatter={(v, n) => [`${vn(Number(v), 2)}%`, String(n)]}
                contentStyle={{ background: "var(--sm-pop)", border: "1px solid rgba(201,162,74,0.45)", borderRadius: 6, fontSize: 12 }}
                itemSorter={(it) => -(it.value as number)}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, cursor: "pointer" }}
                onClick={(e) => {
                  const k = String(e.dataKey);
                  setHide((s) => {
                    const n = new Set(s);
                    if (n.has(k)) n.delete(k);
                    else n.add(k);
                    return n;
                  });
                }}
              />
              {rows.map((r, i) => (
                <Line
                  key={r.name}
                  dataKey={r.name}
                  stroke={LINE_COLORS[i % LINE_COLORS.length]}
                  strokeWidth={i < 3 ? 2.25 : 1.5}
                  dot={{ r: 2 }}
                  hide={hide.has(r.name)}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="overflow-x-auto rounded-[10px] border border-[var(--ab-line)] bg-[var(--ab-card)]">
        <table className="w-full min-w-[820px] border-collapse text-[0.9rem]">
          <thead>
            <tr className="sm-thead">
              <th className="px-3 py-2.5 text-left font-bold">CTCK</th>
              {labels.map((l) => (
                <th key={l} className="px-2 py-2.5 text-right font-bold">
                  {l}
                </th>
              ))}
              <th className="px-3 py-2.5 text-right font-bold">So với kỳ trước</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const xs = pick(r);
              const ch = xs[lastIdx] != null && xs[lastIdx - 1] != null ? xs[lastIdx]! - xs[lastIdx - 1]! : null;
              return (
                <tr key={r.name} className="border-t border-[var(--ab-line)]">
                  <td className="px-3 py-1.5 font-bold text-[var(--ab-strong)]">{r.name}</td>
                  {xs.map((x, i) => (
                    <td key={i} className="px-2 py-1.5 text-right tabular-nums">
                      {x == null ? "—" : `${vn(x, 2)}%`}
                    </td>
                  ))}
                  <td className={`px-3 py-1.5 text-right tabular-nums ${ch == null ? "" : ch > 0 ? "up" : ch < 0 ? "down" : ""}`}>
                    {ch == null ? "—" : `${ch > 0 ? "+" : ""}${vn(ch, 2)} điểm %`}
                  </td>
                </tr>
              );
            })}
            <tr className="border-t border-[var(--ab-line-strong)] font-bold">
              <td className="px-3 py-1.5">Tổng nhóm dẫn đầu</td>
              {pick(sh.total).map((x, i) => (
                <td key={i} className="px-2 py-1.5 text-right tabular-nums">
                  {x == null ? "—" : `${vn(x, 2)}%`}
                </td>
              ))}
              <td />
            </tr>
          </tbody>
        </table>
      </section>
      <p className="text-xs text-[var(--ab-muted)]">Nguồn: thống kê thị phần môi giới trong file tổng hợp ngành chứng khoán. Chỉ để tham khảo, không phải khuyến nghị mua bán.</p>
    </div>
  );
}

/* --------------------------------------------------------------------- trang */

const TABS = [
  { id: "tong-quan", label: "Chỉ số hoạt động" },
  { id: "dinh-gia", label: "Định giá" },
  { id: "quy-mo", label: "Quy mô & lợi nhuận" },
  { id: "thi-phan", label: "Thị phần môi giới" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function SecuritiesSector() {
  const [params, setParams] = useSearchParams();
  const tab: TabId = (TABS.find((t) => t.id === params.get("muc"))?.id ?? "tong-quan") as TabId;
  const [group, setGroup] = useState<SecGroupFilter>("Tất cả");
  const { data, error } = useSecSector();
  return (
    <div className="text-[var(--ab-text)]">
      <nav aria-label="Mục trong Ngành chứng khoán" className="border-b border-[var(--ab-line)] bg-[var(--ab-card)]">
        <div className="gutter-x mx-auto flex max-w-[1440px] gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const on = t.id === tab;
            return (
              <button
                key={t.id}
                type="button"
                aria-current={on ? "page" : undefined}
                onClick={() => setParams(t.id === "tong-quan" ? {} : { muc: t.id }, { replace: true })}
                className={`shrink-0 border-b-2 px-4 py-3 text-[0.95rem] whitespace-nowrap transition-colors ${
                  on ? "border-[#e07b39] font-bold text-[var(--ab-strong)]" : "border-transparent text-[var(--ab-muted)] hover:text-[var(--ab-strong)]"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>
      <div className="gutter-x mx-auto flex max-w-[1440px] flex-col gap-4 py-7">
        <div className="flex flex-wrap items-end gap-3">
          <div className="mr-auto">
            <h1 className="text-[clamp(1.6rem,3vw,2rem)] font-bold leading-tight text-[var(--ab-strong)]">
              Ngành chứng khoán · {TABS.find((t) => t.id === tab)!.label}
            </h1>
            <p className="mt-1 text-[var(--ab-muted)]">
              {data ? `${data.rows.length} công ty chứng khoán niêm yết · số liệu báo cáo tài chính ${qLabel(data.period)}` : "Đang tải số liệu…"}
            </p>
          </div>
          {tab !== "thi-phan" && <Seg items={SEC_GROUPS} value={group} onChange={setGroup} label="Nhóm CTCK" />}
        </div>
        {error && <p className="text-[var(--ab-muted)]">Không tải được số liệu ngành chứng khoán. Tải lại trang để thử lại.</p>}
        {!data && !error && <div aria-busy="true" className="h-[600px] animate-pulse rounded-[10px] bg-[var(--ab-skel)]" />}
        {data && tab === "tong-quan" && <OverviewTab d={data} group={group} />}
        {data && tab === "dinh-gia" && <SecValuationTab d={data} group={group} />}
        {data && tab === "quy-mo" && <ScaleTab d={data} group={group} />}
        {data && tab === "thi-phan" && <ShareTab d={data} />}
      </div>
    </div>
  );
}
