import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BANKS, PERIOD, type BankGroup, type MetricKey } from "../data/bankSector";

// Ngành ngân hàng: 4 chỉ số trung bình ngành, bảng 16 ngân hàng (ô xanh = tốt lên
// so với cùng kỳ, đỏ = xấu đi) và biểu đồ xếp hạng theo chỉ số được chọn.

interface Metric {
  key: MetricKey;
  label: string;
  short: string;
  /** 1 = cao là tốt, -1 = thấp là tốt, 0 = trung tính */
  dir: 1 | -1 | 0;
  what: string;
}

const METRICS: Metric[] = [
  { key: "casa", label: "CASA", short: "CASA", dir: 1, what: "Tỷ lệ tiền gửi không kỳ hạn: phần tiền gửi gần như không phải trả lãi. Cao hơn thì vốn rẻ hơn." },
  { key: "cir", label: "CIR", short: "CIR", dir: -1, what: "Chi phí hoạt động trên tổng thu nhập. Thấp hơn là vận hành hiệu quả hơn." },
  { key: "noii", label: "NoII/TOI", short: "Thu ngoài lãi", dir: 1, what: "Tỷ trọng thu nhập ngoài lãi (phí, dịch vụ…) trong tổng thu nhập. Cao hơn thì nguồn thu đa dạng hơn." },
  { key: "credit", label: "Tín dụng YTD", short: "Tín dụng YTD", dir: 1, what: "Dư nợ cho vay tăng bao nhiêu so với đầu năm." },
  { key: "deposit", label: "Tiền gửi YTD", short: "Tiền gửi YTD", dir: 1, what: "Tiền gửi khách hàng tăng bao nhiêu so với đầu năm." },
  { key: "nim", label: "NIM", short: "NIM", dir: 1, what: "Biên lãi ròng: ngân hàng lời bao nhiêu trên mỗi đồng cho vay sau khi trả lãi huy động. Cao hơn là tốt." },
  { key: "roa", label: "ROA", short: "ROA", dir: 1, what: "Lợi nhuận trên tổng tài sản trong quý." },
  { key: "roe", label: "ROE", short: "ROE", dir: 1, what: "Lợi nhuận trên vốn chủ sở hữu trong quý." },
  { key: "npl", label: "NPL", short: "Nợ xấu", dir: -1, what: "Tỷ lệ nợ xấu (nhóm 3–5) trên tổng dư nợ. Thấp hơn là an toàn hơn." },
  { key: "ldr", label: "LDR", short: "LDR", dir: 0, what: "Cho vay trên tiền gửi. Quá cao là căng thanh khoản, quá thấp là chưa dùng hết vốn." },
  { key: "yoea", label: "YOEA", short: "Lợi suất TS", dir: 1, what: "Lợi suất bình quân trên tài sản sinh lãi." },
  { key: "cof", label: "COF", short: "Chi phí vốn", dir: -1, what: "Chi phí vốn huy động bình quân. Thấp hơn là tốt." },
];
const RANK_KEYS: MetricKey[] = ["nim", "roe", "npl", "casa", "ldr", "credit", "cof"];
const GROUPS: ("Tất cả" | BankGroup)[] = ["Tất cả", "SOBs", "NHTM lớn", "NHTM vừa"];

const vn = (x: number, d = 2) => x.toLocaleString("vi-VN", { minimumFractionDigits: d, maximumFractionDigits: d });
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="min-w-0 flex-[1_1_12rem] border-[var(--ab-line)] px-5 py-3.5 [&:not(:first-child)]:border-l">
      <p className="text-[0.82rem] text-[var(--ab-muted)]">{label}</p>
      <p className="mt-0.5 text-[1.75rem] font-bold tabular-nums leading-tight text-[var(--ab-strong)]">{value}</p>
      <p className="mt-0.5 text-xs text-[var(--ab-muted)]">{sub}</p>
    </div>
  );
}

