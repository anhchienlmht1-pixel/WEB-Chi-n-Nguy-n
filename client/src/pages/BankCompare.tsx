import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { usePolling } from "../hooks/usePolling";
import { fetchBankPbHistory } from "../api/client";
import { BANK_SYMBOL_LIST, CORE_METRIC_KEYS, METRIC_META, fetchBankData, formatMetricValue } from "../utils/bankData";
import { computePbStatsFromHistory, getPbDataCoverage, pbWindowExceedsCoverage, type PbLookbackYears } from "../utils/pbHistory";
import type { BankData, BankMetricKey, BankOverviewRow } from "../types/bank";
import BankDetailView from "../components/BankDetailView";
import BankMetricComparisonTable from "../components/BankMetricComparisonTable";
import PbRangeChart from "../components/PbRangeChart";
import CompanyLogo from "../components/CompanyLogo";

type SortDir = "asc" | "desc";
type Tab = "compare" | "metric" | "detail" | "pb";
type PeriodType = "quarter" | "year";

const GROUP_ORDER = ["Quốc doanh", "Doanh nghiệp", "Cá nhân", "Quy mô nhỏ", ""];
const PB_POLL_MS = 5 * 60 * 1000; // server caches the underlying VCI scan for 1h — no point polling faster

function buildRow(bank: BankData, periodType: PeriodType, periodIndex: number): BankOverviewRow {
  const periodData = periodType === "quarter" ? bank.quarter : bank.year;
  const idx = Math.min(periodIndex, periodData.periods.length - 1);
  const row: Partial<BankOverviewRow> = {
    symbol: bank.symbol,
    name: bank.name,
    group: bank.group,
    exchange: bank.exchange,
    period: periodData.periods[idx] ?? "—",
  };
  for (const key of Object.keys(periodData.metrics) as BankMetricKey[]) {
    row[key] = periodData.metrics[key][idx] ?? null;
  }
  return row as BankOverviewRow;
}

