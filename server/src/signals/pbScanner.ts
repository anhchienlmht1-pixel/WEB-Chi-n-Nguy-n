import { fetchVciReport } from "../providers/vciFinancials.js";

// Curated sector symbol lists, mirrored from the equivalent client-side
// sets (client/src/utils/bankData.ts BANK_SYMBOLS, securitiesData.ts
// SECURITIES_SYMBOLS) so the server can fan out over the same universe
// without importing client code. Real estate has no equivalent client list
// (its P/B chart previously read symbols straight off a Google Sheet's own
// header row) — this one is built from client/src/data/companyProfiles.ts's
// own "Bất động sản" / "Bất động sản khu công nghiệp" sector tags instead
// of guessed, so it's grounded in data already in this app rather than new.
export const BANK_SYMBOLS = [
  "VCB", "BID", "CTG", "TCB", "VPB", "MBB", "ACB", "LPB", "HDB", "STB",
  "VIB", "TPB", "EIB", "SHB", "MSB", "OCB", "SSB", "NAB", "BAB", "ABB",
  "PGB", "BVB", "VBB", "VAB", "NVB", "KLB", "SGB",
];

export const SECURITIES_SYMBOLS = [
  "SSI", "VND", "HCM", "VCI", "VIX", "MBS", "FTS", "SHS",
  "BSI", "DSE", "CTS", "VDS", "ORS", "VCK", "VPX", "TCX",
];

export const REAL_ESTATE_SYMBOLS = [
  "VIC", "VHM", "VRE", "NVL", "PDR", "DXG", "KDH", "NLG", "DIG", "KBC", "CEO", "BCM", "IDC",
];

export interface PbHistoryTable {
  symbols: string[];
  rows: { date: string; values: (number | null)[] }[];
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

// Period labels here are always "Qn YYYY" or "YYYY" (see vciFinancials.ts's
// ratioPeriodLabel) — parsed back into a sortable quarter-index rather than
// a real date, since these are fiscal periods, not calendar dates.
function periodSortKey(label: string): number {
  const m = /^Q(\d) (\d{4})$/.exec(label);
  if (m) return Number(m[2]) * 4 + Number(m[1]);
  const y = Number(label);
  return Number.isFinite(y) ? y * 4 : 0;
}

interface SymbolPb {
  symbol: string;
  periods: string[];
  values: (number | null)[];
}

// Replaces the earlier Google-Sheet-backed P/B history (a user-maintained
// daily series) with live P/B pulled from VCI's verified ratio endpoint
// (server/src/providers/vciFinancials.ts's CSTC report) for every symbol in
// the given sector, quarterly cadence instead of daily since that's the
// granularity the endpoint actually provides.
export async function scanPbComparison(symbols: string[]): Promise<PbHistoryTable> {
  const results = await mapWithConcurrency(symbols, 8, async (symbol): Promise<SymbolPb | null> => {
    try {
      const report = await fetchVciReport(symbol, "CSTC", "quarter");
      const pbItem = report.items.find((it) => it.id === "pb");
      if (!pbItem) return null;
      return { symbol, periods: report.periods, values: pbItem.values };
    } catch {
      // A single symbol's data being unavailable shouldn't fail the whole
      // sector comparison — it's simply excluded from the table.
      return null;
    }
  });

  const valid = results.filter((r): r is SymbolPb => r !== null);
  const symbolsOut = valid.map((r) => r.symbol);

  const allPeriods = new Set<string>();
  for (const r of valid) for (const p of r.periods) allPeriods.add(p);
  const sortedPeriods = [...allPeriods].sort((a, b) => periodSortKey(a) - periodSortKey(b));

  const rows = sortedPeriods.map((period) => ({
    date: period,
    values: valid.map((r) => {
      const idx = r.periods.indexOf(period);
      return idx >= 0 ? r.values[idx] : null;
    }),
  }));

  return { symbols: symbolsOut, rows };
}
