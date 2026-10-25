import { NavLink } from "react-router-dom";
import { Sun, Moon } from "lucide-react";
import SearchBox from "./SearchBox";
import StockHeaderInfo from "./StockHeaderInfo";
import TrendSignalBell from "./TrendSignalBell";
import { useTheme } from "../hooks/useTheme";

// One page (Tín hiệu, at "/") plus stock detail and account opening — no
// tab nav needed; the logo already links home.
export default function Header() {
  const { theme, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex max-w-[1800px] items-center gap-3 px-4 py-3">
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

        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-none sm:gap-3">
          <div className="min-w-0 flex-1 sm:w-40 sm:flex-none md:w-40 lg:w-52">
            <StockHeaderInfo />
          </div>
          <div className="min-w-0 flex-1 sm:w-40 sm:flex-none md:w-40 lg:w-52">
            <SearchBox />
          </div>
          <TrendSignalBell />
          <NavLink
            to="/huong-dan-mo-tai-khoan"
            className="shrink-0 whitespace-nowrap rounded-md bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md"
          >
            Mở tài khoản
          </NavLink>
          <button
            onClick={toggle}
            title={theme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-slate-300 text-slate-600 transition-colors duration-300 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" strokeWidth={1.75} /> : <Moon className="h-4 w-4" strokeWidth={1.75} />}
          </button>
        </div>
      </div>
    </header>
  );
}
