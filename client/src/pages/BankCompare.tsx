import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { usePolling } from "../hooks/usePolling";
import { fetchHistory, fetchQuote } from "../api/client";
import { BANK_SYMBOL_LIST, CORE_METRIC_KEYS, METRIC_META, fetchBankData, formatMetricValue } from "../utils/bankData";
import { PB_COMPARE_SYMBOLS, computeBankPbStat, type PbLookbackYears } from "../utils/bankPb";
import type { BankData, BankMetricKey, BankOverviewRow } from "../types/bank";
import BankDetailView from "../components/BankDetailView";
import BankMetricComparisonTable from "../components/BankMetricComparisonTable";
import BankPbRangeChart from "../components/BankPbRangeChart";
import CompanyLogo from "../components/CompanyLogo";

type SortDir = "asc" | "desc";
type Tab = "compare" | "metric" | "detail" | "pb";
type PeriodType = "quarter" | "year";

const GROUP_ORDER = ["Quốc doanh", "Doanh nghiệp", "Cá nhân", "Quy mô nhỏ", ""];

function errorText(reason: unknown): string {
  return (reason instanceof Error ? reason.message : String(reason)).slice(0, 150);
}

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

  // Quotes + 5-year price history are only fetched once the "So sánh P/B"
  // tab is opened, and only once — switching the "Thời gian" (1/3/5 năm)
  // window below just recomputes stats from this cached data, no refetch.
  // allSettled (not all) so one bank's provider hiccup only blanks that
  // one bar instead of failing the whole 16-bank chart.
  const { data: pbRaw, error: pbError, loading: pbLoading } = usePolling(async () => {
    if (tab !== "pb") return null;
    const [quoteResults, historyResults] = await Promise.all([
      Promise.allSettled(PB_COMPARE_SYMBOLS.map((s) => fetchQuote(s))),
      Promise.allSettled(PB_COMPARE_SYMBOLS.map((s) => fetchHistory(s, "5Y"))),
    ]);
    return { quoteResults, historyResults };
  }, [tab]);

  const pbStats = useMemo(() => {
    if (!pbRaw || !banks) return null;
    const bankBySymbol = new Map(banks.map((b) => [b.symbol, b]));
    const since = new Date();
    since.setFullYear(since.getFullYear() - pbYears);
    return PB_COMPARE_SYMBOLS.map((symbol, i) => {
      const bank = bankBySymbol.get(symbol);
      const quoteResult = pbRaw.quoteResults[i];
      const historyResult = pbRaw.historyResults[i];
      if (!bank || quoteResult.status !== "fulfilled" || historyResult.status !== "fulfilled") {
        return { symbol, current: null, average: null, min: null, max: null };
      }
      return computeBankPbStat(quoteResult.value, bank, historyResult.value.points, since);
    });
  }, [pbRaw, banks, pbYears]);

  // Every bank came back null — either every request failed, or requests
  // succeeded but the provider didn't return marketCap for any of them.
  // Promise.allSettled means neither shows up as a top-level pbError, so
  // this builds a diagnostic message from the individual results instead
  // of the chart just rendering empty with no explanation.
  const pbAllEmpty = pbStats !== null && pbStats.every((s) => s.current == null && s.average == null);
  const pbDiagnostic = useMemo(() => {
    if (!pbRaw || !pbAllEmpty) return null;
    const reasons: string[] = [];
    let missingMarketCap = 0;
    PB_COMPARE_SYMBOLS.forEach((symbol, i) => {
      const q = pbRaw.quoteResults[i];
      const h = pbRaw.historyResults[i];
      if (q.status === "rejected") reasons.push(`${symbol} (giá): ${errorText(q.reason)}`);
      else if (!q.value.marketCap) missingMarketCap++;
      if (h.status === "rejected") reasons.push(`${symbol} (lịch sử giá): ${errorText(h.reason)}`);
    });
    const parts: string[] = [];
    if (reasons.length > 0) parts.push(reasons.slice(0, 3).join(" | "));
    if (missingMarketCap > 0) parts.push(`${missingMarketCap}/${PB_COMPARE_SYMBOLS.length} mã tải giá thành công nhưng thiếu vốn hóa thị trường`);
    return parts.join(". ") || "Không rõ nguyên nhân.";
  }, [pbRaw, pbAllEmpty]);

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
          {!pbLoading && pbStats && pbAllEmpty && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400">
              Không tính được P/B cho ngân hàng nào — tất cả nguồn giá/lịch sử giá đều lỗi hoặc thiếu vốn hóa thị
              trường. Chi tiết: {pbDiagnostic}
            </div>
          )}
          {pbStats && !pbAllEmpty && (
            <>
              <BankPbRangeChart data={pbStats} title="So sánh P/B ngành ngân hàng" />
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                P/B lịch sử ước tính từ giá đóng cửa và vốn chủ sở hữu theo quý thực tế, áp dụng số lượng cổ phiếu lưu
                hành hiện tại cho các mốc thời gian trong quá khứ (không có dữ liệu số lượng cổ phiếu lưu hành lịch
                sử) — có thể lệch với ngân hàng từng phát hành thêm cổ phiếu đáng kể trong giai đoạn so sánh.
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
