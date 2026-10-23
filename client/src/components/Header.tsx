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
        <NavLink
          to="/"
          className="flex shrink-0 items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100"
        >
          <img src="/logo-bull.png" alt="" className="h-8 w-8 shrink-0 object-contain" />
          <span className="hidden sm:inline">Chiến Nguyễn Stock</span>
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
            className="shrink-0 whitespace-nowrap rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors duration-300 hover:bg-emerald-700"
          >
            Mở tài khoản
          </NavLink>
          <button
            onClick={toggle}
            title={theme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition-colors duration-300 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" strokeWidth={1.75} /> : <Moon className="h-4 w-4" strokeWidth={1.75} />}
          </button>
        </div>
      </div>
    </header>
  );
}
