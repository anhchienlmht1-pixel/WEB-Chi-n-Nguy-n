import { useMemo } from "react";
import { usePolling } from "../hooks/usePolling";
import { COMPANY_PROFILES } from "../data/companyProfiles";
import { fetchBankData, isBankSymbol } from "../utils/bankData";
import { fetchSecuritiesData, isSecuritiesSymbol } from "../utils/securitiesData";
import { fetchKbsCompanyProfile } from "../api/client";
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
// - KBS's live company-profile endpoint (business model, founding date,
//   address, CEO, leadership, major shareholders) — covers effectively any
//   listed symbol, not just the curated 93. Used as the fallback for the
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
  // KBS not having a profile for some symbol, or being unreachable, should
  // just mean this section quietly falls back to the other two sources,
  // not block the whole card.
  const { data: kbsProfile } = usePolling(
    () => fetchKbsCompanyProfile(upper).catch(() => null),
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

  const founded = profile?.founded ?? kbsProfile?.foundedDate ?? null;
  const headquarters = profile?.headquarters ?? kbsProfile?.address ?? null;
  const website = profile?.website ?? kbsProfile?.website ?? null;
  const description = profile?.description ?? kbsProfile?.businessModel ?? null;
  const hasLeadership = (kbsProfile?.officers.length ?? 0) > 0 || kbsProfile?.ceoName;
  const hasShareholders = (kbsProfile?.shareholders.length ?? 0) > 0;

  if (!profile && figures.length === 0 && !kbsProfile) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
      <div className="flex flex-wrap items-start justify-between gap-4 p-4">
        <div className="flex min-w-0 items-start gap-3">
          <CompanyLogo symbol={upper} size={44} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {profile?.fullName ?? displayName ?? fallbackName ?? upper}
              </h3>
              {profile?.sector && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {profile.sector}
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              {founded && <span>Thành lập {founded}</span>}
              {headquarters && <span>Trụ sở: {headquarters}</span>}
              {kbsProfile?.ceoName && (
                <span>
                  {kbsProfile.ceoPosition ?? "CEO"}: {kbsProfile.ceoName}
                </span>
              )}
              {website && (
                <a
                  href={website.startsWith("http") ? website : `https://${website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 hover:underline dark:text-emerald-400"
                >
                  {website}
                </a>
              )}
            </div>
            {description && (
              <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">{description}</p>
            )}
          </div>
        </div>
      </div>

      {figures.length > 0 && (
        <div className="grid grid-cols-2 gap-px border-t border-slate-200 bg-slate-200 dark:border-slate-800 dark:bg-slate-800 sm:grid-cols-4">
          {figures.map((f) => (
            <div key={f.label} className="bg-white p-3 dark:bg-slate-900">
              <div className="text-xs text-slate-500 dark:text-slate-400">{f.label}</div>
              <div className="mt-0.5 font-semibold tabular-nums text-slate-900 dark:text-slate-100">{f.value}</div>
            </div>
          ))}
        </div>
      )}

      {(hasLeadership || hasShareholders) && (
        <div className="grid grid-cols-1 gap-px border-t border-slate-200 bg-slate-200 dark:border-slate-800 dark:bg-slate-800 sm:grid-cols-2">
          {hasLeadership && (
            <div className="bg-white p-3 dark:bg-slate-900">
              <div className="mb-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">Ban lãnh đạo</div>
              <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                {kbsProfile!.officers.slice(0, 5).map((o, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span className="truncate">{o.position ?? "—"}</span>
                    <span className="shrink-0 font-medium text-slate-900 dark:text-slate-100">{o.name ?? "—"}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {hasShareholders && (
            <div className="bg-white p-3 dark:bg-slate-900">
              <div className="mb-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">Cổ đông lớn</div>
              <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                {kbsProfile!.shareholders.slice(0, 5).map((s, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span className="truncate">{s.name ?? "—"}</span>
                    <span className="shrink-0 font-medium tabular-nums text-slate-900 dark:text-slate-100">
                      {s.ownershipPercent != null ? `${s.ownershipPercent.toLocaleString("vi-VN")}%` : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {(period || kbsProfile) && (
        <div className="border-t border-slate-200 px-4 py-2 text-[11px] text-slate-400 dark:border-slate-800 dark:text-slate-500">
          {period && `Số liệu tại kỳ ${period} — nguồn: dữ liệu tự tổng hợp (Excel).`}
          {period && kbsProfile && " "}
          {kbsProfile && "Thông tin hồ sơ công ty — nguồn: KB Securities (KBS)."}
        </div>
      )}
    </div>
  );
}
