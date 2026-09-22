import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Sun, Moon, X, Menu } from "lucide-react";
import SearchBox from "./SearchBox";
import StockHeaderInfo from "./StockHeaderInfo";
import TrendSignalBell from "./TrendSignalBell";
import { useTheme } from "../hooks/useTheme";

const NAV_ITEMS = [
  { to: "/thi-truong", label: "Thị trường", end: false },
  { to: "/so-sanh-pb", label: "So sánh P/B", end: false },
  { to: "/huong-dan-mo-tai-khoan", label: "Mở Tài Khoản", end: false },
];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `shrink-0 whitespace-nowrap border-b-2 pb-0.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${
    isActive
      ? "border-slate-900 text-slate-900 dark:border-slate-100 dark:text-slate-100"
      : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
  }`;

const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-lg px-3 py-3 text-sm font-semibold uppercase tracking-[0.12em] transition-colors ${
    isActive
      ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
  }`;

export default function Header() {
  const { theme, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  // Landing page keeps the header to Logo – Menu – CTA (no search/ticker/
  // bell) — those belong to the live app, not the marketing homepage.
  const isLanding = useLocation().pathname === "/";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3">
        <NavLink
          to="/"
          onClick={() => setMenuOpen(false)}
          className="flex shrink-0 items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100"
        >
          <img src="/logo-bull.png" alt="" className="h-8 w-8 shrink-0 object-contain" />
          <span className="hidden sm:inline">Chiến Nguyễn Stock</span>
        </NavLink>

        <nav className="hidden shrink-0 items-center gap-6 md:flex lg:gap-8">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-none sm:gap-3">
          {!isLanding && (
            <>
              <div className="min-w-0 flex-1 sm:w-40 sm:flex-none md:w-40 lg:w-52">
                <StockHeaderInfo />
              </div>
              <div className="min-w-0 flex-1 sm:w-40 sm:flex-none md:w-40 lg:w-52">
                <SearchBox />
              </div>
              <TrendSignalBell />
            </>
          )}
          <NavLink
            to="/thi-truong"
            className="hidden shrink-0 whitespace-nowrap rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors duration-300 hover:bg-emerald-700 sm:inline-block"
          >
            Vào hệ thống
          </NavLink>
          <button
            onClick={toggle}
            title={theme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition-colors duration-300 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" strokeWidth={1.75} /> : <Moon className="h-4 w-4" strokeWidth={1.75} />}
          </button>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={menuOpen}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition-colors duration-300 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden"
          >
            {menuOpen ? <X className="h-4 w-4" strokeWidth={1.75} /> : <Menu className="h-4 w-4" strokeWidth={1.75} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="border-t border-slate-200 px-4 py-2 dark:border-slate-800 md:hidden">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMenuOpen(false)}
              className={mobileNavLinkClass}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}
