import { STOCK_UNIVERSE } from "../providers/universe.js";
import { getVpsExchangeSymbols, getVpsIndexRaw, getVpsRawStocks } from "../providers/vpsProvider.js";
import { getKbsBoardRaw, kbsListedSharesFrom, kbsSessionRow } from "../providers/kbsMarketProvider.js";
import { HOSE_SNAPSHOT } from "../providers/hoseList.js";
import { readPrecomputed } from "./precomputed.js";
import type { HoseBreadth } from "./hoseBreadth.js";
import { getHistoryWithFallback, getQuoteWithFallback } from "../providers/fallback.js";

// Thống kê phiên sàn HOSE cho trang Toàn cảnh thị trường:
//  - Tác động lên VN-Index của từng mã (ước tính theo vốn hóa niêm yết):
//    điểm_i = (giá_i − tham chiếu_i) × KLNY_i / D, với D = Σ(tham chiếu × KLNY) / VN-Index phiên trước.
//    VN-Index tính theo số cổ phiếu niêm yết; quỹ/ETF và mã thiếu số liệu bị bỏ nên là ước tính.
//  - Độ rộng (kèm số mã trần/sàn), thanh khoản so với trung bình 20 phiên, khối ngoại ròng toàn sàn.

export interface SessionStats {
  asOf: string;
  exchange: "HOSE";
  /** số mã dùng để tính / số mã của sàn */
  coverage: { used: number; listed: number; fullList: boolean; rows?: number; fromKbs?: number; shares?: number; listError?: string };
  index: { price: number; prev: number; change: number } | null;
  impact: { symbol: string; points: number; changePercent: number }[];
  impactSum: number | null;
  breadth: { up: number; down: number; flat: number; ceiling: number; floor: number };
  value: number | null;
  /** giá trị khớp lệnh (Σ khối lượng khớp × giá bình quân); thỏa thuận = value − matched */
  matched: number | null;
  /** khối lượng khớp phiên này so với TB 20 phiên trước (lấy từ lịch sử VN-Index), null nếu chưa có */
  vsAvg20: { today: number; avg20: number; pct: number; basis: "value" | "volume" } | null;
  foreign: { buy: number; sell: number; net: number };
}

let sharesCache: { at: number; map: Map<string, number> } | null = null;
let listCache: { at: number; syms: string[]; full: boolean; error?: string } | null = null;

async function hoseSymbols(): Promise<{ syms: string[]; full: boolean; error?: string }> {
  // danh sách đầy đủ giữ 6 giờ; danh sách dự phòng chỉ giữ 2 phút để sớm thử lại VPS
  if (listCache && Date.now() - listCache.at < (listCache.full ? 6 * 3600_000 : 120_000)) return listCache;
  let syms: string[] = [];
  let error: string | undefined;
  for (let attempt = 0; attempt < 2 && syms.length <= 250; attempt++) {
    try {
      syms = await getVpsExchangeSymbols("hose");
      if (syms.length <= 250) error = `VPS trả ${syms.length} mã`;
    } catch (e) {
      error = String((e as Error)?.message ?? e).slice(0, 160);
      syms = [];
    }
  }
  const full = syms.length > 250;
  if (full) error = undefined;
  else syms = HOSE_SNAPSHOT.length > 250 ? HOSE_SNAPSHOT : STOCK_UNIVERSE.filter((s) => s.exchange === "HOSE").map((s) => s.symbol);
  listCache = { at: Date.now(), syms, full, error };
  return listCache;
}

function listedShares(board: Map<string, any>): Map<string, number> {
  // số cổ phiếu niêm yết ít đổi: KBS lỗi thì dùng lại bản trong 12 giờ trước
  const map = kbsListedSharesFrom(board);
  if (map.size > 0) {
    if (sharesCache && Date.now() - sharesCache.at < 12 * 3600_000) for (const [k, v] of sharesCache.map) if (!map.has(k)) map.set(k, v);
    sharesCache = { at: Date.now(), map };
    return map;
  }
  return sharesCache?.map ?? map;
}

