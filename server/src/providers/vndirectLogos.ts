// VNDirect's public company-profiles endpoint (no API key) — bulk list of
// every listed company's profile fields, including a ready-to-use logo
// image URL per symbol.
//
// Endpoint + field names verified against an open-source ETL pipeline
// (github.com/hoquangsang/stock-insight,
// data-pipeline/etl/extractors/vndirect_company_profiles.py) that reads
// this exact host/path and documents the record shape (code, floor, logo,
// vnName, enName, foundDate, ..., website, ...). That pipeline's own
// transform step (data-pipeline/jobs/sync_vndirect_industries.py,
// `_parse_profile_row`) copies `logo` straight into its `logo_url` column
// with no URL-joining, i.e. it treats the field as already a full URL —
// same as how it treats `website`. Only `code`/`logo` are kept here; the
// endpoint returns ~2800 companies with many more fields not needed for
// this site's logo lookup.
const VND_COMPANY_PROFILES_URL = "https://api-finfo.vndirect.com.vn/v4/company_profiles";

const HEADERS = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8",
  Origin: "https://www.vndirect.com.vn",
  Referer: "https://www.vndirect.com.vn/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

export interface CompanyLogoEntry {
  logoUrl: string | null;
}

export type CompanyLogoMap = Record<string, CompanyLogoEntry>;

export async function fetchVndirectCompanyProfilesRaw(): Promise<Record<string, unknown>[]> {
  const url = `${VND_COMPANY_PROFILES_URL}?size=10000&page=1`;
  const res = await fetch(url, { headers: HEADERS });
  const rawBody = await res.text();

  if (!res.ok) {
    throw Object.assign(
      new Error(`VNDirect trả lỗi ${res.status} khi lấy company_profiles. Nội dung: ${rawBody.slice(0, 300)}`),
      { status: 502 }
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw Object.assign(new Error("VNDirect trả về dữ liệu không phải JSON cho company_profiles."), {
      status: 502,
    });
  }

  const rows = Array.isArray((parsed as { data?: unknown })?.data) ? (parsed as { data: unknown[] }).data : [];
  return rows as Record<string, unknown>[];
}

export async function fetchVndirectLogos(): Promise<CompanyLogoMap> {
  const rows = await fetchVndirectCompanyProfilesRaw();

  const map: CompanyLogoMap = {};
  for (const r of rows) {
    const code = typeof r?.code === "string" ? r.code.trim().toUpperCase() : "";
    if (!code) continue;
    const logo = typeof r?.logo === "string" ? r.logo.trim() : "";
    map[code] = { logoUrl: logo || null };
  }
  return map;
}
