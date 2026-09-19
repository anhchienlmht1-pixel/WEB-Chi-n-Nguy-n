import { useMemo } from "react";
import { fetchMarketOverview } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { computeForeignFlowRows } from "../utils/foreignFlow";
import ForeignFlowChart from "../components/ForeignFlowChart";
import ForeignFlowBoard from "../components/ForeignFlowBoard";

export default function ForeignFlow() {
  const { data } = usePolling(fetchMarketOverview, [], 10000);

  const rows = useMemo(() => computeForeignFlowRows(data?.quotes ?? []), [data]);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      <div className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-600 dark:text-slate-400">Dòng tiền khối ngoại</h2>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">Giao dịch khối ngoại theo mã cổ phiếu</h1>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900/40">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {data ? "Nguồn dữ liệu hiện tại chưa cung cấp giao dịch khối ngoại." : "Đang tải dữ liệu..."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <ForeignFlowChart rows={rows} />
          <ForeignFlowBoard rows={rows} />
        </div>
      )}
    </div>
  );
}
