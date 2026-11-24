import { put, head } from "@vercel/blob";
import { STOCK_UNIVERSE } from "../providers/universe.js";
import { getHistoryWithFallback } from "../providers/fallback.js";
import type { HistoryPoint } from "../providers/types.js";
import { barDateICT, dropUnclosedBars, lastClosedSessionDate } from "./sessionClose.js";

// "Sóng ngành" theo cách nhìn của Mark Minervini: một ngành đang có sóng khi
// nhiều cổ phiếu trong ngành cùng lúc đạt Trend Template (xu hướng tăng giai
// đoạn 2). Với mỗi tuần trong ~2 năm gần nhất, tính:
//   - mỗi ngành: % số mã đạt Trend Template, số mã lập đỉnh 52 tuần
//   - VN-Index: giá đóng cửa, MA50/150/200 và giai đoạn (1 tích lũy, 2 tăng,
//     3 phân phối, 4 giảm) theo vị trí giá – MA150 và độ dốc MA150
// Chỉ dùng phiên đã đóng. Kết quả lưu Vercel Blob theo phiên để chỉ tính một
// lần mỗi ngày (cùng cách tradeJournal.ts).

// Phân ngành cho phân tích sóng ngành — phủ toàn bộ STOCK_UNIVERSE.
export const WAVE_SECTORS: Record<string, string[]> = {
  "Ngân hàng": ["VCB", "BID", "CTG", "TCB", "MBB", "ACB", "VPB", "STB", "SHB", "HDB", "TPB", "VIB", "EIB", "MSB", "LPB", "OCB", "SSB", "ABB", "NAB", "BAB", "SGB", "KLB", "PGB", "VAB", "VBB", "EVF"],
  "Chứng khoán": ["SSI", "VND", "HCM", "VCI", "VIX", "FTS", "CTS", "BSI", "AGR", "VDS", "APG", "ORS", "EVS", "TVS", "VIG", "SHS", "MBS"],
  "Bất động sản": ["VIC", "VHM", "VRE", "NVL", "PDR", "DXG", "KDH", "NLG", "DIG", "CEO", "HDG", "AGG", "DXS", "SCR", "HQC", "LDG", "VPI", "NTL", "TCH", "QCG", "SJS", "API", "NBB", "NHA", "HDC", "CRE", "IJC"],
  "BĐS khu công nghiệp": ["KBC", "BCM", "IDC", "SZC", "ITA", "D2D", "LHG", "SIP"],
  "Thép, xi măng": ["HPG", "HSG", "NKG", "POM", "SMC", "TLH", "VGS", "HT1"],
  "Xây dựng, đầu tư công": ["HBC", "CTD", "FCN", "PC1", "TV2", "VC3", "VCG", "CII", "HHV", "DPG", "HUT", "BCG"],
  "Dầu khí": ["GAS", "PLX", "PVD", "PVS", "BSR", "OIL", "PVT", "PVC"],
  "Điện, nước": ["POW", "NT2", "PPC", "QTP", "HND", "SBA", "VSH", "GEG", "REE", "BWE", "TDM"],
  "Hóa chất, phân bón": ["DGC", "DCM", "DPM", "LAS", "BFC"],
  "Cao su": ["GVR", "PHR", "DPR", "TRC", "DRC", "CSM"],
  "Bán lẻ, tiêu dùng": ["VNM", "MWG", "PNJ", "MSN", "SAB", "KDC", "DGW", "FRT", "MCH", "BHN", "MML", "QNS", "LSS", "SBT"],
  "Thủy sản, nông nghiệp": ["VHC", "ANV", "DBC", "HAG", "HNG", "PAN", "BAF", "ASM"],
  "Dệt may": ["TCM", "STK", "GIL", "MSH", "VGT", "TNG"],
  "Cảng biển, logistics": ["GMD", "VSC", "HAH", "PHP", "DVP", "TMS", "STG", "VTP"],
  "Hàng không": ["VJC", "HVN", "ACV", "SKG"],
  "Công nghệ, viễn thông": ["FPT", "CMG", "ELC", "ITD", "VGI", "FOX"],
  "Bảo hiểm": ["BVH", "BMI", "MIG", "PTI", "VNR", "PVI"],
  "Dược phẩm": ["DHG", "IMP", "DBD", "DVN", "TRA"],
  "Công nghiệp, vật liệu khác": ["GEX", "GEE", "VEA", "HAX", "SVC", "SAM", "PTB", "GDT", "BMP", "NTP", "AAA", "VCS"],
};

const SECTOR_OF: Record<string, string> = Object.fromEntries(
  Object.entries(WAVE_SECTORS).flatMap(([sec, syms]) => syms.map((s) => [s, sec])),
);

const WEEKS = 104;
/** Ngưỡng coi là "có sóng": từ 50% số mã trong ngành đạt Trend Template. */
export const WAVE_THRESHOLD = 50;

