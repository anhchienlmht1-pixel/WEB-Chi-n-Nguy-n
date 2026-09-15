// Fmarket (https://fmarket.vn) open-fund data — the same source shown in the
// "Fund Insight" panel. Fmarket's own website is driven by a public JSON API
// at api.fmarket.vn; we use two endpoints:
//   POST /res/products/filter  → the list of open funds (stock / balanced)
//   GET  /res/products/{id}     → one fund's detail, incl. its top holdings
// From those we aggregate, per stock, how many funds hold it and their
// average weight — "tiền lớn đang đứng ở đâu".
//
// NOTE: some sandboxed/CI networks block api.fmarket.vn (egress policy). The
// callers cache with staleOnError and the UI degrades to a retry, so a blip
// or a locked-down environment never hard-crashes the page.

const FMARKET_BASE = "https://api.fmarket.vn";
const FETCH_TIMEOUT_MS = 12_000;
const DETAIL_CONCURRENCY = 8;
// VN tickers are 3 uppercase letters/digits (HPG, STB, FPT, …).
const TICKER_RE = /^[A-Z0-9]{3}$/;

export interface FmarketFundHolding {
  stockCode: string;
  weight: number; // % of the fund's NAV
}

export interface FmarketFund {
  id: number;
  name: string;
  shortName: string;
  code: string;
  assetType: string; // "STOCK" | "BALANCED" | ...
  /** 12-month NAV growth (%), when Fmarket reports it. */
  nav12mChange: number | null;
  holdings: FmarketFundHolding[];
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
        // Fmarket rejects requests without a browser-ish UA.
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
          ? `Fmarket phản hồi quá chậm (quá ${FETCH_TIMEOUT_MS / 1000}s), đã huỷ yêu cầu.`
          : `Không kết nối được tới Fmarket: ${err instanceof Error ? err.message : String(err)}`
      ),
      { status: 502 }
    );
  }
  if (!res.ok) {
    throw Object.assign(new Error(`Fmarket trả về lỗi HTTP ${res.status}.`), { status: 502 });
  }
  return res.json();
}

function toNumber(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v.replace(/,/g, "")) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
}

// Fmarket's detail payload has shifted field names over time; read holdings
// defensively from whichever list is present and keep only real equities.
function extractHoldings(detail: any): FmarketFundHolding[] {
  const lists: any[] = [
    detail?.data?.productTopHoldingList,
    detail?.data?.productTopHoldingListVN,
    detail?.productTopHoldingList,
  ].filter(Array.isArray);
  const seen = new Map<string, number>();
  for (const list of lists) {
    for (const h of list) {
      const code = String(h?.stockCode ?? h?.code ?? "")
        .trim()
        .toUpperCase();
      if (!TICKER_RE.test(code)) continue;
      const type = String(h?.type ?? "STOCK").toUpperCase();
      if (type && type !== "STOCK") continue;
      const weight = toNumber(h?.netAssetPercent ?? h?.weight ?? h?.percent) ?? 0;
      // Keep the largest reported weight if the same code appears twice.
      if (!seen.has(code) || weight > (seen.get(code) as number)) seen.set(code, weight);
    }
    if (seen.size > 0) break;
  }
  return Array.from(seen, ([stockCode, weight]) => ({ stockCode, weight }));
}

async function fetchFundList(): Promise<{ id: number; name: string; shortName: string; code: string; assetType: string; nav12mChange: number | null }[]> {
  const body = {
    types: ["NEW_FUND", "TRADING_FUND"],
    issuerIds: [] as number[],
    sortOrder: "DESC",
    sortField: "navTo12Months",
    page: 1,
    pageSize: 100,
    isIpo: false,
    fundAssetTypes: ["STOCK", "BALANCED"],
    bondRemainPeriods: [] as number[],
    searchField: "",
    isBuyByReward: false,
    thirdAppIds: [] as number[],
  };
  const json = await fmFetch(`${FMARKET_BASE}/res/products/filter`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const rows: any[] = json?.data?.rows ?? json?.data ?? [];
  if (!Array.isArray(rows) || rows.length === 0) {
    throw Object.assign(new Error("Fmarket không trả về danh sách quỹ."), { status: 502 });
  }
  return rows
    .map((r) => ({
      id: Number(r?.id),
      name: String(r?.name ?? r?.shortName ?? "").trim(),
      shortName: String(r?.shortName ?? r?.code ?? "").trim(),
      code: String(r?.code ?? "").trim(),
      assetType: String(r?.dataFundAssetType?.code ?? r?.dataFundAssetType?.name ?? "STOCK").toUpperCase(),
      nav12mChange: toNumber(r?.productNavChange?.navTo12Months),
    }))
    .filter((f) => Number.isFinite(f.id));
}

// Lists the open funds plus each one's stock holdings. A single fund whose
// detail call fails is dropped rather than failing the whole aggregation.
export async function fetchOpenStockFunds(): Promise<FmarketFund[]> {
  const list = await fetchFundList();
  const funds = await mapWithConcurrency(list, DETAIL_CONCURRENCY, async (f): Promise<FmarketFund | null> => {
    try {
      const detail = await fmFetch(`${FMARKET_BASE}/res/products/${f.id}`);
      const holdings = extractHoldings(detail);
      if (holdings.length === 0) return null;
      return { ...f, holdings };
    } catch {
      return null;
    }
  });
  const usable = funds.filter((f): f is FmarketFund => f !== null);
  if (usable.length === 0) {
    throw Object.assign(new Error("Không đọc được danh mục nắm giữ từ Fmarket."), { status: 502 });
  }
  return usable;
}
