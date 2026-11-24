import { put, head } from "@vercel/blob";
import { STOCK_UNIVERSE } from "../providers/universe.js";
import { getHistoryWithFallback } from "../providers/fallback.js";
import type { HistoryPoint, HistoryRange } from "../providers/types.js";
import { barDateICT, dropUnclosedBars } from "./sessionClose.js";

// "Sóng ngành" theo cách nhìn của Mark Minervini: một ngành đang có sóng khi
// nhiều cổ phiếu trong ngành cùng lúc đạt Trend Template (xu hướng tăng giai
// đoạn 2). Tính theo tuần từ năm 2000 đến nay:
//   - mỗi ngành: % số mã đạt Trend Template, số mã lập đỉnh 52 tuần
//   - VN-Index: giá đóng cửa, MA50/150/200 (ngày) và giai đoạn 1–4
// Lịch sử từng mã được tính dần (mỗi lượt gọi xử lý một nhóm mã trong giới hạn
// thời gian của hàm serverless) và lưu Vercel Blob dưới dạng chuỗi mã hóa theo
// tuần; mỗi phiên chỉ cập nhật thêm các tuần mới. Chỉ dùng phiên đã đóng.

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

/** Ngưỡng coi là "có sóng": từ 50% số mã trong ngành đạt Trend Template. */
export const WAVE_THRESHOLD = 50;
/** Ngân sách thời gian mỗi lượt gọi (hàm Vercel tối đa 30 giây). */
const BUDGET_MS = 19_000;

export interface SectorWaveRow {
  sector: string;
  /** số mã có dữ liệu ở tuần gần nhất */
  n: number;
  /** % mã đạt Trend Template theo từng tuần (null nếu dưới 3 mã có dữ liệu) */
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
  breadth: (number | null)[];
  sectors: SectorWaveRow[];
  threshold: number;
  /** tiến độ dựng lịch sử: số mã đã tính / tổng */
  progress: { done: number; total: number };
  /** trạng thái thị trường trên chỉ số cân bằng của Bull Stock (theo tuần, cùng trục với weeks) */
  market: MarketState;
}

/** 1 Tích cực · 2 Quan sát · 3 Thận trọng */
export type MarketStateCode = 1 | 2 | 3;
export interface MarketSignal {
  date: string;
  /** chỉ số tuần (vị trí trong weeks) */
  w: number;
  level: number;
  /** % thay đổi của chỉ số cân bằng sau 63 / 126 phiên (≈3 / 6 tháng); null nếu chưa đủ phiên */
  after3m: number | null;
  after6m: number | null;
}
export interface MarketState {
  index: (number | null)[];
  ma50: (number | null)[];
  state: (MarketStateCode | null)[];
  /** thanh khoản 20 phiên so với trung bình 250 phiên, % */
  liq: (number | null)[];
  signals: MarketSignal[];
  now: {
    date: string;
    state: MarketStateCode;
    /** trạng thái theo chỉ số trước khi xét sóng ngành */
    base: MarketStateCode;
    since: string;
    dist: number;
    liq: number | null;
    level: number;
    /** số ngành có sóng ở phiên gần nhất */
    waves: number;
  } | null;
  /** số mã tối thiểu mỗi phiên để tính chỉ số */
  minStocks: number;
}

