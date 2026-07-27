import { fetchFinancialReport } from "../providers/financials.js";
import type { FinancialLineItem, FinancialReport } from "../providers/kbsFinancials.js";
import { findSeed } from "../providers/universe.js";
import { industryOf, symbolsInIndustry } from "../data/icbIndustries.js";

// Same substring-match approach as client/src/utils/ratios.ts's ROE_MATCH —
// KBS/VNDirect/VCI/CafeF reports don't expose stable row IDs for ratios, but
// "ROE" is kept as a literal abbreviation even inside Vietnamese labels.
const ROE_MATCH = (name: string) => name.includes("roe");

function findLatestRoe(report: FinancialReport): number | null {
  const lastIdx = report.periods.length - 1;
  if (lastIdx < 0) return null;
  const item: FinancialLineItem | undefined = report.items.find(
    (it) => ROE_MATCH((it.name || "").toLowerCase()) || ROE_MATCH((it.nameEn || "").toLowerCase())
  );
  if (!item) return null;
  const v = item.values[lastIdx];
  return v != null && Number.isFinite(v) ? v : null;
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export interface IndustryRankingPeer {
  symbol: string;
  name: string;
  roe: number | null;
}

export interface IndustryRanking {
  symbol: string;
  industry: string;
  rank: number | null; // 1-based rank by ROE desc among peers with known ROE; null if this symbol's own ROE is unavailable
  rankedCount: number; // how many peers (including this symbol) had a usable ROE
  peers: IndustryRankingPeer[]; // sorted by ROE desc (nulls last)
}

// Ranks a symbol against its ICB-industry peers (see data/icbIndustries.ts)
// by latest annual ROE. This is a simple, transparent single-metric ranking
// — not a reconstruction of FiinTrade's proprietary Value/Growth/Momentum
// scoring, which isn't disclosed anywhere this app can source it from.
// Peer coverage is limited to STOCK_UNIVERSE (the symbols this app actually
// has live price/financials for), which is a small subset of each ICB
// industry's real full membership — the UI must not claim "rank X of the
// whole industry", only "rank X among the N peers we have data for".
export async function rankIndustry(symbol: string): Promise<IndustryRanking | null> {
  const upper = symbol.toUpperCase();
  const industry = industryOf(upper);
  if (!industry) return null;

  const peerSymbols = symbolsInIndustry(industry);
  if (peerSymbols.length < 2) return null;

  const peers = await mapWithConcurrency(peerSymbols, 8, async (peerSymbol): Promise<IndustryRankingPeer> => {
    const seed = findSeed(peerSymbol);
    const name = seed?.name ?? peerSymbol;
    try {
      const report = await fetchFinancialReport(peerSymbol, "CSTC", "year");
      return { symbol: peerSymbol, name, roe: findLatestRoe(report) };
    } catch {
      return { symbol: peerSymbol, name, roe: null };
    }
  });

  const ranked = peers.filter((p) => p.roe != null).sort((a, b) => (b.roe as number) - (a.roe as number));
  const unranked = peers.filter((p) => p.roe == null);
  const sortedPeers = [...ranked, ...unranked];

  const rankIdx = ranked.findIndex((p) => p.symbol === upper);
  return {
    symbol: upper,
    industry,
    rank: rankIdx === -1 ? null : rankIdx + 1,
    rankedCount: ranked.length,
    peers: sortedPeers,
  };
}
