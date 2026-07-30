import { fetchFinancialReport } from "../providers/financials.js";
import { getHistoryWithFallback } from "../providers/fallback.js";
import { latestBuySince } from "../signals/trendScanner.js";
import { extractKeyRatios } from "./ratios.js";
import { findProfitItem, latestPeriodMetric } from "./financials.js";
import type { DailyDigest, TrendAction } from "./marketDigest.js";

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

// One short "P/E X · ROE Y · LNST tăng/giảm Z% svck" line per symbol — a
// terse valuation + business-result read, not a full company profile.
// Any piece missing (ratios, or a matching profit line item) just drops
// out of the sentence rather than failing the whole blurb.
async function computeSymbolBlurb(symbol: string): Promise<string | null> {
  const [ratiosResult, kqkdResult] = await Promise.allSettled([
    fetchFinancialReport(symbol, "CSTC", "year"),
    fetchFinancialReport(symbol, "KQKD", "quarter"),
  ]);

  const bits: string[] = [];

  if (ratiosResult.status === "fulfilled") {
    const { pe, roe } = extractKeyRatios(ratiosResult.value);
    if (pe?.value != null) bits.push(`P/E ${pe.value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}x`);
    if (roe?.value != null) bits.push(`ROE ${roe.value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`);
  }

  if (kqkdResult.status === "fulfilled") {
    const profitItem = findProfitItem(kqkdResult.value);
    const metric = profitItem ? latestPeriodMetric(kqkdResult.value, profitItem) : null;
    if (metric) {
      const growth = metric.yoyGrowthPercent ?? metric.qoqGrowthPercent;
      if (growth !== null) {
        const dir = growth >= 0 ? "tăng" : "giảm";
        const vs = metric.yoyGrowthPercent !== null ? "svck" : "so quý trước";
        bits.push(`LNST ${metric.periodLabel} ${dir} ${Math.abs(growth).toFixed(1)}% ${vs}`);
      } else {
        bits.push(`LNST ${metric.periodLabel} ${metric.value.toLocaleString("vi-VN")}${metric.unit ? ` ${metric.unit}` : ""}`);
      }
    }
  }

  return bits.length > 0 ? bits.join(" · ") : null;
}

async function computeLiquidityCommentary(symbols: string[]): Promise<Record<string, string>> {
  const results = await Promise.allSettled(symbols.map(computeSymbolBlurb));
  const out: Record<string, string> = {};
  symbols.forEach((symbol, i) => {
    const r = results[i];
    if (r.status === "fulfilled" && r.value) out[symbol] = r.value;
  });
  return out;
}

/**
 * Adds the "my action" callout for the digest's primary symbol (price
 * history + trend-following rule) and a short valuation/earnings blurb for
 * each of the day's top-5 by-liquidity symbols (marketSnapshot.topTraded) —
 * no full per-company profile/ratio card, just a terse line per stock next
 * to the "Top thanh khoản" list. Degrades gracefully per-symbol: a source
 * being down for one stock just drops that stock's blurb, not the rest.
 */
export async function enrichDailyDigest(digest: DailyDigest): Promise<DailyDigest> {
  const symbol = digest.primarySymbol;
  const liquiditySymbols = digest.marketSnapshot.topTraded.slice(0, 5).map((s) => s.symbol);

  const [actionResult, commentaryResult] = await Promise.allSettled([
    symbol ? computeTrendAction(symbol) : Promise.resolve(null),
    computeLiquidityCommentary(liquiditySymbols),
  ]);

  const action = actionResult.status === "fulfilled" ? actionResult.value : null;
  const liquidityCommentary = commentaryResult.status === "fulfilled" ? commentaryResult.value : {};

  return { ...digest, action, liquidityCommentary };
}
