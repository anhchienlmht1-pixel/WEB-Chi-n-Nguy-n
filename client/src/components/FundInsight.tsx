import { Link } from "react-router-dom";
import { useState, type ReactNode } from "react";
import { usePolling } from "../hooks/usePolling";
import { fetchFundInsight, type FundInsightStock } from "../api/client";
import { formatPercent } from "../utils/format";
import CompanyLogo from "./CompanyLogo";

const POLL_MS = 30 * 60 * 1000; // server caches for 1h — holdings move ~daily

// Prefers the stock logo Fmarket returns; if it's missing or fails to load,
// falls back to the app's existing company-logo/initials badge so a row is
// never left with a broken image.
function StockLogo({ symbol, logoUrl, size = 26 }: { symbol: string; logoUrl: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (!logoUrl || failed) return <CompanyLogo symbol={symbol} size={size} />;
  return (
    <img
      src={logoUrl}
      alt={symbol}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className="shrink-0 rounded-md object-contain"
      style={{ width: size, height: size }}
    />
  );
}

function monthLabel(): string {
  return `tháng ${new Date().getMonth() + 1}`;
}

function Shell({ subtitle, children }: { subtitle: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
      <div className="border-b border-slate-200 p-4 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white dark:bg-slate-100 dark:text-slate-900">
            Fund Insight
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</span>
        </div>
      </div>
      {children}
    </div>
  );
}

function StrengthBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 min-w-[60px] flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="h-full rounded-full bg-green-500 dark:bg-green-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-200">
        {value}
      </span>
    </div>
  );
}

