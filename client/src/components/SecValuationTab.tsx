import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
  LabelList,
} from "recharts";
import { Tile, heat, vn } from "./bankUi";
import { dLabel, useSecValuation, type SecGroupFilter, type SecPbStat, type SecSector } from "../data/securities";

// Định giá ngành chứng khoán: P/B hiện tại so với chính lịch sử 5 năm của từng
// CTCK (dữ liệu ngày, sheet "Data P/B Chứng"), biểu đồ P/B theo thời gian với
// dải trung bình ± 1 độ lệch chuẩn, và tương quan P/B – ROE.

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : 0;
};
const GROUP_COLOR: Record<string, string> = { "Cho vay margin": "#c9a24a", "Tự doanh": "#4f8a5b", Khác: "#5b8def" };

function RangeBar({ sym, s }: { sym: string; s: SecPbStat }) {
  const lo = s.min;
  const hi = s.max;
  const span = hi - lo || 1;
  const x = (v: number) => `${((v - lo) / span) * 100}%`;
  const below = s.cur <= s.avg;
  return (
    <div
      className="relative mx-auto h-6 w-[160px]"
      role="img"
      title={`${sym}: hiện tại ${vn(s.cur)} · trung bình ${vn(s.avg)} · thấp nhất ${vn(s.min)} (${dLabel(s.minDate)}) · cao nhất ${vn(s.max)} (${dLabel(s.maxDate)})`}
      aria-label={`${sym}: P/B hiện tại ${vn(s.cur)}, trung bình ${vn(s.avg)}, thấp nhất ${vn(s.min)}, cao nhất ${vn(s.max)}`}
    >
      <span className="absolute top-1/2 right-0 left-0 h-1.5 -translate-y-1/2 rounded-full bg-[var(--ab-line-strong)]" />
      <span
        className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-[rgba(201,162,74,0.35)]"
        style={{ left: x(Math.max(lo, s.avg - s.sd)), right: `calc(100% - ${x(Math.min(hi, s.avg + s.sd))})` }}
      />
      <span className="absolute top-1 h-4 w-px bg-[#e07b39]" style={{ left: x(s.avg) }} />
      <span
        className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--ab-bg)]"
        style={{ left: x(s.cur), background: below ? "var(--heat-up)" : "var(--heat-down)" }}
      />
    </div>
  );
}

