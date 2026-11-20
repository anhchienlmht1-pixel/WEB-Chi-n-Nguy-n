import { useEffect, useState, type ReactNode } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Trang "Chi tiết ngân hàng" — dựng lại sheet "Chi tiết" trong file Excel ngân
// hàng của anh Chiến: bên trái bảng chỉ số quý gần nhất (QoQ, YoY/YTD), bên phải
// các biểu đồ theo quý. Dữ liệu: client/public/data/banks/detail/<MÃ>.json, xuất
// từ file Excel bằng scripts/export_bank_detail.py (không gọi API).

type Series = Record<string, (number | null)[]>;
interface Detail {
  symbol: string;
  quarters: string[];
  series: Series;
  industry: Series;
}

export const DETAIL_BANKS = new Set(["VCB", "BID", "CTG", "TCB", "VPB", "MBB", "ACB", "HDB", "STB", "SHB", "LPB", "VIB", "TPB", "EIB", "MSB", "OCB"]);

const C = {
  gold: "#d9b155",
  egg: "#cbbf9f",
  moss: "#6f8f63",
  mossDark: "#3f5739",
  sky: "#7fb3c8",
  rose: "#e08a7a",
  grid: "rgba(239,231,212,0.07)",
  axis: "#8f9a84",
};

const vn = (n: number, d = 1) => n.toLocaleString("vi-VN", { minimumFractionDigits: d, maximumFractionDigits: d });
const pctV = (v: number, d = 1) => `${vn(v * 100, d)}%`;
const signed = (s: string, v: number) => (v > 0 ? `+${s}` : v < 0 ? `−${s.replace("-", "")}` : s);
const qShort = (q: string) => q.replace(/^Q(\d) 20(\d\d)$/, "Q$1/$2");

const at = (arr: (number | null)[] | undefined, i: number) => (arr && i >= 0 && i < arr.length ? arr[i] : null);

/* ----------------------------------------------------------- bảng chỉ số */

type Row = { label: string; key: string; kind: "pct" | "amount"; ytdKey?: string; better?: "up" | "down" };
const ROWS: Row[] = [
  { label: "CASA (%)", key: "casa", kind: "pct", better: "up" },
  { label: "Cho vay khách hàng", key: "loans", kind: "amount", ytdKey: "creditYtd", better: "up" },
  { label: "Tiền gửi khách hàng", key: "deposits", kind: "amount", ytdKey: "depositYtd", better: "up" },
  { label: "ROE 4 quý (%)", key: "roe", kind: "pct", better: "up" },
  { label: "ROA 4 quý (%)", key: "roa", kind: "pct", better: "up" },
  { label: "NIM (%)", key: "nim", kind: "pct", better: "up" },
  { label: "LDR (%)", key: "ldr", kind: "pct" },
  { label: "LLR (%)", key: "llr", kind: "pct", better: "up" },
  { label: "CIR (%)", key: "cir", kind: "pct", better: "down" },
  { label: "NPL (%)", key: "npl", kind: "pct", better: "down" },
  { label: "YOEA (%)", key: "yoea", kind: "pct", better: "up" },
  { label: "COF (%)", key: "cof", kind: "pct", better: "down" },
];

