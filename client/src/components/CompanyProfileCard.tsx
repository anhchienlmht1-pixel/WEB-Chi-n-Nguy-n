import { useMemo } from "react";
import { usePolling } from "../hooks/usePolling";
import { COMPANY_PROFILES } from "../data/companyProfiles";
import { fetchBankData, isBankSymbol } from "../utils/bankData";
import { fetchSecuritiesData, isSecuritiesSymbol } from "../utils/securitiesData";
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

// "Hồ sơ doanh nghiệp" card shown at the top of the stock page for the 43
// covered symbols. Two data sources, both honest about their origin:
// static reference info from data/companyProfiles.ts (compiled offline —
// cafef.vn is unreachable from this environment, see that file's header)
// and live key figures from the user's own Excel exports.
export default function CompanyProfileCard({ symbol }: { symbol: string }) {
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

  if (!profile && figures.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
      <div className="flex flex-wrap items-start justify-between gap-4 p-4">
        <div className="flex min-w-0 items-start gap-3">
          <CompanyLogo symbol={upper} size={44} />
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {profile?.fullName ?? displayName ?? upper}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              {profile?.founded && <span>Thành lập {profile.founded}</span>}
              {profile?.headquarters && <span>Trụ sở: {profile.headquarters}</span>}
              {profile?.website && (
                <a
                  href={`https://${profile.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 hover:underline dark:text-emerald-400"
                >
                  {profile.website}
                </a>
              )}
            </div>
            {profile?.description && (
              <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">{profile.description}</p>
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

      {period && (
        <div className="border-t border-slate-200 px-4 py-2 text-[11px] text-slate-400 dark:border-slate-800 dark:text-slate-500">
          Số liệu tại kỳ {period} — nguồn: dữ liệu tự tổng hợp (Excel).
        </div>
      )}
    </div>
  );
}
