import { Link, NavLink } from "react-router-dom";
import { Sun, Moon } from "lucide-react";
import SearchBox from "./SearchBox";
import StockHeaderInfo from "./StockHeaderInfo";
import TrendSignalBell from "./TrendSignalBell";
import { useTheme } from "../hooks/useTheme";

// Section links of the home page — hash links, scrolled to by ScrollToHash.
const NAV = [
  { hash: "#tin-hieu", label: "Tín hiệu" },
  { hash: "#he-thong", label: "Hệ thống" },
  { hash: "#nhat-ky", label: "Nhật ký" },
];

// Editorial header: a thin black utility bar (scrolls away) above a sticky
// paper-coloured bar with the section links, the logo and the tools.
export default function Header() {
  const { theme, toggle } = useTheme();

  return (
    <>
      <div className="bg-band text-white">
        <div className="gutter-x mx-auto flex max-w-[1800px] items-center justify-between gap-x-6 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em]">
          <span className="hidden sm:inline">Theo dõi thị trường. Kỷ luật hơn mỗi ngày.</span>
          <span className="ml-auto flex gap-5 sm:ml-0">
            <Link to="/huong-dan-mo-tai-khoan" className="transition-opacity hover:opacity-70">
              Hướng dẫn
            </Link>
            <a href="#footer" className="transition-opacity hover:opacity-70">
              Liên hệ
            </a>
          </span>
        </div>
      </div>

      <header className="sticky top-0 z-30 border-b border-rule bg-paper/95 backdrop-blur">
        <div className="gutter-x mx-auto flex max-w-[1800px] items-center gap-3 py-3">
          <NavLink to="/" aria-label="C Stock — Trang chủ" className="flex shrink-0 items-center">
            {/* The two SVGs are theme-specific (light/dark gradients), so pick by theme.
                <picture> makes the browser fetch only the one that matches the viewport:
                icon-only below sm, icon + STOCK wordmark from sm up. */}
            <picture>
              <source
                media="(max-width: 639px)"
                srcSet={theme === "dark" ? "/logo-cstock-icon-dark.svg" : "/logo-cstock-icon-light.svg"}
              />
              <img
                src={theme === "dark" ? "/logo-cstock-dark.svg" : "/logo-cstock-light.svg"}
                alt="C Stock"
                // "!" = important: index.css has an unlayered `img { height: auto }` that
                // would otherwise beat these layered utilities and show the SVG at its
                // intrinsic 120px height.
                className="h-10! w-auto shrink-0 sm:h-11!"
              />
            </picture>
          </NavLink>

          <nav
            aria-label="Các phần của trang chủ"
            className="ml-6 hidden items-center gap-7 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink xl:flex"
          >
            {NAV.map(({ hash, label }) => (
              <Link
                key={hash}
                to={{ pathname: "/", hash }}
                className="whitespace-nowrap transition-opacity hover:opacity-60"
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-none sm:gap-3">
            {/* Empty (nothing to show) off the stock pages — collapse it so it
                doesn't leave a gap. */}
            <div className="min-w-0 flex-1 empty:hidden sm:w-40 sm:flex-none md:w-40 lg:w-52">
              <StockHeaderInfo />
            </div>
            <div className="min-w-0 flex-1 sm:w-40 sm:flex-none md:w-40 lg:w-52">
              <SearchBox />
            </div>
            <TrendSignalBell />
            {/* Below sm the bar has no room for it next to the search box; "Hướng
                dẫn" in the black strip above and the hero button lead to the same page. */}
            <NavLink
              to="/huong-dan-mo-tai-khoan"
              className="hidden shrink-0 whitespace-nowrap bg-ink px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-paper transition-opacity duration-200 hover:opacity-80 sm:block"
            >
              Mở tài khoản
            </NavLink>
            <button
              onClick={toggle}
              title={theme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
              className="flex h-11 w-11 shrink-0 items-center justify-center border border-ink/30 text-ink transition-colors duration-300 hover:bg-ink/10"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" strokeWidth={1.75} /> : <Moon className="h-4 w-4" strokeWidth={1.75} />}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
