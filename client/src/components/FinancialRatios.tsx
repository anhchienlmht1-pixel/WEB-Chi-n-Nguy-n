import { useEffect, useMemo, useState } from "react";
import { fetchFinancials } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import type { FinancialPeriodType, FinancialReportType } from "../types";
import { formatFinancialValue } from "../utils/format";
import ProfitChart from "./ProfitChart";
import RatioTrendChart from "./RatioTrendChart";
import { sortPeriodIndices } from "../utils/period";
import { buildFinancialTree, type FinancialTreeNode } from "../utils/financials";

const REPORT_TABS: { value: FinancialReportType; label: string }[] = [
  { value: "CSTC", label: "Chỉ số tài chính" },
  { value: "KQKD", label: "Kết quả kinh doanh" },
  { value: "CDKT", label: "Cân đối kế toán" },
  { value: "LCTT", label: "Lưu chuyển tiền tệ" },
];

export default function FinancialRatios({ symbol }: { symbol: string }) {
  const [reportType, setReportType] = useState<FinancialReportType>("CSTC");
  const [periodType, setPeriodType] = useState<FinancialPeriodType>("quarter");
  // Ids of collapsed parent rows (Excel-style outline groups) — a row with
  // children can be toggled shut to hide its subtree without losing the
  // subtotal line itself.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const { data, error, loading } = usePolling(
    () => fetchFinancials(symbol, reportType, periodType),
    [symbol, reportType, periodType]
  );

  // A fresh report (new symbol/report type/period type) starts fully
  // expanded — collapse state shouldn't leak between unrelated reports.
  useEffect(() => {
    setCollapsed(new Set());
  }, [symbol, reportType, periodType]);

  function toggle(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Oldest column first, newest last — same left-to-right timeline
  // convention as the charts above, sorted by the actual year/quarter
  // parsed out of each label rather than assumed array order (KBS's raw
  // order isn't reliably oldest-first or newest-first).
  const displayPeriods = useMemo(() => {
    if (!data) return [];
    return sortPeriodIndices(data.periods, "asc").map((index) => ({ label: data.periods[index], index }));
  }, [data]);

  const tree = useMemo(() => (data ? buildFinancialTree(data.items) : []), [data]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
        <div className="flex flex-wrap gap-1.5">
          {REPORT_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setReportType(tab.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                reportType === tab.value
                  ? "bg-emerald-500 text-slate-950"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-lg border border-slate-200 p-1 text-xs font-medium dark:border-slate-800">
          {(["year", "quarter"] as FinancialPeriodType[]).map((pt) => (
            <button
              key={pt}
              type="button"
              onClick={() => setPeriodType(pt)}
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
      </div>

      {loading && (
        <div className="space-y-2 p-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-5 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      )}

      {!loading && (error || !data) && (
        <div className="p-4 text-sm text-red-500 dark:text-red-400">
          Không thể tải dữ liệu tài chính cho {symbol}{error ? `: ${error}` : ""}.
        </div>
      )}

      {!loading && data && data.items.length === 0 && (
        <div className="p-4 text-sm text-slate-500 dark:text-slate-400">Chưa có dữ liệu.</div>
      )}

      {!loading && data && data.items.length > 0 && reportType === "KQKD" && <ProfitChart report={data} />}
      {!loading && data && data.items.length > 0 && reportType === "CSTC" && <RatioTrendChart report={data} />}

      {!loading && data && data.items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
                <th className="sticky left-0 z-10 bg-white px-4 py-3 font-medium dark:bg-slate-900">
                  Chỉ tiêu
                </th>
                {displayPeriods.map((p) => (
                  <th key={p.index} className="whitespace-nowrap px-4 py-3 text-right font-medium">
                    {p.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tree.map((node) => (
                <FinancialTreeRows
                  key={node.item.id}
                  node={node}
                  displayPeriods={displayPeriods}
                  collapsed={collapsed}
                  onToggle={toggle}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// One outline row plus (if expanded) its subtree, recursively — the
// Excel-style parent/child grouping: Tài sản > Tài sản hiện hành > Tiền
// mặt/Khoản phải thu/Hàng tồn kho, Tài sản cố định, siblings Nợ/Vốn, etc.
// Guide lines (border-l) at each ancestor depth mimic the ├─/└─ connectors
// of an outline view without needing to draw one explicitly per row.
function FinancialTreeRows({
  node,
  displayPeriods,
  collapsed,
  onToggle,
}: {
  node: FinancialTreeNode;
  displayPeriods: { label: string; index: number }[];
  collapsed: Set<string>;
  onToggle: (id: string) => void;
}) {
  const { item, children } = node;
  const hasChildren = children.length > 0;
  const isOpen = !collapsed.has(item.id);

  return (
    <>
      <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900/60">
        <td
          className="sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-2.5 text-slate-600 dark:bg-slate-900/40 dark:text-slate-300"
          style={{ paddingLeft: `${1 + item.levels * 1.25}rem` }}
        >
          <span className="inline-flex items-center gap-1.5">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => onToggle(item.id)}
                aria-label={isOpen ? "Thu gọn" : "Mở rộng"}
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-slate-300 text-[9px] leading-none text-slate-500 hover:border-emerald-500 hover:text-emerald-600 dark:border-slate-600 dark:text-slate-400 dark:hover:border-emerald-400 dark:hover:text-emerald-400"
              >
                {isOpen ? "−" : "+"}
              </button>
            ) : (
              <span className="w-4 shrink-0" />
            )}
            <span className={item.levels === 0 ? "font-semibold text-slate-900 dark:text-slate-100" : ""}>
              {item.name}
            </span>
            {item.unit && (
              <span className="text-xs text-slate-400 dark:text-slate-500">({item.unit})</span>
            )}
          </span>
        </td>
        {displayPeriods.map((p) => (
          <td
            key={p.index}
            className={`whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-300 ${
              item.levels === 0 ? "font-semibold text-slate-900 dark:text-slate-100" : ""
            }`}
          >
            {formatFinancialValue(item.values[p.index], item.unit)}
          </td>
        ))}
      </tr>
      {isOpen &&
        children.map((child) => (
          <FinancialTreeRows
            key={child.item.id}
            node={child}
            displayPeriods={displayPeriods}
            collapsed={collapsed}
            onToggle={onToggle}
          />
        ))}
    </>
  );
}
