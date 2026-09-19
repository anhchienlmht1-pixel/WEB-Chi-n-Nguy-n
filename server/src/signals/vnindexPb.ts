import { getFullMarketQuotes } from "../providers/vnstockProvider.js";
import { fetchFinancialReport } from "../providers/financials.js";
import { STOCK_UNIVERSE } from "../providers/universe.js";

// VN30 members (30 largest companies on HOSE)
const VN30_SYMBOLS = [
  "ACB", "BID", "BVH", "CTG", "GAS", "GVR", "HPG", "HVN", "MBB", "MSN",
  "MWG", "PNJ", "POW", "SAB", "SHB", "STB", "TCB", "TPB", "VCB", "VHM",
  "VIB", "VIC", "VIN", "VJC", "VNM", "VPB", "VRE", "VSH", "VTE", "VTO",
];

export interface VnindexPbData {
  asOf: string;
  vn30Members: number;
  totalMarketCap: number; // in billions VND
  totalBookValue: number; // in billions VND
  pbRatio: number | null;
  pbByYear: Array<{
    year: number;
    bookValuePerShare: number | null;
    marketCapPerShare: number | null;
    pb: number | null;
  }>;
  memberPbs: Array<{
    symbol: string;
    price: number | null;
    marketCap: number | null;
    bookValue: number | null;
    pb: number | null;
  }>;
}

function toNumber(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(/,/g, "")) : NaN;
  return Number.isFinite(n) ? n : null;
}

export async function buildVnindexPb(): Promise<VnindexPbData> {
  const result: VnindexPbData = {
    asOf: new Date().toISOString(),
    vn30Members: VN30_SYMBOLS.length,
    totalMarketCap: 0,
    totalBookValue: 0,
    pbRatio: null,
    pbByYear: [],
    memberPbs: [],
  };

  try {
    // Fetch current quotes for all VN30 members
    const quotes = await getFullMarketQuotes("ALL");
    const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));

    // Fetch financial data for each VN30 member
    for (const symbol of VN30_SYMBOLS) {
      const quote = quoteMap.get(symbol);
      if (!quote) {
        result.memberPbs.push({
          symbol,
          price: null,
          marketCap: null,
          bookValue: null,
          pb: null,
        });
        continue;
      }

      let bookValue: number | null = null;
      let pb: number | null = null;

      try {
        // Fetch latest financial report (năm gần nhất)
        const financial = await fetchFinancialReport(symbol, "balance_sheet", "annual");

        // Book value = Total equity / Outstanding shares
        const totalEquity = toNumber(financial?.data?.[0]?.totalEquity || financial?.data?.[0]?.equity);
        const outstandingShares = toNumber(financial?.data?.[0]?.outstandingShares);

        if (totalEquity && outstandingShares && outstandingShares > 0) {
          bookValue = totalEquity / outstandingShares;
          if (quote.price && bookValue > 0) {
            pb = quote.price / bookValue;
          }
        }

        result.totalBookValue += totalEquity || 0;
      } catch {
        // Silent fail — financial data may not be available
      }

      const marketCap = quote.marketCap || quote.price * 1_000_000; // Estimate if not provided
      result.totalMarketCap += marketCap || 0;

      result.memberPbs.push({
        symbol,
        price: quote.price,
        marketCap,
        bookValue,
        pb,
      });
    }

    // Calculate overall VN30 P/B
    if (result.totalBookValue > 0) {
      result.pbRatio = result.totalMarketCap / result.totalBookValue;
    }

    // Fill in P/B by year (if available)
    // TODO: Implement year-over-year P/B tracking
    // This would require historical financials
  } catch (err) {
    console.error("[vnindexPb] Error building VN30 P/B:", err);
  }

  return result;
}