function Seg<T extends string>({ items, value, onChange, label }: { items: readonly T[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex overflow-hidden rounded-lg border border-[var(--ab-line)]">
      {items.map((t) => (
        <button
          key={t}
          type="button"
          aria-pressed={t === value}
          onClick={() => onChange(t)}
          className={`px-3 py-1.5 text-[0.82rem] transition-colors ${
            t === value ? "bg-[var(--ab-accent)] font-bold text-[var(--ab-bg)]" : "text-[var(--ab-muted)] hover:bg-[var(--ab-hover)]"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

export default function BankSector() {
  const [group, setGroup] = useState<(typeof GROUPS)[number]>("Tất cả");
  const [rankKey, setRankKey] = useState<MetricKey>("nim");
  const rows = useMemo(() => (group === "Tất cả" ? BANKS : BANKS.filter((b) => b.group === group)), [group]);

  const vals = (k: MetricKey) => rows.flatMap((r) => (r.v[k] != null && r.v[k] !== 0 ? [{ bank: r.bank, v: r.v[k]! }] : []));
  const avg = (k: MetricKey) => mean(vals(k).map((x) => x.v));
  const best = (k: MetricKey, hi = true) => {
    const xs = vals(k);
    if (!xs.length) return "";
    const b = xs.reduce((a, c) => ((hi ? c.v > a.v : c.v < a.v) ? c : a));
    return `${hi ? "Cao nhất" : "Thấp nhất"} ${b.bank} ${vn(b.v)}%`;
  };

  const rm = METRICS.find((m) => m.key === rankKey)!;
  const ranked = vals(rankKey).sort((a, b) => (rm.dir === -1 ? a.v - b.v : b.v - a.v));
  const rankAvg = avg(rankKey);
  const rankMax = Math.max(...ranked.map((x) => x.v), rankAvg) * 1.08 || 1;
  const groupsShown = GROUPS.slice(1).filter((g) => rows.some((r) => r.group === g)) as BankGroup[];

  return (
    <div className="gutter-x mx-auto flex max-w-[1440px] flex-col gap-4 py-8 text-[var(--ab-text)]">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="text-[clamp(1.6rem,3vw,2rem)] font-bold leading-tight text-[var(--ab-strong)]">Ngành ngân hàng · {PERIOD}</h1>
          <p className="mt-1 text-[var(--ab-muted)]">16 ngân hàng niêm yết · số liệu báo cáo tài chính quý</p>
        </div>
        <Seg items={GROUPS} value={group} onChange={setGroup} label="Nhóm ngân hàng" />
      </div>

      <section aria-label="Trung bình ngành" className="flex flex-wrap rounded-[10px] border border-[var(--ab-line)] bg-[var(--ab-card)]">
        <Tile label="NIM trung bình" value={`${vn(avg("nim"))}%`} sub={best("nim")} />
        <Tile label="ROE trung bình (quý)" value={`${vn(avg("roe"), 1)}%`} sub={best("roe")} />
        <Tile label="Nợ xấu (NPL) trung bình" value={`${vn(avg("npl"))}%`} sub={best("npl", false)} />
        <Tile label="Tín dụng tăng từ đầu năm" value={`${vn(avg("credit"), 1)}%`} sub={best("credit")} />
      </section>

      <section className="overflow-x-auto rounded-[10px] border border-[var(--ab-line)] bg-[var(--ab-card)]">
        <table className="w-full min-w-[1080px] border-collapse text-[0.92rem]">
          <thead>
            <tr className="bg-[var(--ab-accent)] text-[var(--ab-bg)]">
              <th className="w-[96px]" />
              <th className="px-2 py-2.5 font-bold">Ngân hàng</th>
              {METRICS.map((m) => (
                <th key={m.key} title={m.what} className="px-2 py-2.5 text-center font-bold leading-tight">
                  {m.label} (%)
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groupsShown.map((g) => {
              const gr = rows.filter((r) => r.group === g);
              return gr.map((r, i) => (
                <tr key={r.bank} className={`border-t ${i === 0 ? "border-[var(--ab-line-strong)]" : "border-[var(--ab-line)]"}`}>
                  {i === 0 && (
                    <td rowSpan={gr.length} className="border-r border-[var(--ab-line)] px-3 text-center font-bold whitespace-nowrap text-[var(--ab-text)]">
                      {g}
                    </td>
                  )}
                  <td className="border-r border-[var(--ab-line)] px-3 py-1.5 text-center">
                    <Link to={`/stock/${r.bank}`} className="font-bold text-[var(--ab-strong)] underline-offset-2 hover:underline">
                      {r.bank}
                    </Link>
                  </td>
                  {METRICS.map((m) => {
                    const v = r.v[m.key];
                    const d = r.d[m.key] ?? 0;
                    const s = m.dir * d;
                    const tone = s > 0 ? "var(--ab-up)" : s < 0 ? "var(--ab-down)" : "";
                    const dd = `${d > 0 ? "+" : d < 0 ? "−" : ""}${vn(Math.abs(d))}`;
                    return (
                      <td
                        key={m.key}
                        title={`So với cùng kỳ: ${dd} điểm %`}
                        className="px-2 py-1.5 text-center tabular-nums"
                        style={tone ? { color: tone, background: `color-mix(in srgb, ${tone} 13%, transparent)` } : undefined}
                      >
                        {v == null ? "—" : `${vn(v, 1)}%`}
                      </td>
                    );
                  })}
                </tr>
              ));
            })}
          </tbody>
        </table>
      </section>
      <p className="-mt-1 flex flex-wrap gap-x-5 gap-y-1 text-[0.8rem] text-[var(--ab-muted)]">
        <span>
          <i className="mr-1.5 inline-block h-2.5 w-2.5 align-[-1px]" style={{ background: "color-mix(in srgb, var(--ab-up) 25%, transparent)", border: "1px solid var(--ab-up)" }} />
          Tốt lên so với cùng kỳ
        </span>
        <span>
          <i className="mr-1.5 inline-block h-2.5 w-2.5 align-[-1px]" style={{ background: "color-mix(in srgb, var(--ab-down) 25%, transparent)", border: "1px solid var(--ab-down)" }} />
          Xấu đi so với cùng kỳ
        </span>
        <span>ROA, ROE theo quý · rê chuột vào ô để xem mức thay đổi · bấm tên ngân hàng để mở trang mã</span>
      </p>

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
                    on ? "bg-[var(--ab-accent)] font-bold text-[var(--ab-bg)]" : "border border-[var(--ab-line)] text-[var(--ab-muted)] hover:bg-[var(--ab-hover)]"
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
              return (
                <li key={x.bank} className="grid grid-cols-[3rem_1fr] items-center gap-2 text-[0.85rem]">
                  <Link to={`/stock/${x.bank}`} className="font-bold text-[var(--ab-strong)] hover:underline">
                    {x.bank}
                  </Link>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-4 rounded-[3px]"
                      style={{
                        width: `calc(${(x.v / rankMax) * 100}% - 3.5rem)`,
                        minWidth: 2,
                        background: rm.dir === 0 ? "var(--ab-accent)" : better ? "var(--ab-up)" : "var(--ab-muted)",
                        opacity: rm.dir === 0 || better ? 0.85 : 0.5,
                      }}
                    />
                    <span className="tabular-nums text-[var(--ab-text)]">{vn(x.v)}%</span>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="mt-2 text-[0.8rem] text-[#e07b39]">Trung bình {rows.length} ngân hàng: {vn(rankAvg)}%</p>
        </div>
        <div className="border-[var(--ab-line)] lg:border-l lg:pl-6">
          <h3 className="font-bold text-[var(--ab-strong)]">{rm.label} là gì</h3>
          <p className="mt-1.5 mb-4">{rm.what}</p>
          <h3 className="font-bold text-[var(--ab-strong)]">Đọc nhanh</h3>
          <ul className="mt-1.5 list-disc pl-5 leading-relaxed">
            <li>
              Cột xanh: {rm.dir === -1 ? "thấp hơn" : "cao hơn"} trung bình (tốt hơn). Cột mờ: kém hơn trung bình.
            </li>
            <li>Lọc theo nhóm ở góc trên để so trong cùng nhóm.</li>
            <li>Bấm tên ngân hàng để mở trang chi tiết mã.</li>
          </ul>
          <p className="mt-4 text-xs text-[var(--ab-muted)]">
            Nguồn: tổng hợp báo cáo tài chính {PERIOD} của các ngân hàng. Chỉ để tham khảo, không phải khuyến nghị mua bán.
          </p>
        </div>
      </section>
    </div>
  );
}
