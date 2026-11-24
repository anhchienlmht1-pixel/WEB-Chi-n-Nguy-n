import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import BankBarChart from "../components/BankBarChart";
import { Seg, Tile, vn } from "../components/bankUi";
import { CRIT_LABEL, median, reQ, useReSector, type ReCrit, type ReLongKey, type ReRow, type ReSector } from "../data/realestate";

// Ngành bất động sản: cùng khung với ngành ngân hàng / chứng khoán.
//  - Sức khỏe tài chính: chấm điểm 4 tiêu chí an toàn theo file (đạt +1, không đạt −1)
//  - Người mua trả trước & tồn kho: chỉ báo doanh số sắp ghi nhận và quỹ hàng
//  - Kết quả kinh doanh: doanh thu, lợi nhuận quý
//  - Dự án bàn giao 2026–2028

const CRITS: ReCrit[] = ["debt", "recv", "cash", "land"];
const pct = (x: number | null | undefined, d = 1) => (x == null ? "—" : `${vn(x * 100, d)}%`);
const money = (ty: number | null | undefined) => (ty == null ? "—" : Math.abs(ty) >= 1000 ? `${vn(ty / 1000, 1)} nghìn tỷ` : `${vn(ty, 0)} tỷ`);
const growth = (cur: number | null, prev: number | null) => (cur == null || !prev ? null : ((cur - prev) / Math.abs(prev)) * 100);
const gText = (g: number | null) => (g == null ? "—" : `${g > 0 ? "+" : ""}${vn(g, 1)}%`);
const gCls = (g: number | null) => (g == null ? "" : g > 0 ? "up" : g < 0 ? "down" : "");

/* ------------------------------------------------------- Sức khỏe tài chính */

