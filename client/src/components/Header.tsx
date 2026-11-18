import { Link, NavLink, useLocation } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import SearchBox from "./SearchBox";
import StockHeaderInfo from "./StockHeaderInfo";
import TrendSignalBell from "./TrendSignalBell";

const NAV_BASE =
  "inline-flex min-h-11 items-center whitespace-nowrap border-b-2 text-base font-bold transition-colors duration-200";
const NAV_ACTIVE = "border-[#b9cba9] text-[#fff]";
const NAV_IDLE = "border-transparent text-[#e7ece2] hover:text-[#fff]";

// Moss-green bar: Bull Stock logo, the three sections, stock search, the
// signal bell and — the one orange thing in the chrome — the account button.
// It is a .theme-dark surface so the search box and bell read on the green.
export default function Header() {
  const { pathname } = useLocation();
  const onGuide = pathname.startsWith("/huong-dan-mo-tai-khoan");
  const onAbout = pathname.startsWith("/gioi-thieu");
  const onSignals = !onGuide && !onAbout;

  return (
    <header className="theme-dark sticky top-0 z-30 border-b border-[#4f6349] bg-[#3e503c]!">
      <div className="gutter-x mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-1 py-2.5">
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

        <nav aria-label="Điều hướng chính" className="order-last flex w-full items-center gap-6 md:order-none md:w-auto">
          <Link
            to={{ pathname: "/", hash: "#tin-hieu" }}
            aria-current={onSignals ? "page" : undefined}
            className={`${NAV_BASE} ${onSignals ? NAV_ACTIVE : NAV_IDLE}`}
          >
            Tín hiệu
          </Link>
          <NavLink to="/nganh-ngan-hang" className={({ isActive }) => `${NAV_BASE} ${isActive ? NAV_ACTIVE : NAV_IDLE}`}>
            Ngành ngân hàng
          </NavLink>
          <NavLink to="/gioi-thieu" className={({ isActive }) => `${NAV_BASE} ${isActive ? NAV_ACTIVE : NAV_IDLE}`}>
            Giới thiệu
          </NavLink>
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
          <ThemeToggle />
          <TrendSignalBell />
          <NavLink
            to="/huong-dan-mo-tai-khoan"
            className="fx-btn hidden min-h-11 shrink-0 items-center whitespace-nowrap rounded-md bg-orange-600 px-5 text-base font-bold text-[#1b1f1a] transition-colors duration-200 hover:bg-orange-500 sm:inline-flex"
          >
            Mở tài khoản
          </NavLink>
        </div>
      </div>
    </header>
  );
}
