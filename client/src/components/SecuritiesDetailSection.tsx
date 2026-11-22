import { useEffect, useState, type ReactNode } from "react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// "Chi tiết công ty chứng khoán" trên trang mã — cùng khung với Chi tiết ngân hàng:
// các nhóm biểu đồ theo quý, mỗi nhóm có ghi chú "Cách đọc". Dữ liệu:
// client/public/data/securities/detail/<MÃ>.json (scripts/export_securities.py).

type Arr = (number | null)[];
interface Detail {
  symbol: string;
  group: string;
  quarters: string[];
  series: Record<string, Arr>;
  industry: Record<string, Arr>;
  share: { name: string; quarters: Arr } | null;
  shareQuarters: string[];
}

const C = {
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

const vn = (n: number, d = 1) => n.toLocaleString("vi-VN", { minimumFractionDigits: d, maximumFractionDigits: d });
const qShort = (q: string) => q.replace(/^Q(\d) 20(\d\d)$/, "Q$1/$2");
const at = (a: Arr | undefined, i: number) => (a && i < a.length ? a[i] : null);

function Card({ title, children, note }: { title: string; children: ReactNode; note?: string }) {
  return (
    <div className="flex min-w-0 flex-col rounded-md border border-[var(--sm-line)] bg-[var(--sm-panel)] px-3 pt-2.5 pb-2" title={note}>
      <h4 className="text-[0.88rem] font-semibold text-[var(--sm-egg)]" style={{ fontFamily: "var(--font-sans)" }}>
        {title}
      </h4>
      <div className="mt-1 h-48">{children}</div>
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

export default function SecuritiesDetailSection({ symbol }: { symbol: string }) {
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let off = false;
    setD(null);
    setErr(false);
    fetch(`/data/securities/detail/${symbol.toUpperCase()}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: Detail) => !off && setD(j))
      .catch(() => !off && setErr(true));
    return () => {
      off = true;
    };
  }, [symbol]);

  if (err) return null;
  if (!d) return <div aria-busy="true" className="h-[3000px] animate-pulse rounded-md bg-[var(--ab-skel)] md:h-[1600px] xl:h-[1000px]" />;

  const s = d.series;
  const ind = d.industry;
  const rows = d.quarters.map((q, i) => {
    const r: Record<string, number | string | null> = { q: qShort(q) };
    for (const k of Object.keys(s)) r[k] = at(s[k], i);
    for (const k of Object.keys(ind)) r[`${k}Ind`] = at(ind[k], i);
    // chi phí lãi vay trong file mang dấu âm → đổi dấu cho dễ đọc
    const it = at(s.interest, i);
    r.interestCost = it == null ? null : -it;
    const segs = ["revBroker", "revLoan", "revFvtpl", "revHtm", "revAfs", "revOther"];
    const tot = segs.reduce((a, k) => a + Math.max(0, (at(s[k], i) as number) ?? 0), 0);
    for (const k of segs) r[`${k}Pct`] = tot ? Math.max(0, (at(s[k], i) as number) ?? 0) / tot : null;
    return r;
  });
  const shareRows = d.share
    ? d.shareQuarters.map((q, i) => ({ q: q.replace(/^Q(\d)\/20(\d\d)$/, "Q$1/$2"), share: at(d.share!.quarters, i) }))
    : [];

  const pct: Fmt = (v) => `${vn(v * 100, 1)}%`;
  const pct2: Fmt = (v) => `${vn(v * 100, 2)}%`;
  const times: Fmt = (v) => `${vn(v, 2)} lần`;
  const amt: Fmt = (v) => `${vn(v, 0)} tỷ`;
  const thousands = (v: number) => vn(v / 1000, Math.abs(v) < 10000 && v !== 0 ? 1 : 0);
  const pctAxis = (v: number) => `${vn(v * 100, 0)}%`;
  const common = { data: rows, margin: { top: 4, right: 2, bottom: 0, left: -6 } };
  const xAxis = <XAxis dataKey="q" tick={axisTick} tickLine={false} axisLine={{ stroke: C.grid }} interval="preserveStartEnd" minTickGap={14} />;
  const grid = <CartesianGrid vertical={false} stroke={C.grid} />;
  const cursor = { fill: "rgba(201,162,74,0.06)" };
  const lineCursor = { stroke: "rgba(201,162,74,0.35)" };
  const legend = <Legend wrapperStyle={legendStyle} iconSize={9} />;
  const yAmt = (id?: string) => <YAxis yAxisId={id} tick={axisTick} tickLine={false} axisLine={false} width={40} tickFormatter={thousands} />;
  const yPctR = <YAxis yAxisId="p" orientation="right" tick={axisTick} tickLine={false} axisLine={false} width={40} tickFormatter={pctAxis} />;

  const vsInd = (title: string, k: string, kind: "pct" | "times" = "pct", digits = 1) => {
    const f: Fmt = kind === "times" ? times : digits > 1 ? pct2 : pct;
    return (
      <Card title={`${title} so với ngành`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart {...common}>
            {grid}
            {xAxis}
            <YAxis
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              width={44}
              domain={["auto", "auto"]}
              tickFormatter={(v) => (kind === "times" ? vn(v, 1) : `${vn(v * 100, 0)}%`)}
            />
            <Tooltip cursor={lineCursor} content={<Tip fmts={{ [k]: f, [`${k}Ind`]: f }} />} />
            {legend}
            <Line dataKey={k} name={symbol} stroke={C.gold} strokeWidth={2.25} dot={false} connectNulls />
            <Line dataKey={`${k}Ind`} name="Trung vị ngành" stroke={C.egg} strokeWidth={1.5} strokeDasharray="5 4" dot={false} connectNulls />
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

  const segFmts = { revBroker: amt, revLoan: amt, revFvtpl: amt, revHtm: amt, revAfs: amt, revOther: amt };
  const pctFmts = Object.fromEntries(Object.keys(segFmts).map((k) => [`${k}Pct`, pct]));
  const hasMargin = rows.some((r) => (r.margin as number) > 0);

  return (
    <section aria-label="Chi tiết công ty chứng khoán" className="mt-2">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[rgba(201,162,74,0.35)] pb-3">
        <div>
          <h3 className="font-display text-[1.35rem] leading-tight text-[var(--sm-egg)]">Chi tiết công ty chứng khoán {symbol}</h3>
          <p className="mt-1 text-[0.85rem] text-[var(--sm-mut)]">
            Nhóm {d.group.toLowerCase()} · theo quý, {d.quarters[0]} – {d.quarters[d.quarters.length - 1]} · nguồn: tổng hợp báo cáo tài chính (file phân tích ngành chứng khoán)
          </p>
        </div>
      </div>

      {group(
        "Tổng quan doanh thu & lợi nhuận",
        "cột chồng là doanh thu từng mảng (nghìn tỷ đồng). Mảng môi giới phụ thuộc thanh khoản thị trường; cho vay margin cho thu nhập đều hơn; FVTPL (tự doanh) biến động theo giá cổ phiếu, trái phiếu. Biên LNTT là phần lợi nhuận trước thuế trên mỗi đồng doanh thu.",
        <>
          <Card title="Doanh thu theo mảng" note="Tỷ đồng theo quý">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart {...common}>
                {grid}
                {xAxis}
                {yAmt()}
                <Tooltip cursor={cursor} content={<Tip fmts={segFmts} />} />
                {legend}
                <Bar dataKey="revBroker" name="Môi giới" stackId="r" fill={C.sky} />
                <Bar dataKey="revLoan" name="Cho vay" stackId="r" fill={C.moss} />
                <Bar dataKey="revFvtpl" name="FVTPL" stackId="r" fill={C.gold} />
                <Bar dataKey="revHtm" name="HTM" stackId="r" fill={C.mossDark} />
                <Bar dataKey="revAfs" name="AFS" stackId="r" fill={C.plum} />
                <Bar dataKey="revOther" name="Khác" stackId="r" fill={C.egg} fillOpacity={0.6} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Cơ cấu doanh thu" note="Tỷ trọng từng mảng trong tổng doanh thu (phần dương)">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart {...common} stackOffset="expand">
                {grid}
                {xAxis}
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={40} tickFormatter={pctAxis} />
                <Tooltip cursor={cursor} content={<Tip fmts={pctFmts} />} />
                {legend}
                <Bar dataKey="revBrokerPct" name="Môi giới" stackId="p" fill={C.sky} />
                <Bar dataKey="revLoanPct" name="Cho vay" stackId="p" fill={C.moss} />
                <Bar dataKey="revFvtplPct" name="FVTPL" stackId="p" fill={C.gold} />
                <Bar dataKey="revHtmPct" name="HTM" stackId="p" fill={C.mossDark} />
                <Bar dataKey="revAfsPct" name="AFS" stackId="p" fill={C.plum} />
                <Bar dataKey="revOtherPct" name="Khác" stackId="p" fill={C.egg} fillOpacity={0.6} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Lợi nhuận trước thuế và biên LNTT" note="Cột: tỷ đồng · đường: LNTT / doanh thu">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart {...common}>
                {grid}
                {xAxis}
                {yAmt("a")}
                {yPctR}
                <Tooltip cursor={cursor} content={<Tip fmts={{ pbt: amt, pbtMargin: pct }} />} />
                {legend}
                <Bar yAxisId="a" dataKey="pbt" name="LNTT" fill={C.moss} radius={[2, 2, 0, 0]} />
                <Line yAxisId="p" dataKey="pbtMargin" name="Biên LNTT" stroke={C.gold} strokeWidth={2} dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Tăng trưởng so với cùng kỳ" note="Doanh thu và LNTT quý so với cùng quý năm trước">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart {...common}>
                {grid}
                {xAxis}
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={44} tickFormatter={pctAxis} />
                <Tooltip cursor={lineCursor} content={<Tip fmts={{ revYoy: pct, pbtYoy: pct }} />} />
                {legend}
                <Line dataKey="revYoy" name="Doanh thu" stroke={C.egg} strokeWidth={1.75} dot={false} connectNulls />
                <Line dataKey="pbtYoy" name="LNTT" stroke={C.gold} strokeWidth={2.25} dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        </>,
      )}

      {group(
        "Môi giới & cho vay margin",
        "biên môi giới âm là mảng môi giới đang lỗ (thường do miễn/giảm phí giành khách). Lãi suất margin trừ chi phí vốn vay là khoản lời trên mỗi đồng cho vay. Cho vay/VCSH gần 2 lần là gần trần cho vay ký quỹ theo quy định.",
        <>
          <Card title="Môi giới: doanh thu, lợi nhuận và biên" note="Cột: tỷ đồng · đường: (DT − chi phí môi giới) / DT">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart {...common}>
                {grid}
                {xAxis}
                {yAmt("a")}
                {yPctR}
                <Tooltip cursor={cursor} content={<Tip fmts={{ revBroker: amt, brokerProfit: amt, brokerMargin: pct }} />} />
                {legend}
                <Bar yAxisId="a" dataKey="revBroker" name="DT môi giới" fill={C.sky} fillOpacity={0.8} />
                <Bar yAxisId="a" dataKey="brokerProfit" name="LN môi giới" fill={C.moss} />
                <Line yAxisId="p" dataKey="brokerMargin" name="Biên" stroke={C.gold} strokeWidth={2} dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
          {shareRows.length > 0 ? (
            <Card title="Thị phần môi giới" note="Theo thống kê thị phần trong file tổng hợp">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={shareRows} margin={{ top: 4, right: 2, bottom: 0, left: -6 }}>
                  {grid}
                  <XAxis dataKey="q" tick={axisTick} tickLine={false} axisLine={{ stroke: C.grid }} interval="preserveStartEnd" minTickGap={14} />
                  <YAxis tick={axisTick} tickLine={false} axisLine={false} width={40} domain={["auto", "auto"]} tickFormatter={(v) => `${vn(v, 0)}%`} />
                  <Tooltip cursor={lineCursor} content={<Tip fmts={{ share: (v) => `${vn(v, 2)}%` }} />} />
                  {legend}
                  <Line dataKey="share" name={`Thị phần ${symbol}`} stroke={C.gold} strokeWidth={2.25} dot={{ r: 2 }} connectNulls={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </Card>
          ) : (
            vsInd("Phí môi giới thực thu (take rate)", "takeRate", "pct", 2)
          )}
          <Card title={hasMargin ? "Dư nợ margin và cho vay / VCSH" : "Cho vay và cho vay / VCSH"} note="Cột: tỷ đồng · đường: dư nợ cho vay / vốn chủ sở hữu (lần)">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart {...common}>
                {grid}
                {xAxis}
                {yAmt("a")}
                <YAxis yAxisId="t" orientation="right" tick={axisTick} tickLine={false} axisLine={false} width={34} tickFormatter={(v) => vn(v, 1)} />
                <Tooltip cursor={cursor} content={<Tip fmts={{ margin: amt, loans: amt, marginToEq: times }} />} />
                {legend}
                <Bar yAxisId="a" dataKey={hasMargin ? "margin" : "loans"} name={hasMargin ? "Dư nợ margin" : "Các khoản cho vay"} fill={C.moss} radius={[2, 2, 0, 0]} />
                <Line yAxisId="t" dataKey="marginToEq" name="Cho vay / VCSH" stroke={C.gold} strokeWidth={2} dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Lãi suất margin và chi phí vốn vay" note="Quy năm · nét đứt: trung vị 18 CTCK">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart {...common}>
                {grid}
                {xAxis}
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={40} domain={["auto", "auto"]} tickFormatter={pctAxis} />
                <Tooltip cursor={lineCursor} content={<Tip fmts={{ marginYield: pct, fundingCost: pct, marginYieldInd: pct, fundingCostInd: pct }} />} />
                {legend}
                <Line dataKey="marginYield" name="Lãi suất margin" stroke={C.gold} strokeWidth={2.25} dot={false} connectNulls />
                <Line dataKey="fundingCost" name="Chi phí vốn" stroke={C.rose} strokeWidth={2} dot={false} connectNulls />
                <Line dataKey="marginYieldInd" name="Margin trung vị" stroke={C.egg} strokeWidth={1.25} strokeDasharray="5 4" dot={false} connectNulls />
                <Line dataKey="fundingCostInd" name="Chi phí vốn trung vị" stroke={C.rose} strokeOpacity={0.55} strokeWidth={1.25} strokeDasharray="5 4" dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        </>,
      )}

      {group(
        "Mảng tự doanh",
        "FVTPL là tài sản ghi nhận lãi/lỗ theo giá thị trường mỗi kỳ, nên lợi nhuận dao động mạnh; HTM (giữ đến đáo hạn, chủ yếu tiền gửi, trái phiếu) và AFS ổn định hơn. Tự doanh/VCSH và tỷ trọng LN tự doanh cao nghĩa là kết quả kinh doanh nhạy với diễn biến thị trường.",
        <>
          <Card title="Cơ cấu tài sản tự doanh" note="Cột: tỷ đồng · đường: tự doanh / VCSH (lần)">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart {...common}>
                {grid}
                {xAxis}
                {yAmt("a")}
                <YAxis yAxisId="t" orientation="right" tick={axisTick} tickLine={false} axisLine={false} width={34} tickFormatter={(v) => vn(v, 1)} />
                <Tooltip cursor={cursor} content={<Tip fmts={{ fvtpl: amt, htm: amt, afs: amt, propToEq: times }} />} />
                {legend}
                <Bar yAxisId="a" dataKey="fvtpl" name="FVTPL" stackId="t" fill={C.gold} />
                <Bar yAxisId="a" dataKey="htm" name="HTM" stackId="t" fill={C.mossDark} />
                <Bar yAxisId="a" dataKey="afs" name="AFS" stackId="t" fill={C.plum} radius={[2, 2, 0, 0]} />
                <Line yAxisId="t" dataKey="propToEq" name="Tự doanh / VCSH" stroke={C.egg} strokeWidth={2} dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Doanh thu và lãi thuần tự doanh" note="Tỷ đồng · lãi thuần = doanh thu FVTPL, HTM, AFS trừ các khoản lỗ và chi phí tự doanh">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart {...common}>
                {grid}
                {xAxis}
                {yAmt()}
                <Tooltip cursor={cursor} content={<Tip fmts={{ propRev: amt, propProfit: amt }} />} />
                {legend}
                <Bar dataKey="propRev" name="Doanh thu tự doanh" fill={C.egg} fillOpacity={0.55} />
                <Bar dataKey="propProfit" name="Lãi thuần tự doanh" fill={C.gold} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
          {vsInd("Tỷ trọng LN tự doanh", "propProfitShare")}
          <Card title="Nợ vay và chi phí lãi vay" note="Cột: nợ vay cuối quý (tỷ đồng) · đường: chi phí lãi vay trong quý">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart {...common}>
                {grid}
                {xAxis}
                {yAmt("a")}
                <YAxis yAxisId="c" orientation="right" tick={axisTick} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => vn(v, 0)} />
                <Tooltip cursor={cursor} content={<Tip fmts={{ borrow: amt, interestCost: amt }} />} />
                {legend}
                <Bar yAxisId="a" dataKey="borrow" name="Nợ vay" fill={C.mossDark} radius={[2, 2, 0, 0]} />
                <Line yAxisId="c" dataKey="interestCost" name="Chi phí lãi vay (tỷ)" stroke={C.rose} strokeWidth={2} dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        </>,
      )}

      {group(
        "Hiệu quả so với ngành",
        "đường vàng là công ty, nét đứt là trung vị 18 CTCK trong file (mức ở giữa, không bị vài công ty rất nhỏ kéo lệch). ROE, ROA, biên LNTT nằm trên đường ngành là tốt hơn mặt bằng. ROE, ROA đã quy năm (quý × 4). Đòn bẩy cao giúp ROE cao hơn nhưng rủi ro cũng lớn hơn.",
        <>
          {vsInd("ROE (quy năm)", "roe")}
          {vsInd("ROA (quy năm)", "roa")}
          {vsInd("Biên LNTT", "pbtMargin")}
          {vsInd("Đòn bẩy (tổng TS / VCSH)", "leverage", "times")}
        </>,
      )}
      <p className="mt-3 text-xs text-[var(--sm-mut)]">Chỉ để tham khảo, không phải khuyến nghị mua bán.</p>
    </section>
  );
}
