import { Link, NavLink, useLocation } from "react-router-dom";
import SearchBox from "./SearchBox";
import StockHeaderInfo from "./StockHeaderInfo";
import TrendSignalBell from "./TrendSignalBell";

const NAV_BASE =
  "inline-flex min-h-11 items-center whitespace-nowrap border-b-2 text-base font-bold transition-colors duration-200";
const NAV_ACTIVE = "border-brand-700 text-brand-700";
const NAV_IDLE = "border-transparent text-slate-900 hover:text-brand-700";

// White header with a hairline underneath: logo, the two sections of the site,
// stock search, the signal bell and — the one orange thing in the chrome — the
// account-opening button.
export default function Header() {
  const { pathname } = useLocation();
  const onGuide = pathname.startsWith("/huong-dan-mo-tai-khoan");

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="gutter-x mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-1 py-3">
        <NavLink to="/" aria-label="C Stock — Trang chủ" className="flex shrink-0 items-center">
          {/* <picture> makes the browser fetch only the variant that fits: icon
              only below sm, icon + STOCK wordmark from sm up. */}
          <picture>
            <source media="(max-width: 639px)" srcSet="/logo-cstock-icon-light.svg" />
            <img
              src="/logo-cstock-light.svg"
              alt="C Stock"
              // "!" = important: index.css has an unlayered `img { height: auto }`
              // that would otherwise beat these layered utilities and show the
              // SVG at its intrinsic 120px height.
              className="h-10! w-auto shrink-0 sm:h-11!"
            />
          </picture>
        </NavLink>

        {/* Own row under the logo on phones, inline from md up. */}
        <nav aria-label="Điều hướng chính" className="order-last flex w-full items-center gap-6 md:order-none md:w-auto">
          <Link
            to={{ pathname: "/", hash: "#tin-hieu" }}
            aria-current={!onGuide ? "page" : undefined}
            className={`${NAV_BASE} ${!onGuide ? NAV_ACTIVE : NAV_IDLE}`}
          >
            Tín hiệu
          </Link>
          <NavLink
            to="/huong-dan-mo-tai-khoan"
            className={({ isActive }) => `${NAV_BASE} ${isActive ? NAV_ACTIVE : NAV_IDLE}`}
          >
            Hướng dẫn mở tài khoản
          </NavLink>
        </nav>

        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-none sm:gap-3">
          {/* Empty (nothing to show) off the stock pages — collapse it so it
              doesn't leave a gap. */}
          <div className="min-w-0 flex-1 empty:hidden sm:w-40 sm:flex-none lg:w-52">
            <StockHeaderInfo />
          </div>
          <div className="min-w-0 flex-1 sm:w-44 sm:flex-none lg:w-56">
            <SearchBox />
          </div>
          <TrendSignalBell />
          {/* Below sm the bar has no room for it next to the search box; the
              guide link in the row above leads to the same page. */}
          <NavLink
            to="/huong-dan-mo-tai-khoan"
            className="hidden min-h-11 shrink-0 items-center whitespace-nowrap rounded-md bg-orange-600 px-5 text-base font-bold text-slate-950 transition-colors duration-200 hover:bg-orange-500 sm:inline-flex"
          >
            Mở tài khoản
          </NavLink>
        </div>
      </div>
    </header>
  );
}
