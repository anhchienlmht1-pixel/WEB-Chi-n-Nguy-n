import type { RawRecord } from "../api/client";
import { fetchCompanyDividends, fetchCompanyEvents, fetchCompanyInsiderTrading } from "../api/client";
import { usePolling } from "../hooks/usePolling";

// KBS's /event and /news/internal-trading endpoints aren't field-mapped by
// vnstock's own KBS explorer (unlike the profile endpoint's Leaders/
// Shareholders/Subsidiaries, which have an exact map) — so instead of
// guessing which raw key means what, each record is rendered as whatever
// key/value pairs KBS actually sent, with keys turned into a readable
// label. Loses the "biggest number first" polish of a hand-picked column
// set, but shows real data instead of possibly-wrong labels.
function labelFor(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
  return spaced;
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") return v.toLocaleString("vi-VN");
  return String(v);
}

function RawRecordCard({ record }: { record: RawRecord }) {
  const entries = Object.entries(record).filter(([, v]) => v !== null && v !== undefined && v !== "");
  if (entries.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-md border border-slate-100 p-2.5 text-xs dark:border-slate-800 sm:grid-cols-3">
      {entries.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <div className="truncate text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {labelFor(k)}
          </div>
          <div className="truncate text-slate-700 dark:text-slate-300">{formatValue(v)}</div>
        </div>
      ))}
    </div>
  );
}

type PanelKind = "events" | "dividends" | "insider";

const PANEL_CONFIG: Record<PanelKind, { title: string; subtitle: string; emptyText: string }> = {
  events: {
    title: "Sự kiện doanh nghiệp",
    subtitle: "Đại hội cổ đông, phát hành, chia tách... từ KBS",
    emptyText: "Chưa có sự kiện nào.",
  },
  dividends: {
    title: "Cổ tức",
    subtitle: "Lịch sử chi trả cổ tức từ KBS",
    emptyText: "Chưa có dữ liệu cổ tức.",
  },
  insider: {
    title: "Giao dịch nội bộ",
    subtitle: "Lãnh đạo / cổ đông nội bộ mua bán cổ phiếu, từ KBS",
    emptyText: "Chưa có giao dịch nội bộ nào.",
  },
};

export default function CorporateEventsPanel({ symbol, kind }: { symbol: string; kind: PanelKind }) {
  const fetcher =
    kind === "events"
      ? () => fetchCompanyEvents(symbol)
      : kind === "dividends"
        ? () => fetchCompanyDividends(symbol)
        : () => fetchCompanyInsiderTrading(symbol);

  const { data, error, loading } = usePolling(fetcher, [symbol, kind], 30 * 60 * 1000);
  const config = PANEL_CONFIG[kind];
  const items = data?.items ?? [];

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
      <div className="border-b border-slate-200 p-4 dark:border-slate-800">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
          {config.title} — {symbol}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">{config.subtitle}</p>
      </div>

      {loading && !data && (
        <div className="space-y-2 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="p-4 text-sm text-red-500 dark:text-red-400">Không tải được dữ liệu: {error}</div>
      )}

      {items.length > 0 && (
        <div className="space-y-2 p-4">
          {items.map((r, i) => (
            <RawRecordCard key={i} record={r} />
          ))}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="p-4 text-sm text-slate-500 dark:text-slate-400">{config.emptyText}</div>
      )}
    </div>
  );
}
