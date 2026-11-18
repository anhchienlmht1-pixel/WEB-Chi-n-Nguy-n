import type { Quote } from "./types.js";
import { fetchWithTimeout } from "./http.js";

// SSI FastConnect Data (official SSI market-data API).
// Docs: https://guide.ssi.com.vn/ssi-products/fastconnect-data
//
// Turned on when SSI_API_KEY + SSI_API_SECRET (v3) or SSI_CONSUMER_ID +
// SSI_CONSUMER_SECRET (older v2) are set in
// the environment (Vercel → Settings → Environment Variables). Without them
// every function here returns null and the site keeps using KBS as before.
//
// Used for index quotes: level, change, matched value and market breadth
// (advances / no change / declines / ceilings / floors), plus VN100 which the
// KBS feed doesn't carry. Field names in SSI's docs are inconsistent between
// the tables and the samples (e.g. "Totalmatchval" vs "TotalMatchVal"), so
// fields are looked up case-insensitively.

const BASE = process.env.SSI_FC_DATA_URL || "https://fc-data.ssi.com.vn/api/v2/Market";

// FastConnect v3 (SSI Developer Portal): only API Key + API Secret are needed
// for market data, and no OTP. Takes priority over the older v2 keys below.
function v3Configured(): boolean {
  return Boolean(process.env.SSI_API_KEY && process.env.SSI_API_SECRET);
}
function v2Configured(): boolean {
  return Boolean(process.env.SSI_CONSUMER_ID && process.env.SSI_CONSUMER_SECRET);
}
export function ssiConfigured(): boolean {
  return v3Configured() || v2Configured();
}

// Last outcome, for the /api/ssi/status check (never includes the keys).
export const ssiStatus: { api?: "v3" | "v2"; lastOk?: string; lastError?: string; lastErrorAt?: string } = {};

// --- v3: official SDK, market data only (never Trading / Stream: those place orders or need OTP) ---
let v3Data: Promise<any> | null = null;
async function v3Client(): Promise<any> {
  if (!v3Data) {
    v3Data = (async () => {
      const { Auth, Data } = await import("@ssi.developer/ssi-sdk");
      const auth = new Auth({
        apiKey: process.env.SSI_API_KEY!,
        apiSecret: process.env.SSI_API_SECRET!,
        ...(process.env.SSI_CLIENT_ID ? { clientId: process.env.SSI_CLIENT_ID } : {}),
        timeoutMs: 8000,
        maxRetries: 1,
      });
      await auth.authenticate(); // market data: no OTP
      return { auth, data: new Data(auth) };
    })().catch((e) => {
      v3Data = null;
      throw e;
    });
  }
  return v3Data;
}

async function v3IndexQuote(symbol: string): Promise<Quote | null> {
  const c = await v3Client();
  // Refresh / re-login when the token has run out.
  try {
    if (c.auth.tokenManager?.isTokenExpired?.()) await c.auth.ensureAuthenticated().catch(() => c.auth.authenticate());
  } catch {
    v3Data = null;
    return v3IndexQuote(symbol);
  }
  const s = await c.data.marketData.getIndexSummary(symbol.toUpperCase());
  const price = Number(s?.indexValue);
  if (!s || !(price > 0)) return null;
  const change = Number(s.indexChange) || 0;
  const prevClose = price - change;
  return {
    symbol: symbol.toUpperCase(),
    name: symbol.toUpperCase(),
    exchange: "Chỉ số",
    currency: "điểm",
    price,
    change,
    changePercent: Number.isFinite(Number(s.indexChangePercent)) ? Number(s.indexChangePercent) : prevClose ? (change / prevClose) * 100 : 0,
    open: prevClose,
    high: price,
    low: price,
    prevClose,
    volume: Number(s.totalMatch) || Number(s.totalTrade) || 0,
    value: Number(s.totalMatchValue) || Number(s.totalTradeValue) || undefined,
    advances: s.totalAdvanceStock ?? undefined,
    noChanges: s.totalSteadyStock ?? undefined,
    declines: s.totalDeclineStock ?? undefined,
    ceilings: s.totalCeilingStock ?? undefined,
    floors: s.totalFloorStock ?? undefined,
    updatedAt: new Date().toISOString(),
  };
}

let token: { value: string; until: number } | null = null;

async function getToken(): Promise<string> {
  if (token && Date.now() < token.until) return token.value;
  const res = await fetchWithTimeout(`${BASE}/AccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      consumerID: process.env.SSI_CONSUMER_ID,
      consumerSecret: process.env.SSI_CONSUMER_SECRET,
    }),
  });
  const body: any = await res.json().catch(() => null);
  const value = body?.data?.accessToken ?? body?.accessToken;
  if (!res.ok || !value) {
    throw new Error(`SSI AccessToken lỗi (HTTP ${res.status}): ${String(body?.message ?? "").slice(0, 200)}`);
  }
  // Lifetime isn't documented; refresh every 20 minutes, and on any 401.
  token = { value, until: Date.now() + 20 * 60 * 1000 };
  return value;
}

async function get(path: string, params: Record<string, string | number>): Promise<any[]> {
  const url = new URL(`${BASE}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetchWithTimeout(url.toString(), {
      headers: { Authorization: `Bearer ${await getToken()}` },
    });
    if (res.status === 401 && attempt === 0) {
      token = null;
      continue;
    }
    const body: any = await res.json().catch(() => null);
    if (!res.ok) throw new Error(`SSI ${path} lỗi (HTTP ${res.status}): ${String(body?.message ?? "").slice(0, 200)}`);
    const data = body?.data;
    return Array.isArray(data) ? data : data ? [data] : [];
  }
  return [];
}

