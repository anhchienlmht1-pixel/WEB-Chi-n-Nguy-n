import { useEffect, useState, type ReactNode } from "react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CRIT_LABEL, median, useReSector, type ReCrit, type ReDetail } from "../data/realestate";

// "Chi tiết chủ đầu tư bất động sản" trên trang mã — cùng khung với chi tiết ngân hàng,
// CTCK: nhóm biểu đồ theo quý có ghi chú "Cách đọc". Dữ liệu: /data/realestate/detail/<MÃ>.json
// và đường trung vị ngành tính từ /data/realestate/sector.json.

const C = {
  stock: "var(--sm-stock)",
  stock2: "var(--sm-stock2)",
  ind: "var(--sm-ind)",
  gold: "#d9b155",
  egg: "#cbbf9f",
  moss: "#6f8f63",
  mossDark: "#3f5739",
  sky: "#7fb3c8",
  rose: "#e08a7a",
  plum: "#a68bc4",
  grid: "rgba(127,120,90,0.14)",
  axis: "#8f9a84",
};
const STACK = ["#c9a24a", "#4f8a5b", "#7fb3c8", "#a68bc4", "#e08a7a", "#3f9f86", "#9b8f6a"];

const vn = (n: number, d = 1) => n.toLocaleString("vi-VN", { minimumFractionDigits: d, maximumFractionDigits: d });
const qShort = (q: string) => q.replace(/^Q(\d) 20(\d\d)$/, "Q$1/$2");
const axisTick = { fontSize: 10, fill: C.axis };
const legendStyle = { fontSize: 11, color: C.axis, paddingTop: 2, lineHeight: "14px" };

function Card({ title, children, note, span }: { title: string; children: ReactNode; note?: string; span?: string }) {
  return (
    <div className={`flex min-w-0 flex-col rounded-md border border-[var(--sm-line)] bg-[var(--sm-chart)] px-3 pt-2.5 pb-2 ${span ?? ""}`} title={note}>
      <h4 className="text-[0.88rem] font-semibold text-[var(--sm-egg)]" style={{ fontFamily: "var(--font-sans)" }}>
        {title}
      </h4>
      <div className={`mt-1 ${span ? "h-72" : "h-56"}`}>{children}</div>
    </div>
  );
}

type Fmt = (v: number) => string;
function Tip({ active, payload, label, fmts, dflt }: { active?: boolean; payload?: { name: string; value: number; color: string; dataKey: string }[]; label?: string; fmts?: Record<string, Fmt>; dflt?: Fmt }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="max-w-[320px] rounded-md border border-[rgba(201,162,74,0.45)] bg-[var(--sm-pop)] px-3 py-2 text-[0.8rem] shadow-lg">
      <div className="font-semibold text-[var(--sm-egg)]">{label}</div>
      {payload
        .filter((p) => p.value != null)
        .map((p) => (
          <div key={p.dataKey} className="mt-0.5 flex items-center justify-between gap-4 tabular-nums">
            <span className="flex min-w-0 items-center gap-1.5 text-[var(--sm-mut)]">
              <i className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} />
              <span className="truncate">{p.name}</span>
            </span>
            <b className="text-[var(--sm-egg)]">{(fmts?.[p.dataKey] ?? dflt ?? ((v: number) => vn(v, 0)))(p.value)}</b>
          </div>
        ))}
    </div>
  );
}

const THRESH: Partial<Record<ReCrit, number>> = { debt: 0.5, recv: 0.25, cash: 0.1 };

