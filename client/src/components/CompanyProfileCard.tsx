import { useMemo, useState } from "react";
import { usePolling } from "../hooks/usePolling";
import { COMPANY_PROFILES } from "../data/companyProfiles";
import { fetchBankData, isBankSymbol } from "../utils/bankData";
import { fetchSecuritiesData, isSecuritiesSymbol } from "../utils/securitiesData";
import { fetchCompanyProfile } from "../api/client";
import CompanyLogo from "./CompanyLogo";

interface KeyFigure {
  label: string;
  value: string;
}

function formatBillions(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "—";
  return `${v.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} tỷ`;
}

function formatPerShare(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "—";
  return `${v.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} đ`;
}

function formatShares(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "—";
  if (v >= 1e9) return `${(v / 1e9).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} tỷ CP`;
  return `${(v / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} triệu CP`;
}

// "Hồ sơ doanh nghiệp" card. Three data sources, each honest about its own
// origin and never blended field-for-field with another:
// - data/companyProfiles.ts: static reference info, hand-compiled for ~93
//   symbols (cafef.vn is unreachable from this environment).
// - the user's own Excel exports (bank/securities key figures).
// - a live company-profile endpoint (business model, founding date,
//   address, CEO, leadership, major shareholders) — covers effectively any
//   listed symbol, not just the curated 93. Tries KBS first, falls back to
//   VCI if KBS has nothing for the symbol (see companyProfileFallback.ts on
//   the server); whichever one actually answered is named in `source` and
//   disclosed in the footer caption. Used as the fallback for the
//   descriptive fields when the static profile doesn't have them, and as
//   the only source for CEO/leadership/shareholders (the static list and
//   Excel exports don't carry those at all).
export default function CompanyProfileCard({ symbol, fallbackName }: { symbol: string; fallbackName?: string }) {
  const upper = symbol.toUpperCase();
  const profile = COMPANY_PROFILES[upper];
  const isBank = isBankSymbol(upper);
  const isSecurities = isSecuritiesSymbol(upper);

  const { data: bankData } = usePolling(
    () => (isBank ? fetchBankData(upper) : Promise.resolve(null)),
    [upper, isBank]
  );
  const { data: securitiesData } = usePolling(
    () => (isSecurities ? fetchSecuritiesData(upper) : Promise.resolve(null)),
    [upper, isSecurities]
  );
  // Swallows failures into `null` rather than surfacing an error state —
  // KBS/VCI not having a profile for some symbol, or being unreachable,
  // should just mean this section quietly falls back to the other two
  // sources, not block the whole card.
  const { data: liveProfile } = usePolling(
    () => fetchCompanyProfile(upper).catch(() => null),
    [upper]
  );

  const { figures, period, displayName } = useMemo((): {
    figures: KeyFigure[];
    period: string | null;
    displayName: string | null;
  } => {
    if (bankData) {
      const q = bankData.quarter;
      const last = q.periods.length - 1;
      return {
        displayName: bankData.name,
        period: q.periods[last] ?? null,
        figures: [
          { label: "Tổng tài sản", value: formatBillions(q.metrics.totalAssets[last]) },
          { label: "Vốn chủ sở hữu", value: formatBillions(q.metrics.equity[last]) },
          { label: "Cho vay khách hàng", value: formatBillions(q.metrics.loans[last]) },
          { label: "Tiền gửi khách hàng", value: formatBillions(q.metrics.deposits[last]) },
        ],
      };
    }
    if (securitiesData) {
      const q = securitiesData.quarter;
      const last = q.periods.length - 1;
      return {
        displayName: securitiesData.name,
        period: q.periods[last] ?? null,
        figures: [
          { label: "BVPS", value: formatPerShare(q.metrics.bvps[last]) },
          { label: "Cổ phiếu lưu hành", value: formatShares(q.metrics.sharesOutstanding[last]) },
          { label: "Dư nợ margin", value: formatBillions(q.metrics.marginBalance[last]) },
          { label: "Tài sản tự doanh", value: formatBillions(q.metrics.propAssets[last]) },
        ],
      };
    }
    return { figures: [], period: null, displayName: null };
  }, [bankData, securitiesData]);

  const founded = profile?.founded ?? liveProfile?.foundedDate ?? null;
  const headquarters = profile?.headquarters ?? liveProfile?.address ?? null;
  const website = profile?.website ?? liveProfile?.website ?? null;
  const description = profile?.description ?? liveProfile?.businessModel ?? null;
  const [more, setMore] = useState(false);
  const name = profile?.fullName ?? displayName ?? fallbackName ?? upper;
  void figures;
  void period;

  if (!profile && !liveProfile && !displayName) return null;

  // Bản gọn: logo, tên công ty, một dòng thông tin, đoạn giới thiệu có vạch
  // vàng bên trái (rút gọn 3 dòng, bấm "Xem thêm" để mở hết).
  return (
    <div className="flex flex-col gap-5 rounded-md border border-[var(--sm-line)] bg-[var(--sm-panel)] p-5 sm:flex-row sm:items-start">
      <div className="grid h-24 w-full shrink-0 place-items-center rounded-md bg-[#efe7d4] sm:w-40">
        <CompanyLogo symbol={upper} size={64} fallback="none" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-[1.5rem] leading-tight text-[var(--sm-gold2)]">{name}</h3>
        <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[0.85rem] text-[var(--sm-mut)]">
          {founded && <span>Thành lập {founded}</span>}
          {headquarters && <span>· {headquarters}</span>}
          {website && (
            <a
              href={website.startsWith("http") ? website : `https://${website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--sm-gold2)] hover:underline"
            >
              · {website.replace(/^https?:\/\//, "")}
            </a>
          )}
        </p>
        {description && (
          <div className="mt-3 border-l-2 border-[var(--sm-gold)] pl-4">
            <p className={`max-w-[75ch] text-[0.95rem] leading-relaxed text-[var(--sm-egg2)] ${more ? "" : "line-clamp-3"}`}>{description}</p>
            {description.length > 260 && (
              <button type="button" onClick={() => setMore((v) => !v)} className="mt-1 text-[0.85rem] font-semibold text-[var(--sm-gold2)] hover:underline">
                {more ? "Thu gọn" : "Xem thêm"}
              </button>
            )}
          </div>
        )}
        {liveProfile && (
          <p className="mt-3 text-[0.72rem] text-[var(--sm-mut)]">
            Nguồn hồ sơ: {liveProfile.source === "VCI" ? "Vietcap (VCI)" : "KB Securities (KBS)"}
          </p>
        )}
      </div>
    </div>
  );
}