function HealthTab({ d }: { d: ReSector }) {
  const rows = [...d.rows].sort((a, b) => (b.score ?? -9) - (a.score ?? -9) || a.sym.localeCompare(b.sym));
  const P = reQ(d.period);
  const med = (f: (r: ReRow) => number | null) => median(rows.map(f).filter((x): x is number => x != null));
  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Tổng quan" className="flex flex-wrap rounded-[10px] border border-[var(--ab-line)] bg-[var(--ab-card)]">
        <Tile label="Đạt từ 3/4 tiêu chí" value={`${rows.filter((r) => (r.score ?? -9) >= 2).length}/${rows.length}`} sub="Tổng điểm an toàn từ +2 trở lên" />
        <Tile label="Nợ vay/VCSH trung vị" value={pct(med((r) => r.v.debtToEq))} sub={`${rows.filter((r) => r.flags.debt === 1).length}/${rows.length} CĐT dưới 50%`} />
        <Tile label="Tiền + ĐTNH/TTS trung vị" value={pct(med((r) => r.v.cashToAssets))} sub={`${rows.filter((r) => r.flags.cash === 1).length}/${rows.length} CĐT đạt tiêu chí tiền mặt`} />
        <Tile label="Tồn kho/TTS trung vị" value={pct(med((r) => r.v.invToAssets))} sub="Đại diện quy mô quỹ đất, dự án" />
      </section>

      <section className="overflow-x-auto rounded-[10px] border border-[var(--ab-line)] bg-[var(--ab-card)]">
        <table className="w-full min-w-[980px] border-collapse text-[0.92rem]">
          <thead>
            <tr className="sm-thead">
              <th className="px-3 py-2.5 text-left font-bold">Chủ đầu tư</th>
              {CRITS.map((c) => (
                <th key={c} className="px-2 py-2.5 text-center font-bold leading-tight" title={CRIT_LABEL[c].what}>
                  {CRIT_LABEL[c].short}
                  <span className="block text-[0.75rem] font-normal opacity-80">{CRIT_LABEL[c].rule}</span>
                </th>
              ))}
              <th className="px-2 py-2.5 text-center font-bold">Tổng điểm</th>
              <th className="px-2 py-2.5 text-right font-bold leading-tight" title="Tiền mặt trên nợ ngắn hạn: khả năng trả nợ ngắn hạn bằng tiền">
                Tiền mặt / nợ ngắn hạn
              </th>
              <th className="px-3 py-2.5 text-right font-bold leading-tight">Nợ phải trả / TTS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.sym} className="border-t border-[var(--ab-line)]">
                <td className="px-3 py-1.5">
                  <Link to={`/stock/${r.sym}`} className="font-bold text-[var(--ab-strong)] hover:underline">
                    {r.sym}
                  </Link>
                </td>
                {CRITS.map((c) => {
                  const f = r.flags[c];
                  const v = r.v[CRIT_LABEL[c].metric as keyof ReRow["v"]];
                  return (
                    <td
                      key={c}
                      className="px-2 py-1.5 text-center tabular-nums"
                      style={
                        f == null
                          ? undefined
                          : { background: `color-mix(in srgb, ${f > 0 ? "var(--heat-up)" : "var(--heat-down)"} 22%, transparent)`, color: "var(--heat-ink)" }
                      }
                      title={f == null ? "" : f > 0 ? "Đạt" : "Không đạt"}
                    >
                      <span aria-hidden="true" className="mr-1.5 font-bold" style={{ color: f == null ? undefined : f > 0 ? "var(--heat-up)" : "var(--heat-down)" }}>
                        {f == null ? "" : f > 0 ? "✓" : "✗"}
                      </span>
                      {pct(v)}
                    </td>
                  );
                })}
                <td className="px-2 py-1.5 text-center">
                  <ScorePill s={r.score} />
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">{r.v.cashToStLiab == null ? "—" : `${vn(r.v.cashToStLiab, 2)} lần`}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{pct(r.v.liabToAssets)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="rounded-[10px] border border-[var(--ab-line)] bg-[var(--ab-card)] px-4 py-3 text-[0.85rem] leading-relaxed">
        <b className="text-[var(--ab-strong)]">Cách chấm điểm (theo file phân tích)</b>
        <ul className="mt-1.5 grid gap-x-8 gap-y-1 md:grid-cols-2">
          {CRITS.map((c) => (
            <li key={c}>
              <b>{CRIT_LABEL[c].short}</b> — {d.criteria[c] || CRIT_LABEL[c].rule}. {CRIT_LABEL[c].what}
            </li>
          ))}
          <li className="md:col-span-2">
            Mỗi tiêu chí đạt được <b className="up">+1</b>, không đạt <b className="down">−1</b>; tổng điểm từ −4 đến +4. Tiền mặt / nợ ngắn hạn và nợ phải trả / TTS để tham
            khảo thêm, không tính điểm.
          </li>
          <li className="text-[var(--ab-muted)] md:col-span-2">
            Số liệu báo cáo tài chính {P}. Điểm là sàng lọc sơ bộ về độ an toàn tài chính, không phản ánh chất lượng dự án hay pháp lý. Chỉ để tham khảo, không phải khuyến
            nghị mua bán.
          </li>
        </ul>
      </div>
    </div>
  );
}

function ScorePill({ s }: { s: number | null }) {
  if (s == null) return <span className="text-[var(--ab-muted)]">—</span>;
  const c = s > 0 ? "var(--heat-up)" : s < 0 ? "var(--heat-down)" : "var(--ab-muted)";
  return (
    <span
      className="inline-flex min-w-11 justify-center rounded-full px-2 py-0.5 text-[0.85rem] font-bold tabular-nums"
      style={{ background: `color-mix(in srgb, ${c} ${Math.min(60, 15 + Math.abs(s) * 12)}%, transparent)`, color: "var(--heat-ink-strong)" }}
    >
      {s > 0 ? `+${s}` : s}
    </span>
  );
}

/* ----------------------------------------- Người mua trả trước & tồn kho */