export interface SectorWaveRow {
  sector: string;
  /** số mã đủ dữ liệu tính được ở tuần gần nhất */
  n: number;
  /** % mã đạt Trend Template theo từng tuần (null nếu chưa đủ dữ liệu) */
  pct: (number | null)[];
  /** số mã lập đỉnh 52 tuần trong tuần */
  highs: number[];
  /** mã đạt Trend Template ở tuần gần nhất */
  leaders: string[];
}

export interface SectorWavesResult {
  sessionDate: string;
  weeks: string[];
  vnindex: { close: number[]; ma50: (number | null)[]; ma150: (number | null)[]; ma200: (number | null)[]; stage: (1 | 2 | 3 | 4 | null)[] };
  /** % toàn bộ mã đạt Trend Template theo tuần */
  breadth: (number | null)[];
  sectors: SectorWaveRow[];
  threshold: number;
}

function dedupeSameDay(points: HistoryPoint[]): HistoryPoint[] {
  const out: HistoryPoint[] = [];
  for (const p of points) {
    const prev = out[out.length - 1];
    if (prev && prev.time.slice(0, 10) === p.time.slice(0, 10)) out[out.length - 1] = p;
    else out.push(p);
  }
  return out;
}

function rollingMean(xs: number[], n: number): (number | null)[] {
  const out: (number | null)[] = new Array(xs.length).fill(null);
  let s = 0;
  for (let i = 0; i < xs.length; i++) {
    s += xs[i];
    if (i >= n) s -= xs[i - n];
    if (i >= n - 1) out[i] = s / n;
  }
  return out;
}

function rollingExtreme(xs: number[], n: number, max: boolean): number[] {
  const out: number[] = [];
  for (let i = 0; i < xs.length; i++) {
    let v = xs[i];
    for (let j = Math.max(0, i - n + 1); j < i; j++) v = max ? Math.max(v, xs[j]) : Math.min(v, xs[j]);
    out.push(v);
  }
  return out;
}

interface DailyState {
  dates: string[];
  template: (boolean | null)[];
  newHigh: boolean[];
}

