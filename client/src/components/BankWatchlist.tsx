import { Link } from "react-router-dom";
import { CRITERIA, type CritKey, type Screen, type ScreenRow } from "../lib/bankScreen";
import { banksIn, vn, type GroupFilter } from "./bankUi";

// Danh sách theo dõi: ngân hàng đạt đủ 4 tiêu chí (tín dụng, NIM, ROE cao hơn
// trung bình ngành; P/B thấp hơn), và nhóm "gần đạt" thiếu đúng 1 tiêu chí.

const fmt = (k: CritKey, v: number) => (k === "pb" ? vn(v) : `${vn(v, k === "credit" ? 1 : 2)}%`);

function Chips({ r, avg }: { r: ScreenRow; avg: Screen["avg"] }) {
  return (
    <div className="mt-1.5 grid grid-cols-2 gap-1 sm:grid-cols-4">
      {CRITERIA.map((c) => {
        const ok = r.pass[c.key];
        return (
          <span
            key={c.key}
            title={`${c.label}: ${fmt(c.key, r.val[c.key])} · TB ngành ${fmt(c.key, avg[c.key])}`}
            className="flex items-center justify-between gap-1 rounded-md px-2 py-1 text-[0.75rem] tabular-nums"
            style={{
              background: `color-mix(in srgb, ${ok ? "var(--heat-up)" : "var(--heat-down)"} ${ok ? 16 : 14}%, transparent)`,
              color: ok ? "var(--heat-ink)" : "var(--heat-ink)",
            }}
          >
            <span className="text-[var(--ab-muted)]">{c.short}</span>
            <b style={{ color: ok ? "var(--heat-up)" : "var(--heat-down)" }}>
              {ok ? "✓" : "✗"} {fmt(c.key, r.val[c.key])}
            </b>
          </span>
        );
      })}
    </div>
  );
}

function Card({ r, avg, sel, onSel }: { r: ScreenRow; avg: Screen["avg"]; sel?: string | null; onSel?: (b: string | null) => void }) {
  const on = sel === r.bank;
  return (
    <li
      onMouseEnter={() => onSel?.(r.bank)}
      onMouseLeave={() => onSel?.(null)}
      className={`rounded-lg border px-3 py-2 transition-colors ${on ? "border-[var(--heat-up)] bg-[var(--ab-hover)]" : "border-[var(--ab-line)]"}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <Link to={`/stock/${r.bank}`} className="font-bold text-[var(--ab-strong)] hover:underline">
          {r.bank}
        </Link>
        <span className="text-xs text-[var(--ab-muted)]">
          {r.group} · đạt {r.score}/4
        </span>
      </div>
      <Chips r={r} avg={avg} />
    </li>
  );
}

export default function BankWatchlist({
  screen,
  group,
  sel,
  onSel,
  wide = false,
}: {
  screen: Screen;
  group: GroupFilter;
  sel?: string | null;
  onSel?: (b: string | null) => void;
  /** Overview tab: cards in a grid across the page. */
  wide?: boolean;
}) {
  const shown = new Set(banksIn(group));
  const rows = screen.rows.filter((r) => shown.has(r.bank));
  const full = rows.filter((r) => r.score === 4);
  const near = rows.filter((r) => r.score === 3);
  const list = wide ? "grid gap-2 sm:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-1.5";

  return (
    <div className="flex flex-col">
      <h3 className="text-lg font-bold text-[var(--ab-strong)]">Danh sách theo dõi</h3>
      <p className="mt-1 text-[0.85rem] text-[var(--ab-muted)]">
        Ngân hàng đạt <b className="text-[var(--ab-text)]">đủ 4 tiêu chí</b> so với trung bình 16 ngân hàng:
      </p>
      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {CRITERIA.map((c) => (
          <div key={c.key} className="rounded-lg border border-[var(--ab-line)] px-2.5 py-1.5 text-[0.78rem]">
            <span className="text-[var(--ab-muted)]">
              {c.label} {c.better === "cao" ? ">" : "<"} TB
            </span>
            <b className="block tabular-nums text-[var(--ab-strong)]">{fmt(c.key, screen.avg[c.key])}</b>
          </div>
        ))}
      </div>

      {full.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-[var(--ab-line-strong)] p-3 text-[0.88rem]">
          Chưa có ngân hàng nào đạt đủ 4 tiêu chí{group !== "Tất cả" ? ` trong nhóm ${group}` : ""}.
        </p>
      ) : (
        <ul className={`mt-3 ${list}`}>
          {full.map((r) => (
            <Card key={r.bank} r={r} avg={screen.avg} sel={sel} onSel={onSel} />
          ))}
        </ul>
      )}

      {near.length > 0 && (
        <>
          <p className="mt-4 text-[0.85rem] font-bold text-[var(--ab-text)]">
            Gần đạt (3/4) <span className="font-normal text-[var(--ab-muted)]">· ô đỏ là tiêu chí còn thiếu</span>
          </p>
          <ul className={`mt-1.5 opacity-90 ${list}`}>
            {near.map((r) => (
              <Card key={r.bank} r={r} avg={screen.avg} sel={sel} onSel={onSel} />
            ))}
          </ul>
        </>
      )}

      <p className="mt-3 text-xs leading-relaxed text-[var(--ab-muted)]">
        Lọc tự động, P/B theo giá {screen.live ? "đang khớp (cập nhật trong phiên)" : "cuối quý 3/2026"}. Tín dụng, NIM: báo cáo tài chính Q3/2026;
        ROE, giá trị sổ sách: SSI. P/B thấp có thể do rủi ro riêng (nợ xấu, tăng vốn…). Đây không phải khuyến nghị mua bán.
      </p>
    </div>
  );
}
