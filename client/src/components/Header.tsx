import { useState } from "react";
import { NavLink } from "react-router-dom";
import SearchBox from "./SearchBox";
import StockHeaderInfo from "./StockHeaderInfo";
import TrendSignalBell from "./TrendSignalBell";
import { useTheme } from "../hooks/useTheme";

const NAV_ITEMS = [
  { to: "/", label: "Thị trường", end: true },
  { to: "/so-sanh-pb", label: "So sánh P/B", end: false },
  { href: "https://www.youtube.com/watch?v=CyUYSWOAavw", label: "Hướng Dẫn MỞ TK", external: true },
];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `shrink-0 whitespace-nowrap text-xs font-medium transition-colors ${
    isActive
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
  }`;

const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
    isActive
      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
  }`;

const ctaButtonClass =
  "shrink-0 inline-flex items-center gap-1 whitespace-nowrap rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 px-3 py-2 text-xs font-bold text-white transition-all hover:from-emerald-500 hover:to-emerald-400 dark:from-emerald-500 dark:to-emerald-400 dark:hover:from-emerald-400 dark:hover:to-emerald-300";

export default function Header() {
  const { theme, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3">
        <NavLink
          to="/"
          onClick={() => setMenuOpen(false)}
          className="flex shrink-0 items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100"
        >
          <img src="/logo-bull.png" alt="" className="h-8 w-8 shrink-0 object-contain" />
          <span className="hidden sm:inline">Chiến Nguyễn Invest</span>
        </NavLink>

        <nav className="hidden min-w-0 items-center gap-2 overflow-x-auto md:flex">
          {NAV_ITEMS.map((item) => {
            if ("external" in item && item.external) {
              return (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={ctaButtonClass}
                >
                  📱 {item.label}
                </a>
              );
            }
            const internalItem = item as { to: string; label: string; end: boolean };
            return (
              <NavLink key={internalItem.to} to={internalItem.to} end={internalItem.end} className={navLinkClass}>
                {internalItem.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-none sm:gap-3">
          <div className="min-w-0 flex-1 sm:w-40 sm:flex-none md:w-52">
            <StockHeaderInfo />
          </div>
          <div className="min-w-0 flex-1 sm:w-40 sm:flex-none md:w-52">
            <SearchBox />
          </div>
          <TrendSignalBell />
          <button
            onClick={toggle}
            title={theme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-base transition-colors hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={menuOpen}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-lg transition-colors hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 md:hidden"
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="border-t border-slate-200 px-4 py-2 dark:border-slate-800 md:hidden">
          {NAV_ITEMS.map((item) => {
            if ("external" in item && item.external) {
              return (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 px-3 py-3 text-sm font-bold text-white transition-all hover:from-emerald-500 hover:to-emerald-400 dark:from-emerald-500 dark:to-emerald-400 dark:hover:from-emerald-400 dark:hover:to-emerald-300 my-2"
                >
                  📱 {item.label}
                </a>
              );
            }
            const internalItem = item as { to: string; label: string; end: boolean };
            return (
              <NavLink
                key={internalItem.to}
                to={internalItem.to}
                end={internalItem.end}
                onClick={() => setMenuOpen(false)}
                className={mobileNavLinkClass}
              >
                {internalItem.label}
              </NavLink>
            );
          })}
        </nav>
      )}
    </header>
  );
}
