import { BANKS } from "../data/bankSector";
import { VALUATION } from "../data/bankValuation";
import { priceVnd } from "../hooks/useBankQuotes";
import type { Quote } from "../types";

// Danh sách theo dõi ngân hàng: 4 tiêu chí so với trung bình 16 ngân hàng.
//  1. Tăng trưởng tín dụng từ đầu năm cao hơn TB   (bank.xlsm, Q3/2026)
//  2. NIM cao hơn TB                               (bank.xlsm, Q3/2026)
//  3. ROE 4 quý cao hơn TB                         (SSI)
//  4. P/B thấp hơn TB, theo giá đang khớp          (giá / BVPS SSI)

export type CritKey = "credit" | "nim" | "roe" | "pb";
export const CRITERIA: { key: CritKey; label: string; short: string; better: "cao" | "thấp"; unit: string }[] = [
  { key: "credit", label: "Tăng trưởng tín dụng YTD", short: "Tín dụng", better: "cao", unit: "%" },
  { key: "nim", label: "NIM", short: "NIM", better: "cao", unit: "%" },
  { key: "roe", label: "ROE 4 quý", short: "ROE", better: "cao", unit: "%" },
  { key: "pb", label: "P/B", short: "P/B", better: "thấp", unit: "" },
];

export interface ScreenRow {
  bank: string;
  group: string;
  val: Record<CritKey, number>;
  pass: Record<CritKey, boolean>;
  score: number;
}
export interface Screen {
  avg: Record<CritKey, number>;
  rows: ScreenRow[];
  live: boolean;
}

export function bankScreen(quotes: Record<string, Quote> | null | undefined): Screen {
  const base = BANKS.flatMap((b) => {
    const v = VALUATION[b.bank];
    if (!v || b.v.credit == null || b.v.nim == null) return [];
    const price = priceVnd(quotes?.[b.bank]);
    return [{ bank: b.bank, group: b.group, val: { credit: b.v.credit, nim: b.v.nim, roe: v.roe, pb: price ? price / v.bvps : v.pbQ3 } }];
  });
  const mean = (k: CritKey) => base.reduce((a, r) => a + r.val[k], 0) / (base.length || 1);
  const avg = { credit: mean("credit"), nim: mean("nim"), roe: mean("roe"), pb: mean("pb") };
  const rows = base.map((r) => {
    const pass = {
      credit: r.val.credit > avg.credit,
      nim: r.val.nim > avg.nim,
      roe: r.val.roe > avg.roe,
      pb: r.val.pb < avg.pb,
    };
    return { ...r, pass, score: Object.values(pass).filter(Boolean).length };
  });
  // Đủ 4 tiêu chí trước, rồi theo mức P/B so với ROE (rẻ hơn so với khả năng sinh lời lên đầu).
  rows.sort((a, b) => b.score - a.score || a.val.pb / a.val.roe - b.val.pb / b.val.roe);
  return { avg, rows, live: Boolean(quotes && Object.keys(quotes).length) };
}