export async function getSessionStats(): Promise<SessionStats> {
  const [{ syms, full, error: listError }, vpsIdx] = await Promise.all([hoseSymbols(), getVpsIndexRaw("VNINDEX").catch(() => null)]);
  // VPS chậm thì lấy VN-Index từ nguồn khác (KBS…): đủ để tính tác động, thiếu độ rộng và giá trị
  const idx = vpsIdx ?? (await getQuoteWithFallback("VNINDEX").then((r) => r.quote).catch(() => null));
  const [vpsRows, board] = await Promise.all([getVpsRawStocks(syms), getKbsBoardRaw(syms)]);
  const shares = listedShares(board);
  // mã VPS không trả giá thì lấy giá từ bảng KBS (trần/sàn ước theo biên ±7% HOSE, trừ hao bước giá)
  const rows = [...vpsRows];
  const have = new Set(vpsRows.map((r) => r.symbol));
  let fromKbs = 0;
  for (const sym of syms) {
    if (have.has(sym)) continue;
    const k = board.has(sym) ? kbsSessionRow(board.get(sym)) : null;
    if (!k) continue;
    rows.push({ symbol: sym, ...k, ceiling: k.ref * 1.068, floor: k.ref * 0.932 });
    fromKbs++;
  }

  const breadth = { up: 0, down: 0, flat: 0, ceiling: 0, floor: 0 };
  let fb = 0, fs = 0, matched = 0;
  for (const r of rows) {
    matched += r.volume * (r.avg || r.last) * 1000;
    if (r.last > r.ref) breadth.up++;
    else if (r.last < r.ref) breadth.down++;
    else breadth.flat++;
    if (r.volume > 0 && r.ceiling && r.last >= r.ceiling) breadth.ceiling++;
    if (r.volume > 0 && r.floor && r.last <= r.floor) breadth.floor++;
    fb += r.foreignBuy * r.last * 1000;
    fs += r.foreignSell * r.last * 1000;
  }
  // độ rộng của chính sàn (VPS) đáng tin hơn khi danh sách mã không đầy đủ
  if (idx?.advances != null && idx.declines != null) {
    breadth.up = idx.advances;
    breadth.down = idx.declines;
    breadth.flat = idx.noChanges ?? breadth.flat;
  }

  let impact: SessionStats["impact"] = [];
  let impactSum: number | null = null;
  let used = 0;
  if (idx && idx.prevClose > 0) {
    let capPrev = 0;
    const withShares = rows.filter((r) => shares.has(r.symbol));
    for (const r of withShares) capPrev += r.ref * 1000 * shares.get(r.symbol)!;
    used = withShares.length;
    if (capPrev > 0) {
      const D = capPrev / idx.prevClose;
      impact = withShares
        .map((r) => ({
          symbol: r.symbol,
          points: Math.round((((r.last - r.ref) * 1000 * shares.get(r.symbol)!) / D) * 100) / 100,
          changePercent: Math.round(((r.last - r.ref) / r.ref) * 10000) / 100,
        }))
        .filter((x) => x.points !== 0);
      impactSum = Math.round(impact.reduce((a, x) => a + x.points, 0) * 100) / 100;
      impact.sort((a, b) => a.points - b.points);
    }
  }

  // thanh khoản so với TB20: ưu tiên theo GIÁ TRỊ (20 phiên trước hôm nay, từ job tính sẵn toàn sàn);
  // chưa có bản tính sẵn thì so theo khối lượng trong lịch sử VN-Index
  let vsAvg20: SessionStats["vsAvg20"] = null;
  const today = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
  const hb = await readPrecomputed<HoseBreadth>("hose-breadth").catch(() => null);
  const prevDays = (hb?.days ?? []).filter((d) => d.date < today).slice(-20);
  if (matched > 0 && prevDays.length >= 15) {
    const avg = prevDays.reduce((a, d) => a + d.value, 0) / prevDays.length;
    if (avg > 0) vsAvg20 = { today: matched, avg20: avg, pct: Math.round((matched / avg - 1) * 1000) / 10, basis: "value" };
  }
  if (!vsAvg20) {
    try {
      const h = await getHistoryWithFallback("VNINDEX", "3M");
      const pts = h.points;
      const last = pts[pts.length - 1];
      if (last && last.time.slice(0, 10) === today && pts.length > 21) {
        const prev = pts.slice(-21, -1);
        const avg = prev.reduce((a, p) => a + p.volume, 0) / prev.length;
        if (avg > 0) vsAvg20 = { today: last.volume, avg20: avg, pct: Math.round((last.volume / avg - 1) * 1000) / 10, basis: "volume" };
      }
    } catch {
      vsAvg20 = null;
    }
  }

  return {
    asOf: new Date().toISOString(),
    exchange: "HOSE",
    coverage: { used, listed: syms.length, fullList: full, rows: rows.length, fromKbs, shares: shares.size, ...(listError ? { listError } : {}) },
    index: idx ? { price: idx.price, prev: idx.prevClose, change: idx.change } : null,
    impact,
    impactSum,
    breadth,
    value: idx?.value ?? null,
    matched: matched > 0 ? Math.round(matched) : null,
    vsAvg20,
    foreign: { buy: Math.round(fb), sell: Math.round(fs), net: Math.round(fb - fs) },
  };
}
