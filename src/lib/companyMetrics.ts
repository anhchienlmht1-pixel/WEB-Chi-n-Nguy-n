import "server-only";
import { fetchKbsReport } from "./kbs";
import { fetchCandles, daysAgo, nowSeconds } from "./vndirect";
import { FinancialLineItem, FinancialReport } from "./types";

const PE_MATCH = /p\/e/i;
const PB_MATCH = /p\/b/i;
const ROE_MATCH = /\broe\b/i;
const MARKET_CAP_MATCH = /vốn hóa/i;
const REVENUE_MATCH = /doanh thu thuần|doanh thu bán hàng|tổng doanh thu/i;
const REVENUE_EXCLUDE = /tài chính|khác/i;
const PROFIT_MATCH = /lợi nhuận sau thuế/i;
const PROFIT_EXCLUDE = /thiểu số|không kiểm soát|cổ đông/i;

const AVG_WINDOW = 20;

export interface RatioValue {
  value: number | null;
  unit: string;
}

function findItem(report: FinancialReport, pattern: RegExp, exclude?: RegExp): FinancialLineItem | null {
  const candidates = report.items.filter((it) => pattern.test(it.name) && !(exclude && exclude.test(it.name)));
  if (candidates.length === 0) return null;
  return candidates.reduce((best, it) =>
    it.levels < best.levels ? it : it.levels === best.levels && it.name.length < best.name.length ? it : best
  );
}

function latestOf(item: FinancialLineItem | null): RatioValue {
  if (!item) return { value: null, unit: "" };
  for (let i = item.values.length - 1; i >= 0; i--) {
    if (item.values[i] !== null) return { value: item.values[i], unit: item.unit };
  }
  return { value: null, unit: item.unit };
}

// Change between the two most recent *reported* quarters (not necessarily
// adjacent array slots — a report can have a null value mid-series).
function qoqChangePercent(item: FinancialLineItem | null): number | null {
  if (!item) return null;
  const defined = item.values
    .map((v, i) => ({ v, i }))
    .filter((p): p is { v: number; i: number } => p.v !== null);
  if (defined.length < 2) return null;
  const last = defined[defined.length - 1].v;
  const prev = defined[defined.length - 2].v;
  if (prev === 0) return null;
  return ((last - prev) / Math.abs(prev)) * 100;
}

export interface CompanyMetrics {
  marketCap: RatioValue;
  pe: RatioValue;
  pb: RatioValue;
  roe: RatioValue;
  avgTradingValue20d: number | null;
  relativeVolumePercent: number | null;
  revenueQoqChangePercent: number | null;
  profitQoqChangePercent: number | null;
}

/**
 * marketCap/pe/pb/roe come from whatever rows KBS's "Nhóm chỉ số" ratio
 * section actually returns for the symbol — matched by name pattern, not
 * guaranteed to exist (e.g. some symbols may not carry a "Vốn hóa" row),
 * so any of these can legitimately come back null rather than a guessed
 * number. avgTradingValue20d/relativeVolumePercent/QoQ growth are computed
 * here from real VNDirect daily candles / KBS income-statement rows.
 */
export async function fetchCompanyMetrics(symbol: string): Promise<CompanyMetrics> {
  const [ratioReport, kqkdReport, candles] = await Promise.all([
    fetchKbsReport(symbol, "CSTC", "quarter", 8).catch(() => null),
    fetchKbsReport(symbol, "KQKD", "quarter", 8).catch(() => null),
    fetchCandles(symbol, "D", daysAgo(60), nowSeconds()).catch(() => []),
  ]);

  const marketCap = ratioReport ? latestOf(findItem(ratioReport, MARKET_CAP_MATCH)) : { value: null, unit: "" };
  const pe = ratioReport ? latestOf(findItem(ratioReport, PE_MATCH)) : { value: null, unit: "" };
  const pb = ratioReport ? latestOf(findItem(ratioReport, PB_MATCH)) : { value: null, unit: "" };
  const roe = ratioReport ? latestOf(findItem(ratioReport, ROE_MATCH)) : { value: null, unit: "" };

  const revenueQoqChangePercent = kqkdReport
    ? qoqChangePercent(findItem(kqkdReport, REVENUE_MATCH, REVENUE_EXCLUDE))
    : null;
  const profitQoqChangePercent = kqkdReport
    ? qoqChangePercent(findItem(kqkdReport, PROFIT_MATCH, PROFIT_EXCLUDE))
    : null;

  const last20 = candles.slice(-AVG_WINDOW);
  const avgTradingValue20d =
    last20.length > 0 ? last20.reduce((sum, c) => sum + c.close * c.volume, 0) / last20.length : null;

  const priorSessions = candles.slice(-(AVG_WINDOW + 1), -1);
  const avgVolumePrior =
    priorSessions.length > 0 ? priorSessions.reduce((sum, c) => sum + c.volume, 0) / priorSessions.length : null;
  const latestVolume = candles.length > 0 ? candles[candles.length - 1].volume : null;
  const relativeVolumePercent =
    avgVolumePrior && avgVolumePrior > 0 && latestVolume !== null
      ? ((latestVolume - avgVolumePrior) / avgVolumePrior) * 100
      : null;

  return {
    marketCap,
    pe,
    pb,
    roe,
    avgTradingValue20d,
    relativeVolumePercent,
    revenueQoqChangePercent,
    profitQoqChangePercent,
  };
}
