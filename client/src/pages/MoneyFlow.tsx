import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMoneyFlow } from "../api/client";
import { usePolling } from "../hooks/usePolling";

type SortDir = "asc" | "desc";

export default function MoneyFlow() {
  // Matches the server's own 5 min cache TTL (server/src/routes/stocks.ts's
  // /money-flow) — no point polling faster than the sheet can change.
  const { data, error, loading } = usePolling(fetchMoneyFlow, [], 5 * 60 * 1000);
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<string>("symbol");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Column set + order come straight from the sheet's own header row
  // (server/src/providers/moneyFlowSheet.ts) instead of being hard-coded —
  // whatever the sheet is actually called, this shows it as-is.
  const columns = useMemo(() => {
    const first = data?.items.find((r) => Object.keys(r.metrics).length > 0);
    return first ? Object.keys(first.metrics) : [];
  }, [data]);

  const sorted = useMemo(() => {
    if (!data) return [];
    const list = [...data.items];
    list.sort((a, b) => {
      const av = sortKey === "symbol" ? a.symbol : a.metrics[sortKey] ?? "";
      const bv = sortKey === "symbol" ? b.symbol : b.metrics[sortKey] ?? "";
      const an = Number(av.replace(/,/g, ""));
      const bn = Number(bv.replace(/,/g, ""));
      const cmp =
        Number.isFinite(an) && Number.isFinite(bn) && av !== "" && bv !== ""
          ? an - bn
          : av.localeCompare(bv, "vi");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [data, sortKey, sortDir]);

  function toggleSort(key: string) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function SortHeader({ label, keyValue }: { label: string; keyValue: string }) {
    return (
      <th className="px-4 py-3 text-right font-medium">
        <button
          type="button"
          onClick={() => toggleSort(keyValue)}
          className={`inline-flex items-center gap-1 transition-colors ${
            sortKey === keyValue
              ? "text-emerald-600 dark:text-emerald-400"
              : "hover:text-slate-900 dark:hover:text-slate-100"
          }`}
        >
          {label}
          {sortKey === keyValue && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
        </button>
      </th>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Sức mạnh dòng tiền</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Dữ liệu cập nhật từ Google Sheet, một hàng mỗi mã.
        </p>
      </div>

      {loading && !data && <p className="text-slate-500 dark:text-slate-400">Đang tải dữ liệu...</p>}

      {error && !data && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
          <p className="font-medium text-red-600 dark:text-red-400">Lỗi tải dữ liệu</p>
          <p className="mt-1 text-sm text-red-500 dark:text-red-300/90">{error}</p>
        </div>
      )}

      {data && data.items.length === 0 && (
        <p className="text-slate-500 dark:text-slate-400">Chưa có dữ liệu.</p>
      )}

      {data && data.items.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
                <th className="px-4 py-3 font-medium">
                  <button
                    type="button"
                    onClick={() => toggleSort("symbol")}
                    className={`inline-flex items-center gap-1 transition-colors ${
                      sortKey === "symbol"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "hover:text-slate-900 dark:hover:text-slate-100"
                    }`}
                  >
                    Mã
                    {sortKey === "symbol" && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                  </button>
                </th>
                {columns.map((c) => (
                  <SortHeader key={c} label={c} keyValue={c} />
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr
                  key={r.symbol}
                  onClick={() => navigate(`/stock/${r.symbol}`)}
                  className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900/60"
                >
                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{r.symbol}</td>
                  {columns.map((c) => (
                    <td
                      key={c}
                      className={`px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300 ${
                        c === r.primaryLabel ? "font-semibold text-slate-900 dark:text-slate-100" : ""
                      }`}
                    >
                      {r.metrics[c] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
