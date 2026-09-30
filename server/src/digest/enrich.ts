import { fetchFinancialReport } from "../providers/financials.js";
import { getCompanyProfileWithFallback } from "../providers/companyProfileFallback.js";
import { getHistoryWithFallback } from "../providers/fallback.js";
import { latestBuySince } from "../signals/trendScanner.js";
import { SECTOR_MAP } from "../data/sectorMap.js";
import { extractKeyRatios } from "./ratios.js";
import type { CompanySnapshot, DailyDigest, TrendAction } from "./marketDigest.js";

function vndMagnitude(value: number): string {
  if (value >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(2)} nghìn tỷ đ`;
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ đ`;
  return `${Math.round(value).toLocaleString("vi-VN")} đ`;
}

function ratioText(v: number | null, unit: string): string {
  if (v === null) return "—";
  return `${v.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}${unit === "%" ? "%" : ""}`;
}

// Same trend-following rule as the price chart's own Mua/Bán markers and
// the /trend-signals scan (SMA20 > SMA50, ADX(14) > 25, Supertrend(10,3)
// uptrend) — reused here for a single symbol via the exported pure
// function instead of re-running the full-universe scan.
async function computeTrendAction(symbol: string): Promise<TrendAction> {
  const { points } = await getHistoryWithFallback(symbol, "1Y");
  const signalDates = latestBuySince(points);
  const stance = signalDates ? "MUA" : "DUNG_NGOAI";
  const signalSince = signalDates?.buyDate || null;
  const reasoning = signalDates
    ? `Theo trend-following (SMA20 > SMA50, ADX(14) > 25, Supertrend tăng), ${symbol} đang trong tín hiệu Mua từ ${new Date(
        signalDates.buyDate
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
  const [financialsResult, profileResult] = await Promise.allSettled([
    fetchFinancialReport(symbol, "CSTC", "year"),
    getCompanyProfileWithFallback(symbol),
  ]);

  const valuation =
    financialsResult.status === "fulfilled"
      ? extractKeyRatios(financialsResult.value)
      : { pe: null, pb: null, roe: null };

  if (profileResult.status !== "fulfilled" && financialsResult.status !== "fulfilled") return null;

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
  }

  // The action itself is rendered as its own callout below the article
  // (see DailyDigest.tsx) rather than repeated again here as a paragraph.
  return { ...digest, company, action, paragraphs };
}
