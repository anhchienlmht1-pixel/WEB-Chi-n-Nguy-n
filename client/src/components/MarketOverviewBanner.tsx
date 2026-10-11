import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, Eye } from "lucide-react";
import { usePolling } from "../hooks/usePolling";
import { fetchHistory, fetchMarketOverview } from "../api/client";
import { aggregatePoints } from "../utils/aggregate";
import {
  computeMarketRegimeSeries,
  computeMoneyFlowPct,
  computeSellPressurePct,
  summarizeRegimeSeries,
  type MarketRegime,
} from "../utils/marketRegime";

const REGIME_INFO: Record<
  MarketRegime,
  {
    label: string;
    icon: typeof AlertTriangle;
    badgeClassName: string;
    titleClassName: string;
    dotClassName: string;
    assessment: string;
    action: string;
  }
> = {
  positive: {
    label: "TÍCH CỰC",
    icon: CheckCircle2,
    badgeClassName: "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400",
    titleClassName: "text-green-700 dark:text-green-400",
    dotClassName: "bg-green-600",
    assessment: "Xu hướng tăng được xác nhận trên VNINDEX (SMA20 > SMA50, ADX đủ mạnh, Supertrend tăng, tính theo tuần).",
    action: "Có thể duy trì hoặc mở thêm vị thế theo xu hướng — vẫn luôn kèm điểm dừng lỗ.",
  },
  watch: {
    label: "QUAN SÁT",
    icon: Eye,
    badgeClassName: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
    titleClassName: "text-amber-700 dark:text-amber-400",
    dotClassName: "bg-amber-500",
    assessment: "Xu hướng VNINDEX chưa rõ ràng (tính theo tuần) — ADX chưa đủ mạnh để xác nhận tăng hoặc giảm.",
    action: "Quan sát thêm, chưa vội giải ngân mạnh cho tới khi xu hướng rõ hơn.",
  },
  caution: {
    label: "THẬN TRỌNG",
    icon: AlertTriangle,
    badgeClassName: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400",
    titleClassName: "text-red-700 dark:text-red-400",
    dotClassName: "bg-red-600",
    assessment: "Xu hướng giảm được xác nhận trên VNINDEX (SMA20 < SMA50 hoặc Supertrend giảm, ADX đủ mạnh, tính theo tuần).",
    action: "Hạn chế giải ngân mới, ưu tiên bảo toàn vốn cho tới khi xu hướng đảo chiều.",
  },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function GaugeBar({
  title,
  valuePct,
  max,
  thresholds,
  caption,
}: {
  title: string;
  valuePct: number;
  max: number;
  thresholds: { value: number; label: string }[];
  caption: string;
}) {
  const clamped = Math.max(0, Math.min(max, valuePct));
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</h4>
        <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">{clamped.toFixed(0)}%</span>
      </div>
      <div className="relative mt-3 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-slate-700 dark:bg-slate-300"
          style={{ width: `${(clamped / max) * 100}%` }}
        />
        {thresholds.map((t) => (
          <div
            key={t.value}
            className="absolute top-0 h-2 w-px bg-slate-400 dark:bg-slate-600"
            style={{ left: `${(t.value / max) * 100}%` }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
        <span>0%</span>
        {thresholds.map((t) => (
          <span key={t.value}>{t.label}</span>
        ))}
        <span>{max}%</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{caption}</p>
    </div>
  );
}

// "Toàn cảnh thị trường" — auto-classifies VNINDEX's current regime using
// the exact same Trend Following combo as the rest of the site (see
// utils/marketRegime.ts), fed weekly bars so the call is stable instead of
// flipping on every daily wiggle, plus two live gauges built from real
// data this site already polls: today's VNINDEX volume vs its own
// 250-session daily average (money flow proxy — no separate market-wide
// turnover feed exists to read this from) and the share of the watchlist
// currently closing down (sell-pressure breadth).
export default function MarketOverviewBanner() {
  const { data: historyData } = usePolling(() => fetchHistory("VNINDEX", "MAX"), [], 5 * 60 * 1000);
  const { data: overviewData } = usePolling(() => fetchMarketOverview(), [], 10_000);

  const summary = useMemo(() => {
    if (!historyData) return null;
    const weekly = aggregatePoints(historyData.points, "W");
    const series = computeMarketRegimeSeries(weekly);
    return summarizeRegimeSeries(series);
  }, [historyData]);

  const moneyFlowPct = useMemo(() => {
    if (!historyData) return null;
    const daily = aggregatePoints(historyData.points, "D");
    return computeMoneyFlowPct(daily);
  }, [historyData]);

  const sellPressurePct = useMemo(() => {
    if (!overviewData) return null;
    return computeSellPressurePct(overviewData.quotes);
  }, [overviewData]);

  if (!summary) return null;

  const info = REGIME_INFO[summary.regime];
  const Icon = info.icon;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${info.badgeClassName}`}>
            <Icon className="h-5 w-5" strokeWidth={2} />
          </span>
          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Toàn cảnh thị trường
            </h2>
            <h1 className={`text-2xl font-bold ${info.titleClassName}`}>{info.label}</h1>
          </div>
        </div>
        <div className="text-right text-xs text-slate-400 dark:text-slate-500">
          <div className="flex items-center justify-end gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${info.dotClassName}`} />
            Cập nhật {formatDate(historyData!.points[historyData!.points.length - 1].time)}
          </div>
          <div className="mt-1">
            Từ {formatDate(summary.sinceTime)} · {summary.periodsCount} tuần
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <p className="text-sm text-slate-700 dark:text-slate-300">
          <span className="font-semibold text-slate-900 dark:text-slate-100">Nhận định: </span>
          {info.assessment}
        </p>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          <span className="font-semibold text-slate-900 dark:text-slate-100">Hành động: </span>
          {info.action}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {moneyFlowPct !== null && (
          <GaugeBar
            title="Dòng tiền"
            valuePct={moneyFlowPct}
            max={200}
            thresholds={[
              { value: 80, label: "80%: rút" },
              { value: 120, label: "120%: mạnh" },
            ]}
            caption={`Khối lượng khớp lệnh VNINDEX hôm nay bằng ${moneyFlowPct.toFixed(0)}% trung bình 250 phiên gần nhất.`}
          />
        )}
        {sellPressurePct !== null && (
          <GaugeBar
            title="Lực bán"
            valuePct={sellPressurePct}
            max={100}
            thresholds={[
              { value: 33, label: "Yếu dần" },
              { value: 66, label: "Còn mạnh" },
            ]}
            caption={`${sellPressurePct.toFixed(0)}% mã trong danh mục theo dõi đang giảm giá hôm nay.`}
          />
        )}
      </div>

      <p className="mt-3 text-[10px] text-slate-400 dark:text-slate-500">
        Trạng thái tự động phân loại từ chỉ báo kỹ thuật của VNINDEX theo tuần; 2 chỉ số bên dưới cập nhật theo ngày
        từ dữ liệu thị trường thời gian thực — không phải khuyến nghị đầu tư.
      </p>
    </div>
  );
}
