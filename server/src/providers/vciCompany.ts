// VCI (Vietcap Securities) company-profile data — a fallback source used
// when KBS has no profile (or no useful fields) for a symbol. Unlike KBS's
// single combined payload, VCI splits this across separate endpoints:
//  - {base}/details?ticker={symbol} — name, sector, profile description,
//    listing date, outstanding shares.
//  - {base}/{symbol}/shareholder — one combined list; officers are just
//    entries with owner_type=="INDIVIDUAL" and a non-null position_name,
//    the rest are shareholders.
//
// Endpoints + field names verified against vnstock's open-source VCI
// explorer (github.com/thinh-vu/vnstock, vnstock/explorer/vci/{const,
// company}.py — Company._fetch_company_details/_fetch_shareholder_list,
// and core/utils/user_agent.py for the required Referer/Origin headers).
// Only fields vnstock's code explicitly names are trusted here — the raw
// API payload may carry more, but their exact key names aren't verifiable
// without live network access in this environment, so unknown fields
// (founding date, address, CEO, phone/email/website) are left null rather
// than guessed.
import type { CompanyOfficer, CompanyProfile, CompanyShareholder } from "./kbsCompany.js";

const VCI_COMPANY_BASE = "https://iq.vietcap.com.vn/api/iq-insight-service/v1/company";

const HEADERS = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9,vi-VN;q=0.8,vi;q=0.7",
  "Content-Type": "application/json",
  Referer: "https://trading.vietcap.com.vn/",
  Origin: "https://trading.vietcap.com.vn/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s === "" ? null : s;
}

// VCI's "profile" field comes back as an HTML fragment, same as KBS's SM/HS.
function stripHtml(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  const text = s
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  return text || null;
}

async function vciGet(path: string, symbolForError: string): Promise<any> {
  const url = `${VCI_COMPANY_BASE}${path}`;
  const res = await fetch(url, { headers: HEADERS });
  const rawBody = await res.text();

  if (!res.ok) {
    throw Object.assign(
      new Error(`VCI trả lỗi ${res.status} khi lấy hồ sơ công ty ${symbolForError}. Nội dung: ${rawBody.slice(0, 300)}`),
      { status: 502 }
    );
  }

  let parsed: any;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw Object.assign(new Error(`VCI trả về dữ liệu không phải JSON cho hồ sơ công ty ${symbolForError}`), {
      status: 502,
    });
  }

  return parsed?.data;
}

export function parseVciCompanyProfile(symbol: string, details: any, shareholderList: any): CompanyProfile {
  const upper = symbol.toUpperCase();
  const list: any[] = Array.isArray(shareholderList) ? shareholderList : [];

  const officers: CompanyOfficer[] = list
    .filter((s) => s?.ownerType === "INDIVIDUAL" && str(s?.positionName))
    .map((s) => ({
      fromDate: null,
      position: str(s?.positionName),
      name: str(s?.ownerName),
    }));

  const shareholders: CompanyShareholder[] = list
    .filter((s) => num(s?.percentage) !== null)
    .map((s) => ({
      name: str(s?.ownerName),
      updateDate: str(s?.updateDate),
      sharesOwned: num(s?.quantity),
      ownershipPercent: num(s?.percentage),
    }))
    .sort((a, b) => (b.ownershipPercent ?? 0) - (a.ownershipPercent ?? 0));

  return {
    symbol: upper,
    businessModel: stripHtml(details?.profile ?? details?.enProfile),
    foundedDate: null,
    charterCapital: null,
    numberOfEmployees: null,
    listingDate: str(details?.listingDate),
    parValue: null,
    exchange: null,
    ceoName: null,
    ceoPosition: null,
    address: null,
    phone: null,
    email: null,
    website: null,
    history: null,
    outstandingShares: num(details?.numberOfSharesMktCap),
    officers,
    shareholders,
  };
}

export async function fetchVciCompanyProfile(symbol: string): Promise<CompanyProfile> {
  const upper = symbol.toUpperCase();
  const [details, shareholderList] = await Promise.all([
    vciGet(`/details?ticker=${encodeURIComponent(upper)}`, upper),
    vciGet(`/${encodeURIComponent(upper)}/shareholder`, upper),
  ]);

  if (!details || typeof details !== "object" || Object.keys(details).length === 0) {
    throw Object.assign(new Error(`Không có dữ liệu hồ sơ công ty cho mã ${upper} từ VCI.`), { status: 404 });
  }

  return parseVciCompanyProfile(upper, details, shareholderList);
}
