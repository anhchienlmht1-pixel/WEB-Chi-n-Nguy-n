import { Landmark } from "lucide-react";
import { usePolling } from "../hooks/usePolling";
import { fetchBankDepositRates, type BankDepositRateRow } from "../api/client";

const TERM_KEYS = ["1", "3", "6", "9", "12", "13", "18", "24", "36"] as const;

function average(row: BankDepositRateRow): number | null {
  const values = TERM_KEYS.map((k) => row.terms[k]).filter((v): v is number => v !== null);
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// "Lãi suất huy động trung bình" — snapshot tĩnh lấy từ SSI (không có
// lãi suất cho vay: SSI không có nguồn nào cho mục này, chỉ có lãi suất
// tiền gửi theo kỳ hạn của từng ngân hàng). Xem data/bankDepositRates.ts
// phía server — bảng này không tự cập nhật theo thời gian thực.
export default function BankDepositRateTable() {
  const { data } = usePolling(() => fetchBankDepositRates(), [], 30 * 60 * 1000);

  if (!data || data.banks.length === 0) return null;

  const rows = data.banks
    .map((row) => ({ row, avg: average(row) }))
    .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <Landmark className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
          Lãi suất huy động trung bình
        </h3>
        <span className="text-xs text-slate-500 dark:text-slate-400">Cập nhật: {formatDate(data.asOf)}</span>
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Lãi suất tiền gửi (%/năm) theo kỳ hạn của 11 ngân hàng, nguồn SSI — snapshot tĩnh, không gồm lãi suất cho vay
        (không có nguồn dữ liệu cho mục này).
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[720px] text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <th className="sticky left-0 bg-white py-1.5 pr-3 font-medium dark:bg-slate-900/40">Ngân hàng</th>
              {TERM_KEYS.map((k) => (
                <th key={k} className="px-2 py-1.5 text-right font-medium tabular-nums">
                  {k} th
                </th>
              ))}
              <th className="pl-2 py-1.5 text-right font-semibold">Bình quân</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ row, avg }) => (
              <tr key={row.bank} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                <td className="sticky left-0 bg-white py-1.5 pr-3 font-medium text-slate-900 dark:bg-slate-900/40 dark:text-slate-100">
                  {row.bank}
                </td>
                {TERM_KEYS.map((k) => (
                  <td key={k} className="px-2 py-1.5 text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {row.terms[k] !== null ? row.terms[k]!.toFixed(2) : "—"}
                  </td>
                ))}
                <td className="pl-2 py-1.5 text-right font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  {avg !== null ? `${avg.toFixed(2)}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">
        "Bình quân" tính trên các kỳ hạn có sản phẩm thực tế (loại bỏ kỳ hạn ngân hàng không công bố). Không gồm tiền
        gửi không kỳ hạn. Không phải khuyến nghị đầu tư.
      </p>
    </div>
  );
}
