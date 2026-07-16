import { useNavigate } from "react-router-dom";
import type { Quote } from "../types";
import { formatChange, formatPercent, formatPrice, formatVolume, trendClass } from "../utils/format";
import WatchButton from "./WatchButton";

export default function StockTable({ quotes }: { quotes: Quote[] }) {
  const navigate = useNavigate();

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3 font-medium">Mã</th>
            <th className="px-4 py-3 font-medium">Tên</th>
            <th className="px-4 py-3 text-right font-medium">Giá</th>
            <th className="px-4 py-3 text-right font-medium">Thay đổi</th>
            <th className="px-4 py-3 text-right font-medium">%</th>
            <th className="px-4 py-3 text-right font-medium">KL</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {quotes.map((q) => (
            <tr
              key={q.symbol}
              onClick={() => navigate(`/stock/${q.symbol}`)}
              className="cursor-pointer border-b border-slate-900 last:border-0 hover:bg-slate-900/60"
            >
              <td className="px-4 py-3 font-semibold text-slate-100">{q.symbol}</td>
              <td className="max-w-[200px] truncate px-4 py-3 text-slate-400">{q.name}</td>
              <td className="px-4 py-3 text-right tabular-nums text-slate-100">
                {formatPrice(q.price, q.currency)}
              </td>
              <td className={`px-4 py-3 text-right tabular-nums ${trendClass(q.change)}`}>
                {formatChange(q.change, q.currency)}
              </td>
              <td className={`px-4 py-3 text-right tabular-nums ${trendClass(q.changePercent)}`}>
                {formatPercent(q.changePercent)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-slate-400">
                {formatVolume(q.volume)}
              </td>
              <td className="px-4 py-3 text-right">
                <WatchButton symbol={q.symbol} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
