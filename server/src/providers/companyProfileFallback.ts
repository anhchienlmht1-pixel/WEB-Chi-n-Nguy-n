import { fetchKbsCompanyProfile, type CompanyProfile } from "./kbsCompany.js";
import { fetchVciCompanyProfile } from "./vciCompany.js";

// Mirrors the getQuoteWithFallback/getHistoryWithFallback pattern in
// fallback.ts: try KBS first (single request, broadest field coverage),
// fall back to VCI if KBS errors or comes back empty for this symbol.
// Each source's fields are kept as-is and never blended together — the
// returned `source` tag says which provider the whole profile came from.
function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function isUseful(p: CompanyProfile): boolean {
  return Boolean(p.businessModel || p.officers.length > 0 || p.shareholders.length > 0 || p.listingDate);
}

export interface CompanyProfileWithSource extends CompanyProfile {
  source: "KBS" | "VCI";
}

export async function getCompanyProfileWithFallback(symbol: string): Promise<CompanyProfileWithSource> {
  const upper = symbol.toUpperCase();
  const errors: string[] = [];

  try {
    const kbs = await fetchKbsCompanyProfile(upper);
    if (isUseful(kbs)) return { ...kbs, source: "KBS" };
    errors.push("KBS: dữ liệu rỗng");
  } catch (err) {
    errors.push(`KBS: ${errorMessage(err).slice(0, 150)}`);
  }

  try {
    const vci = await fetchVciCompanyProfile(upper);
    if (isUseful(vci)) return { ...vci, source: "VCI" };
    errors.push("VCI: dữ liệu rỗng");
  } catch (err) {
    errors.push(`VCI: ${errorMessage(err).slice(0, 150)}`);
  }

  throw Object.assign(
    new Error(`Không lấy được hồ sơ công ty cho mã ${upper} từ bất kỳ nguồn nào. ${errors.join(" | ")}`),
    { status: 502 }
  );
}
