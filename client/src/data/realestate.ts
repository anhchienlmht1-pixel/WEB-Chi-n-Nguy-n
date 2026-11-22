import { useEffect, useState } from "react";

// Ngành bất động sản: số liệu xuất nguyên từ file Excel tổng hợp (scripts/export_realestate.py
// → client/public/data/realestate/). Tiền: tỷ đồng. Tỷ lệ: số thập phân (0,25 = 25%).

export const RE_SYMBOLS = new Set(["VHM", "NVL", "KDH", "NLG", "DXG", "PDR", "DIG", "TCH", "CEO", "HDC", "HDG", "IDJ", "NTL"]);

export type ReCrit = "debt" | "recv" | "cash" | "land";
export type ReLongKey = "prepaid" | "inventory" | "debtToEq" | "recvToAssets" | "cashToAssets" | "invToAssets";
type N = number | null;

export interface ReRow {
  sym: string;
  /** 1 = đạt, -1 = không đạt (theo file) */
  flags: Partial<Record<ReCrit, 1 | -1>>;
  score: number | null;
  v: {
    prepaid: N;
    prepaidPrev: N;
    prepaidQoq: N;
    inventory: N;
    inventoryPrev: N;
    debtToEq: N;
    recvToAssets: N;
    cashToAssets: N;
    invToAssets: N;
    cashToStLiab: N;
    liabToAssets: N;
    revenue: N;
    revenuePrev: N;
    grossProfit: N;
    netProfit: N;
    netProfitPrev: N;
    equity: N;
    cash: N;
    stDebt: N;
    ltDebt: N;
  };
}

export interface ReProject {
  sym: string;
  name: string;
  location: string;
  launch: string;
  handover: string;
  progress: string;
}

export interface ReSector {
  period: string;
  periodPrev: string;
  quarters: string[];
  shortQuarters: string[];
  rows: ReRow[];
  criteria: Record<ReCrit, string>;
  projects: ReProject[];
  series: Record<string, Partial<Record<ReLongKey, N[]>>>;
}

export interface ReDetail {
  symbol: string;
  quarters: string[];
  series: Partial<Record<ReLongKey, N[]>>;
  shortQuarters: string[];
  short: Record<string, N[]>;
  inventoryByProject: { title: string; quarters: string[]; items: { name: string; values: N[] }[] }[];
  projectList: Record<string, string>[];
  handover: ReProject[];
  flags: Partial<Record<ReCrit, 1 | -1>>;
}

let cache: Promise<ReSector> | null = null;
export function loadReSector() {
  cache ??= fetch("/data/realestate/sector.json").then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))));
  cache.catch(() => (cache = null));
  return cache;
}
export function useReSector() {
  const [data, setData] = useState<ReSector | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let off = false;
    loadReSector()
      .then((d) => !off && setData(d))
      .catch(() => !off && setError(true));
    return () => {
      off = true;
    };
  }, []);
  return { data, error };
}

export const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : null;
};

export const CRIT_LABEL: Record<ReCrit, { short: string; metric: ReLongKey; rule: string; what: string }> = {
  debt: { short: "Nợ vay/VCSH", metric: "debtToEq", rule: "< 50%", what: "Tổng nợ vay trên vốn chủ sở hữu. Dưới 50% là đòn bẩy an toàn." },
  recv: { short: "Phải thu/TTS", metric: "recvToAssets", rule: "< 25%", what: "Phải thu ngắn + dài hạn trên tổng tài sản. Cao là tiền bị khách hàng, đối tác chiếm dụng nhiều." },
  cash: { short: "Tiền + ĐTNH/TTS", metric: "cashToAssets", rule: "> 10%", what: "Tiền và đầu tư ngắn hạn trên tổng tài sản. Dưới 10% là thiếu tiền; quá 30% là dùng vốn chưa hiệu quả." },
  land: { short: "Tồn kho/TTS", metric: "invToAssets", rule: "lớn hơn ngành", what: "Hàng tồn kho (chủ yếu quỹ đất, dự án dở dang) trên tổng tài sản, đại diện quy mô quỹ đất so với ngành." },
};

/** "Q3 2026" → "Q3/2026" */
export const reQ = (q: string) => q.replace(" ", "/");