function KpiTable({ d }: { d: Detail }) {
  const n = d.quarters.length - 1;
  const cell = "px-2.5 py-1.5 text-right tabular-nums";
  const tone = (v: number | null, better?: "up" | "down") =>
    v == null || !better || v === 0 ? "text-[var(--sm-egg2)]" : (v > 0) === (better === "up") ? "up" : "down";
  return (
    <div className="overflow-hidden rounded-md border border-[var(--sm-line)] bg-[var(--sm-panel)]">
      <table className="w-full border-collapse text-[0.84rem]">
        <thead>
          <tr className="border-b border-[rgba(201,162,74,0.45)] text-[var(--sm-gold2)]">
            <th className="px-2.5 py-2 text-left font-semibold">Chỉ tiêu</th>
            <th className="px-2.5 py-2 text-right font-semibold">{d.quarters[n]}</th>
            <th className="px-2.5 py-2 text-right font-semibold">QoQ</th>
            <th className="px-2.5 py-2 text-right font-semibold">YoY / YTD</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => {
            const s = d.series[r.key];
            const cur = at(s, n);
            const prev = at(s, n - 1);
            const yAgo = at(s, n - 4);
            let qoq: number | null = null;
            let yoy: number | null = null;
            if (cur != null && prev != null) qoq = r.kind === "pct" ? cur - prev : prev ? cur / prev - 1 : null;
            if (r.ytdKey) yoy = at(d.series[r.ytdKey], n);
            else if (cur != null && yAgo != null) yoy = cur - yAgo;
            return (
              <tr key={r.key} className="border-b border-[var(--sm-line2)] last:border-b-0">
                <td className="px-2.5 py-1.5 text-[var(--sm-egg)]">{r.label}</td>
                <td className={`${cell} font-semibold text-[var(--sm-egg)]`}>
                  {cur == null ? "—" : r.kind === "pct" ? pctV(cur) : vn(cur, 0)}
                </td>
                <td className={`${cell} ${tone(qoq, r.better)}`}>{qoq == null ? "—" : signed(pctV(Math.abs(qoq)), qoq)}</td>
                <td className={`${cell} ${tone(yoy, r.better)}`}>{yoy == null ? "—" : signed(pctV(Math.abs(yoy)), yoy)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t border-[var(--sm-line2)] px-3 py-2 text-[0.75rem] leading-relaxed text-[var(--sm-mut)]">
        Tỷ lệ: QoQ, YoY là chênh lệch điểm %. Cho vay, tiền gửi (tỷ đồng): QoQ là % thay đổi so với quý trước, YTD là tăng trưởng từ
        đầu năm.
      </p>
    </div>
  );
}

/* --------------------------------------------------------------- biểu đồ */

function Card({ title, children, note }: { title: string; children: ReactNode; note?: string }) {
  return (
    <div className="flex min-w-0 flex-col rounded-md border border-[var(--sm-line)] bg-[var(--sm-panel)] px-3 pt-2.5 pb-2" title={note}>
      <h4 className="text-[0.88rem] font-semibold text-[var(--sm-egg)]" style={{ fontFamily: "var(--font-sans)" }}>
        {title}
      </h4>
      <div className="mt-1 h-44">{children}</div>
    </div>
  );
}

type Fmt = (v: number) => string;
function Tip({ active, payload, label, fmts }: { active?: boolean; payload?: { name: string; value: number; color: string; dataKey: string }[]; label?: string; fmts: Record<string, Fmt> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-[rgba(201,162,74,0.45)] bg-[#1a2418] px-3 py-2 text-[0.8rem] shadow-lg">
      <div className="font-semibold text-[var(--sm-egg)]">{label}</div>
      {payload
        .filter((p) => p.value != null)
        .map((p) => (
          <div key={p.dataKey} className="mt-0.5 flex items-center justify-between gap-4 tabular-nums">
            <span className="flex items-center gap-1.5 text-[var(--sm-mut)]">
              <i className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
              {p.name}
            </span>
            <b className="text-[var(--sm-egg)]">{(fmts[p.dataKey] ?? ((v: number) => vn(v, 0)))(p.value)}</b>
          </div>
        ))}
    </div>
  );
}

const axisTick = { fontSize: 10, fill: C.axis };
const legendStyle = { fontSize: 11, color: C.axis, paddingTop: 2, lineHeight: "14px" };
const thousands = (v: number) => vn(v / 1000, 0);
const pctAxis = (v: number) => `${vn(v * 100, 0)}%`;

export default function BankDetailSection({ symbol }: { symbol: string }) {
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let off = false;
    setD(null);
    setErr(false);
    fetch(`/data/banks/detail/${symbol.toUpperCase()}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: Detail) => !off && setD(j))
      .catch(() => !off && setErr(true));
    return () => {
      off = true;
    };
  }, [symbol]);

  if (err) return null;
  if (!d) return <div aria-busy="true" className="h-[880px] animate-pulse rounded-md bg-[var(--ab-skel)] md:h-[520px]" />;

  const s = d.series;
  const ind = d.industry;
  const rows = d.quarters.map((q, i) => ({
    q: qShort(q),
    deposits: at(s.deposits, i),
    interbank: at(s.interbank, i),
    papers: at(s.papers, i),
    depositYtd: at(s.depositYtd, i),
    loans: at(s.loans, i),
    creditYtd: at(s.creditYtd, i),
    retail: at(s.loanRetail, i),
    corp: at(s.loanCorp, i),
    other: at(s.loanOther, i),
    short: at(s.loanShort, i),
    mid: at(s.loanMid, i),
    long: at(s.loanLong, i),
    nim: at(s.nim, i),
    nimInd: at(ind.nim, i),
    casa: at(s.casa, i),
    casaInd: at(ind.casa, i),
    npl: at(s.npl, i),
    nplInd: at(ind.npl, i),
    g2: at(s.g2, i),
    pbt: at(s.pbt, i),
    toi: at(s.toi, i),
    roe: at(s.roe, i),
    roeInd: at(ind.roe, i),
  }));
  const pct = (v: number) => pctV(v);
  const amt = (v: number) => `${vn(v, 0)} tỷ`;
  const common = { data: rows, margin: { top: 4, right: 2, bottom: 0, left: -6 } };
  const xAxis = <XAxis dataKey="q" tick={axisTick} tickLine={false} axisLine={{ stroke: C.grid }} interval="preserveStartEnd" minTickGap={14} />;
  const grid = <CartesianGrid vertical={false} stroke={C.grid} />;
  const cursor = { fill: "rgba(201,162,74,0.06)" };

  return (
    <section aria-label="Chi tiết ngân hàng" className="mt-2">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[rgba(201,162,74,0.35)] pb-3">
        <div>
          <h3 className="font-display text-[1.35rem] leading-tight text-[var(--sm-egg)]">Chi tiết ngân hàng {symbol}</h3>
          <p className="mt-1 text-[0.85rem] text-[var(--sm-mut)]">
            Theo quý, {d.quarters[0]} – {d.quarters[d.quarters.length - 1]} · nguồn: tổng hợp báo cáo tài chính (file phân tích ngành ngân hàng)
          </p>
        </div>
      </div>

      <div className="mt-4 grid items-start gap-3 xl:grid-cols-12">
        <div className="xl:col-span-4">
          <KpiTable d={d} />
        </div>

        <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:col-span-8">
          <Card title="Tăng trưởng huy động" note="Cột: nghìn tỷ đồng · đường: tăng trưởng tiền gửi từ đầu năm">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart {...common}>
                {grid}
                {xAxis}
                <YAxis yAxisId="a" tick={axisTick} tickLine={false} axisLine={false} width={40} tickFormatter={thousands} />
                <YAxis yAxisId="p" orientation="right" tick={axisTick} tickLine={false} axisLine={false} width={40} tickFormatter={pctAxis} />
                <Tooltip cursor={cursor} content={<Tip fmts={{ deposits: amt, interbank: amt, papers: amt, depositYtd: pct }} />} />
                <Legend wrapperStyle={legendStyle} iconSize={9} />
                <Bar yAxisId="a" dataKey="deposits" name="Tiền gửi KH" stackId="h" fill={C.moss} />
                <Bar yAxisId="a" dataKey="interbank" name="Tiền gửi TCTD khác" stackId="h" fill={C.mossDark} />
                <Bar yAxisId="a" dataKey="papers" name="Giấy tờ có giá" stackId="h" fill={C.egg} fillOpacity={0.7} radius={[2, 2, 0, 0]} />
                <Line yAxisId="p" dataKey="depositYtd" name="Tăng trưởng YTD" stroke={C.gold} strokeWidth={2} dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Tăng trưởng tín dụng" note="Cột: dư nợ cho vay khách hàng (nghìn tỷ) · đường: tăng trưởng từ đầu năm">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart {...common}>
                {grid}
                {xAxis}
                <YAxis yAxisId="a" tick={axisTick} tickLine={false} axisLine={false} width={40} tickFormatter={thousands} />
                <YAxis yAxisId="p" orientation="right" tick={axisTick} tickLine={false} axisLine={false} width={40} tickFormatter={pctAxis} />
                <Tooltip cursor={cursor} content={<Tip fmts={{ loans: amt, creditYtd: pct }} />} />
                <Legend wrapperStyle={legendStyle} iconSize={9} />
                <Bar yAxisId="a" dataKey="loans" name="Cho vay KH" fill={C.moss} radius={[2, 2, 0, 0]} />
                <Line yAxisId="p" dataKey="creditYtd" name="Tăng trưởng YTD" stroke={C.gold} strokeWidth={2} dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Tỷ trọng cho vay theo nhóm khách hàng" note="Chỉ các quý ngân hàng công bố cơ cấu (thường là quý 2 và quý 4)">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart {...common} data={rows.filter((r) => (r.retail ?? 0) + (r.corp ?? 0) > 0)} stackOffset="expand">
                {grid}
                {xAxis}
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={40} tickFormatter={pctAxis} />
                <Tooltip cursor={cursor} content={<Tip fmts={{ retail: pct, corp: pct, other: pct }} />} />
                <Legend wrapperStyle={legendStyle} iconSize={9} />
                <Bar dataKey="retail" name="Cá nhân" stackId="m" fill={C.gold} />
                <Bar dataKey="corp" name="Doanh nghiệp" stackId="m" fill={C.moss} />
                <Bar dataKey="other" name="Khác" stackId="m" fill={C.egg} fillOpacity={0.6} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Kỳ hạn cho vay">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart {...common} stackOffset="expand">
                {grid}
                {xAxis}
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={40} tickFormatter={pctAxis} />
                <Tooltip cursor={cursor} content={<Tip fmts={{ short: pct, mid: pct, long: pct }} />} />
                <Legend wrapperStyle={legendStyle} iconSize={9} />
                <Bar dataKey="short" name="Ngắn hạn" stackId="t" fill={C.egg} fillOpacity={0.7} />
                <Bar dataKey="mid" name="Trung hạn" stackId="t" fill={C.moss} />
                <Bar dataKey="long" name="Dài hạn" stackId="t" fill={C.mossDark} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Card title="NIM so với trung bình ngành">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart {...common}>
                {grid}
                {xAxis}
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => `${vn(v * 100, 1)}%`} domain={["auto", "auto"]} />
                <Tooltip cursor={{ stroke: "rgba(201,162,74,0.35)" }} content={<Tip fmts={{ nim: pct, nimInd: pct }} />} />
                <Legend wrapperStyle={legendStyle} iconSize={9} />
                <Line dataKey="nim" name={symbol} stroke={C.gold} strokeWidth={2.25} dot={false} connectNulls />
                <Line dataKey="nimInd" name="TB ngành" stroke={C.egg} strokeWidth={1.5} strokeDasharray="5 4" dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          <Card title="CASA so với trung bình ngành">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart {...common}>
                {grid}
                {xAxis}
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={40} tickFormatter={pctAxis} domain={["auto", "auto"]} />
                <Tooltip cursor={{ stroke: "rgba(201,162,74,0.35)" }} content={<Tip fmts={{ casa: pct, casaInd: pct }} />} />
                <Legend wrapperStyle={legendStyle} iconSize={9} />
                <Line dataKey="casa" name={symbol} stroke={C.gold} strokeWidth={2.25} dot={false} connectNulls />
                <Line dataKey="casaInd" name="TB ngành" stroke={C.egg} strokeWidth={1.5} strokeDasharray="5 4" dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Chất lượng tài sản">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart {...common}>
                {grid}
                {xAxis}
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => `${vn(v * 100, 1)}%`} />
                <Tooltip cursor={cursor} content={<Tip fmts={{ g2: pct, npl: pct, nplInd: pct }} />} />
                <Legend wrapperStyle={legendStyle} iconSize={9} />
                <Bar dataKey="g2" name="Nợ nhóm 2" fill={C.egg} fillOpacity={0.35} radius={[2, 2, 0, 0]} />
                <Line dataKey="npl" name={`NPL ${symbol}`} stroke={C.rose} strokeWidth={2.25} dot={false} connectNulls />
                <Line dataKey="nplInd" name="NPL TB ngành" stroke={C.egg} strokeWidth={1.5} strokeDasharray="5 4" dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Thu nhập và lợi nhuận theo quý" note="Tỷ đồng · ROE 4 quý gần nhất trên trục phải">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart {...common}>
                {grid}
                {xAxis}
                <YAxis yAxisId="a" tick={axisTick} tickLine={false} axisLine={false} width={40} tickFormatter={thousands} />
                <YAxis yAxisId="p" orientation="right" tick={axisTick} tickLine={false} axisLine={false} width={40} tickFormatter={pctAxis} />
                <Tooltip cursor={cursor} content={<Tip fmts={{ toi: amt, pbt: amt, roe: pct }} />} />
                <Legend wrapperStyle={legendStyle} iconSize={9} />
                <Bar yAxisId="a" dataKey="toi" name="Tổng thu nhập HĐ" fill={C.moss} radius={[2, 2, 0, 0]} />
                <Bar yAxisId="a" dataKey="pbt" name="LNTT" fill={C.gold} radius={[2, 2, 0, 0]} />
                <Line yAxisId="p" dataKey="roe" name="ROE 4 quý" stroke={C.egg} strokeWidth={1.75} dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
      </div>
    </section>
  );
}
