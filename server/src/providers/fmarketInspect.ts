// Inspection tool để test Fmarket API endpoints
// Chạy: npm run dev, truy cập http://localhost:4000/api/debug/fmarket-inspect

const FMARKET_BASE = "https://api.fmarket.vn";
const FETCH_TIMEOUT_MS = 15_000;

async function fmFetch(url: string, init?: RequestInit): Promise<any> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        ...(init?.headers ?? {}),
      },
    });
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    throw Object.assign(
      new Error(
        timedOut
          ? `Fmarket phản hồi quá chậm (quá ${FETCH_TIMEOUT_MS / 1000}s)`
          : `Không kết nối được tới Fmarket: ${err instanceof Error ? err.message : String(err)}`
      ),
      { status: 502 }
    );
  }
  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(
      new Error(`Fmarket HTTP ${res.status}: ${text.slice(0, 200)}`),
      { status: res.status }
    );
  }
  return res.json();
}

function findInObject(obj: any, patterns: string[], path = ""): Map<string, string[]> {
  const results = new Map<string, string[]>();
  if (obj === null || typeof obj !== "object") return results;

  for (const [key, value] of Object.entries(obj)) {
    const newPath = path ? `${path}.${key}` : key;

    if (typeof value === "string") {
      for (const pattern of patterns) {
        if (value.toLowerCase().includes(pattern.toLowerCase())) {
          const current = results.get(pattern) || [];
          current.push(`${newPath}: ${value.slice(0, 100)}`);
          results.set(pattern, current);
        }
      }
    } else if (typeof value === "object" && value !== null && Object.keys(value).length < 100) {
      // Don't traverse deeply nested objects
      const nested = findInObject(value, patterns, newPath);
      for (const [pattern, matches] of nested) {
        const current = results.get(pattern) || [];
        current.push(...matches);
        results.set(pattern, current);
      }
    }
  }
  return results;
}

export async function inspectFmarketApi(): Promise<any> {
  const report: any = {
    timestamp: new Date().toISOString(),
    tests: {},
    summary: "",
  };

  try {
    // Test 1: Fetch fund list
    console.log("[Fmarket Inspect] Step 1: Fetching fund list...");
    const body = {
      types: ["NEW_FUND", "TRADING_FUND"],
      issuerIds: [] as number[],
      sortOrder: "DESC",
      sortField: "navTo12Months",
      page: 1,
      pageSize: 3,
      isIpo: false,
      fundAssetTypes: ["STOCK", "BALANCED"],
      bondRemainPeriods: [] as number[],
      searchField: "",
      isBuyByReward: false,
      thirdAppIds: [] as number[],
    };

    const listRes = await fmFetch(`${FMARKET_BASE}/res/products/filter`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    const funds = listRes?.data?.rows || [];
    report.tests.fundList = {
      status: funds.length > 0 ? "✅ OK" : "❌ No funds",
      count: funds.length,
      sampleFund: funds[0]
        ? {
            id: funds[0].id,
            name: funds[0].name,
            code: funds[0].code,
            nav12mChange: funds[0].productNavChange?.navTo12Months,
          }
        : null,
    };

    if (funds.length === 0) {
      report.summary = "Fund list is empty";
      return report;
    }

    const fund = funds[0];

    // Test 2: Fetch full product detail
    console.log(`[Fmarket Inspect] Step 2: Fetching product detail for ${fund.id}...`);
    const detailRes = await fmFetch(`${FMARKET_BASE}/res/products/${fund.id}`);

    const topLevelKeys = Object.keys(detailRes);
    const dataKeys = Object.keys(detailRes?.data || {});

    report.tests.productDetail = {
      status: "✅ OK",
      topLevelKeys: topLevelKeys.slice(0, 10),
      dataKeys: dataKeys.slice(0, 15),
    };

    // Test 3: Search for prospectus/document URLs
    console.log("[Fmarket Inspect] Step 3: Searching for prospectus/document URLs...");
    const searchPatterns = ["prospectus", "document", "pdf", "charter", "mandate"];
    const foundUrls = findInObject(detailRes, searchPatterns);

    const prospectusEndpoints = [];
    for (const endpoint of [
      `/res/products/${fund.id}/prospectus`,
      `/res/products/${fund.id}/documents`,
      `/res/funds/${fund.id}/prospectus`,
      `/res/funds/${fund.id}/documents`,
      `/documents/${fund.id}`,
    ]) {
      try {
        const res = await fmFetch(`${FMARKET_BASE}${endpoint}`);
        prospectusEndpoints.push({
          endpoint,
          status: "✅ OK",
          responseKeys: Object.keys(res).slice(0, 5),
        });
      } catch (err) {
        prospectusEndpoints.push({
          endpoint,
          status: "❌ Not found / Error",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    report.tests.prospectusSearch = {
      foundInDetail: foundUrls.size > 0 ? Object.fromEntries(foundUrls) : "None found",
      testEndpoints: prospectusEndpoints,
    };

    // Test 4: Check holdings structure
    console.log("[Fmarket Inspect] Step 4: Checking holdings...");
    const holdings =
      detailRes?.data?.productTopHoldingList ||
      detailRes?.data?.productTopHoldingListVN ||
      detailRes?.productTopHoldingList ||
      [];

    report.tests.holdings = {
      count: holdings.length,
      structure:
        holdings.length > 0
          ? Object.keys(holdings[0])
          : "No holdings",
      sample:
        holdings.length > 0
          ? {
              code: holdings[0]?.stockCode || holdings[0]?.code,
              weight: holdings[0]?.weight || holdings[0]?.netAssetPercent,
              logo: !!holdings[0]?.logoUrl || !!holdings[0]?.image,
            }
          : null,
    };

    report.summary = "✅ All tests completed. See 'tests' for details.";
  } catch (err) {
    report.error = err instanceof Error ? err.message : String(err);
    report.summary = `❌ Error: ${report.error}`;
  }

  return report;
}

// Export for use in routes
export default inspectFmarketApi;
