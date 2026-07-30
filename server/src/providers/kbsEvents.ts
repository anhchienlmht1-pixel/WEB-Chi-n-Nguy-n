// KB Securities (KBS) corporate-events + insider-trading data — two
// endpoints confirmed live (URL + query params) against vnstock's KBS
// explorer (github.com/thinh-vu/vnstock, tag v4.0.4,
// vnstock/explorer/kbs/{company,const}.py — Company.events()/
// insider_trading(), _EVENT_TYPE), the same source kbsCompany.ts was
// verified against. Unlike the profile endpoint's Leaders/Shareholders/
// Subsidiaries arrays, vnstock's own wrapper does NOT map these two
// endpoints' field names to anything — it just camelCases whatever keys
// come back — meaning there's no verified field map to port here either.
// So this deliberately does NOT guess specific field names: each record
// is returned as-is (object of whatever keys KBS sends), and the caller
// renders it generically. If the real field names turn out to need
// nicer labels once live data is visible, that's a follow-up fix, not a
// blind guess baked in now.
const STOCK_INFO_BASE = "https://kbbuddywts.kbsec.com.vn/iis-server/investment/stockinfo";

const HEADERS = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
  Referer: "https://kbbuddywts.kbsec.com.vn/",
  Origin: "https://kbbuddywts.kbsec.com.vn",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
};

// Event type IDs — verified from vnstock's _EVENT_TYPE constant.
export const EVENT_TYPES: Record<number, string> = {
  1: "Đại hội cổ đông",
  2: "Trả cổ tức",
  3: "Phát hành",
  4: "Giao dịch cổ đông nội bộ",
  5: "Sự kiện khác",
};

async function fetchKbsJsonList(
  url: string,
  params: Record<string, string | number>,
  notFoundLabel: string
): Promise<Record<string, unknown>[]> {
  const query = new URLSearchParams(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])));
  const res = await fetch(`${url}?${query.toString()}`, { headers: HEADERS });
  const rawBody = await res.text();

  if (!res.ok) {
    throw Object.assign(
      new Error(`KBS trả lỗi ${res.status} khi lấy ${notFoundLabel}. Nội dung: ${rawBody.slice(0, 300)}`),
      { status: 502 }
    );
  }

  let data: unknown;
  try {
    data = JSON.parse(rawBody);
  } catch {
    throw Object.assign(new Error(`KBS trả về dữ liệu không phải JSON cho ${notFoundLabel}.`), { status: 502 });
  }

  // KBS returns either a bare array, or an object with the list under some
  // key (seen elsewhere in this codebase's other KBS endpoints) — try both
  // shapes rather than assuming one.
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === "object") {
    const values = Object.values(data as Record<string, unknown>);
    const arr = values.find((v) => Array.isArray(v));
    if (Array.isArray(arr)) return arr as Record<string, unknown>[];
  }
  return [];
}

export async function fetchKbsEvents(
  symbol: string,
  eventType?: number,
  page = 1,
  pageSize = 20
): Promise<Record<string, unknown>[]> {
  const upper = symbol.toUpperCase();
  const params: Record<string, string | number> = { l: 1, p: page, s: pageSize };
  if (eventType !== undefined) params.eID = eventType;
  return fetchKbsJsonList(`${STOCK_INFO_BASE}/event/${encodeURIComponent(upper)}`, params, `sự kiện của ${upper}`);
}

/** "Trả cổ tức" is event type 2 within the same events feed — no separate
 * dividend endpoint on KBS. */
export async function fetchKbsDividends(symbol: string, page = 1, pageSize = 20): Promise<Record<string, unknown>[]> {
  return fetchKbsEvents(symbol, 2, page, pageSize);
}

export async function fetchKbsInsiderTrading(
  symbol: string,
  page = 1,
  pageSize = 20
): Promise<Record<string, unknown>[]> {
  const upper = symbol.toUpperCase();
  return fetchKbsJsonList(
    `${STOCK_INFO_BASE}/news/internal-trading/${encodeURIComponent(upper)}`,
    { l: 1, p: page, s: pageSize },
    `giao dịch nội bộ của ${upper}`
  );
}
