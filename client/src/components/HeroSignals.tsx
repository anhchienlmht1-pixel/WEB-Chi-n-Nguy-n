import { Link } from "react-router-dom";
import { usePolling } from "../hooks/usePolling";
import { fetchTrendBuyResult, fetchTradeJournal } from "../api/client";
import { formatPrice } from "../utils/format";

// Opening block of the Giới thiệu page: what the last closed session changed in
// the signal list (new buys, exits) and the system's real track record, so a
// visitor sees in a few seconds what the site is for. Data: the same scan and
// forward-only trade journal as the signal list on the home page.

const POLL_MS = 5 * 60 * 1000;
const LINE = "border-[rgba(213,223,204,0.16)]";
const WEEKDAY = ["Chủ nhật", "thứ Hai", "thứ Ba", "thứ Tư", "thứ Năm", "thứ Sáu", "thứ Bảy"];

const day = (iso: string) => iso.slice(0, 10);
function dmy(iso: string): string {
  const [y, m, d] = day(iso).split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}
function dm(iso: string): string {
  const [, m, d] = day(iso).split("-");
  return d && m ? `${d}/${m}` : iso;
}
function weekday(iso: string): string {
  const [y, m, d] = day(iso).split("-").map(Number);
  if (!y || !m || !d) return "";
  return WEEKDAY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}
