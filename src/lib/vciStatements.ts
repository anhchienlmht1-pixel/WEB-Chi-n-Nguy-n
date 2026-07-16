import "server-only";
import { StatementPoint } from "./types";
import { RawRow, extractPeriodLabel, extractRows, fetchVciJson, toNumber } from "./vciCommon";

// Same Vietcap research API as the ratio endpoint, different section —
// raw income-statement line items rather than computed ratios. Field
// codes here aren't confirmed (no public docs); these are the most
// plausible names given the ratio endpoint's own naming style, with a
// diagnostic error if none match so the real names can be read off the
// actual response instead of guessed again.
const STATEMENT_URL = (symbol: string) =>
  `https://iq.vietcap.com.vn/api/iq-insight-service/v1/company/${encodeURIComponent(symbol)}/financial-statement?section=INCOME_STATEMENT`;

const NET_INTEREST_INCOME_KEYS = [
  "netInterestIncome",
  "netInterestAndSimilarIncome",
  "interestAndSimilarIncome",
  "niiIncome",
];

const PROFIT_AFTER_TAX_KEYS = [
  "profitAfterTax",
  "netProfitAfterTax",
  "profitAfterTaxOfParentCompany",
  "attributableToParentCompany",
  "netProfit",
  "shareholderProfit",
];

function firstMatch(row: RawRow, keys: string[]): number | null {
  for (const key of keys) {
    const v = toNumber(row[key]);
    if (v !== null) return v;
  }
  return null;
}

export async function fetchVciIncomeStatement(symbol: string): Promise<StatementPoint[]> {
  const json = await fetchVciJson(STATEMENT_URL(symbol), symbol, "vci-income-statement");
  const rows = extractRows(json);

  if (rows.length === 0) {
    const preview = JSON.stringify(json).slice(0, 500);
    throw new Error(`Không đọc được báo cáo KQKD từ Vietcap cho ${symbol}. Raw: ${preview}`);
  }

  const points = rows
    .map((row) => {
      const periodInfo = extractPeriodLabel(row);
      if (!periodInfo) return null;
      return {
        period: periodInfo.period,
        periodType: periodInfo.periodType,
        sortKey: periodInfo.sortKey,
        netInterestIncome: firstMatch(row, NET_INTEREST_INCOME_KEYS),
        profitAfterTax: firstMatch(row, PROFIT_AFTER_TAX_KEYS),
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .sort((a, b) => a.sortKey - b.sortKey);

  const hasAny = points.some((p) => p.netInterestIncome !== null || p.profitAfterTax !== null);
  if (!hasAny) {
    const sampleKeys = Object.keys(rows[rows.length - 1]).slice(0, 50).join(", ");
    throw new Error(
      `Nhận được ${rows.length} kỳ báo cáo KQKD từ Vietcap cho ${symbol} nhưng không khớp field thu nhập lãi thuần/lợi nhuận. Field thực tế: ${sampleKeys}`
    );
  }

  return points.map(({ period, periodType, netInterestIncome, profitAfterTax }) => ({
    period,
    periodType,
    netInterestIncome,
    profitAfterTax,
  }));
}
