import { getHistoryWithFallback } from "../providers/fallback.js";
import { getVpsExchangeSymbols } from "../providers/vpsProvider.js";
import { HOSE_SNAPSHOT } from "../providers/hoseList.js";
import { dedupeSameDay, latestSma, mapWithConcurrency } from "./maScanner.js";

// Thống kê toàn sàn HOSE theo giá đóng cửa (job tính sẵn hằng ngày):
//  - % mã nằm trên MA20/50/200 (chỉ tính mã có đủ số phiên cho từng MA),
//  - số mã vượt đỉnh / thủng đáy 52 tuần ở phiên gần nhất,
//  - giá trị giao dịch từng phiên ≈ Σ(giá đóng cửa × khối lượng) của mọi mã, để so thanh khoản trong phiên với TB 20 phiên.
export interface HoseBreadth {
  sessionDate: string;
  symbols: number;
  ma: Record<"20" | "50" | "200", { above: number; total: number }>;
  high52: number;
  low52: number;
  /** giá trị giao dịch ước tính theo phiên (đồng), cũ → mới, tối đa 30 phiên */
  days: { date: string; value: number }[];
}

export async function buildHoseBreadth(): Promise<HoseBreadth> {
  let syms: string[] = [];
  try {
    syms = await getVpsExchangeSymbols("hose");
  } catch {
    syms = [];
  }
  if (syms.length <= 250) syms = HOSE_SNAPSHOT;

  const ma: HoseBreadth["ma"] = { "20": { above: 0, total: 0 }, "50": { above: 0, total: 0 }, "200": { above: 0, total: 0 } };
  let high52 = 0;
  let low52 = 0;
  let used = 0;
  let sessionDate = "";
  const byDay = new Map<string, number>();

  await mapWithConcurrency(syms, 10, async (sym) => {
    try {
      const pts = dedupeSameDay((await getHistoryWithFallback(sym, "1Y")).points);
      if (pts.length < 2) return;
      used++;
      const closes = pts.map((p) => p.close);
      const last = pts[pts.length - 1];
      const d = last.time.slice(0, 10);
      if (d > sessionDate) sessionDate = d;
      for (const p of [20, 50, 200] as const) {
        const m = latestSma(closes, p);
        if (m == null) continue;
        ma[p].total++;
        if (last.close > m) ma[p].above++;
      }
      const prev = pts.slice(-251, -1);
      if (prev.length >= 200) {
        // theo giá đóng cửa: đóng cửa cao/thấp nhất 52 tuần
        if (last.close > Math.max(...prev.map((p) => p.close))) high52++;
        if (last.close < Math.min(...prev.map((p) => p.close))) low52++;
      }
      // giá lịch sử theo nghìn đồng, khối lượng theo cổ phiếu
      for (const p of pts.slice(-30)) {
        const k = p.time.slice(0, 10);
        byDay.set(k, (byDay.get(k) ?? 0) + p.close * 1000 * p.volume);
      }
    } catch {
      // mã thiếu lịch sử: bỏ qua
    }
  });

  if (used < 200) throw new Error(`chỉ lấy được lịch sử ${used}/${syms.length} mã`);
  const days = [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-30)
    .map(([date, value]) => ({ date, value: Math.round(value) }));
  return { sessionDate, symbols: used, ma, high52, low52, days };
}
