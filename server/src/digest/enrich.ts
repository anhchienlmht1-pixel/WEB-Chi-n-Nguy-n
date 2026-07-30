import { fetchFinancialReport } from "../providers/financials.js";
import { getCompanyProfileWithFallback } from "../providers/companyProfileFallback.js";
import { getHistoryWithFallback } from "../providers/fallback.js";
import { latestBuySince } from "../signals/trendScanner.js";
import { SECTOR_MAP } from "../data/sectorMap.js";
import { extractKeyRatios } from "./ratios.js";
import { findProfitItem, findRevenueItem, latestPeriodMetric } from "./financials.js";
import type { CompanySnapshot, DailyDigest, FundamentalMetric, TrendAction } from "./marketDigest.js";

function vndMagnitude(value: number): string {
  if (value >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(2)} nghìn tỷ đ`;
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ đ`;
  return `${Math.round(value).toLocaleString("vi-VN")} đ`;
}

function ratioText(v: number | null, unit: string): string {
  if (v === null) return "—";
  return `${v.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}${unit === "%" ? "%" : ""}`;
}

// "cùng kỳ" (YoY) is the standard apples-to-apples read for a quarterly
// figure — used whenever the same quarter last year is actually in the
// report; falls back to QoQ, then to just the raw figure with no growth
// framing if neither comparison period is available.
function growthPhrase(metric: FundamentalMetric | null, label: string): string | null {
  if (!metric) return null;
  const valueText = `${metric.value.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}${
    metric.unit ? ` ${metric.unit}` : ""
  }`;
  if (metric.yoyGrowthPercent !== null) {
    const dir = metric.yoyGrowthPercent >= 0 ? "tăng" : "giảm";
    return `${label} ${metric.periodLabel} đạt ${valueText}, ${dir} ${Math.abs(metric.yoyGrowthPercent).toFixed(
      1
    )}% so với cùng kỳ`;
  }
  if (metric.qoqGrowthPercent !== null) {
    const dir = metric.qoqGrowthPercent >= 0 ? "tăng" : "giảm";
    return `${label} ${metric.periodLabel} đạt ${valueText}, ${dir} ${Math.abs(metric.qoqGrowthPercent).toFixed(
      1
    )}% so với kỳ trước`;
  }
  return `${label} ${metric.periodLabel} đạt ${valueText}`;
}

// Same trend-following rule as the price chart's own Mua/Bán markers and
// the /trend-signals scan (SMA20 > SMA50, ADX(14) > 25, Supertrend(10,3)
// uptrend) — reused here for a single symbol via the exported pure
// function instead of re-running the full-universe scan.
async function computeTrendAction(symbol: string): Promise<TrendAction> {
  const { points } = await getHistoryWithFallback(symbol, "1Y");
  const signalSince = latestBuySince(points);
  const stance = signalSince ? "MUA" : "DUNG_NGOAI";
  const reasoning = signalSince
    ? `Theo trend-following (SMA20 > SMA50, ADX(14) > 25, Supertrend tăng), ${symbol} đang trong tín hiệu Mua từ ${new Date(
        signalSince
      ).toLocaleDateString("vi-VN")}. Tôi giữ vị thế theo xu hướng, chỉ thoát khi Supertrend đảo chiều giảm hoặc SMA20 cắt xuống dưới SMA50 — không dự đoán đỉnh, để hệ thống tự báo lúc xu hướng kết thúc.`
    : `Theo trend-following, ${symbol} chưa hội đủ điều kiện Mua (SMA20/SMA50/ADX(14)/Supertrend chưa đồng thuận tăng). Tôi đứng ngoài, chỉ giải ngân khi có tín hiệu xác nhận xu hướng tăng rõ ràng — không đoán đáy.`;

  return {
    symbol,
    stance,
    stanceLabel: stance === "MUA" ? "Mua / Giữ theo xu hướng" : "Đứng ngoài / Quan sát",
    signalSince,
    reasoning,
  };
}