const LINE_COLORS = ["#c9a24a", "#4f8a5b", "#2f7fd6", "#d6456b", "#8a5cc4", "#14a3a3", "#d08a1e", "#6b7b5e", "#a14f3a", "#5a6fb0", "#9b8f6a", "#3f9f86", "#b0577f"];
const TREND_KEYS: { k: ReLongKey; label: string; ratio: boolean }[] = [
  { k: "prepaid", label: "Người mua trả tiền trước", ratio: false },
  { k: "inventory", label: "Hàng tồn kho", ratio: false },
  { k: "debtToEq", label: "Nợ vay/VCSH", ratio: true },
  { k: "cashToAssets", label: "Tiền + ĐTNH/TTS", ratio: true },
  { k: "recvToAssets", label: "Phải thu/TTS", ratio: true },
  { k: "invToAssets", label: "Tồn kho/TTS", ratio: true },
];

function PrepaidTab({ d }: { d: ReSector }) {
  const P = reQ(d.period);
  const PP = reQ(d.periodPrev);
  const [exVhm, setExVhm] = useState<"Bỏ VHM" | "Có VHM">("Bỏ VHM");
  const [metric, setMetric] = useState<ReLongKey>("prepaid");
  const [picked, setPicked] = useState<string[]>(["KDH", "NLG", "DXG", "PDR", "TCH"]);
  const rows = d.rows.filter((r) => exVhm === "Có VHM" || r.sym !== "VHM");
  const mk = TREND_KEYS.find((x) => x.k === metric)!;
  const chart = useMemo(
    () =>
      d.quarters.map((q, i) => {
        const o: Record<string, number | string | null> = { q: q.replace(/^Q(\d) 20(\d\d)$/, "Q$1/$2") };
        for (const s of picked) o[s] = d.series[s]?.[metric]?.[i] ?? null;
        return o;
      }),
    [d, picked, metric],
  );
  const totalNow = d.rows.reduce((a, r) => a + (r.v.prepaid ?? 0), 0);
  const totalPrev = d.rows.reduce((a, r) => a + (r.v.prepaidPrev ?? 0), 0);
  const invNow = d.rows.reduce((a, r) => a + (r.v.inventory ?? 0), 0);
  const invPrev = d.rows.reduce((a, r) => a + (r.v.inventoryPrev ?? 0), 0);
  const upCnt = d.rows.filter((r) => (growth(r.v.prepaid, r.v.prepaidPrev) ?? 0) > 0).length;

  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Tổng quan" className="flex flex-wrap rounded-[10px] border border-[var(--ab-line)] bg-[var(--ab-card)]">
        <Tile label={`Người mua trả trước ${P}`} value={money(totalNow)} sub={`${gText(growth(totalNow, totalPrev))} so với ${PP} · ${d.rows.length} CĐT`} />
        <Tile label="CĐT tăng người mua trả trước" value={`${upCnt}/${d.rows.length}`} sub={`So với cùng kỳ ${PP}`} />
        <Tile label={`Hàng tồn kho ${P}`} value={money(invNow)} sub={`${gText(growth(invNow, invPrev))} so với ${PP}`} />
        <Tile label="VHM chiếm" value={pct((d.rows.find((r) => r.sym === "VHM")?.v.prepaid ?? 0) / (totalNow || 1), 0)} sub="Tỷ trọng người mua trả trước của VHM" />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-3xl text-[0.88rem] text-[var(--ab-muted)]">
          <b className="text-[var(--ab-strong)]">Người mua trả tiền trước</b> là tiền khách đã đặt cọc, thanh toán theo tiến độ cho căn chưa bàn giao — doanh thu sẽ ghi nhận khi
          bàn giao. Khoản này tăng thường là dấu hiệu bán hàng tốt.
        </p>
        <Seg items={["Bỏ VHM", "Có VHM"] as const} value={exVhm} onChange={setExVhm} label="Có tính VHM không" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <BankBarChart
          title="Người mua trả tiền trước"
          subtitle={`${P} · nghìn tỷ đồng · chấm: % so với ${PP}`}
          items={rows
            .filter((r) => r.v.prepaid != null)
            .sort((a, b) => b.v.prepaid! - a.v.prepaid!)
            .map((r) => {
              const g = growth(r.v.prepaid, r.v.prepaidPrev);
              return { bank: r.sym, v: r.v.prepaid! / 1000, v2: g == null ? undefined : Math.max(-300, Math.min(300, g)) };
            })}
          fmt={(n) => `${vn(n, 2)} nghìn tỷ`}
          axisFmt={(n) => vn(n, Number.isInteger(n) ? 0 : 1)}
          label1="Người mua trả trước"
          label2="So với cùng kỳ (giới hạn ±300%)"
          v2Kind="dot"
          fmt2={(n) => `${n > 0 ? "+" : ""}${vn(n, 1)}%`}
          axisFmt2={(n) => `${vn(n, 0)}%`}
          compact
        />
        <BankBarChart
          title="Hàng tồn kho"
          subtitle={`${P} · nghìn tỷ đồng · chấm: % so với ${PP}`}
          items={rows
            .filter((r) => r.v.inventory != null)
            .sort((a, b) => b.v.inventory! - a.v.inventory!)
            .map((r) => {
              const g = growth(r.v.inventory, r.v.inventoryPrev);
              return { bank: r.sym, v: r.v.inventory! / 1000, v2: g == null ? undefined : Math.max(-300, Math.min(300, g)) };
            })}
          fmt={(n) => `${vn(n, 2)} nghìn tỷ`}
          axisFmt={(n) => vn(n, Number.isInteger(n) ? 0 : 1)}
          label1="Hàng tồn kho"
          label2="So với cùng kỳ (giới hạn ±300%)"
          v2Kind="dot"
          fmt2={(n) => `${n > 0 ? "+" : ""}${vn(n, 1)}%`}
          axisFmt2={(n) => `${vn(n, 0)}%`}
          compact
        />
      </div>

      <section className="rounded-[10px] border border-[var(--ab-line)] bg-[var(--ab-card)] p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold text-[var(--ab-strong)]">Diễn biến theo quý</h2>
          <div role="group" aria-label="Chọn chỉ tiêu" className="flex flex-wrap gap-1.5">
            {TREND_KEYS.map((t) => (
              <button
                key={t.k}
                type="button"
                aria-pressed={t.k === metric}
                onClick={() => setMetric(t.k)}
                className={`rounded-full px-3 py-1 text-[0.8rem] transition-colors ${
                  t.k === metric ? "sm-on font-bold" : "border border-[var(--ab-line)] text-[var(--ab-muted)] hover:bg-[var(--ab-hover)]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div role="group" aria-label="Chọn chủ đầu tư" className="mt-3 flex flex-wrap gap-1.5">
          {d.rows.map((r) => {
            const on = picked.includes(r.sym);
            return (
              <button
                key={r.sym}
                type="button"
                aria-pressed={on}
                onClick={() => setPicked((xs) => (on ? xs.filter((x) => x !== r.sym) : [...xs, r.sym]))}
                className={`rounded-md border px-2 py-0.5 text-[0.78rem] font-semibold transition-colors ${
                  on ? "border-[var(--sm-gold)] bg-[rgba(201,162,74,0.12)] text-[var(--ab-strong)]" : "border-[var(--ab-line)] text-[var(--ab-muted)]"
                }`}
              >
                {r.sym}
              </button>
            );
          })}
        </div>
        <div className="mt-3 h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart} margin={{ top: 8, right: 12, bottom: 0, left: -4 }}>
              <CartesianGrid vertical={false} stroke="var(--ab-line)" />
              <XAxis dataKey="q" tick={{ fontSize: 11, fill: "var(--ab-muted)" }} tickLine={false} axisLine={{ stroke: "var(--ab-line)" }} minTickGap={18} />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--ab-muted)" }}
                tickLine={false}
                axisLine={false}
                width={48}
                tickFormatter={(v) => (mk.ratio ? `${vn(v * 100, 0)}%` : vn(v / 1000, v >= 10000 ? 0 : 1))}
              />
              <Tooltip
                formatter={(v, n) => [mk.ratio ? pct(Number(v)) : money(Number(v)), String(n)]}
                contentStyle={{ background: "var(--sm-pop)", border: "1px solid rgba(201,162,74,0.45)", borderRadius: 6, fontSize: 12 }}
                itemSorter={(it) => -(it.value as number)}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {picked.map((s) => (
                <Line
                  key={s}
                  dataKey={s}
                  stroke={LINE_COLORS[d.rows.findIndex((r) => r.sym === s) % LINE_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-xs text-[var(--ab-muted)]">{mk.ratio ? "Tỷ lệ, %." : "Nghìn tỷ đồng."} Bấm mã để thêm / bỏ khỏi biểu đồ.</p>
      </section>
    </div>
  );
}

/* ---------------------------------------------------------- Kết quả kinh doanh */

function ResultTab({ d }: { d: ReSector }) {
  const P = reQ(d.period);
  const PP = reQ(d.periodPrev);
  const rows = [...d.rows].sort((a, b) => (b.v.revenue ?? 0) - (a.v.revenue ?? 0));
  const noVhm = rows.filter((r) => r.sym !== "VHM");
  const sum = (xs: ReRow[], f: (r: ReRow) => number | null) => xs.reduce((a, r) => a + (f(r) ?? 0), 0);
  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Tổng quan" className="flex flex-wrap rounded-[10px] border border-[var(--ab-line)] bg-[var(--ab-card)]">
        <Tile label={`Doanh thu ${P}`} value={money(sum(rows, (r) => r.v.revenue))} sub={`${gText(growth(sum(rows, (r) => r.v.revenue), sum(rows, (r) => r.v.revenuePrev)))} so với ${PP}`} />
        <Tile
          label={`Lợi nhuận ròng ${P}`}
          value={money(sum(rows, (r) => r.v.netProfit))}
          sub={`${gText(growth(sum(rows, (r) => r.v.netProfit), sum(rows, (r) => r.v.netProfitPrev)))} so với ${PP}`}
        />
        <Tile
          label="Lợi nhuận ròng, bỏ VHM"
          value={money(sum(noVhm, (r) => r.v.netProfit))}
          sub={`${gText(growth(sum(noVhm, (r) => r.v.netProfit), sum(noVhm, (r) => r.v.netProfitPrev)))} so với ${PP}`}
        />
        <Tile label="CĐT có lãi trong quý" value={`${rows.filter((r) => (r.v.netProfit ?? 0) > 0).length}/${rows.length}`} sub="Lợi nhuận ròng dương" />
      </section>

      <BankBarChart
        title="Lợi nhuận ròng và tăng trưởng"
        subtitle={`${P} · cột: nghìn tỷ đồng · chấm: % so với ${PP} · bỏ VHM để dễ so sánh`}
        items={noVhm
          .filter((r) => r.v.netProfit != null)
          .sort((a, b) => b.v.netProfit! - a.v.netProfit!)
          .map((r) => {
            const g = growth(r.v.netProfit, r.v.netProfitPrev);
            return { bank: r.sym, v: r.v.netProfit! / 1000, v2: g == null ? undefined : Math.max(-300, Math.min(300, g)) };
          })}
        fmt={(n) => `${vn(n, 2)} nghìn tỷ`}
        axisFmt={(n) => vn(n, Number.isInteger(n) ? 0 : 1)}
        label1="Lợi nhuận ròng quý"
        label2="So với cùng kỳ (giới hạn ±300%)"
        v2Kind="dot"
        fmt2={(n) => `${n > 0 ? "+" : ""}${vn(n, 1)}%`}
        axisFmt2={(n) => `${vn(n, 0)}%`}
      />

      <h2 className="mt-2 text-lg font-bold text-[var(--ab-strong)]">Bảng số liệu (tỷ đồng)</h2>
      <section className="overflow-x-auto rounded-[10px] border border-[var(--ab-line)] bg-[var(--ab-card)]">
        <table className="w-full min-w-[880px] border-collapse text-[0.9rem]">
          <thead>
            <tr className="sm-thead">
              <th className="px-3 py-2.5 text-left font-bold">Chủ đầu tư</th>
              <th className="px-2 py-2.5 text-right font-bold">Doanh thu</th>
              <th className="px-2 py-2.5 text-right font-bold">So với cùng kỳ</th>
              <th className="px-2 py-2.5 text-right font-bold">Lợi nhuận gộp</th>
              <th className="px-2 py-2.5 text-right font-bold">Biên gộp</th>
              <th className="px-2 py-2.5 text-right font-bold">Lợi nhuận ròng</th>
              <th className="px-2 py-2.5 text-right font-bold">So với cùng kỳ</th>
              <th className="px-3 py-2.5 text-right font-bold">Vốn chủ sở hữu</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const gr = growth(r.v.revenue, r.v.revenuePrev);
              const gn = growth(r.v.netProfit, r.v.netProfitPrev);
              const gm = r.v.revenue ? (r.v.grossProfit ?? 0) / r.v.revenue : null;
              const f0 = (x: number | null) => (x == null ? "—" : vn(x, 0));
              return (
                <tr key={r.sym} className="border-t border-[var(--ab-line)]">
                  <td className="px-3 py-1.5">
                    <Link to={`/stock/${r.sym}`} className="font-bold text-[var(--ab-strong)] hover:underline">
                      {r.sym}
                    </Link>
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{f0(r.v.revenue)}</td>
                  <td className={`px-2 py-1.5 text-right tabular-nums ${gCls(gr)}`}>{gText(gr)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{f0(r.v.grossProfit)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{pct(gm)}</td>
                  <td className={`px-2 py-1.5 text-right tabular-nums ${(r.v.netProfit ?? 0) < 0 ? "down" : ""}`}>{f0(r.v.netProfit)}</td>
                  <td className={`px-2 py-1.5 text-right tabular-nums ${gCls(gn)}`}>{gText(gn)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{f0(r.v.equity)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <p className="text-xs text-[var(--ab-muted)]">
        Doanh thu bất động sản ghi nhận khi bàn giao nên dao động mạnh giữa các quý; nên xem cùng người mua trả trước. Nguồn: báo cáo tài chính {P}. Chỉ để tham khảo, không
        phải khuyến nghị mua bán.
      </p>
    </div>
  );
}

/* ------------------------------------------------------ Dự án bàn giao */

function ProjectsTab({ d }: { d: ReSector }) {
  const groups = d.projects.reduce<Record<string, typeof d.projects>>((a, p) => ((a[p.sym] ??= []).push(p), a), {});
  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-3xl text-[0.9rem] text-[var(--ab-muted)]">
        Các dự án dự kiến bàn giao giai đoạn 2026–2028 theo file tổng hợp. Bàn giao là lúc doanh thu được ghi nhận; tiến độ thực tế có thể khác kế hoạch.
      </p>
      <section className="overflow-x-auto rounded-[10px] border border-[var(--ab-line)] bg-[var(--ab-card)]">
        <table className="w-full min-w-[920px] border-collapse text-[0.9rem]">
          <thead>
            <tr className="sm-thead">
              <th className="px-3 py-2.5 text-left font-bold">CĐT</th>
              <th className="px-3 py-2.5 text-left font-bold">Dự án</th>
              <th className="px-3 py-2.5 text-left font-bold">Vị trí</th>
              <th className="px-3 py-2.5 text-left font-bold">Mở bán</th>
              <th className="px-3 py-2.5 text-left font-bold">Bàn giao dự kiến</th>
              <th className="px-3 py-2.5 text-left font-bold">Tiến độ</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(groups).map(([sym, ps]) =>
              ps.map((p, i) => (
                <tr key={sym + p.name} className={`border-t ${i === 0 ? "border-[var(--ab-line-strong)]" : "border-[var(--ab-line)]"} align-top`}>
                  {i === 0 && (
                    <td rowSpan={ps.length} className="border-r border-[var(--ab-line)] px-3 py-2 font-bold">
                      <Link to={`/stock/${sym}`} className="text-[var(--ab-strong)] hover:underline">
                        {sym}
                      </Link>
                    </td>
                  )}
                  <td className="px-3 py-2 font-semibold text-[var(--ab-strong)]">{p.name}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{p.location}</td>
                  <td className="px-3 py-2 whitespace-nowrap tabular-nums">{p.launch}</td>
                  <td className="px-3 py-2 whitespace-nowrap tabular-nums">{p.handover}</td>
                  <td className="px-3 py-2 text-[0.86rem] leading-snug text-[var(--ab-text)]">{p.progress}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </section>
      <p className="text-xs text-[var(--ab-muted)]">Nguồn: tổng hợp từ file phân tích ngành bất động sản. Chỉ để tham khảo, không phải khuyến nghị mua bán.</p>
    </div>
  );
}

/* --------------------------------------------------------------------- trang */

const TABS = [
  { id: "suc-khoe", label: "Sức khỏe tài chính" },
  { id: "tra-truoc", label: "Người mua trả trước & tồn kho" },
  { id: "ket-qua", label: "Kết quả kinh doanh" },
  { id: "du-an", label: "Dự án bàn giao 2026–2028" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function RealEstateSector() {
  const [params, setParams] = useSearchParams();
  const tab: TabId = (TABS.find((t) => t.id === params.get("muc"))?.id ?? "suc-khoe") as TabId;
  const { data, error } = useReSector();
  return (
    <div className="text-[var(--ab-text)]">
      <nav aria-label="Mục trong Ngành bất động sản" className="border-b border-[var(--ab-line)] bg-[var(--ab-card)]">
        <div className="gutter-x mx-auto flex max-w-[1920px] gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const on = t.id === tab;
            return (
              <button
                key={t.id}
                type="button"
                aria-current={on ? "page" : undefined}
                onClick={() => setParams(t.id === "suc-khoe" ? {} : { muc: t.id }, { replace: true })}
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
      <div className="gutter-x mx-auto flex max-w-[1920px] flex-col gap-4 py-7">
        <div>
          <h1 className="text-[clamp(1.6rem,3vw,2rem)] font-bold leading-tight text-[var(--ab-strong)]">
            Ngành bất động sản · {TABS.find((t) => t.id === tab)!.label}
          </h1>
          <p className="mt-1 text-[var(--ab-muted)]">
            {data ? `${data.rows.length} chủ đầu tư niêm yết · số liệu báo cáo tài chính ${reQ(data.period)}` : "Đang tải số liệu…"}
          </p>
        </div>
        {error && <p className="text-[var(--ab-muted)]">Không tải được số liệu ngành bất động sản. Tải lại trang để thử lại.</p>}
        {!data && !error && <div aria-busy="true" className="h-[600px] animate-pulse rounded-[10px] bg-[var(--ab-skel)]" />}
        {data && tab === "suc-khoe" && <HealthTab d={data} />}
        {data && tab === "tra-truoc" && <PrepaidTab d={data} />}
        {data && tab === "ket-qua" && <ResultTab d={data} />}
        {data && tab === "du-an" && <ProjectsTab d={data} />}
      </div>
    </div>
  );
}
