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
// hàng của anh Chiến: các biểu đồ theo quý. Dữ liệu: client/public/data/banks/detail/<MÃ>.json, xuất
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
const qShort = (q: string) => q.replace(/^Q(\d) 20(\d\d)$/, "Q$1/$2");

const at = (arr: (number | null)[] | undefined, i: number) => (arr && i >= 0 && i < arr.length ? arr[i] : null);

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
    <div className="rounded-md border border-[rgba(201,162,74,0.45)] bg-[var(--sm-pop)] px-3 py-2 text-[0.8rem] shadow-lg">
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
  if (!d) return <div aria-busy="true" className="h-[3400px] animate-pulse rounded-md bg-[var(--ab-skel)] md:h-[1800px] xl:h-[1100px]" />;

  const s = d.series;
  const ind = d.industry;
  const keys = ["deposits", "interbank", "papers", "depositYtd", "loans", "creditYtd", "loanRetail", "loanCorp", "loanOther", "loanShort", "loanMid", "loanLong",
    "secRealEstate", "secTrade", "secManufacturing", "secConstruction", "secPersonal", "secOther", "nim", "casa", "cof", "cir", "roe", "roa", "npl", "g2", "llr", "ldr",
    "yoea", "pbt", "pat", "toi", "nii", "nonii"];
  const rows = d.quarters.map((q, i) => {
    const r: Record<string, number | string | null> = { q: qShort(q) };
    for (const k of keys) {
      r[k] = at(s[k], i);
      r[`${k}Ind`] = at(ind[k], i);
    }
    const loans = at(s.loans, i);
    const dep = at(s.deposits, i);
    r.gap = loans != null && dep != null ? loans - dep : null;
    const nii = at(s.nii, i);
    const non = at(s.nonii, i);
    r.niiShare = nii != null && non != null && nii + non !== 0 ? nii / (nii + non) : null;
    r.nonShare = nii != null && non != null && nii + non !== 0 ? non / (nii + non) : null;
    return r;
  });
  const pct = (v: number) => pctV(v);
  const pct2 = (v: number) => pctV(v, 2);
  const amt = (v: number) => `${vn(v, 0)} tỷ`;
  const common = { data: rows, margin: { top: 4, right: 2, bottom: 0, left: -6 } };
  const xAxis = <XAxis dataKey="q" tick={axisTick} tickLine={false} axisLine={{ stroke: C.grid }} interval="preserveStartEnd" minTickGap={14} />;
  const grid = <CartesianGrid vertical={false} stroke={C.grid} />;
  const cursor = { fill: "rgba(201,162,74,0.06)" };
  const lineCursor = { stroke: "rgba(201,162,74,0.35)" };
  const yPct = (w = 40, d1 = 0) => (
    <YAxis tick={axisTick} tickLine={false} axisLine={false} width={w} tickFormatter={(v) => `${vn(v * 100, d1)}%`} domain={["auto", "auto"]} />
  );
  const legend = <Legend wrapperStyle={legendStyle} iconSize={9} />;

  // Chỉ số của ngân hàng (vàng) so với trung bình ngành (vỏ trứng, nét đứt).
  const vsInd = (title: string, k: string, digits = 1) => (
    <Card title={`${title} so với ngành`}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart {...common}>
          {grid}
          {xAxis}
          {yPct(44, digits)}
          <Tooltip cursor={lineCursor} content={<Tip fmts={{ [k]: digits > 1 ? pct2 : pct, [`${k}Ind`]: digits > 1 ? pct2 : pct }} />} />
          {legend}
          <Line dataKey={k} name={symbol} stroke={C.gold} strokeWidth={2.25} dot={false} connectNulls />
          <Line dataKey={`${k}Ind`} name="TB ngành" stroke={C.egg} strokeWidth={1.5} strokeDasharray="5 4" dot={false} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  );
  const mixRows = (ks: string[]) => rows.filter((r) => ks.reduce((a, k) => a + ((r[k] as number) ?? 0), 0) > 0);
  // Tiêu đề nhóm, bên cạnh là ghi chú "Cách đọc" ngắn cho người mới.
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

      {group(
        "Tổng quan tăng trưởng",
        "cột là quy mô (nghìn tỷ đồng), đường vàng là tăng trưởng từ đầu năm (YTD). Tín dụng tăng nhanh hơn tiền gửi thì chênh lệch cho vay − tiền gửi nới rộng, ngân hàng phải dựa nhiều hơn vào vốn liên ngân hàng và giấy tờ có giá.",
        <>
          <Card title="Tăng trưởng huy động" note="Cột: nghìn tỷ đồng · đường: tăng trưởng tiền gửi từ đầu năm">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart {...common}>
                {grid}
                {xAxis}
                <YAxis yAxisId="a" tick={axisTick} tickLine={false} axisLine={false} width={40} tickFormatter={thousands} />
                <YAxis yAxisId="p" orientation="right" tick={axisTick} tickLine={false} axisLine={false} width={40} tickFormatter={pctAxis} />
                <Tooltip cursor={cursor} content={<Tip fmts={{ deposits: amt, interbank: amt, papers: amt, depositYtd: pct }} />} />
                {legend}
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
                {legend}
                <Bar yAxisId="a" dataKey="loans" name="Cho vay KH" fill={C.moss} radius={[2, 2, 0, 0]} />
                <Line yAxisId="p" dataKey="creditYtd" name="Tăng trưởng YTD" stroke={C.gold} strokeWidth={2} dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Tăng trưởng tín dụng và huy động (YTD)">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart {...common}>
                {grid}
                {xAxis}
                {yPct()}
                <Tooltip cursor={lineCursor} content={<Tip fmts={{ creditYtd: pct, depositYtd: pct }} />} />
                {legend}
                <Line dataKey="creditYtd" name="Tín dụng" stroke={C.gold} strokeWidth={2.25} dot={false} connectNulls />
                <Line dataKey="depositYtd" name="Tiền gửi" stroke={C.egg} strokeWidth={1.75} dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Chênh lệch cho vay và tiền gửi KH" note="Cho vay khách hàng trừ tiền gửi khách hàng, tỷ đồng">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart {...common}>
                {grid}
                {xAxis}
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={40} tickFormatter={thousands} />
                <Tooltip cursor={cursor} content={<Tip fmts={{ gap: amt }} />} />
                {legend}
                <Bar dataKey="gap" name="Cho vay − tiền gửi (nghìn tỷ)" fill={C.moss} radius={[2, 2, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}

      {group(
        "Cơ cấu cho vay",
        "mỗi cột là 100% dư nợ, chia theo nhóm. Tỷ trọng cá nhân, BĐS, dài hạn cao thường cho lợi suất cao hơn nhưng rủi ro và kỳ hạn dài hơn. Khoảng cách giữa YOEA (lợi suất) và COF (chi phí vốn) càng rộng thì biên lãi càng tốt.",
        <>
          <Card title="Theo nhóm khách hàng" note="Chỉ các quý ngân hàng công bố cơ cấu">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart {...common} data={mixRows(["loanRetail", "loanCorp"])} stackOffset="expand">
                {grid}
                {xAxis}
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={40} tickFormatter={pctAxis} />
                <Tooltip cursor={cursor} content={<Tip fmts={{ loanRetail: pct, loanCorp: pct, loanOther: pct }} />} />
                {legend}
                <Bar dataKey="loanRetail" name="Cá nhân" stackId="m" fill={C.gold} />
                <Bar dataKey="loanCorp" name="Doanh nghiệp" stackId="m" fill={C.moss} />
                <Bar dataKey="loanOther" name="Khác" stackId="m" fill={C.egg} fillOpacity={0.6} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Theo kỳ hạn">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart {...common} data={mixRows(["loanShort", "loanMid", "loanLong"])} stackOffset="expand">
                {grid}
                {xAxis}
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={40} tickFormatter={pctAxis} />
                <Tooltip cursor={cursor} content={<Tip fmts={{ loanShort: pct, loanMid: pct, loanLong: pct }} />} />
                {legend}
                <Bar dataKey="loanShort" name="Ngắn hạn" stackId="t" fill={C.egg} fillOpacity={0.7} />
                <Bar dataKey="loanMid" name="Trung hạn" stackId="t" fill={C.moss} />
                <Bar dataKey="loanLong" name="Dài hạn" stackId="t" fill={C.gold} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Theo ngành kinh tế">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart {...common} data={mixRows(["secRealEstate", "secTrade", "secManufacturing", "secPersonal", "secOther"])} stackOffset="expand">
                {grid}
                {xAxis}
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={40} tickFormatter={pctAxis} />
                <Tooltip cursor={cursor} content={<Tip fmts={{ secRealEstate: pct, secTrade: pct, secManufacturing: pct, secConstruction: pct, secPersonal: pct, secOther: pct }} />} />
                {legend}
                <Bar dataKey="secRealEstate" name="BĐS" stackId="s" fill={C.gold} />
                <Bar dataKey="secTrade" name="Thương mại" stackId="s" fill={C.moss} />
                <Bar dataKey="secManufacturing" name="Sản xuất" stackId="s" fill={C.mossDark} />
                <Bar dataKey="secConstruction" name="Xây dựng" stackId="s" fill={C.sky} />
                <Bar dataKey="secPersonal" name="Cá nhân" stackId="s" fill={C.rose} />
                <Bar dataKey="secOther" name="Khác" stackId="s" fill={C.egg} fillOpacity={0.5} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Lợi suất tài sản sinh lãi (YOEA)">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart {...common}>
                {grid}
                {xAxis}
                {yPct(44, 1)}
                <Tooltip cursor={lineCursor} content={<Tip fmts={{ yoea: pct, yoeaInd: pct, cof: pct }} />} />
                {legend}
                <Line dataKey="yoea" name={`YOEA ${symbol}`} stroke={C.gold} strokeWidth={2.25} dot={false} connectNulls />
                <Line dataKey="cof" name={`COF ${symbol}`} stroke={C.rose} strokeWidth={1.75} dot={false} connectNulls />
                <Line dataKey="yoeaInd" name="YOEA ngành" stroke={C.egg} strokeWidth={1.5} strokeDasharray="5 4" dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}

      {group(
        "Nhóm chỉ số hiệu quả so với ngành",
        "đường vàng là ngân hàng, nét đứt là trung bình 16 ngân hàng. ROE, ROA, NIM, CASA nằm trên đường ngành là tốt; COF, CIR nằm dưới đường ngành là tốt. ROE, ROA tính trên 4 quý gần nhất.",
        <>
          <Card title="Thu nhập hoạt động" note="Tỷ đồng theo quý">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart {...common}>
                {grid}
                {xAxis}
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={40} tickFormatter={thousands} />
                <Tooltip cursor={cursor} content={<Tip fmts={{ nii: amt, nonii: amt, pbt: amt }} />} />
                {legend}
                <Bar dataKey="nii" name="Thu nhập lãi thuần" stackId="i" fill={C.moss} />
                <Bar dataKey="nonii" name="Ngoài lãi" stackId="i" fill={C.egg} fillOpacity={0.7} radius={[2, 2, 0, 0]} />
                <Line dataKey="pbt" name="LNTT" stroke={C.gold} strokeWidth={2} dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Cơ cấu thu nhập hoạt động">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart {...common} stackOffset="expand">
                {grid}
                {xAxis}
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={40} tickFormatter={pctAxis} />
                <Tooltip cursor={cursor} content={<Tip fmts={{ niiShare: pct, nonShare: pct }} />} />
                {legend}
                <Bar dataKey="niiShare" name="Lãi thuần" stackId="c" fill={C.moss} />
                <Bar dataKey="nonShare" name="Ngoài lãi" stackId="c" fill={C.gold} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
          {vsInd("ROE 4 quý", "roe")}
          {vsInd("NIM", "nim")}
          {vsInd("CASA", "casa")}
          {vsInd("COF", "cof")}
          {vsInd("CIR", "cir")}
          {vsInd("ROA 4 quý", "roa", 2)}
        </>
      )}

      {group(
        "Chất lượng tài sản, thanh khoản & cân đối",
        "NPL và nợ nhóm 2 càng thấp càng tốt; nợ nhóm 2 tăng thường báo trước nợ xấu tăng. LLR cao là đệm dự phòng dày. LDR cao nghĩa là đã dùng phần lớn tiền gửi để cho vay, dư địa thanh khoản hẹp hơn.",
        <>
          <Card title="Nợ xấu và nợ nhóm 2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart {...common}>
                {grid}
                {xAxis}
                {yPct(44, 1)}
                <Tooltip cursor={cursor} content={<Tip fmts={{ g2: pct2, npl: pct2, nplInd: pct2 }} />} />
                {legend}
                <Bar dataKey="g2" name="Nợ nhóm 2" fill={C.egg} fillOpacity={0.35} radius={[2, 2, 0, 0]} />
                <Line dataKey="npl" name={`NPL ${symbol}`} stroke={C.rose} strokeWidth={2.25} dot={false} connectNulls />
                <Line dataKey="nplInd" name="NPL ngành" stroke={C.egg} strokeWidth={1.5} strokeDasharray="5 4" dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
          {vsInd("Bao phủ nợ xấu (LLR)", "llr")}
          {vsInd("Cho vay / tiền gửi (LDR)", "ldr")}
          <Card title="Lợi nhuận sau thuế" note="Tỷ đồng theo quý">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart {...common}>
                {grid}
                {xAxis}
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={40} tickFormatter={thousands} />
                <Tooltip cursor={cursor} content={<Tip fmts={{ pat: amt, patInd: amt }} />} />
                {legend}
                <Bar dataKey="pat" name={`LNST ${symbol}`} fill={C.gold} radius={[2, 2, 0, 0]} />
                <Line dataKey="patInd" name="TB ngành" stroke={C.egg} strokeWidth={1.5} strokeDasharray="5 4" dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}
    </section>
  );
}
