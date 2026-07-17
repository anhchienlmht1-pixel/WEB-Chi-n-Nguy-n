import { NavLink } from "react-router-dom";
import SearchBox from "./SearchBox";
import { useTheme } from "../hooks/useTheme";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium transition-colors ${
    isActive
      ? "text-orange-600 dark:text-orange-400"
      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
  }`;

export default function Header() {
  const { theme, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
        <NavLink
          to="/"
          className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-slate-950">
            📈
          </span>
          Chiến Nguyễn Invest
        </NavLink>

        <nav className="flex items-center gap-5">
          <NavLink to="/" end className={navLinkClass}>
            Thị trường
          </NavLink>
          <NavLink to="/watchlist" className={navLinkClass}>
            Theo dõi
          </NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <SearchBox />
          <button
            onClick={toggle}
            title={theme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-base transition-colors hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>
      </div>
    </header>
  );
}
