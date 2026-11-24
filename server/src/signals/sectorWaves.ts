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
  symbols: Record<string, { codes: string; len: number; tail?: number[]; tailDate?: string }>;
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

/** Một lượt: dựng/cập nhật trạng thái trong ngân sách thời gian. Trả về trạng thái mới. */
async function step(prev: State | null): Promise<State> {
  const t0 = Date.now();
  const deadline = t0 + BUDGET_MS;
  let st: State = prev ?? { version: 2, sessionDate: "", weekKeys: [], weekEnds: [], vnindex: { close: [], ma50: [], ma150: [], ma200: [], stage: [] }, symbols: {} };
  const idx = await buildIndex();
  if (idx.sessionDate !== st.sessionDate || idx.weekKeys.length !== st.weekKeys.length) {
    // lịch mới: giữ mã tuần cũ nếu lịch cũ là tiền tố của lịch mới
    const prefixOk = st.weekKeys.every((k, i) => idx.weekKeys[i] === k);
    st = { ...st, ...idx, symbols: prefixOk ? st.symbols : {} };
  } else {
    // cùng lịch: vẫn cập nhật VN-Index (quy tắc giai đoạn có thể đã đổi)
    st = { ...st, stageRule: idx.stageRule, vnindex: idx.vnindex };
  }
  const W = st.weekKeys.length;
  const universe = STOCK_UNIVERSE.map((s) => s.symbol).filter((s) => SECTOR_OF[s]);
  // ưu tiên: mã chưa có lịch sử (cần MAX), rồi mã cần cập nhật tuần mới
  const missing = universe.filter((s) => !st.symbols[s]);
  const stale = universe.filter((s) => st.symbols[s] && (st.symbols[s].len < W || st.symbols[s].codes.length < W));
  // tuần cuối có thể chưa trọn (thêm phiên mới trong tuần) → luôn tính lại tuần cuối của phiên mới
  const refreshLast = universe.filter(
    (s) => st.symbols[s] && !stale.includes(s) && ((prev && prev.sessionDate !== st.sessionDate) || !st.symbols[s].tail),
  );

  await mapWithConcurrency(
    missing,
    12,
    async (s) => {
      try {
        const p = await closedHistory(s, "MAX");
        st.symbols[s] = { codes: encodeWeeks(p, st.weekKeys, 0), len: W, ...tailOf(p) };
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
        st.symbols[s] = { codes: cur.codes.slice(0, from) + encodeWeeks(p, st.weekKeys, from), len: W, ...tailOf(p) };
      } catch {
        /* lượt sau */
      }
    },
    deadline,
  );
  return st;
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
  const done = Object.keys(st.symbols).length;
  return {
    sessionDate: st.sessionDate,
    weeks: st.weekEnds,
    vnindex: st.vnindex,
    breadth: allPass.map((p, w) => (allTot[w] >= 10 ? Math.round((p / allTot[w]) * 1000) / 10 : null)),
    sectors: rows,
    threshold: WAVE_THRESHOLD,
    progress: { done, total: Object.keys(SECTOR_OF).length },
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
  return s.stageRule === STAGE_RULE && s.sessionDate >= closed && syms.length >= total && syms.every((x) => x.len >= W && x.tail);
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