function pct(n: number, digits = 1, sign = true): string {
  const s = Math.abs(n).toLocaleString("vi-VN", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return `${n < 0 ? "−" : sign && n > 0 ? "+" : ""}${s}%`;
}
const tone = (n: number) => (n > 0 ? "text-[#3fd07a]" : n < 0 ? "text-[#ff5c5c]" : "text-[#d5dfcc]");

type Row = { key: string; kind: "MUA" | "BÁN" | "GIỮ"; symbol: string; note: string; value: string; valueCls: string };

function SignalRow({ r }: { r: Row }) {
  const badge =
    r.kind === "MUA"
      ? "bg-[rgba(63,208,122,0.16)] text-[#3fd07a]"
      : r.kind === "BÁN"
        ? "bg-[rgba(255,92,92,0.14)] text-[#ff5c5c]"
        : "bg-[rgba(185,203,169,0.12)] text-[#b9cba9]";
  return (
    <li className={`border-b last:border-b-0 ${LINE}`}>
      <Link
        to={`/stock/${r.symbol}`}
        className="fx-row grid min-h-12 grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 transition-colors duration-200 hover:bg-[rgba(127,214,168,0.06)]"
      >
        <span className={`inline-flex h-6.5 items-center justify-center rounded text-xs font-bold ${badge}`}>{r.kind}</span>
        <span className="min-w-0 truncate">
          <b className="text-lg text-[#fff]">{r.symbol}</b> <span className="text-sm text-[#8fa882]">{r.note}</span>
        </span>
        <b className={`text-lg tabular-nums ${r.valueCls}`}>{r.value}</b>
      </Link>
    </li>
  );
}

export default function HeroSignals() {
  const { data: scan } = usePolling(() => fetchTrendBuyResult(), [], POLL_MS);
  const { data: journal } = usePolling(() => fetchTradeJournal(), [], POLL_MS);

  const session = scan?.sessionDate ?? "";
  const holding = Array.isArray(scan?.items) ? scan.items : [];
  const buys = session ? holding.filter((h) => day(h.buyDate) === session) : [];
  const closedAll = Array.isArray(journal?.closed) ? journal.closed : [];
  const exits = session ? closedAll.filter((t) => day(t.sellDate) === session) : [];

  let rows: Row[] = [
    ...buys.map((h) => ({
      key: "b" + h.symbol,
      kind: "MUA" as const,
      symbol: h.symbol,
      note: `vào ${dm(h.buyDate)}`,
      value: formatPrice(h.buyPrice, h.currency),
      valueCls: "text-[#3fd07a]",
    })),
    ...exits.map((t) => ({
      key: "s" + t.symbol + t.sellDate,
      kind: "BÁN" as const,
      symbol: t.symbol,
      note: `giữ ${t.holdingDays} ngày`,
      value: pct(t.returnPercent),
      valueCls: tone(t.returnPercent),
    })),
  ];
  // Quiet session: show what the system is holding instead of an empty box.
  const quiet = rows.length === 0;
  if (quiet) {
    rows = [...holding]
      .sort((a, b) => b.signalReturnPercent - a.signalReturnPercent)
      .slice(0, 4)
      .map((h) => ({
        key: "h" + h.symbol,
        kind: "GIỮ" as const,
        symbol: h.symbol,
        note: `từ ${dm(h.buyDate)}`,
        value: pct(h.signalReturnPercent),
        valueCls: tone(h.signalReturnPercent),
      }));
  }

  const closed = closedAll;
  const n = closed.length;
  const wins = closed.filter((t) => t.returnPercent > 0);
  const losses = closed.filter((t) => t.returnPercent < 0);
  const avg = (xs: typeof closed) => (xs.length ? xs.reduce((a, t) => a + t.returnPercent, 0) / xs.length : 0);

  return (
    <div>
      <p className="mb-4 text-[1.0625rem] font-bold leading-snug text-[#b9cba9]">
        Điểm mua, điểm bán theo xu hướng · cập nhật mỗi phiên sau 15:00 · lệnh nào cũng ghi lại, thắng hay thua.
      </p>

      {!scan || !session ? (
        <div aria-busy="true" className="space-y-3">
          <div className="h-4 w-56 animate-pulse rounded bg-[rgba(255,255,255,0.06)]" />
          <div className="h-14 w-80 animate-pulse rounded bg-[rgba(255,255,255,0.06)]" />
          <div className="h-14 w-72 animate-pulse rounded bg-[rgba(255,255,255,0.06)]" />
        </div>
      ) : (
        <>
          <p className="flex items-center gap-2 font-mono text-sm text-[#8fa882]">
            <span aria-hidden="true" className="hero-pulse inline-block h-2 w-2 rounded-full bg-[#3fd07a]" />
            Chốt phiên {weekday(session)} {dmy(session)}
          </p>
          <h1 className="dt-rise mt-2 text-[clamp(2.6rem,6vw,3.9rem)] font-bold leading-[1.08] tracking-[-0.01em] text-[#fff]!">
            {quiet ? (
              <>
                Không có lệnh mới
                <br />
                <span className="text-[#b9cba9]">đang giữ {holding.length} mã</span>
              </>
            ) : (
              <>
                {buys.length} mã mới vào
                <br />
                <span className="text-[#b9cba9]">{exits.length} mã thoát lệnh</span>
              </>
            )}
          </h1>
          <p className="mt-3 text-lg leading-snug text-[#d5dfcc]">
            Hệ thống đang giữ <b className="text-[#fff]">{holding.length} mã</b> · tín hiệu mới sau{" "}
            <b className="text-[#fff]">15:00</b>.
          </p>

          {rows.length > 0 && (
            <ul className={`mt-5 overflow-hidden rounded-[10px] border ${LINE} bg-[rgba(18,26,17,0.85)]`}>
              {rows.map((r) => (
                <SignalRow key={r.key} r={r} />
              ))}
            </ul>
          )}

          {journal?.startDate && (
            <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[0.95rem] text-[#a9b8a0]">
              {n === 0 ? (
                <span>Nhật ký lệnh thật bắt đầu từ {dmy(journal.startDate)}, chưa có lệnh nào đóng.</span>
              ) : (
                <>
                  <span>
                    Lệnh thật từ {dm(journal.startDate)}: <b className="text-[#fff]">{n} lệnh</b>
                  </span>
                  <span>
                    Thắng <b className="text-[#fff]">{pct((wins.length / n) * 100, 0, false)}</b>
                  </span>
                  {wins.length > 0 && (
                    <span>
                      Thắng TB <b className="text-[#3fd07a]">{pct(avg(wins))}</b>
                    </span>
                  )}
                  {losses.length > 0 && (
                    <span>
                      Thua TB <b className="text-[#ff5c5c]">{pct(avg(losses))}</b>
                    </span>
                  )}
                </>
              )}
            </p>
          )}
        </>
      )}
    </div>
  );
}