export default function SecValuationTab({ d, group }: { d: SecSector; group: SecGroupFilter }) {
  const { data: v, error } = useSecValuation();
  const [pick, setPick] = useState("SSI");
  const groupOf = useMemo(() => Object.fromEntries(d.rows.map((r) => [r.sym, r.group])), [d]);
  const roeOf = useMemo(() => Object.fromEntries(d.rows.map((r) => [r.sym, r.v.roe])), [d]);

  if (error) return <p className="text-[var(--ab-muted)]">Không tải được dữ liệu P/B. Tải lại trang để thử lại.</p>;
  if (!v) return <div aria-busy="true" className="h-[600px] animate-pulse rounded-[10px] bg-[var(--ab-skel)]" />;

  const syms = Object.keys(v.stats).filter((s) => group === "Tất cả" || groupOf[s] === group);
  const rows = syms
    .map((s) => ({ sym: s, s: v.stats[s], vs: (v.stats[s].cur / v.stats[s].avg - 1) * 100 }))
    .sort((a, b) => a.s.pct - b.s.pct);
  const latest = rows.reduce((a, r) => (r.s.curDate > a ? r.s.curDate : a), "");
  const below = rows.filter((r) => r.s.cur < r.s.avg).length;
  const lowest = rows[0];
  const missing = d.rows.filter((r) => (group === "Tất cả" || r.group === group) && !v.stats[r.sym]).map((r) => r.sym);

  // Biểu đồ P/B theo thời gian của mã đang chọn.
  const sel = v.stats[pick] ? pick : rows[0]?.sym ?? "SSI";
  const st = v.stats[sel];
  const series = (v.series[sel] ?? []).map(([t, pb]) => ({ t, pb }));
  const band = st ? [Math.max(0, st.avg - st.sd), st.avg + st.sd] : [0, 0];
  const chartData = series.map((p) => ({ ...p, band }));

  const scatter = rows
    .filter((r) => roeOf[r.sym] != null)
    .map((r) => ({ sym: r.sym, pb: r.s.cur, roe: roeOf[r.sym] as number, g: groupOf[r.sym] }));

  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Định giá chung" className="flex flex-wrap rounded-[10px] border border-[var(--ab-line)] bg-[var(--ab-card)]">
        <Tile label="P/B trung vị hiện tại" value={vn(median(rows.map((r) => r.s.cur)))} sub={`${rows.length} CTCK · mới nhất ${dLabel(latest)}`} />
        <Tile label="P/B trung vị lịch sử" value={vn(median(rows.map((r) => r.s.avg)))} sub="Trung vị của mức P/B trung bình từng mã" />
        <Tile label="Thấp hơn trung bình lịch sử" value={`${below}/${rows.length}`} sub="Số CTCK có P/B dưới trung bình lịch sử của chính nó" />
        {lowest && (
          <Tile
            label="Gần đáy lịch sử nhất"
            value={lowest.sym}
            sub={`P/B ${vn(lowest.s.cur)} · thấp hơn ${vn(100 - lowest.s.pct, 1)}% số phiên`}
          />
        )}
      </section>

      <section className="overflow-x-auto rounded-[10px] border border-[var(--ab-line)] bg-[var(--ab-card)]">
        <table className="w-full min-w-[1020px] border-collapse text-[0.9rem]">
          <thead>
            <tr className="sm-thead">
              <th className="px-3 py-2.5 text-left font-bold">CTCK</th>
              <th className="px-2 py-2.5 text-right font-bold">P/B hiện tại</th>
              <th className="px-2 py-2.5 text-right font-bold">Trung bình</th>
              <th className="px-2 py-2.5 text-right font-bold">Thấp nhất</th>
              <th className="px-2 py-2.5 text-right font-bold">Cao nhất</th>
              <th className="px-2 py-2.5 text-center font-bold">Dải P/B lịch sử</th>
              <th className="px-2 py-2.5 text-right font-bold" title="P/B hiện tại so với trung bình lịch sử">So với TB</th>
              <th className="px-2 py-2.5 text-right font-bold" title="Phần trăm số phiên có P/B thấp hơn hoặc bằng hiện tại">Vị trí lịch sử</th>
              <th className="px-2 py-2.5 text-right font-bold">ROE quy năm</th>
              <th className="px-3 py-2.5 text-right font-bold">Dữ liệu từ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const z = -r.vs / 25;
              return (
                <tr key={r.sym} className="border-t border-[var(--ab-line)]">
                  <td className="px-3 py-1.5">
                    <button
                      type="button"
                      onClick={() => setPick(r.sym)}
                      className={`font-bold underline-offset-2 hover:underline ${r.sym === sel ? "text-[#e07b39]" : "text-[var(--ab-strong)]"}`}
                      title="Xem biểu đồ P/B bên dưới"
                    >
                      {r.sym}
                    </button>
                  </td>
                  <td className="px-2 py-1.5 text-right font-bold tabular-nums" title={`Ngày ${dLabel(r.s.curDate)}`}>
                    {vn(r.s.cur)}
                    {r.s.curDate !== latest && <span className="ml-1 text-[0.7rem] font-normal text-[var(--ab-muted)]">({dLabel(r.s.curDate).slice(0, 5)})</span>}
                    {v.source[r.sym] === "ssi" && (
                      <span className="ml-1 rounded bg-[var(--ab-hover)] px-1 text-[0.66rem] font-semibold text-[var(--ab-muted)]" title="Dữ liệu P/B lấy từ SSI">
                        SSI
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{vn(r.s.avg)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums" title={dLabel(r.s.minDate)}>
                    {vn(r.s.min)}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums" title={dLabel(r.s.maxDate)}>
                    {vn(r.s.max)}
                  </td>
                  <td className="px-2 py-1.5">
                    <RangeBar sym={r.sym} s={r.s} />
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums" style={heat(z, z)}>
                    {r.vs > 0 ? "+" : ""}
                    {vn(r.vs, 0)}%
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{vn(r.s.pct, 0)}%</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{roeOf[r.sym] == null ? "—" : `${vn(roeOf[r.sym] as number, 1)}%`}</td>
                  <td className="px-3 py-1.5 text-right text-[0.82rem] text-[var(--ab-muted)] tabular-nums">{dLabel(r.s.since).slice(3)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <div className="rounded-[10px] border border-[var(--ab-line)] bg-[var(--ab-card)] px-4 py-3 text-[0.85rem] leading-relaxed">
        <b className="text-[var(--ab-strong)]">Cách đọc</b>
        <ul className="mt-1.5 grid gap-x-8 gap-y-1 md:grid-cols-2">
          <li>
            <b>Dải P/B</b>: thanh xám là khoảng thấp nhất – cao nhất, phần vàng là trung bình ± 1 độ lệch chuẩn, vạch cam là trung bình, chấm{" "}
            <span style={{ color: "var(--heat-up)" }}>xanh</span> là P/B hiện tại dưới trung bình, <span style={{ color: "var(--heat-down)" }}>đỏ</span> là trên.
          </li>
          <li>
            <b>Vị trí lịch sử</b>: phần trăm số phiên có P/B thấp hơn hoặc bằng hiện tại. 5% nghĩa là P/B đang ở vùng thấp nhất 5% số phiên từ khi có dữ liệu.
          </li>
          <li>
            P/B thấp so với lịch sử không tự nó là rẻ: cần xem cùng ROE và chất lượng tài sản. Lịch sử của LPS, KAI, VCK, VPX, TCX, DSE ngắn (niêm yết gần đây) nên dải hẹp hơn.
          </li>
          <li className="text-[var(--ab-muted)]">
            Nguồn: sheet "Data P/B Chứng" (dữ liệu theo ngày). Mã gắn nhãn SSI (LPS, KAI chưa có trong sheet; TCX sheet ngừng cập nhật từ 15/09/2026) lấy
            P/B theo ngày từ SSI.{missing.length ? ` Chưa có dữ liệu P/B: ${missing.join(", ")}.` : ""} Chỉ để tham khảo, không phải khuyến nghị mua bán.
          </li>
        </ul>
      </div>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0 rounded-[10px] border border-[var(--ab-line)] bg-[var(--ab-card)] p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold text-[var(--ab-strong)]">P/B {sel} theo thời gian</h2>
            {st && (
              <p className="text-[0.82rem] text-[var(--ab-muted)]">
                Trung bình {vn(st.avg)} · ±1 độ lệch chuẩn {vn(band[0])}–{vn(band[1])}
              </p>
            )}
          </div>
          <div role="group" aria-label="Chọn CTCK" className="mt-2 flex flex-wrap gap-1.5">
            {rows.map((r) => (
              <button
                key={r.sym}
                type="button"
                aria-pressed={r.sym === sel}
                onClick={() => setPick(r.sym)}
                className={`rounded-full px-2.5 py-1 text-[0.78rem] transition-colors ${
                  r.sym === sel ? "sm-on font-bold" : "border border-[var(--ab-line)] text-[var(--ab-muted)] hover:bg-[var(--ab-hover)]"
                }`}
              >
                {r.sym}
              </button>
            ))}
          </div>
          <div className="mt-3 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                <CartesianGrid vertical={false} stroke="var(--ab-line)" />
                <XAxis
                  dataKey="t"
                  tick={{ fontSize: 11, fill: "var(--ab-muted)" }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--ab-line)" }}
                  minTickGap={40}
                  tickFormatter={(t: string) => `${t.slice(5, 7)}/${t.slice(2, 4)}`}
                />
                <YAxis tick={{ fontSize: 11, fill: "var(--ab-muted)" }} tickLine={false} axisLine={false} width={40} tickFormatter={(x) => vn(x, 1)} domain={[0, "auto"]} />
                <Tooltip
                  formatter={(val, name) => (name === "band" ? [null, null] : [vn(Number(val)), "P/B"])}
                  labelFormatter={(t) => dLabel(String(t))}
                  contentStyle={{ background: "var(--sm-pop)", border: "1px solid rgba(201,162,74,0.45)", borderRadius: 6, fontSize: 12 }}
                />
                <Area dataKey="band" stroke="none" fill="rgba(201,162,74,0.16)" isAnimationActive={false} activeDot={false} />
                {st && <ReferenceLine y={st.avg} stroke="#e07b39" strokeDasharray="5 4" label={{ value: `TB ${vn(st.avg)}`, position: "insideTopRight", fontSize: 11, fill: "#e07b39" }} />}
                <Line dataKey="pb" stroke="var(--ab-strong)" strokeWidth={2} dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 text-xs text-[var(--ab-muted)]">
            {v.source[sel] === "ssi" ? "Dữ liệu SSI, mỗi điểm một phiên." : "Mỗi điểm cách nhau 10 phiên giao dịch."} Vùng vàng: trung bình ± 1 độ lệch chuẩn.
          </p>
        </div>

        <div className="min-w-0 rounded-[10px] border border-[var(--ab-line)] bg-[var(--ab-card)] p-4">
          <h2 className="text-lg font-bold text-[var(--ab-strong)]">P/B và ROE</h2>
          <p className="text-[0.82rem] text-[var(--ab-muted)]">P/B mới nhất · ROE quy năm {qLabelOf(d)}. Công ty sinh lời cao thường được định giá P/B cao hơn.</p>
          <div className="mt-3 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 12, right: 16, bottom: 8, left: -6 }}>
                <CartesianGrid stroke="var(--ab-line)" />
                <XAxis
                  type="number"
                  dataKey="roe"
                  name="ROE"
                  tick={{ fontSize: 11, fill: "var(--ab-muted)" }}
                  tickFormatter={(x) => `${vn(x, 0)}%`}
                  label={{ value: "ROE quy năm", position: "insideBottom", offset: -4, fontSize: 11, fill: "var(--ab-muted)" }}
                />
                <YAxis type="number" dataKey="pb" name="P/B" tick={{ fontSize: 11, fill: "var(--ab-muted)" }} width={40} tickFormatter={(x) => vn(x, 1)} />
                <ZAxis range={[60, 60]} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload as { sym: string; pb: number; roe: number; g: string };
                    return (
                      <div className="rounded-md border border-[rgba(201,162,74,0.45)] bg-[var(--sm-pop)] px-3 py-2 text-[0.8rem]">
                        <b>{p.sym}</b> · {p.g}
                        <div className="tabular-nums">P/B {vn(p.pb)} · ROE {vn(p.roe, 1)}%</div>
                      </div>
                    );
                  }}
                />
                {Object.keys(GROUP_COLOR).map((g) => (
                  <Scatter key={g} name={g} data={scatter.filter((x) => x.g === g)} fill={GROUP_COLOR[g]} isAnimationActive={false}>
                    <LabelList dataKey="sym" position="top" style={{ fontSize: 10, fill: "var(--ab-text)" }} />
                  </Scatter>
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 flex flex-wrap gap-3 text-[0.78rem] text-[var(--ab-muted)]">
            {Object.entries(GROUP_COLOR).map(([g, c]) => (
              <span key={g} className="flex items-center gap-1.5">
                <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c }} />
                {g}
              </span>
            ))}
          </div>
        </div>
      </section>
      <p className="text-xs text-[var(--ab-muted)]">
        <Link to="/nganh-chung-khoan" className="underline-offset-2 hover:underline">
          Ngành chứng khoán
        </Link>{" "}
        · Định giá chỉ để tham khảo, không phải khuyến nghị mua bán.
      </p>
    </div>
  );
}

function qLabelOf(d: SecSector) {
  return d.period.replace(" ", "/");
}