function peakClass(d: number | null): string {
  if (d == null) return "text-slate-400 dark:text-slate-500";
  if (d >= -8) return "text-green-600 dark:text-green-400";
  if (d >= -20) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function InsightCard({
  label,
  title,
  children,
  tone = "slate",
}: {
  label: string;
  title: ReactNode;
  children: ReactNode;
  tone?: "slate" | "amber" | "green";
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20"
      : tone === "green"
        ? "border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/20"
        : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40";
  const labelClass =
    tone === "amber"
      ? "text-amber-700 dark:text-amber-400"
      : tone === "green"
        ? "text-green-700 dark:text-green-400"
        : "text-slate-500 dark:text-slate-400";
  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <div className={`text-[11px] font-bold uppercase tracking-wide ${labelClass}`}>{label}</div>
      <div className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{title}</div>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{children}</p>
    </div>
  );
}

function Row({ s }: { s: FundInsightStock }) {
  return (
    <tr className="border-t border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40">
      <td className="px-3 py-2">
        <Link to={`/stock/${s.symbol}`} className="flex items-center gap-2">
          <StockLogo symbol={s.symbol} logoUrl={s.logoUrl} size={26} />
          <div className="min-w-0">
            <div className="font-semibold text-slate-900 dark:text-slate-100">{s.symbol}</div>
            <div className="text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
              {s.price != null ? s.price.toFixed(2) : "—"}
              {s.changePercent != null && (
                <span
                  className={
                    s.changePercent > 0
                      ? " text-green-600 dark:text-green-400"
                      : s.changePercent < 0
                        ? " text-red-600 dark:text-red-400"
                        : ""
                  }
                >
                  {" · "}
                  {formatPercent(s.changePercent)}
                </span>
              )}
            </div>
          </div>
        </Link>
      </td>
      <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-800 dark:text-slate-100">
        {s.fundCount}
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
        {s.avgWeight ? `${s.avgWeight.toFixed(1)}%` : "—"}
      </td>
      <td className="px-3 py-2">
        <StrengthBar value={s.priceStrength} />
      </td>
      <td className={`px-3 py-2 text-right text-xs font-semibold tabular-nums ${peakClass(s.distanceFromPeak)}`}>
        {s.distanceFromPeak != null ? `${s.distanceFromPeak.toFixed(1)}%` : "—"}
      </td>
    </tr>
  );
}

export default function FundInsight() {
  const { data, error, loading, refetch } = usePolling(() => fetchFundInsight(), [], POLL_MS);

  if (loading && !data) {
    return (
      <Shell subtitle="Đang tổng hợp danh mục các quỹ mở từ Fmarket…">
        <div className="space-y-2 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-9 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      </Shell>
    );
  }

  if (error && !data) {
    return (
      <Shell subtitle="insight từ các quỹ mở · nguồn Fmarket">
        <div className="flex flex-col items-center gap-3 p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl dark:bg-slate-800">
            ⏳
          </div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Chưa tải được dữ liệu quỹ</p>
          <p className="max-w-xs text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Đang tổng hợp danh mục từ nhiều quỹ nên có thể mất một chút, hoặc kết nối tới Fmarket tạm gián đoạn. Bạn hãy
            thử lại nhé.
          </p>
          <button
            type="button"
            onClick={refetch}
            className="mt-1 rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            ↻ Thử lại
          </button>
        </div>
      </Shell>
    );
  }

  if (!data) return null;

  const subtitle = `insight từ ${data.fundsTotal} quỹ mở · nguồn Fmarket`;

  return (
    <Shell subtitle={subtitle}>
      <div className="border-b border-slate-200 p-4 dark:border-slate-800">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Top pick {monthLabel()} —{" "}
          <span className="text-green-600 dark:text-green-400">nơi tiền lớn và tín hiệu gặp nhau</span>
        </h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          <span className="font-semibold text-slate-800 dark:text-slate-200">{data.fundsTotal} quỹ</span> đang cầm{" "}
          <span className="font-semibold text-slate-800 dark:text-slate-200">{data.symbolsHeld} mã</span>. Hệ chấm{" "}
          <span className="font-semibold text-green-700 dark:text-green-400">{data.waitingToBuyCount} mã</span> trong số
          đó đang ở vùng chờ mua — đây là những mã khỏe nhất trong nhóm giao nhau.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[1.7fr_1fr]">
        {/* Table */}
        <div className="min-w-0 overflow-x-auto">
          {data.topPicks.length === 0 ? (
            <p className="p-4 text-sm text-slate-500 dark:text-slate-400">
              Hiện chưa có mã nào vừa được quỹ cầm nhiều vừa ở vùng chờ mua.
            </p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  <th className="px-3 py-2 text-left font-medium">Mã</th>
                  <th className="px-3 py-2 text-right font-medium">Quỹ cầm</th>
                  <th className="px-3 py-2 text-right font-medium">Tỷ trọng</th>
                  <th className="px-3 py-2 text-left font-medium">Sức mạnh giá</th>
                  <th className="px-3 py-2 text-right font-medium">Cách đỉnh</th>
                </tr>
              </thead>
              <tbody>
                {data.topPicks.map((s) => (
                  <Row key={s.symbol} s={s} />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Insight cards */}
        <div className="flex flex-col gap-3">
          {data.crowdedWeak && (
            <InsightCard
              tone="amber"
              label="Đám đông đang kẹt"
              title={`${data.crowdedWeak.symbol} · ${data.crowdedWeak.fundCount} quỹ`}
            >
              Nằm trong nhóm mã được quỹ cầm nhiều nhất, nhưng sức mạnh giá chỉ {data.crowdedWeak.priceStrength}/99
              {data.crowdedWeak.distanceFromPeak != null && (
                <> và còn cách đỉnh {Math.abs(data.crowdedWeak.distanceFromPeak).toFixed(1)}%</>
              )}
              . Tiền lớn vào sớm chưa chắc là đúng thời điểm.
            </InsightCard>
          )}

          {data.strongest && (
            <InsightCard label="Khỏe nhất trong rổ quỹ" title={`${data.strongest.symbol} · ${data.strongest.priceStrength}/99`}>
              {data.strongest.fundCount} quỹ đang cầm — sức mạnh giá dẫn đầu nhóm được quỹ nắm giữ.
            </InsightCard>
          )}

          {data.mostHeld.length > 0 && (
            <InsightCard
              label="Được quỹ cầm nhiều nhất"
              title={
                <span className="tabular-nums">
                  {data.mostHeld.map((m) => `${m.symbol} · ${m.fundCount}`).join("   ")}
                </span>
              }
            >
              Số quỹ đang nắm trong {data.fundsTotal} quỹ — nơi tiền tổ chức đứng đông nhất thị trường.
            </InsightCard>
          )}

          <div className="rounded-lg border-l-4 border-green-500 bg-green-50/50 px-3 py-2 text-xs leading-relaxed text-slate-600 dark:bg-green-950/10 dark:text-slate-400">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {data.fundsBeatingVnindex}/{data.fundsComparable} quỹ
            </span>{" "}
            vượt được VN-Index 12 tháng
            {data.vnindex12mChange != null && <> (chỉ số {formatPercent(data.vnindex12mChange)})</>}. Bấm vào từng mã để
            xem chi tiết.
          </div>
        </div>
      </div>
    </Shell>
  );
}