async function computeCompanySnapshot(symbol: string, name: string, exchange: string): Promise<CompanySnapshot | null> {
  const [ratiosResult, kqkdResult, profileResult] = await Promise.allSettled([
    fetchFinancialReport(symbol, "CSTC", "year"),
    fetchFinancialReport(symbol, "KQKD", "quarter"),
    getCompanyProfileWithFallback(symbol),
  ]);

  const valuation =
    ratiosResult.status === "fulfilled" ? extractKeyRatios(ratiosResult.value) : { pe: null, pb: null, roe: null };

  let revenue: FundamentalMetric | null = null;
  let profit: FundamentalMetric | null = null;
  if (kqkdResult.status === "fulfilled") {
    const report = kqkdResult.value;
    const revenueItem = findRevenueItem(report);
    const profitItem = findProfitItem(report);
    revenue = revenueItem ? latestPeriodMetric(report, revenueItem) : null;
    profit = profitItem ? latestPeriodMetric(report, profitItem) : null;
  }

  if (
    ratiosResult.status !== "fulfilled" &&
    profileResult.status !== "fulfilled" &&
    kqkdResult.status !== "fulfilled"
  ) {
    return null;
  }

  const profile = profileResult.status === "fulfilled" ? profileResult.value : null;

  return {
    symbol,
    name,
    exchange: profile?.exchange ?? exchange,
    sector: SECTOR_MAP[symbol] ?? null,
    businessModel: profile?.businessModel ? profile.businessModel.slice(0, 320) : null,
    charterCapitalText: profile?.charterCapital ? vndMagnitude(profile.charterCapital) : null,
    listingDate: profile?.listingDate ?? null,
    valuation: {
      pe: valuation.pe?.value ?? null,
      pb: valuation.pb?.value ?? null,
      roe: valuation.roe?.value ?? null,
    },
    revenue,
    profit,
  };
}

/**
 * Adds the "about the company" + "my action" sections for the digest's
 * primary symbol — two extra async fetches (financials + company profile
 * for valuation/fundamentals, price history for the trend-following call)
 * beyond the synchronous topic-selection in marketDigest.ts. Degrades
 * gracefully: any of the three failing (e.g. a source being down) still
 * leaves the rest of the article intact, just without that section.
 */
export async function enrichDailyDigest(digest: DailyDigest): Promise<DailyDigest> {
  const symbol = digest.primarySymbol;
  if (!symbol) return digest;

  const ref = digest.relatedStocks.find((r) => r.symbol === symbol);
  const [companyResult, actionResult] = await Promise.allSettled([
    computeCompanySnapshot(symbol, ref?.name ?? symbol, ref?.exchange ?? ""),
    computeTrendAction(symbol),
  ]);

  const company = companyResult.status === "fulfilled" ? companyResult.value : null;
  const action = actionResult.status === "fulfilled" ? actionResult.value : null;

  const paragraphs = [...digest.paragraphs];

  if (company) {
    const val = company.valuation;
    const valuationBits: string[] = [];
    if (val.pe !== null) valuationBits.push(`P/E ${ratioText(val.pe, "")}`);
    if (val.pb !== null) valuationBits.push(`P/B ${ratioText(val.pb, "")}`);
    if (val.roe !== null) valuationBits.push(`ROE ${ratioText(val.roe, "%")}`);
    const valuationText = valuationBits.length > 0 ? valuationBits.join(", ") : "chưa có đủ dữ liệu định giá";

    paragraphs.push(
      `Về doanh nghiệp: ${symbol}${company.sector ? ` (ngành ${company.sector})` : ""}${
        company.businessModel ? ` — ${company.businessModel}` : ""
      }${company.charterCapitalText ? `. Vốn điều lệ ${company.charterCapitalText}` : ""}. Định giá hiện tại: ${valuationText}.`
    );

    const revenuePhrase = growthPhrase(company.revenue, "Doanh thu");
    const profitPhrase = growthPhrase(company.profit, "lợi nhuận sau thuế");
    if (revenuePhrase || profitPhrase) {
      paragraphs.push(`Kết quả kinh doanh: ${[revenuePhrase, profitPhrase].filter(Boolean).join("; ")}.`);
    }
  }

  // The action itself is rendered as its own callout below the article
  // (see DailyDigest.tsx) rather than repeated again here as a paragraph.
  return { ...digest, company, action, paragraphs };
}
