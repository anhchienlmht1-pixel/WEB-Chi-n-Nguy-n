import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import SearchBox from "./SearchBox";
import StockHeaderInfo from "./StockHeaderInfo";
import TrendSignalBell from "./TrendSignalBell";
import ThemeToggle from "./ThemeToggle";
import TickerTape from "./TickerTape";

const NAV_BASE =
  "inline-flex min-h-11 items-center whitespace-nowrap border-b text-[0.98rem] font-medium transition-colors duration-200";
const NAV_ACTIVE = "border-[var(--sm-gold)] text-[var(--sm-egg)]";
const NAV_IDLE = "border-transparent text-[var(--sm-egg2)] hover:text-[var(--sm-egg)]";

type Item = { to: string; label: string; sub: string };
const MARKET: Item[] = [
  { to: "/tin-hieu", label: "Tín hiệu", sub: "Danh mục theo xu hướng, nhật ký lệnh" },
  { to: "/song-nganh", label: "Sóng ngành", sub: "Nhịp thị trường, ngành nào đang lên" },
];
const SECTORS: Item[] = [
  { to: "/nganh-ngan-hang", label: "Ngành ngân hàng", sub: "So sánh chỉ số các ngân hàng" },
  { to: "/nganh-chung-khoan", label: "Ngành chứng khoán", sub: "So sánh chỉ số các CTCK" },
  { to: "/nganh-bat-dong-san", label: "Ngành bất động sản", sub: "Sức khỏe tài chính chủ đầu tư" },
];

// Mục menu thả xuống: rê chuột (máy tính) hoặc bấm (điện thoại) để mở,
// bấm ra ngoài / Esc / đổi trang để đóng.
function NavMenu({ label, items }: { label: string; items: Item[] }) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const ptr = useRef("");
  const active = items.some((it) => pathname.startsWith(it.to));
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const off = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", off);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", off);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <div
      ref={ref}
      className="relative"
      onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        // chuột đã mở bằng rê; bấm chỉ bật/tắt khi dùng cảm ứng hoặc bàn phím
        onPointerDown={(e) => (ptr.current = e.pointerType)}
        onClick={(e) => (e.detail === 0 || ptr.current !== "mouse" ? setOpen((v) => !v) : setOpen(true))}
        className={`${NAV_BASE} gap-1 ${active ? NAV_ACTIVE : NAV_IDLE}`}
      >
        {label}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 z-40 pt-1.5">
          <ul className="min-w-[17rem] overflow-hidden rounded-[12px] border border-[rgba(201,162,74,0.35)] bg-[#1a2418] p-1.5 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)]">
            {items.map((it) => {
              const on = pathname.startsWith(it.to);
              return (
                <li key={it.to}>
                  <Link
                    to={it.to}
                    aria-current={on ? "page" : undefined}
                    className={`block rounded-[8px] px-3 py-2 transition-colors ${on ? "bg-[rgba(201,162,74,0.16)]" : "hover:bg-[rgba(239,231,212,0.07)]"}`}
                  >
                    <span className={`block text-[0.95rem] font-semibold ${on ? "text-[var(--sm-gold2)]" : "text-[var(--sm-egg)]"}`}>{it.label}</span>
                    <span className="block text-[0.8rem] text-[var(--sm-mut)]">{it.sub}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// Sơn mài bar (lacquer, gold rule): Bull Stock logo, the three sections, stock search, the
// signal bell and — the one orange thing in the chrome — the account button.
// It is a .theme-dark surface so the search box and bell read on the green.
export default function Header() {
  const { pathname } = useLocation();
  const onAbout = pathname === "/" || pathname.startsWith("/gioi-thieu");

  return (
    <header className="theme-dark sticky top-0 z-30 border-b border-[rgba(201,162,74,0.35)] bg-[rgba(18,26,17,0.92)]! backdrop-blur-md">
      <div className="gutter-x mx-auto flex max-w-[1920px] flex-wrap items-center gap-x-6 gap-y-1 py-2.5">
        <NavLink to="/" aria-label="Bull Stock — Trang chủ" className="flex shrink-0 items-center">
          <picture>
            <source media="(max-width: 639px)" srcSet="/logo-bullstock-icon-dark.svg" />
            <img
              src="/logo-bullstock-dark.svg"
              alt="Bull Stock"
              // "!" beats the unlayered `img { height: auto }` in index.css.
              className="h-10! w-auto shrink-0 sm:h-11!"
            />
          </picture>
        </NavLink>

        <nav aria-label="Điều hướng chính" className="order-last -mx-1 flex w-full flex-wrap items-center gap-x-5 px-1 md:order-none md:w-auto lg:gap-x-6">
          <Link to="/" aria-current={onAbout ? "page" : undefined} className={`${NAV_BASE} ${onAbout ? NAV_ACTIVE : NAV_IDLE}`}>
            Giới thiệu
          </Link>
          <NavMenu label="Dữ liệu thị trường" items={MARKET} />
          <NavMenu label="Dữ liệu ngành" items={SECTORS} />
          <NavLink
            to="/huong-dan-mo-tai-khoan"
            className={({ isActive }) => `${NAV_BASE} ${isActive ? NAV_ACTIVE : NAV_IDLE}`}
          >
            Hướng dẫn mở tài khoản
          </NavLink>
        </nav>

        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-none sm:gap-3">
          <div className="min-w-0 flex-1 empty:hidden sm:w-40 sm:flex-none lg:w-52">
            <StockHeaderInfo />
          </div>
          <div className="min-w-0 flex-1 sm:w-44 sm:flex-none lg:w-56">
            <SearchBox />
          </div>
          <TrendSignalBell />
          <ThemeToggle />
          <NavLink
            to="/huong-dan-mo-tai-khoan"
            className="sm-btn sm-btn-p hidden shrink-0 whitespace-nowrap text-[0.98rem] sm:inline-flex"
          >
            Mở tài khoản
          </NavLink>
        </div>
      </div>
      <TickerTape />
    </header>
  );
}
