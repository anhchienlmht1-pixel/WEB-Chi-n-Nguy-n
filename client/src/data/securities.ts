import { useEffect, useState } from "react";

// Ngành chứng khoán: số liệu xuất từ file Excel tổng hợp báo cáo tài chính các
// CTCK (scripts/export_securities.py → client/public/data/securities/). Đơn vị:
// tiền là tỷ đồng; tỷ lệ là % (riêng đòn bẩy, margin/VCSH, tự doanh/VCSH là lần).
// ROA, ROE, lãi suất margin, chi phí vốn đã quy năm (số quý × 4).

export type SecGroup = "Cho vay margin" | "Tự doanh" | "Khác";
export const SEC_GROUPS: ("Tất cả" | SecGroup)[] = ["Tất cả", "Cho vay margin", "Tự doanh", "Khác"];
export type SecGroupFilter = (typeof SEC_GROUPS)[number];

export type SecMetric =
  | "roe"
  | "roa"
  | "pbtMargin"
  | "brokerMargin"
  | "brokerShare"
  | "takeRate"
  | "marginYield"
  | "fundingCost"
  | "spread"
  | "marginGrowth"
  | "marginToEq"
  | "propToEq"
  | "propProfitShare"
  | "leverage"
  | "revYoy"
  | "pbtYoy";

export interface SecRow {
  sym: string;
  group: SecGroup;
  v: Record<SecMetric, number | null>;
  /** cùng kỳ năm trước */
  p: Record<SecMetric, number | null>;
}

export interface SecScale {
  sym: string;
  tts: number | null;
  eq: number | null;
  charter: number | null;
  margin: number | null;
  loans: number | null;
  prop: number | null;
  borrow: number | null;
  rev: number | null;
  pbt: number | null;
  pat: number | null;
  pbtPrev: number | null;
  patPrev: number | null;
  revBroker: number | null;
  revLoan: number | null;
  propRev: number | null;
  marginPrev: number | null;
  ttsPrev: number | null;
}

export interface ShareRow {
  name: string;
  years: (number | null)[];
  quarters: (number | null)[];
}

export interface SecSector {
  period: string;
  periodPrev: string;
  rows: SecRow[];
  scale: SecScale[];
  share: { years: string[]; quarters: string[]; rows: ShareRow[]; total: { years: (number | null)[]; quarters: (number | null)[] } };
  capitalPlans: { sym: string; method: string; pct: number | null; shares: number | null; value: number | null; status: string | null }[];
}

export const SEC_SYMBOLS = new Set([
  "SSI", "VND", "HCM", "VCI", "VIX", "MBS", "FTS", "SHS", "BSI", "DSE", "CTS", "VDS", "ORS", "VCK", "VPX", "TCX", "LPS", "KAI",
]);

let cache: Promise<SecSector> | null = null;
export function loadSecSector(): Promise<SecSector> {
  cache ??= fetch("/data/securities/sector.json").then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))));
  cache.catch(() => (cache = null));
  return cache;
}

export function useSecSector() {
  const [data, setData] = useState<SecSector | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let off = false;
    loadSecSector()
      .then((d) => !off && setData(d))
      .catch(() => !off && setError(true));
    return () => {
      off = true;
    };
  }, []);
  return { data, error };
}

/** "Q3 2026" → "Q3/2026" */
export const qLabel = (q: string) => q.replace(" ", "/");

export interface SecPbStat {
  cur: number;
  curDate: string;
  avg: number;
  med: number;
  sd: number;
  min: number;
  minDate: string;
  max: number;
  maxDate: string;
  n: number;
  since: string;
  /** % số phiên có P/B thấp hơn hoặc bằng hiện tại */
  pct: number;
}
export interface SecValuation {
  dates: string[];
  series: Record<string, (number | null)[]>;
  stats: Record<string, SecPbStat>;
}

// P/B theo ngày (Google Sheet "Triển vọng đầu tư - Team Bull", sheet "Data P/B Chứng"),
// xuất bằng scripts/export_securities_pb.py.
let vcache: Promise<SecValuation> | null = null;
export function useSecValuation() {
  const [data, setData] = useState<SecValuation | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let off = false;
    vcache ??= fetch("/data/securities/valuation.json").then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))));
    vcache
      .then((d) => !off && setData(d))
      .catch(() => {
        vcache = null;
        if (!off) setError(true);
      });
    return () => {
      off = true;
    };
  }, []);
  return { data, error };
}

/** "2026-11-04" → "04/11/2026" */
export const dLabel = (d: string) => d.split("-").reverse().join("/");