// Matches the source Excel's own "Tổng quan" sheet: every bank, one row
// each — sortable by any of the 14 core ratios, and (unlike a plain
// snapshot of the sheet) adjustable to any quarter or year the user
// picks, since every bank's full quarter+year series is already
// available from the "Cơ bản" export. A second tab ("Chi tiết mã ngân
// hàng") replicates that same workbook's much deeper per-bank "Chi tiết"
// dashboard sheet (see BankDetailView).
export default function BankCompare() {
  const { data: banks, error, loading } = usePolling(
    () => Promise.all(BANK_SYMBOL_LIST.map((s) => fetchBankData(s))),
    []
  );
  const [sortKey, setSortKey] = useState<BankMetricKey>("roe4q");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [tab, setTab] = useState<Tab>("compare");
  const [detailSymbol, setDetailSymbol] = useState<string>(BANK_SYMBOL_LIST[0]);
  const [periodType, setPeriodType] = useState<PeriodType>("quarter");
  const [periodIndex, setPeriodIndex] = useState<number | null>(null);
  const [pbYears, setPbYears] = useState<PbLookbackYears>(1);

  // P/B pulled live from VCI's ratio endpoint (quarterly) for every bank —
  // only fetched while the tab is open, refreshed every 5 min. Switching
  // "Thời gian" (1/3/5 năm) below just recomputes current/average/min/max
  // client-side from whatever table is already cached, no extra fetch.
  const { data: pbHistory, error: pbError, loading: pbLoading } = usePolling(
    async () => {
      if (tab !== "pb") return null;
      return fetchBankPbHistory();
    },
    [tab],
    PB_POLL_MS
  );

  const pbStats = useMemo(() => {
    if (!pbHistory) return null;
    return computePbStatsFromHistory(pbHistory, pbYears);
  }, [pbHistory, pbYears]);

  const pbCoverage = useMemo(() => (pbHistory ? getPbDataCoverage(pbHistory) : null), [pbHistory]);
  const pbWindowCapped = pbCoverage !== null && pbWindowExceedsCoverage(pbCoverage, pbYears);

  const periods = useMemo(() => {
    if (!banks || banks.length === 0) return [];
    return (periodType === "quarter" ? banks[0].quarter : banks[0].year).periods;
  }, [banks, periodType]);
  const activeIndex = periodIndex ?? periods.length - 1;

  const rows = useMemo(() => {
    if (!banks) return [];
    return banks.map((b) => buildRow(b, periodType, activeIndex));
  }, [banks, periodType, activeIndex]);

  const sortedBanks = useMemo(() => {
    const list = [...rows];
    list.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return list;
  }, [rows, sortKey, sortDir]);

  const groupedByGroup = useMemo(() => {
    const groups = new Map<string, BankOverviewRow[]>();
    for (const row of sortedBanks) {
      const key = row.group || "";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }
    return groups;
  }, [sortedBanks]);

  function toggleSort(key: BankMetricKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function changePeriodType(pt: PeriodType) {
    setPeriodType(pt);
    setPeriodIndex(null);
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">So sánh ngân hàng</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        27 ngân hàng niêm yết, tại kỳ {rows[0]?.period ?? "gần nhất"}. Bấm vào tiêu đề cột để sắp xếp.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="flex w-fit gap-1 rounded-lg border border-slate-200 p-1 text-xs font-medium dark:border-slate-800">
          {(
            [
              ["compare", "Bảng so sánh"],
              ["metric", "So sánh chỉ số"],
              ["pb", "So sánh P/B"],
              ["detail", "Chi tiết mã ngân hàng"],
            ] as [Tab, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                tab === value
                  ? "bg-emerald-500 text-slate-950"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "compare" && periods.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-lg border border-slate-200 p-1 text-xs font-medium dark:border-slate-800">
              {(["quarter", "year"] as PeriodType[]).map((pt) => (
                <button
                  key={pt}
                  type="button"
                  onClick={() => changePeriodType(pt)}
                  className={`rounded-md px-3 py-1 transition-colors ${
                    periodType === pt
                      ? "bg-emerald-500 text-slate-950"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                  }`}
                >
                  {pt === "year" ? "Năm" : "Quý"}
                </button>
              ))}
            </div>
            <select
              value={activeIndex}
              onChange={(e) => setPeriodIndex(Number(e.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              {periods.map((p, i) => (
                <option key={`${p}-${i}`} value={i}>
                  {p}
                </option>
              )).reverse()}
            </select>
          </div>
        )}

        {tab === "pb" && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Thời gian</span>
            <div className="flex gap-1 rounded-lg border border-slate-200 p-1 text-xs font-medium dark:border-slate-800">
              {([1, 3, 5] as PbLookbackYears[]).map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setPbYears(y)}
                  className={`rounded-md px-3 py-1 transition-colors ${
                    pbYears === y
                      ? "bg-emerald-500 text-slate-950"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                  }`}
                >
                  {y} Năm
                </button>
              ))}
            </div>
            {pbCoverage && (
              <span className="text-xs text-slate-400 dark:text-slate-500">
                Dữ liệu: {pbCoverage.earliestLabel} – {pbCoverage.latestLabel}
              </span>
            )}
          </div>
        )}
      </div>

      {tab === "pb" && (
        <div className="mt-4">
          {pbLoading && !pbStats && (
            <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-6 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              ))}
            </div>
          )}
          {!pbLoading && (pbError || !pbStats) && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-red-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-red-400">
              Không tải được dữ liệu P/B{pbError ? `: ${pbError}` : ""}.
            </div>
          )}
          {pbStats && pbCoverage && pbWindowCapped && (
            <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-400">
              Nguồn dữ liệu hiện chỉ có P/B từ <strong>{pbCoverage.earliestLabel}</strong> — khoảng "{pbYears} Năm"
              đã hiển thị toàn bộ lịch sử có sẵn, nên có thể giống với khoảng thời gian ngắn hơn.
            </div>
          )}
          {pbStats && (
            <>
              <PbRangeChart data={pbStats} title="So sánh P/B ngành ngân hàng" />
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                Dữ liệu P/B theo quý, lấy trực tiếp từ báo cáo tài chính công bố (nguồn: Vietcap) — không phải khuyến
                nghị đầu tư từ hệ thống.
              </p>
            </>
          )}
        </div>
      )}

      {tab === "metric" && (
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
          {loading && (
            <div className="space-y-2 p-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-6 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              ))}
            </div>
          )}
          {!loading && (error || !banks) && (
            <div className="p-4 text-sm text-red-500 dark:text-red-400">
              Không tải được dữ liệu so sánh{error ? `: ${error}` : ""}.
            </div>
          )}
          {!loading && banks && <BankMetricComparisonTable banks={banks} />}
        </div>
      )}

      {tab === "detail" && (
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
          <BankDetailView symbol={detailSymbol} onSymbolChange={setDetailSymbol} />
        </div>
      )}

      {tab === "compare" && (
      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
        {loading && (
          <div className="space-y-2 p-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-6 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        )}

        {!loading && (error || !banks) && (
          <div className="p-4 text-sm text-red-500 dark:text-red-400">
            Không tải được dữ liệu so sánh{error ? `: ${error}` : ""}.
          </div>
        )}

        {!loading && banks && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
                  <th className="sticky left-0 z-10 bg-white px-4 py-3 font-medium text-slate-500">
                    Ngân hàng
                  </th>
                  {CORE_METRIC_KEYS.map((key) => (
                    <th key={key} className="whitespace-nowrap px-3 py-3 text-right font-medium">
                      <button
                        type="button"
                        onClick={() => toggleSort(key)}
                        className={`inline-flex items-center gap-1 transition-colors ${
                          sortKey === key
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "hover:text-slate-900 dark:hover:text-slate-100"
                        }`}
                      >
                        {METRIC_META[key].label}
                        {sortKey === key && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {GROUP_ORDER.filter((g) => groupedByGroup.has(g)).map((group) => (
                  <BankGroupRows key={group || "khac"} group={group} rows={groupedByGroup.get(group) ?? []} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}
    </div>
  );
}

function BankGroupRows({ group, rows }: { group: string; rows: BankOverviewRow[] }) {
  return (
    <>
      {group && (
        <tr>
          <td
            colSpan={CORE_METRIC_KEYS.length + 1}
            className="sticky left-0 bg-slate-50 px-4 py-1.5 text-xs font-semibold text-slate-500 dark:bg-slate-900/80 dark:text-slate-400"
          >
            {group}
          </td>
        </tr>
      )}
      {rows.map((row) => (
        <tr
          key={row.symbol}
          className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900/60"
        >
          <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-2.5">
            <Link to={`/stock/${row.symbol}`} className="flex items-center gap-2">
              <CompanyLogo symbol={row.symbol} />
              <span className="font-semibold text-slate-900 hover:text-emerald-600">{row.symbol}</span>
              <span className="text-xs text-slate-400">{row.exchange}</span>
            </Link>
          </td>
          {CORE_METRIC_KEYS.map((key) => (
            <td
              key={key}
              className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-300"
            >
              {formatMetricValue(row[key], METRIC_META[key].format)}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
