import { usePolling } from "../hooks/usePolling";
import { fetchTradeJournal } from "../api/client";

// Performance of the signal system as a whole: every trade it has actually
// closed, across all stocks, from the forward-only journal on the server
// (recorded since journal.startDate, never backfilled). Same data as the
// "Đã đóng" tab of the signal list.

const POLL_MS = 5 * 60 * 1000;

function pct(n: number, digits: number, sign = false): string {
  const s = Math.abs(n).toLocaleString("vi-VN", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return `${n < 0 ? "−" : sign && n > 0 ? "+" : ""}${s}%`;
}

function dmy(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

function Tile({ label, value, tone }: { label: string; value: string | number; tone?: "up" | "down" }) {
  const color = tone === "up" ? "up" : tone === "down" ? "down" : "text-slate-900";
  return (
    <div className="fx-feature flex-[1_1_9rem] border-l border-slate-200 px-4 py-3 first:border-l-0">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-0.5 text-2xl font-bold leading-tight tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

export default function SystemPerformance() {
  const { data: journal } = usePolling(() => fetchTradeJournal(), [], POLL_MS);
  if (!journal) return null;

  const trades = journal.closed;
  const n = trades.length;
  const wins = trades.filter((t) => t.returnPercent > 0).length;
  const losses = trades.filter((t) => t.returnPercent < 0).length;
  const avg = n ? trades.reduce((a, t) => a + t.returnPercent, 0) / n : 0;
  const avgWin = wins ? trades.filter((t) => t.returnPercent > 0).reduce((a, t) => a + t.returnPercent, 0) / wins : 0;
  const avgLoss = losses
    ? trades.filter((t) => t.returnPercent < 0).reduce((a, t) => a + t.returnPercent, 0) / losses
    : 0;
  const avgHold = n ? trades.reduce((a, t) => a + t.holdingDays, 0) / n : 0;
  const best = n ? trades.reduce((a, t) => (t.returnPercent > a.returnPercent ? t : a)) : null;
  const worst = n ? trades.reduce((a, t) => (t.returnPercent < a.returnPercent ? t : a)) : null;
  const lastSell = n ? trades.reduce((a, t) => (t.sellDate > a ? t.sellDate : a), trades[0].sellDate) : null;

  return (
    <section aria-label="Hiệu suất hệ thống tín hiệu">
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h3 className="text-xl font-bold leading-snug text-brand-700">Hiệu suất hệ thống · tất cả các lệnh đã đóng</h3>
        <p className="text-sm text-slate-500">
          Lệnh thật từ {dmy(journal.startDate)}
          {lastSell ? ` – ${dmy(lastSell)}` : ""}
        </p>
      </div>

      {n === 0 ? (
        <p className="rounded-md border border-slate-200 px-4 py-4 text-base text-slate-600">
          Chưa có lệnh nào đóng kể từ {dmy(journal.startDate)}. Số liệu sẽ hiện ở đây khi hệ thống đóng lệnh đầu tiên.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap rounded-md border border-slate-200">
            <Tile label="Tổng lệnh đã đóng" value={n} />
            <Tile label="Thắng" value={wins} tone="up" />
            <Tile label="Thua" value={losses} tone="down" />
            <Tile label="Tỷ lệ thắng" value={pct((wins / n) * 100, 1)} />
            <Tile label="Lãi/lỗ trung bình mỗi lệnh" value={pct(avg, 2, true)} tone={avg > 0 ? "up" : avg < 0 ? "down" : undefined} />
            <Tile label="Giữ trung bình" value={`${Math.round(avgHold)} ngày`} />
          </div>
          <p className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
            <span>
              Lệnh thắng trung bình <b className="up">{pct(avgWin, 2, true)}</b>
            </span>
            <span>
              Lệnh thua trung bình <b className="down">{pct(avgLoss, 2, true)}</b>
            </span>
            {best && (
              <span>
                Lãi nhất <b className="text-slate-900">{best.symbol}</b> <b className="up">{pct(best.returnPercent, 2, true)}</b>
              </span>
            )}
            {worst && worst.returnPercent < 0 && (
              <span>
                Lỗ nhất <b className="text-slate-900">{worst.symbol}</b>{" "}
                <b className="down">{pct(worst.returnPercent, 2, true)}</b>
              </span>
            )}
          </p>
        </>
      )}
      <p className="mt-2 text-sm leading-normal text-slate-500">
        Ghi theo phiên đã đóng cửa, từ ngày bắt đầu trở đi, không dựng lại quá khứ. Lãi/lỗ tính từ giá đóng cửa phiên mua
        đến giá đóng cửa phiên bán, chưa trừ phí và thuế. Kết quả quá khứ không bảo đảm kết quả tương lai; không phải lời
        khuyên đầu tư.
      </p>
    </section>
  );
}
