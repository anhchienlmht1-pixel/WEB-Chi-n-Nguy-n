import { useState } from "react";
import { NavLink } from "react-router-dom";
import SearchBox from "./SearchBox";
import { useTheme } from "../hooks/useTheme";

const NAV_ITEMS = [
  { to: "/", label: "Thị trường", end: true },
  { to: "/watchlist", label: "Theo dõi", end: false },
  { to: "/so-sanh", label: "So sánh", end: false },
  { to: "/so-sanh-ngan-hang", label: "So sánh ngân hàng", end: false },
  { to: "/so-sanh-chung-khoan", label: "So sánh chứng khoán", end: false },
  { to: "/so-sanh-bat-dong-san", label: "So sánh bất động sản", end: false },
  { to: "/backtest", label: "Backtest", end: false },
  { to: "/trien-vong-dau-tu", label: "Triển vọng đầu tư", end: false },
];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium transition-colors ${
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

        <nav className="hidden items-center gap-5 md:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-none sm:gap-3">
          <div className="min-w-0 flex-1 sm:w-56 sm:flex-none md:w-72">
            <SearchBox />
          </div>
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
