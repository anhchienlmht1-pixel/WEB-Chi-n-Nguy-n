import { fetchFinancialReport } from "../providers/financials.js";
import { getHistoryWithFallback } from "../providers/fallback.js";
import { fetchNewsForSymbol } from "../news/cafefNews.js";
import { latestBuySince } from "../signals/trendScanner.js";
import { extractKeyRatios } from "./ratios.js";
import { findProfitItem, latestPeriodMetric } from "./financials.js";
import type { DailyDigest, NewsCitation, TrendAction } from "./marketDigest.js";

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

// Real news headlines mentioning the digest's primary symbol, so a claim
// like "thanh khoản đột biến" / "dẫn đầu đà tăng" is backed by an actual
// cited source (CafeF — see server/src/news/cafefNews.ts) instead of
// asserted with nothing behind it. Returns [] rather than guessing at a
// cause when nothing recent mentions the symbol.
async function computePrimaryNews(symbol: string): Promise<NewsCitation[]> {
  const { items } = await fetchNewsForSymbol(symbol, 5);
  return items.slice(0, 3).map((item) => ({
    title: item.title,
    link: item.link,
    source: item.source,
    pubDate: item.pubDate ?? null,
  }));
}

/**
 * Adds the "my action" callout for the digest's primary symbol (price
 * history + trend-following rule), a short valuation/earnings blurb for
 * each of the day's top-5 by-liquidity symbols (marketSnapshot.topTraded),
 * and — for whichever symbol the day's narrative is actually about
 * (primarySymbol, which may or may not be one of that top-5) — real cited
 * news headlines plus its own fundamentals blurb if it wasn't already
 * covered by the liquidity list. This is what backs up a claim like
 * "VCB thanh khoản đột biến" with an actual reason (a news event, or a
 * business-result number) instead of just the price/volume figures.
 * Degrades gracefully per-symbol/per-source: anything unavailable just
 * drops that piece rather than failing the whole digest.
 */
export async function enrichDailyDigest(digest: DailyDigest): Promise<DailyDigest> {
  const symbol = digest.primarySymbol;
  const liquiditySymbols = digest.marketSnapshot.topTraded.slice(0, 5).map((s) => s.symbol);
  const needsOwnBlurb = symbol !== null && !liquiditySymbols.includes(symbol);

  const [actionResult, commentaryResult, newsResult, primaryBlurbResult] = await Promise.allSettled([
    symbol ? computeTrendAction(symbol) : Promise.resolve(null),
    computeLiquidityCommentary(liquiditySymbols),
    symbol ? computePrimaryNews(symbol) : Promise.resolve([] as NewsCitation[]),
    needsOwnBlurb ? computeSymbolBlurb(symbol as string) : Promise.resolve(null),
  ]);

  const action = actionResult.status === "fulfilled" ? actionResult.value : null;
  const liquidityCommentary = commentaryResult.status === "fulfilled" ? commentaryResult.value : {};
  const newsCitations = newsResult.status === "fulfilled" ? newsResult.value : [];
  const primaryBlurb =
    (symbol && liquidityCommentary[symbol]) ||
    (primaryBlurbResult.status === "fulfilled" ? primaryBlurbResult.value : null);

  const extraParagraphs: string[] = [];
  if (symbol && primaryBlurb) {
    extraParagraphs.push(`Nhìn thêm yếu tố cơ bản, tôi thấy ${symbol} hiện ${primaryBlurb}.`);
  }
  if (symbol && newsCitations.length > 0) {
    const cited = newsCitations
      .slice(0, 2)
      .map((n) => `"${n.title}" (${n.source})`)
      .join("; ");
    extraParagraphs.push(
      `Về mặt tin tức, ${symbol} gần đây có ${cited} — nguồn đầy đủ ở cuối bài.`
    );
  }

  return {
    ...digest,
    action,
    liquidityCommentary,
    newsCitations,
    paragraphs: extraParagraphs.length > 0 ? [...digest.paragraphs, ...extraParagraphs] : digest.paragraphs,
  };
}