// Trạng thái lưu Blob. codes: mỗi ký tự là một tuần của lịch (cùng độ dài weekKeys):
//  "." chưa đủ dữ liệu · "0" không đạt · "1" đạt · "2" không đạt + đỉnh 52 tuần · "3" đạt + đỉnh 52 tuần
interface State {
  version: 2;
  stageRule?: number;
  sessionDate: string;
  weekKeys: string[]; // thứ Hai của tuần
  weekEnds: string[]; // phiên cuối của tuần (VN-Index)
  vnindex: SectorWavesResult["vnindex"];
  /** tail: 250 giá đóng cửa gần nhất (phiên đã đóng) để tính trạng thái trong phiên; tailDate: ngày phiên cuối */
  symbols: Record<string, { codes: string; len: number; tail?: number[]; tailDate?: string; aggUntil?: string }>;
  /** chỉ số cân bằng, theo ngày: [tổng lợi suất ngày, số mã, tổng giá trị giao dịch, số mã có giá trị] */
  ew?: Record<string, [number, number, number, number]>;
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

// cửa sổ trượt max/min O(n) bằng hàng đợi đơn điệu
function rollingExtreme(xs: number[], n: number, max: boolean): number[] {
  const out: number[] = [];
  const q: number[] = [];
  for (let i = 0; i < xs.length; i++) {
    while (q.length && (max ? xs[q[q.length - 1]] <= xs[i] : xs[q[q.length - 1]] >= xs[i])) q.pop();
    q.push(i);
    if (q[0] <= i - n) q.shift();
    out.push(xs[q[0]]);
  }
  return out;
}

const weekKey = (d: string) => {
  const t = new Date(`${d}T00:00:00Z`);
  const day = (t.getUTCDay() + 6) % 7;
  return new Date(t.getTime() - day * 86_400_000).toISOString().slice(0, 10);
};
const dayOf = (p: HistoryPoint) => barDateICT(p.time) ?? p.time.slice(0, 10);

async function closedHistory(symbol: string, range: HistoryRange): Promise<HistoryPoint[]> {
  const { points } = await getHistoryWithFallback(symbol, range);
  return dropUnclosedBars(dedupeSameDay(points)).filter((x) => Number.isFinite(x.close) && x.close > 0);
}

// Trend Template (Minervini), dùng giá đóng cửa:
//  giá > MA50 > MA150 > MA200; MA200 đi lên so với 20 phiên trước;
//  giá ≥ 1,3 × đáy 52 tuần; giá ≥ 0,75 × đỉnh 52 tuần.
// Trả về mã tuần cho các tuần từ chỉ số `from` của lịch.
function encodeWeeks(points: HistoryPoint[], weekKeys: string[], from: number): string {
  const c = points.map((p) => p.close);
  const dates = points.map(dayOf);
  const m50 = rollingMean(c, 50), m150 = rollingMean(c, 150), m200 = rollingMean(c, 200);
  const hi = rollingExtreme(c, 250, true), lo = rollingExtreme(c, 250, false);
  // gom theo tuần: phiên cuối tuần + có đỉnh 52 tuần trong tuần không
  const byWeek = new Map<string, { last: number; high: boolean }>();
  for (let i = 0; i < c.length; i++) {
    const k = weekKey(dates[i]);
    const e = byWeek.get(k) ?? { last: i, high: false };
    e.last = i;
    if (i >= 240 && c[i] >= hi[i]) e.high = true;
    byWeek.set(k, e);
  }
  let out = "";
  for (let w = from; w < weekKeys.length; w++) {
    const e = byWeek.get(weekKeys[w]);
    if (!e) {
      out += ".";
      continue;
    }
    const i = e.last;
    const a = m50[i], b = m150[i], d = m200[i], d20 = i >= 20 ? m200[i - 20] : null;
    if (a == null || b == null || d == null || d20 == null || i < 220) {
      out += ".";
      continue;
    }
    const t = c[i] > a && a > b && b > d && d > d20 && c[i] >= 1.3 * lo[i] && c[i] >= 0.75 * hi[i];
    out += String((t ? 1 : 0) + (e.high ? 2 : 0));
  }
  return out;
}

/** MA150 thay đổi dưới ±1% trong 20 phiên coi là đi ngang. */
const STAGE_FLAT = 0.01;
/** Đổi số này khi đổi quy tắc giai đoạn để trạng thái đã lưu được tính lại. */
const STAGE_RULE = 2;

const tailOf = (p: HistoryPoint[]) => ({
  tail: p.slice(-250).map((x) => Math.round(x.close * 1000) / 1000),
  tailDate: p.length ? dayOf(p[p.length - 1]) : undefined,
});

async function buildIndex(): Promise<Pick<State, "stageRule" | "sessionDate" | "weekKeys" | "weekEnds" | "vnindex">> {
  const v = await closedHistory("VNINDEX", "MAX");
  if (v.length < 260) throw new Error("Không đủ dữ liệu VN-Index để tính sóng ngành");
  const vc = v.map((p) => p.close);
  const vd = v.map(dayOf);
  const v50 = rollingMean(vc, 50), v150 = rollingMean(vc, 150), v200 = rollingMean(vc, 200);
  // Giai đoạn theo Weinstein, lấy độ dốc MA150 (20 phiên) làm chính:
  //  MA150 đi lên (> +1%)            → 2 Tăng (kể cả khi giá điều chỉnh xuống dưới MA150)
  //  MA150 đi xuống (< −1%), giá < MA150 → 4 Giảm; giá > MA150 → 1 (hồi phục, bắt đầu tích lũy)
  //  MA150 đi ngang (±1%)            → 3 Phân phối nếu trước đó là xu hướng tăng, 1 Tích lũy nếu trước đó giảm
  const stageDaily: (1 | 2 | 3 | 4 | null)[] = [];
  let regime: 2 | 4 | null = null;
  for (let i = 0; i < vc.length; i++) {
    const b = v150[i], b20 = i >= 20 ? v150[i - 20] : null;
    if (b == null || b20 == null) {
      stageDaily.push(null);
      continue;
    }
    const slope = (b - b20) / b20;
    if (slope > STAGE_FLAT) {
      regime = 2;
      stageDaily.push(2);
    } else if (slope < -STAGE_FLAT) {
      regime = 4;
      stageDaily.push(vc[i] < b ? 4 : 1);
    } else {
      stageDaily.push(regime === 2 ? 3 : 1);
    }
  }
  const idx: number[] = [];
  // lịch tuần từ năm 2000 (HOSE mở cửa 7/2000)
  for (let i = 0; i < vd.length; i++) if (vd[i] >= "2000-01-01" && (i === vd.length - 1 || weekKey(vd[i + 1]) !== weekKey(vd[i]))) idx.push(i);
  const r2 = (x: number | null) => (x == null ? null : Math.round(x * 100) / 100);
  return {
    stageRule: STAGE_RULE,
    sessionDate: vd[vd.length - 1],
    weekKeys: idx.map((i) => weekKey(vd[i])),
    weekEnds: idx.map((i) => vd[i]),
    vnindex: {
      close: idx.map((i) => r2(vc[i])!),
      ma50: idx.map((i) => r2(v50[i])),
      ma150: idx.map((i) => r2(v150[i])),
      ma200: idx.map((i) => r2(v200[i])),
      stage: idx.map((i) => stageDaily[i]),
    },
  };
}

async function mapWithConcurrency<T>(items: T[], limit: number, fn: (item: T) => Promise<void>, deadline: number): Promise<void> {
  let next = 0;
  async function worker() {
    while (next < items.length && Date.now() < deadline) await fn(items[next++]);
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

// ----------------------------------------------------------------- chỉ số cân bằng + trạng thái thị trường
/** Biến động ngày vượt ±15% coi là do chia tách/cổ tức chưa điều chỉnh: bỏ khỏi chỉ số. */
const MAX_DAILY_MOVE = 0.15;
const EW_MIN_STOCKS = 30;
/** Phiên ngày phân phối: chỉ số giảm từ 0,2% với thanh khoản cao hơn phiên trước. */
const DIST_DROP = -0.002;
/** Phiên xác nhận: ngày thứ 4–10 của nhịp hồi, chỉ số tăng từ 1,5% với thanh khoản cao hơn phiên trước. */
const FTD_GAIN = 0.015;

/** Cộng một mã vào tổng theo ngày của chỉ số cân bằng, chỉ các phiên sau `after` (không cộng trùng). */
function addAgg(st: State, p: HistoryPoint[], after: string | undefined): string | undefined {
  const ew = (st.ew ??= {});
  for (let i = 1; i < p.length; i++) {
    const d = dayOf(p[i]);
    if (after && d <= after) continue;
    const r = p[i].close / p[i - 1].close - 1;
    const e = (ew[d] ??= [0, 0, 0, 0]);
    if (Number.isFinite(r) && Math.abs(r) <= MAX_DAILY_MOVE) {
      e[0] = Math.round((e[0] + r) * 1e6) / 1e6;
      e[1] += 1;
    }
    const v = p[i].close * (p[i].volume || 0);
    if (Number.isFinite(v) && v > 0) {
      e[2] = Math.round(e[2] + v);
      e[3] += 1;
    }
  }
  return p.length ? dayOf(p[p.length - 1]) : after;
}

// Trạng thái thị trường kiểu "M" trong CAN SLIM (William O'Neil), tính trên chỉ số cân bằng:
//  Thận trọng → Tích cực: có phiên xác nhận (ngày thứ 4–10 của nhịp hồi từ đáy, tăng ≥ 1,5%, thanh khoản tăng).
//  Tích cực → Quan sát: từ 4 ngày phân phối trong 25 phiên, hoặc chỉ số đóng cửa dưới MA50.
//  Thận trọng → Quan sát (không cần phiên xác nhận): chỉ số trên MA50 và MA50 đi lên so với 10 phiên trước.
//  Quan sát → Tích cực: ngày phân phối giảm còn dưới 4 và chỉ số trở lại trên MA50.
//  → Thận trọng: từ 6 ngày phân phối khi chỉ số đã dưới MA50, hoặc chỉ số thủng đáy thấp nhất 50 phiên trước đó.
//  Ngày phân phối hết hiệu lực sau 25 phiên hoặc khi chỉ số đã cao hơn giá đóng cửa ngày đó 5%.
export interface MarketRule {
  /** mức tăng tối thiểu của phiên xác nhận */
  gain: number;
  /** thanh khoản phiên xác nhận: cao hơn phiên trước, hay cao hơn trung bình 50 phiên */
  vol: "prev" | "avg50";
  /** chỉ tính phiên xác nhận tới ngày thứ maxDay của nhịp hồi (null: không giới hạn) */
  maxDay: number | null;
  /** % toàn thị trường đạt Trend Template (tuần trước) tối thiểu (null: không xét) */
  minBreadth: number | null;
  /** thủng đáy nhịp hồi thì về Thận trọng ngay */
  failFast: boolean;
  /** thoát Thận trọng không cần phiên xác nhận: "ma50" chỉ số trên MA50 đang đi lên → Quan sát;
   *  "ma50high" như trên nhưng lên Tích cực chỉ khi lập đỉnh 50 phiên */
  recover: "none" | "ma50" | "ma50high";
  /** ngày phân phối: mức giảm tối thiểu (âm) và thanh khoản so với phiên trước hay trung bình 50 phiên */
  distDrop: number;
  distVol: "prev" | "avg50";
  /** số ngày phân phối để chuyển Thận trọng */
  distCaution: number;
  /** ngày phân phối chỉ đẩy về Thận trọng khi chỉ số đã dưới MA50 (trên MA50 thì dừng ở Quan sát) */
  cautionBelowMa50: boolean;
  /** Tích cực chỉ khi có ít nhất một ngành có sóng; không có thì hạ về Quan sát */
  needWave: boolean;
  /** ngưỡng % mã đạt Trend Template của một ngành để tính là "có sóng" cho điều kiện trên */
  waveMin: number;
  /** thay điều kiện ngành bằng % toàn thị trường đạt Trend Template (null: dùng ngành) */
  waveBreadth: number | null;
}
/** Điều kiện Tích cực: có ngành từ 30% mã đạt Trend Template (sóng đang hình thành; ngưỡng 50% vào quá trễ). */
const WAVE_MIN_FOR_MARKET = 30;
export const MARKET_RULE: MarketRule = { gain: FTD_GAIN, vol: "prev", maxDay: 10, minBreadth: null, failFast: false, recover: "ma50", distDrop: DIST_DROP, distVol: "prev", distCaution: 6, cautionBelowMa50: true, needWave: true, waveMin: WAVE_MIN_FOR_MARKET, waveBreadth: null };

interface MarketDaily {
  dates: string[];
  lvl: number[];
  ret: number[];
  ma50: (number | null)[];
  liq: (number | null)[];
  state: MarketStateCode[];
  sigIdx: number[];
  base: MarketStateCode[];
  waveAt: number[];
  since: number;
  dist: number;
  why: string[];
}

function runMarket(st: State, rule: MarketRule, breadth?: (number | null)[]): MarketDaily | null {
  const waves = rule.needWave ? (rule.waveBreadth != null ? (breadth ?? []).map((b) => (b != null && b >= rule.waveBreadth! ? 1 : 0)) : wavesOf(st, rule.waveMin)) : undefined;
  const ew = st.ew ?? {};
  const dates = Object.keys(ew)
    .filter((d) => ew[d][1] >= EW_MIN_STOCKS)
    .sort();
  if (dates.length < 60) return null;
  const N = dates.length;
  const lvl: number[] = [];
  const vol: number[] = [];
  const ret: number[] = [];
  for (let i = 0; i < N; i++) {
    const e = ew[dates[i]];
    const r = e[0] / e[1];
    ret.push(i === 0 ? 0 : r);
    lvl.push(i === 0 ? 100 : lvl[i - 1] * (1 + r));
    vol.push(e[3] > 0 ? e[2] / e[3] : 0);
  }
  const ma50 = rollingMean(lvl, 50);
  const v20 = rollingMean(vol, 20), v50 = rollingMean(vol, 50), v250 = rollingMean(vol, 250);
  const liq = vol.map((_, i) => (v20[i] != null && v250[i] ? Math.round((v20[i]! / v250[i]!) * 1000) / 10 : null));
  const low50 = rollingExtreme(lvl, 50, false);
  const high50 = rollingExtreme(lvl, 50, true);
  // % thị trường đạt Trend Template của tuần trước ngày i (tránh nhìn trước)
  let wk = 0;
  const breadthPrev = (i: number) => {
    if (!breadth) return null;
    while (wk < st.weekEnds.length && st.weekEnds[wk] < dates[i]) wk++;
    return wk > 0 ? breadth[wk - 1] : null;
  };

  const state: MarketStateCode[] = [];
  const sigIdx: number[] = [];
  let s: MarketStateCode = 3;
  let since = 0;
  let rallyLow = lvl[0];
  let rallyStart = -1;
  let ftdLow = 0;
  let dist: number[] = [];
  // sau phiên xác nhận chỉ số thường còn dưới MA50: chỉ xét MA50 khi đã vượt lên MA50 ít nhất một lần
  let crossed = false;
  let viaRecover = false;
  const why: string[] = [];
  for (let i = 0; i < N; i++) {
    const up = i > 0 && vol[i] > vol[i - 1];
    const b = breadthPrev(i);
    dist = dist.filter((j) => i - j < 25 && lvl[i] < lvl[j] * 1.05);
    const distVolOk = rule.distVol === "prev" ? up : i > 0 && v50[i - 1] != null && vol[i] > v50[i - 1]!;
    if (i > 0 && ret[i] <= rule.distDrop && distVolOk) dist.push(i);
    let next: MarketStateCode = s;
    if (s === 3) {
      if (lvl[i] < rallyLow) {
        rallyLow = lvl[i];
        rallyStart = -1;
      } else if (rallyStart < 0 && ret[i] > 0) rallyStart = i;
      let day = rallyStart >= 0 ? i - rallyStart + 1 : 0;
      if (rule.maxDay != null && day > rule.maxDay) {
        // nhịp hồi quá dài không có phiên xác nhận: bỏ, chờ nhịp hồi mới từ đáy mới
        rallyLow = lvl[i];
        rallyStart = -1;
        day = 0;
      }
      const volOk = rule.vol === "prev" ? up : v50[i - 1] != null && vol[i] > v50[i - 1]!;
      if (
        day >= 4 &&
        (rule.maxDay == null || day <= rule.maxDay) &&
        ret[i] >= rule.gain &&
        volOk &&
        (rule.minBreadth == null || (b != null && b >= rule.minBreadth))
      ) {
        next = 1;
        dist = [];
        ftdLow = rallyLow;
        crossed = ma50[i] != null && lvl[i] >= ma50[i]!;
        viaRecover = false;
        sigIdx.push(i);
      } else if (rule.recover !== "none") {
        const m = ma50[i], m10 = i >= 10 ? ma50[i - 10] : null;
        if (m != null && m10 != null && lvl[i] > m && m > m10) {
          next = 2;
          crossed = true;
          viaRecover = rule.recover === "ma50high";
        }
      }
    } else {
      const prevLow = i > 0 ? low50[i - 1] : lvl[i];
      const m = ma50[i];
      if (m != null && lvl[i] >= m) crossed = true;
      const distHit = dist.length >= rule.distCaution && (!rule.cautionBelowMa50 || (m != null && lvl[i] < m));
      if (distHit || lvl[i] < prevLow || (rule.failFast && lvl[i] < ftdLow)) {
        why.push(distHit ? "d" : "l");
        next = 3;
        rallyLow = lvl[i];
        rallyStart = -1;
        viaRecover = false;
      } else if (dist.length >= 4 || (crossed && m != null && lvl[i] < m)) next = 2;
      else if (viaRecover && !(i > 0 && lvl[i] >= high50[i - 1])) next = 2;
      else {
        next = 1;
        viaRecover = false;
      }
    }
    if (next !== s) since = i;
    s = next;
    state.push(s);
  }
  // kết hợp sóng ngành: số ngành có sóng của tuần đã chốt gần nhất (phiên cuối tuần dùng chính tuần đó)
  const base = state.slice();
  const waveAt: number[] = new Array(N).fill(0);
  if (waves) {
    let w = 0;
    for (let i = 0; i < N; i++) {
      while (w < st.weekEnds.length && st.weekEnds[w] < dates[i]) w++;
      const k = w < st.weekEnds.length && st.weekEnds[w] === dates[i] ? w : w - 1;
      waveAt[i] = k >= 0 ? (waves[k] ?? 0) : 0;
      if (rule.needWave && state[i] === 1 && waveAt[i] === 0) state[i] = 2;
    }
    since = N - 1;
    while (since > 0 && state[since - 1] === state[N - 1]) since--;
  }
  return { dates, lvl, ret, ma50, liq, state, base, waveAt, sigIdx, since, dist: dist.length, why };
}

export function computeMarket(st: State, rule: MarketRule = MARKET_RULE, breadth?: (number | null)[]): MarketState {
  const empty: MarketState = { index: st.weekEnds.map(() => null), ma50: st.weekEnds.map(() => null), state: st.weekEnds.map(() => null), liq: st.weekEnds.map(() => null), signals: [], now: null, minStocks: EW_MIN_STOCKS };
  const md = runMarket(st, rule, breadth);
  if (!md) return empty;
  const { dates, lvl, ma50, liq, state, sigIdx, since } = md;
  const N = dates.length;

  // lấy mẫu theo tuần: phiên gần nhất không sau ngày cuối tuần
  const W = st.weekEnds.length;
  const out: MarketState = { ...empty, index: [], ma50: [], state: [], liq: [] };
  const wOf: number[] = new Array(N).fill(-1);
  let j = -1;
  for (let w = 0; w < W; w++) {
    while (j + 1 < N && dates[j + 1] <= st.weekEnds[w]) {
      j++;
      wOf[j] = w;
    }
    const ok = j >= 0 && dates[j] > (w > 0 ? st.weekEnds[w - 1] : "");
    const r1 = (x: number | null) => (x == null ? null : Math.round(x * 100) / 100);
    out.index.push(ok ? r1(lvl[j]) : null);
    out.ma50.push(ok ? r1(ma50[j]) : null);
    out.state.push(ok ? state[j] : null);
    out.liq.push(ok ? liq[j] : null);
  }
  const pct = (a: number, b: number) => Math.round((b / a - 1) * 1000) / 10;
  out.signals = sigIdx.map((i) => ({
    date: dates[i],
    w: wOf[i] >= 0 ? wOf[i] : W - 1,
    level: Math.round(lvl[i] * 100) / 100,
    after3m: i + 63 < N ? pct(lvl[i], lvl[i + 63]) : null,
    after6m: i + 126 < N ? pct(lvl[i], lvl[i + 126]) : null,
  }));
  const L = N - 1;
  out.now = { date: dates[L], state: state[L], base: md.base[L], waves: md.waveAt[L], since: dates[since], dist: md.dist, liq: liq[L], level: Math.round(lvl[L] * 100) / 100 };
  return out;
}

/** Một lượt: dựng/cập nhật trạng thái trong ngân sách thời gian. Trả về trạng thái mới. */
async function step(prev: State | null): Promise<State> {
  const t0 = Date.now();
  const deadline = t0 + BUDGET_MS;
  let st: State = prev ?? { version: 2, sessionDate: "", weekKeys: [], weekEnds: [], vnindex: { close: [], ma50: [], ma150: [], ma200: [], stage: [] }, symbols: {} };
  const idx = await buildIndex();
  if (idx.sessionDate !== st.sessionDate || idx.weekKeys.length !== st.weekKeys.length) {
    // lịch mới: giữ mã tuần cũ nếu lịch cũ là tiền tố của lịch mới
    const prefixOk = st.weekKeys.every((k, i) => idx.weekKeys[i] === k);
    st = prefixOk ? { ...st, ...idx } : { ...st, ...idx, symbols: {}, ew: {} };
  } else {
    // cùng lịch: vẫn cập nhật VN-Index (quy tắc giai đoạn có thể đã đổi)
    st = { ...st, stageRule: idx.stageRule, vnindex: idx.vnindex };
  }
  const W = st.weekKeys.length;
  const universe = STOCK_UNIVERSE.map((s) => s.symbol).filter((s) => SECTOR_OF[s]);
  // ưu tiên: mã chưa có lịch sử (cần MAX), rồi mã cần cập nhật tuần mới
  // mã chưa có lịch sử, hoặc chưa góp vào chỉ số cân bằng (trạng thái lưu từ bản cũ) → tải MAX
  const missing = universe.filter((s) => !st.symbols[s] || !st.symbols[s].aggUntil);
  const stale = universe.filter((s) => st.symbols[s]?.aggUntil && (st.symbols[s].len < W || st.symbols[s].codes.length < W));
  // tuần cuối có thể chưa trọn (thêm phiên mới trong tuần) → luôn tính lại tuần cuối của phiên mới
  const refreshLast = universe.filter(
    (s) => st.symbols[s]?.aggUntil && !stale.includes(s) && ((prev && prev.sessionDate !== st.sessionDate) || !st.symbols[s].tail),
  );

  await mapWithConcurrency(
    missing,
    12,
    async (s) => {
      try {
        const p = await closedHistory(s, "MAX");
        const old = st.symbols[s];
        // mã đã có từ bản cũ: chỉ bổ sung phần chỉ số cân bằng; chưa có: tính mã tuần
        const codes = old && old.len >= W ? old.codes : encodeWeeks(p, st.weekKeys, 0);
        const aggUntil = addAgg(st, p, undefined);
        st.symbols[s] = { codes, len: W, ...tailOf(p), aggUntil };
      } catch {
        // thử lại ở lượt sau
      }
    },
    deadline,
  );
  await mapWithConcurrency(
    [...stale, ...refreshLast],
    20,
    async (s) => {
      try {
        const cur = st.symbols[s];
        const from = Math.max(0, Math.min(cur.len, cur.codes.length) - 1);
        const gap = W - from;
        const p = await closedHistory(s, gap > 8 ? "5Y" : "1Y");
        const aggUntil = addAgg(st, p, cur.aggUntil);
        st.symbols[s] = { codes: cur.codes.slice(0, from) + encodeWeeks(p, st.weekKeys, from), len: W, ...tailOf(p), aggUntil };
      } catch {
        /* lượt sau */
      }
    },
    deadline,
  );
  return st;
}

/** Số ngành có sóng theo tuần (từ WAVE_THRESHOLD% mã đạt Trend Template, tối thiểu 3 mã có dữ liệu) */
function wavesOf(st: State, min: number = WAVE_THRESHOLD): number[] {
  const W = st.weekKeys.length;
  const out = new Array(W).fill(0);
  for (const syms of Object.values(WAVE_SECTORS)) {
    const pass = new Array(W).fill(0), tot = new Array(W).fill(0);
    for (const sym of syms) {
      const c = st.symbols[sym]?.codes;
      if (!c) continue;
      for (let w = 0; w < Math.min(W, c.length); w++) {
        const ch = c.charCodeAt(w) - 48;
        if (ch < 0 || ch > 3) continue;
        tot[w]++;
        if (ch & 1) pass[w]++;
      }
    }
    for (let w = 0; w < W; w++) if (tot[w] >= 3 && (pass[w] / tot[w]) * 100 >= min) out[w]++;
  }
  return out;
}

/** % toàn thị trường đạt Trend Template theo tuần */
function breadthOf(st: State): (number | null)[] {
  const W = st.weekKeys.length;
  const pass = new Array(W).fill(0), tot = new Array(W).fill(0);
  for (const x of Object.values(st.symbols)) {
    for (let w = 0; w < Math.min(W, x.codes.length); w++) {
      const ch = x.codes.charCodeAt(w) - 48;
      if (ch < 0 || ch > 3) continue;
      tot[w]++;
      if (ch & 1) pass[w]++;
    }
  }
  return pass.map((p, w) => (tot[w] >= 10 ? Math.round((p / tot[w]) * 1000) / 10 : null));
}

/** So sánh các cách lọc phiên xác nhận trên dữ liệu đã lưu (không tải thêm). */
export async function getMarketBacktest(variants: Record<string, Partial<MarketRule>>) {
  const st = await readState();
  if (!st) return null;
  const br = breadthOf(st);
  const out: Record<string, unknown> = {};
  for (const [name, v] of Object.entries(variants)) {
    const md = runMarket(st, { ...MARKET_RULE, ...v }, br);
    if (!md) continue;
    const { lvl, ret, state, sigIdx, dates } = md;
    const N = lvl.length;
    const f = (i: number, k: number) => (i + k < N ? Math.round((lvl[i + k] / lvl[i] - 1) * 1000) / 10 : null);
    // lợi suất chỉ số khi đang ở từng trạng thái (trạng thái hôm trước, lợi suất hôm sau: không nhìn trước)
    const g = [1, 1, 1, 1], days = [0, 0, 0, 0];
    for (let i = 1; i < N; i++) {
      g[state[i - 1]] *= 1 + ret[i];
      days[state[i - 1]]++;
    }
    out[name] = {
      sig: sigIdx.map((i) => `${dates[i]}:${f(i, 63) ?? "-"}/${f(i, 126) ?? "-"}`),
      days: days.slice(1),
      gain: g.slice(1).map((x) => Math.round((x - 1) * 1000) / 10),
      start: dates[0],
      // các đợt Thận trọng: số đợt, số đợt ngắn dưới 15 phiên, lý do (d: ngày phân phối, l: thủng đáy 50 phiên)
      caution: (() => {
        const runs: number[] = [];
        for (let i = 0; i < N; i++) if (state[i] === 3) (i > 0 && state[i - 1] === 3 ? runs[runs.length - 1]++ : runs.push(1));
        return { n: runs.length, short: runs.filter((x) => x < 15).length, d: md.why.filter((x) => x === "d").length, l: md.why.filter((x) => x === "l").length };
      })(),
    };
  }
  return out;
}

function summarize(st: State): SectorWavesResult {
  const W = st.weekKeys.length;
  const sectors = Object.keys(WAVE_SECTORS);
  const rows: SectorWaveRow[] = [];
  const allPass = new Array(W).fill(0);
  const allTot = new Array(W).fill(0);
  for (const sec of sectors) {
    const pass = new Array(W).fill(0), tot = new Array(W).fill(0), highs = new Array(W).fill(0);
    const leaders: string[] = [];
    for (const s of WAVE_SECTORS[sec]) {
      const c = st.symbols[s]?.codes;
      if (!c) continue;
      for (let w = 0; w < Math.min(W, c.length); w++) {
        const ch = c.charCodeAt(w) - 48;
        if (ch < 0 || ch > 3) continue;
        tot[w]++;
        if (ch & 1) pass[w]++;
        if (ch & 2) highs[w]++;
      }
      const lastCh = c.charCodeAt(W - 1) - 48;
      if (lastCh >= 0 && lastCh & 1) leaders.push(s);
    }
    for (let w = 0; w < W; w++) {
      allPass[w] += pass[w];
      allTot[w] += tot[w];
    }
    rows.push({
      sector: sec,
      n: tot[W - 1],
      pct: pass.map((p, w) => (tot[w] >= 3 ? Math.round((p / tot[w]) * 1000) / 10 : null)),
      highs,
      leaders,
    });
  }
  return {
    sessionDate: st.sessionDate,
    weeks: st.weekEnds,
    vnindex: st.vnindex,
    breadth: allPass.map((p, w) => (allTot[w] >= 10 ? Math.round((p / allTot[w]) * 1000) / 10 : null)),
    sectors: rows,
    threshold: WAVE_THRESHOLD,
    progress: { done: Object.values(st.symbols).filter((x) => x.aggUntil).length, total: Object.keys(SECTOR_OF).length },
    market: computeMarket(st, MARKET_RULE, breadthOf(st)),
  };
}

// ----------------------------------------------------------------- lưu trữ
const BLOB_PATHNAME = "sector-waves/state-v2.json";
const blobConfigured = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
let memState: State | null = null;

async function readState(): Promise<State | null> {
  if (!blobConfigured()) return memState;
  try {
    const meta = await head(BLOB_PATHNAME);
    const r = await fetch(`${meta.url}?t=${Date.now()}`, { cache: "no-store" });
    if (!r.ok) return memState;
    const s = (await r.json()) as State;
    return s.version === 2 ? s : memState;
  } catch {
    return memState;
  }
}

async function writeState(s: State): Promise<void> {
  memState = s;
  if (!blobConfigured()) return;
  await put(BLOB_PATHNAME, JSON.stringify(s), { access: "public", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true });
}

function upToDate(s: State, closed: string): boolean {
  const W = s.weekKeys.length;
  const total = Object.keys(SECTOR_OF).length;
  const syms = Object.values(s.symbols);
  return s.stageRule === STAGE_RULE && s.sessionDate >= closed && syms.length >= total && syms.every((x) => x.len >= W && x.tail && x.aggUntil);
}

/**
 * Trả về sóng ngành của phiên đã đóng gần nhất. Nếu lịch sử chưa dựng xong hoặc
 * chưa cập nhật phiên mới, chạy một lượt (≈20 giây) rồi trả về kết quả hiện có
 * kèm `progress`; client gọi lại cho tới khi done = total.
 */
export async function getSectorWaves(closed: string): Promise<SectorWavesResult> {
  const saved = await readState();
  if (saved && upToDate(saved, closed)) return summarize(saved);
  const next = await step(saved);
  await writeState(next).catch((e) => console.error("[sector-waves] không lưu được trạng thái:", e instanceof Error ? e.message : e));
  return summarize(next);
}

export function isComplete(r: SectorWavesResult): boolean {
  return r.progress.done >= r.progress.total;
}

// ----------------------------------------------------------------- trong phiên
export interface SectorWavesLive {
  asOf: string;
  /** true khi đã có giá của phiên đang giao dịch (khác phiên đã đóng) */
  intraday: boolean;
  breadth: number | null;
  sectors: { sector: string; n: number; pct: number | null; leaders: string[] }[];
}

/** Trend Template ở phiên hiện tại: chuỗi giá đóng cửa đã lưu + giá khớp hiện tại. */
function templateNow(closes: number[]): boolean | null {
  const n = closes.length;
  if (n < 221) return null;
  const mean = (k: number, end: number) => {
    let s = 0;
    for (let i = end - k + 1; i <= end; i++) s += closes[i];
    return s / k;
  };
  const x = closes[n - 1];
  const a = mean(50, n - 1), b = mean(150, n - 1), d = mean(200, n - 1), d20 = mean(200, n - 21);
  const w = closes.slice(-250);
  const hi = Math.max(...w), lo = Math.min(...w);
  return x > a && a > b && b > d && d > d20 && x >= 1.3 * lo && x >= 0.75 * hi;
}

let liveState: { at: number; st: State | null } = { at: 0, st: null };

export async function getSectorWavesLive(quotes: { symbol: string; price: number; time?: string }[], closed: string): Promise<SectorWavesLive> {
  if (!liveState.st || Date.now() - liveState.at > 10 * 60_000) liveState = { at: Date.now(), st: await readState() };
  const st = liveState.st;
  const price = new Map(quotes.filter((q) => Number.isFinite(q.price) && q.price > 0).map((q) => [q.symbol, q.price]));
  // Đang trong phiên khi phiên đã đóng gần nhất là ngày trước hôm nay (giờ VN) và có giá khớp.
  const today = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
  const intraday = closed < today && price.size > 0;
  const sectors = Object.entries(WAVE_SECTORS).map(([sector, syms]) => {
    let n = 0, pass = 0;
    const leaders: string[] = [];
    for (const s of syms) {
      const rec = st?.symbols[s];
      if (!rec?.tail || rec.tail.length < 221) continue;
      let closes = rec.tail;
      const p = price.get(s);
      if (intraday && p && rec.tailDate && rec.tailDate < today) {
        // quy giá khớp về cùng đơn vị với giá lịch sử (nghìn đồng hay đồng)
        const last = rec.tail[rec.tail.length - 1];
        const r = p / last;
        const px = r > 500 ? p / 1000 : r < 0.002 ? p * 1000 : p;
        closes = [...rec.tail.slice(1), px];
      }
      const t = templateNow(closes);
      if (t == null) continue;
      n++;
      if (t) {
        pass++;
        leaders.push(s);
      }
    }
    return { sector, n, pct: n >= 3 ? Math.round((pass / n) * 1000) / 10 : null, leaders };
  });
  const N = sectors.reduce((a, x) => a + x.n, 0);
  const P = sectors.reduce((a, x) => a + x.leaders.length, 0);
  return { asOf: new Date().toISOString(), intraday, breadth: N ? Math.round((P / N) * 1000) / 10 : null, sectors };
}