export default function RealEstateDetailSection({ symbol }: { symbol: string }) {
  const [d, setD] = useState<ReDetail | null>(null);
  const [err, setErr] = useState(false);
  const { data: sector } = useReSector();
  useEffect(() => {
    let off = false;
    setD(null);
    setErr(false);
    fetch(`/data/realestate/detail/${symbol.toUpperCase()}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: ReDetail) => !off && setD(j))
      .catch(() => !off && setErr(true));
    return () => {
      off = true;
    };
  }, [symbol]);

  if (err) return null;
  if (!d) return <div aria-busy="true" className="h-[2400px] animate-pulse rounded-md bg-[var(--ab-skel)] md:h-[1300px] xl:h-[900px]" />;

  const pct: Fmt = (v) => `${vn(v * 100, 1)}%`;
  const amt: Fmt = (v) => `${vn(v, 0)} tỷ`;
  const thousands = (v: number) => vn(v / 1000, Math.abs(v) < 10000 && v !== 0 ? 1 : 0);
  const pctAxis = (v: number) => `${vn(v * 100, 0)}%`;
  const grid = <CartesianGrid vertical={false} stroke={C.grid} />;
  const cursor = { fill: "rgba(201,162,74,0.06)" };
  const lineCursor = { stroke: "rgba(201,162,74,0.35)" };
  const legend = <Legend wrapperStyle={legendStyle} iconSize={9} />;

  // chuỗi dài (Q1/2022 →), kèm trung vị ngành
  const long = d.quarters.map((q, i) => {
    const o: Record<string, number | string | null> = { q: qShort(q) };
    for (const [k, arr] of Object.entries(d.series)) o[k] = arr?.[i] ?? null;
    if (sector) {
      for (const k of ["debtToEq", "recvToAssets", "cashToAssets", "invToAssets"] as const) {
        o[`${k}Ind`] = median(Object.values(sector.series).flatMap((s) => (s[k]?.[i] != null ? [s[k]![i]!] : [])));
      }
    }
    return o;
  });
  // chuỗi ngắn (Q4/2024 →) cho kết quả kinh doanh
  const short = d.shortQuarters.map((q, i) => {
    const o: Record<string, number | string | null> = { q: qShort(q) };
    for (const [k, arr] of Object.entries(d.short)) o[k] = arr?.[i] ?? null;
    const rev = d.short.revenue?.[i];
    const gp = d.short.grossProfit?.[i];
    o.grossMargin = rev && gp != null ? gp / rev : null;
    return o;
  });
  const xAxis = <XAxis dataKey="q" tick={axisTick} tickLine={false} axisLine={{ stroke: C.grid }} interval="preserveStartEnd" minTickGap={14} />;

  const ratio = (c: ReCrit) => {
    const k = CRIT_LABEL[c].metric;
    const f = d.flags[c];
    return (
      <Card title={`${CRIT_LABEL[c].short} (${CRIT_LABEL[c].rule})`} note={CRIT_LABEL[c].what}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={long} margin={{ top: 4, right: 2, bottom: 0, left: -6 }}>
            {grid}
            {xAxis}
            <YAxis tick={axisTick} tickLine={false} axisLine={false} width={40} domain={[0, "auto"]} tickFormatter={pctAxis} />
            <Tooltip cursor={lineCursor} content={<Tip dflt={pct} />} />
            {legend}
            {THRESH[c] != null && <ReferenceLine y={THRESH[c]} stroke={C.rose} strokeDasharray="3 3" />}
            <Line type="monotone" dataKey={k} name={`${symbol}${f ? (f > 0 ? " ✓" : " ✗") : ""}`} stroke={C.stock} strokeWidth={2.25} dot={false} connectNulls />
            <Line type="monotone" dataKey={`${k}Ind`} name="Trung vị 13 CĐT" stroke={C.ind} strokeWidth={1.5} strokeDasharray="5 4" dot={false} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>
    );
  };

  const group = (title: string, guide: string, children: ReactNode) => (
    <div className="mt-6">
      <div className="mb-2.5 flex flex-col gap-1.5 lg:flex-row lg:items-baseline lg:gap-5">
        <h4 className="flex shrink-0 items-center gap-2 text-[0.95rem] font-semibold text-[var(--sm-gold2)]">
          <span className="h-3 w-[3px] rounded-full bg-[var(--sm-gold)]" aria-hidden="true" />
          {title}
        </h4>
        <p className="text-[0.8rem] leading-relaxed text-[var(--sm-mut)]">
          <b className="font-semibold text-[var(--sm-egg2)]">Cách đọc: </b>
          {guide}
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{children}</div>
    </div>
  );

  // Tồn kho theo dự án: khối đầu tiên (dở dang), 6 dự án lớn nhất quý gần nhất + "Khác"
  const inv = d.inventoryByProject.map((blk) => {
    const n = blk.quarters.length;
    const lastIdx = (it: { values: (number | null)[] }) => it.values[n - 1] ?? 0;
    const sorted = [...blk.items].sort((a, b) => lastIdx(b) - lastIdx(a));
    const top = sorted.slice(0, 6);
    const rest = sorted.slice(6);
    const data = blk.quarters.map((q, i) => {
      const o: Record<string, number | string | null> = { q: qShort(q) };
      top.forEach((it, j) => (o[`p${j}`] = it.values[i] ?? null));
      o.other = rest.reduce((a, it) => a + (it.values[i] ?? 0), 0) || null;
      return o;
    });
    return { title: blk.title.replace(/^Chỉ phí/, "Chi phí"), top, hasRest: rest.length > 0, data };
  });

  const score = Object.values(d.flags).reduce((a: number, v) => a + (v ?? 0), 0);

  return (
    <section aria-label="Chi tiết chủ đầu tư bất động sản" className="mt-2">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[rgba(201,162,74,0.35)] pb-3">
        <div>
          <h3 className="font-display text-[1.35rem] leading-tight text-[var(--sm-egg)]">Chi tiết chủ đầu tư {symbol}</h3>
          <p className="mt-1 text-[0.85rem] text-[var(--sm-mut)]">
            Theo quý, {d.quarters[0]} – {d.quarters[d.quarters.length - 1]} · nguồn: tổng hợp báo cáo tài chính (file phân tích ngành bất động sản)
          </p>
        </div>
        {Object.keys(d.flags).length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-[0.8rem]">
            {(Object.keys(CRIT_LABEL) as ReCrit[]).map((c) => (
              <span
                key={c}
                className="rounded-full border px-2 py-0.5"
                style={{
                  borderColor: d.flags[c] === 1 ? "var(--heat-up)" : "var(--heat-down)",
                  color: d.flags[c] === 1 ? "var(--heat-up)" : "var(--heat-down)",
                }}
              >
                {d.flags[c] === 1 ? "✓" : "✗"} {CRIT_LABEL[c].short}
              </span>
            ))}
            <b className="ml-1 text-[var(--sm-egg)]">Điểm an toàn {score > 0 ? `+${score}` : score}/4</b>
          </div>
        )}
      </div>

      {group(
        "Bán hàng & quỹ hàng",
        "người mua trả tiền trước là tiền khách đã trả cho căn chưa bàn giao — tăng là bán hàng tốt, sẽ thành doanh thu khi bàn giao. Hàng tồn kho chủ yếu là quỹ đất và dự án đang xây.",
        <>
          <Card title="Người mua trả tiền trước" note="Tỷ đồng cuối quý">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={long} margin={{ top: 4, right: 2, bottom: 0, left: -6 }}>
                {grid}
                {xAxis}
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={40} tickFormatter={thousands} />
                <Tooltip cursor={cursor} content={<Tip dflt={amt} />} />
                {legend}
                <Bar dataKey="prepaid" name="Người mua trả trước (nghìn tỷ)" fill={C.gold} radius={[2, 2, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Hàng tồn kho" note="Tỷ đồng cuối quý">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={long} margin={{ top: 4, right: 2, bottom: 0, left: -6 }}>
                {grid}
                {xAxis}
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={40} tickFormatter={thousands} />
                <Tooltip cursor={cursor} content={<Tip dflt={amt} />} />
                {legend}
                <Bar dataKey="inventory" name="Hàng tồn kho (nghìn tỷ)" fill={C.moss} radius={[2, 2, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Doanh thu và lợi nhuận ròng" note={`Tỷ đồng theo quý, ${d.shortQuarters[0]} – ${d.shortQuarters[d.shortQuarters.length - 1]}`}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={short} margin={{ top: 4, right: 2, bottom: 0, left: -6 }}>
                {grid}
                {xAxis}
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={40} tickFormatter={thousands} />
                <Tooltip cursor={cursor} content={<Tip dflt={amt} />} />
                {legend}
                <Bar dataKey="revenue" name="Doanh thu" fill={C.egg} fillOpacity={0.6} />
                <Bar dataKey="netProfit" name="LN ròng" fill={C.gold} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Biên lợi nhuận gộp" note="Lợi nhuận gộp / doanh thu thuần">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={short} margin={{ top: 4, right: 2, bottom: 0, left: -6 }}>
                {grid}
                {xAxis}
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={40} tickFormatter={pctAxis} domain={["auto", "auto"]} />
                <Tooltip cursor={lineCursor} content={<Tip dflt={pct} />} />
                {legend}
                <Line type="monotone" dataKey="grossMargin" name="Biên gộp" stroke={C.gold} strokeWidth={2.25} dot={{ r: 2 }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        </>,
      )}

      {group(
        "Độ an toàn tài chính so với ngành",
        "đường vàng là công ty, nét đứt là trung vị 13 chủ đầu tư, vạch đỏ là ngưỡng trong file (nợ vay/VCSH < 50%, phải thu/TTS < 25%, tiền + ĐTNH/TTS > 10%). Dấu ✓/✗ cạnh mã là đạt/không đạt ở quý gần nhất.",
        <>
          {ratio("debt")}
          {ratio("recv")}
          {ratio("cash")}
          {ratio("land")}
        </>,
      )}

      {inv.length > 0 &&
        group(
          "Hàng tồn kho theo dự án",
          "mỗi cột là tổng giá trị dở dang của các dự án lớn nhất trong quý (tỷ đồng). Dự án tăng mạnh là đang được đầu tư xây dựng; giảm là đã bàn giao, ghi nhận doanh thu.",
          <>
            {inv.map((b) => (
              <Card key={b.title} title={b.title} span={inv.length === 1 ? "md:col-span-2 xl:col-span-4" : "md:col-span-2"}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={b.data} margin={{ top: 4, right: 2, bottom: 0, left: -6 }}>
                    {grid}
                    {xAxis}
                    <YAxis tick={axisTick} tickLine={false} axisLine={false} width={40} tickFormatter={thousands} />
                    <Tooltip cursor={cursor} content={<Tip dflt={amt} />} />
                    <Legend wrapperStyle={{ ...legendStyle, fontSize: 10 }} iconSize={8} />
                    {b.top.map((it, j) => (
                      <Bar key={it.name} dataKey={`p${j}`} name={it.name.length > 34 ? `${it.name.slice(0, 32)}…` : it.name} stackId="i" fill={STACK[j]} />
                    ))}
                    {b.hasRest && <Bar dataKey="other" name="Dự án khác" stackId="i" fill={C.egg} fillOpacity={0.5} />}
                  </ComposedChart>
                </ResponsiveContainer>
              </Card>
            ))}
          </>,
        )}

      {(d.projectList.length > 0 || d.handover.length > 0) && (
        <div className="mt-6 flex flex-col gap-3">
          {d.projectList.length > 0 && (
            <div className="min-w-0 overflow-x-auto rounded-md border border-[var(--sm-line)] bg-[var(--sm-panel)]">
              <h4 className="px-3 pt-2.5 text-[0.88rem] font-semibold text-[var(--sm-egg)]">Danh sách dự án</h4>
              <table className="mt-1 w-full min-w-[820px] border-collapse text-[0.84rem]">
                <thead>
                  <tr className="text-left text-[var(--sm-mut)]">
                    {Object.keys(d.projectList[0]).map((h) => (
                      <th key={h} className="px-3 py-1.5 font-semibold">
                        {h.charAt(0) + h.slice(1).toLowerCase().replace(/\(.*\)/, "").trim()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {d.projectList.map((p, i) => (
                    <tr key={i} className="border-t border-[var(--sm-line2)] align-top">
                      {Object.entries(p).map(([k, v], j) => (
                        <td key={k} className={`px-3 py-1.5 ${j === 0 ? "font-semibold text-[var(--sm-egg)]" : "text-[var(--sm-egg2)]"}`}>
                          {v || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {d.handover.length > 0 && (
            <div className="min-w-0 overflow-x-auto rounded-md border border-[var(--sm-line)] bg-[var(--sm-panel)]">
              <h4 className="px-3 pt-2.5 text-[0.88rem] font-semibold text-[var(--sm-egg)]">Dự án bàn giao 2026–2028</h4>
              <ul className="mt-1">
                {d.handover.map((p) => (
                  <li key={p.name} className="border-t border-[var(--sm-line2)] px-3 py-2 text-[0.84rem]">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <b className="text-[var(--sm-egg)]">{p.name}</b>
                      <span className="text-[var(--sm-mut)] tabular-nums">
                        {p.location} · mở bán {p.launch} · bàn giao {p.handover}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[var(--sm-egg2)]">{p.progress}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      <p className="mt-3 text-xs text-[var(--sm-mut)]">Chỉ để tham khảo, không phải khuyến nghị mua bán.</p>
    </section>
  );
}