/** Case-insensitive field read; returns a finite number or undefined. */
function numField(row: any, ...names: string[]): number | undefined {
  if (!row) return undefined;
  const keys = Object.keys(row);
  for (const n of names) {
    const k = keys.find((x) => x.toLowerCase().replace(/\s/g, "") === n.toLowerCase());
    if (k == null) continue;
    const v = Number(String(row[k]).replace(/,/g, ""));
    if (Number.isFinite(v)) return v;
  }
  return undefined;
}

function vnToday(): string {
  const d = new Date(Date.now() + 7 * 3600 * 1000);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}
function vnDaysAgo(days: number): string {
  const d = new Date(Date.now() + 7 * 3600 * 1000 - days * 86400000);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

// Our index symbols → SSI index ids.
const SSI_INDEX_ID: Record<string, string> = {
  VNINDEX: "VNINDEX",
  VN30: "VN30",
  VN100: "VN100",
  HNXINDEX: "HNXIndex",
  UPCOMINDEX: "HNXUpcomIndex",
};
export function isSsiIndex(symbol: string): boolean {
  return symbol.toUpperCase() in SSI_INDEX_ID;
}

/** Latest session of an index from SSI DailyIndex, or null if SSI isn't set up / has nothing. */
export async function ssiIndexQuote(symbol: string): Promise<Quote | null> {
  if (!ssiConfigured()) return null;
  const id = SSI_INDEX_ID[symbol.toUpperCase()];
  if (!id) return null;
  if (v3Configured()) {
    ssiStatus.api = "v3";
    try {
      const q = await v3IndexQuote(symbol);
      if (q) ssiStatus.lastOk = new Date().toISOString();
      return q;
    } catch (err) {
      ssiStatus.lastError = err instanceof Error ? err.message : String(err);
      ssiStatus.lastErrorAt = new Date().toISOString();
      console.error(`[ssi v3] ${symbol}: ${ssiStatus.lastError}`);
      return null;
    }
  }
  ssiStatus.api = "v2";
  try {
    // A week back so a Monday morning or a holiday still finds the last session.
    const rows = await get("DailyIndex", {
      indexId: id,
      fromDate: vnDaysAgo(7),
      toDate: vnToday(),
      pageIndex: 1,
      pageSize: 10,
      ascending: "false",
    });
    const row = rows.sort((a, b) => dateKey(b) - dateKey(a))[0];
    const price = numField(row, "IndexValue");
    if (!row || !price) return null;
    const change = numField(row, "Change") ?? 0;
    const prevClose = numField(row, "PriorIndexValue") ?? price - change;
    ssiStatus.lastOk = new Date().toISOString();
    return {
      symbol: symbol.toUpperCase(),
      name: String(row.IndexName ?? row.indexName ?? symbol.toUpperCase()),
      exchange: "Chỉ số",
      currency: "điểm",
      price,
      change,
      changePercent: numField(row, "RatioChange") ?? (prevClose ? (change / prevClose) * 100 : 0),
      open: prevClose,
      high: price,
      low: price,
      prevClose,
      volume: numField(row, "TotalVol", "TotalMatchVol", "TotalQtty") ?? 0,
      value: numField(row, "TotalVal", "TotalMatchVal", "TotalValue"),
      advances: numField(row, "Advances"),
      noChanges: numField(row, "NoChanges"),
      declines: numField(row, "Declines"),
      ceilings: numField(row, "Ceilings", "Ceiling"),
      floors: numField(row, "Floors", "Floor"),
      updatedAt: new Date().toISOString(),
    };
  } catch (err) {
    ssiStatus.lastError = err instanceof Error ? err.message : String(err);
    ssiStatus.lastErrorAt = new Date().toISOString();
    console.error(`[ssi] ${symbol}: ${ssiStatus.lastError}`);
    return null;
  }
}

function dateKey(row: any): number {
  const raw = String(row?.TradingDate ?? row?.tradingDate ?? row?.["Trading Date"] ?? "");
  const parts = raw.slice(0, 10).split(/[/\-]/).map(Number);
  // dd/mm/yyyy (documented) or yyyy-mm-dd.
  const [y, m, d] = parts[0] > 31 ? parts : [parts[2], parts[1], parts[0]];
  return y && m && d ? y * 10000 + m * 100 + d : 0;
}
