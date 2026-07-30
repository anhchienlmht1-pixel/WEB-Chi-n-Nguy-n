// KB Securities (KBS) company-profile data — a single endpoint that
// returns overview info (business model, founding date, address, CEO,
// website...) plus embedded arrays for leadership and major shareholders,
// for essentially any listed VN stock, not just the ~93 symbols hand-
// curated in client/src/data/companyProfiles.ts.
//
// Endpoint + field mapping verified against vnstock's open-source KBS
// explorer (github.com/thinh-vu/vnstock, vnstock/explorer/kbs/{const,
// company}.py — Company._load_cache() and _COMPANY_PROFILE_MAP /
// _LEADERS_MAP / _SHAREHOLDERS_MAP), the same source kbsMarketProvider.ts
// and kbsFinancials.ts were built from.
const STOCK_INFO_BASE = "https://kbbuddywts.kbsec.com.vn/iis-server/investment/stockinfo";

const HEADERS = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
  Referer: "https://kbbuddywts.kbsec.com.vn/",
  Origin: "https://kbbuddywts.kbsec.com.vn",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
};

export interface CompanyOfficer {
  fromDate: string | null;
  position: string | null;
  name: string | null;
}

export interface CompanyShareholder {
  name: string | null;
  updateDate: string | null;
  sharesOwned: number | null;
  ownershipPercent: number | null;
}

export interface CompanySubsidiary {
  name: string | null;
  updateDate: string | null;
  charterCapital: number | null;
  ownershipPercent: number | null;
  currency: string | null;
  /** ownershipPercent > 50 = "công ty con", otherwise "công ty liên kết" —
   * same threshold vnstock's own KBS explorer uses (explorer/kbs/company.py
   * subsidiaries()/affiliate()). */
  type: "công ty con" | "công ty liên kết";
}

export interface CompanyProfile {
  symbol: string;
  businessModel: string | null;
  foundedDate: string | null;
  charterCapital: number | null;
  numberOfEmployees: number | null;
  listingDate: string | null;
  parValue: number | null;
  exchange: string | null;
  ceoName: string | null;
  ceoPosition: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  history: string | null;
  outstandingShares: number | null;
  officers: CompanyOfficer[];
  shareholders: CompanyShareholder[];
  subsidiaries: CompanySubsidiary[];
}

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

// KBS's business_model/history fields come back as HTML fragments
// (e.g. "<p>...</p>") — strip tags rather than rendering them raw.
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

export function parseCompanyProfile(symbol: string, data: any): CompanyProfile {
  const upper = symbol.toUpperCase();
  const officers: CompanyOfficer[] = Array.isArray(data?.Leaders)
    ? data.Leaders.map((l: any) => ({
        fromDate: str(l?.FD),
        position: str(l?.PN),
        name: str(l?.NM),
      }))
    : [];

  const shareholders: CompanyShareholder[] = Array.isArray(data?.Shareholders)
    ? data.Shareholders.map((s: any) => ({
        name: str(s?.NM),
        updateDate: str(s?.D),
        sharesOwned: num(s?.V),
        ownershipPercent: num(s?.OR),
      }))
    : [];

  const subsidiaries: CompanySubsidiary[] = Array.isArray(data?.Subsidiaries)
    ? data.Subsidiaries.map((s: any) => {
        const ownershipPercent = num(s?.OR);
        return {
          name: str(s?.NM),
          updateDate: str(s?.D),
          charterCapital: num(s?.CC),
          ownershipPercent,
          currency: str(s?.CR),
          type: (ownershipPercent ?? 0) > 50 ? "công ty con" : "công ty liên kết",
        } as CompanySubsidiary;
      })
    : [];

  return {
    symbol: upper,
    businessModel: stripHtml(data?.SM),
    foundedDate: str(data?.FD),
    charterCapital: num(data?.CC),
    numberOfEmployees: num(data?.HM),
    listingDate: str(data?.LD),
    parValue: num(data?.FV),
    exchange: str(data?.EX),
    ceoName: str(data?.CTP),
    ceoPosition: str(data?.CTPP),
    address: str(data?.ADD),
    phone: str(data?.PHONE),
    email: str(data?.EMAIL),
    website: str(data?.URL),
    history: stripHtml(data?.HS),
    outstandingShares: num(data?.KLCPLH),
    officers,
    shareholders,
    subsidiaries,
  };
}

export async function fetchKbsCompanyProfile(symbol: string): Promise<CompanyProfile> {
  const upper = symbol.toUpperCase();
  const url = `${STOCK_INFO_BASE}/profile/${encodeURIComponent(upper)}?l=1`;
  const res = await fetch(url, { headers: HEADERS });
  const rawBody = await res.text();

  if (!res.ok) {
    throw Object.assign(
      new Error(`KBS trả lỗi ${res.status} khi lấy hồ sơ công ty ${upper}. Nội dung: ${rawBody.slice(0, 300)}`),
      { status: 502 }
    );
  }

  let data: any;
  try {
    data = JSON.parse(rawBody);
  } catch {
    throw Object.assign(new Error(`KBS trả về dữ liệu không phải JSON cho hồ sơ công ty ${upper}`), { status: 502 });
  }

  if (!data || typeof data !== "object" || Object.keys(data).length === 0) {
    throw Object.assign(new Error(`Không có dữ liệu hồ sơ công ty cho mã ${upper} từ KBS.`), { status: 404 });
  }

  return parseCompanyProfile(upper, data);
}