// Trend Template (Minervini), bản dùng giá đóng cửa:
//  giá > MA50 > MA150 > MA200; MA200 đi lên so với 20 phiên trước;
//  giá ≥ 1,3 × đáy 52 tuần; giá ≥ 0,75 × đỉnh 52 tuần.
function dailyState(points: HistoryPoint[]): DailyState {
  const c = points.map((p) => p.close);
  const dates = points.map((p) => barDateICT(p.time) ?? p.time.slice(0, 10));
  const m50 = rollingMean(c, 50);
  const m150 = rollingMean(c, 150);
  const m200 = rollingMean(c, 200);
  const hi = rollingExtreme(c, 250, true);
  const lo = rollingExtreme(c, 250, false);
  const template = c.map((x, i) => {
    const a = m50[i], b = m150[i], d = m200[i], d20 = i >= 20 ? m200[i - 20] : null;
    if (a == null || b == null || d == null || d20 == null || i < 220) return null;
    return x > a && a > b && b > d && d > d20 && x >= 1.3 * lo[i] && x >= 0.75 * hi[i];
  });
  const newHigh = c.map((x, i) => i >= 240 && x >= hi[i]);
  return { dates, template, newHigh };
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** Chỉ số của phần tử cuối cùng có date ≤ d (mảng dates tăng dần), hoặc -1. */
function lastAtOrBefore(dates: string[], d: string, from: number): number {
  let i = from;
  while (i + 1 < dates.length && dates[i + 1] <= d) i++;
  return dates[i] <= d ? i : -1;
}

export async function computeSectorWaves(): Promise<SectorWavesResult> {
  // VN-Index: lịch tuần (phiên cuối mỗi tuần) và giai đoạn thị trường
  const { points: vRaw } = await getHistoryWithFallback("VNINDEX", "5Y");
  const v = dropUnclosedBars(dedupeSameDay(vRaw));
  if (v.length < 260) throw new Error("Không đủ dữ liệu VN-Index để tính sóng ngành");
  const vc = v.map((p) => p.close);
  const vd = v.map((p) => barDateICT(p.time) ?? p.time.slice(0, 10));
  const v50 = rollingMean(vc, 50), v150 = rollingMean(vc, 150), v200 = rollingMean(vc, 200);

  // phiên cuối của mỗi tuần (tuần tính từ thứ Hai)
  const weekEnd: number[] = [];
  const wk = (d: string) => {
    const t = new Date(`${d}T00:00:00Z`);
    const day = (t.getUTCDay() + 6) % 7;
    return new Date(t.getTime() - day * 86_400_000).toISOString().slice(0, 10);
  };
  for (let i = 0; i < vd.length; i++) if (i === vd.length - 1 || wk(vd[i + 1]) !== wk(vd[i])) weekEnd.push(i);
  const idx = weekEnd.slice(-WEEKS);
  const weeks = idx.map((i) => vd[i]);

  // giai đoạn VN-Index theo ngày, rồi lấy giá trị ở cuối tuần
  const stageDaily: (1 | 2 | 3 | 4 | null)[] = [];
  let lastDef: 2 | 4 | null = null;
  for (let i = 0; i < vc.length; i++) {
    const a = v50[i], b = v150[i], b20 = i >= 20 ? v150[i - 20] : null;
    if (a == null || b == null || b20 == null) {
      stageDaily.push(null);
      continue;
    }
    if (vc[i] > b && b > b20 && a > b) lastDef = 2;
    else if (vc[i] < b && b < b20 && a < b) lastDef = 4;
    else {
      stageDaily.push(lastDef === 2 ? 3 : 1);
      continue;
    }
    stageDaily.push(lastDef);
  }

  // từng mã
  const universe = STOCK_UNIVERSE.filter((s) => SECTOR_OF[s.symbol]);
  const states = await mapWithConcurrency(universe, 25, async (seed) => {
    try {
      const { points } = await getHistoryWithFallback(seed.symbol, "5Y");
      const p = dropUnclosedBars(dedupeSameDay(points)).filter((x) => Number.isFinite(x.close) && x.close > 0);
      return p.length >= 230 ? { symbol: seed.symbol, s: dailyState(p) } : null;
    } catch {
      return null;
    }
  });

  const sectors = Object.keys(WAVE_SECTORS);
  const pass: Record<string, number[]> = {};
  const total: Record<string, number[]> = {};
  const highs: Record<string, number[]> = {};
  const leaders: Record<string, string[]> = {};
  for (const s of sectors) {
    pass[s] = new Array(weeks.length).fill(0);
    total[s] = new Array(weeks.length).fill(0);
    highs[s] = new Array(weeks.length).fill(0);
    leaders[s] = [];
  }
  for (const st of states) {
    if (!st) continue;
    const sec = SECTOR_OF[st.symbol];
    let k = 0;
    for (let w = 0; w < weeks.length; w++) {
      const j = lastAtOrBefore(st.s.dates, weeks[w], k);
      if (j < 0) continue;
      k = j;
      // bỏ mã đã ngừng giao dịch lâu (dữ liệu cũ hơn 10 ngày so với tuần đang xét)
      if ((Date.parse(weeks[w]) - Date.parse(st.s.dates[j])) / 86_400_000 > 10) continue;
      const t = st.s.template[j];
      if (t == null) continue;
      total[sec][w]++;
      if (t) pass[sec][w]++;
      // đỉnh 52 tuần bất kỳ phiên nào trong tuần
      let h = false;
      for (let q = j; q >= 0 && q > j - 5 && wk(st.s.dates[q]) === wk(weeks[w]); q--) if (st.s.newHigh[q]) h = true;
      if (h) highs[sec][w]++;
      if (w === weeks.length - 1 && t) leaders[sec].push(st.symbol);
    }
  }

  const pctOf = (p: number, t: number) => (t >= 3 ? Math.round((p / t) * 1000) / 10 : null);
  const rows: SectorWaveRow[] = sectors.map((s) => ({
    sector: s,
    n: total[s][weeks.length - 1],
    pct: weeks.map((_, w) => pctOf(pass[s][w], total[s][w])),
    highs: highs[s],
    leaders: leaders[s],
  }));
  const breadth = weeks.map((_, w) => {
    const p = sectors.reduce((a, s) => a + pass[s][w], 0);
    const t = sectors.reduce((a, s) => a + total[s][w], 0);
    return t ? Math.round((p / t) * 1000) / 10 : null;
  });
  const r2 = (x: number | null) => (x == null ? null : Math.round(x * 100) / 100);

  return {
    sessionDate: vd[vd.length - 1],
    weeks,
    vnindex: {
      close: idx.map((i) => r2(vc[i])!),
      ma50: idx.map((i) => r2(v50[i])),
      ma150: idx.map((i) => r2(v150[i])),
      ma200: idx.map((i) => r2(v200[i])),
      stage: idx.map((i) => stageDaily[i]),
    },
    breadth,
    sectors: rows,
    threshold: WAVE_THRESHOLD,
  };
}

// ----------------------------------------------------------------- lưu trữ
const BLOB_PATHNAME = "sector-waves/latest.json";
const blobConfigured = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

async function readBlob(): Promise<SectorWavesResult | null> {
  if (!blobConfigured()) return null;
  try {
    const meta = await head(BLOB_PATHNAME);
    const r = await fetch(`${meta.url}?t=${Date.now()}`, { cache: "no-store" });
    return r.ok ? ((await r.json()) as SectorWavesResult) : null;
  } catch {
    return null;
  }
}

async function writeBlob(v: SectorWavesResult): Promise<void> {
  if (!blobConfigured()) return;
  await put(BLOB_PATHNAME, JSON.stringify(v), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

/** Kết quả của phiên đã đóng gần nhất: đọc Blob nếu đã có, không thì tính và lưu lại. */
export async function getSectorWaves(): Promise<SectorWavesResult> {
  const closed = lastClosedSessionDate();
  const saved = await readBlob();
  if (saved && saved.sessionDate >= closed) return saved;
  try {
    const fresh = await computeSectorWaves();
    await writeBlob(fresh).catch((e) => console.error("[sector-waves] không lưu được Blob:", e instanceof Error ? e.message : e));
    return fresh;
  } catch (err) {
    if (saved) return saved;
    throw err;
  }
}
