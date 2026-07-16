import { NavLink } from "react-router-dom";
import SearchBox from "./SearchBox";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium transition-colors ${
    isActive ? "text-emerald-400" : "text-slate-400 hover:text-slate-100"
  }`;

export default function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
        <NavLink to="/" className="flex items-center gap-2 text-lg font-bold text-slate-100">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-slate-950">
            📈
          </span>
          StockDash
        </NavLink>

        <nav className="flex items-center gap-5">
          <NavLink to="/" end className={navLinkClass}>
            Thị trường
          </NavLink>
          <NavLink to="/watchlist" className={navLinkClass}>
            Theo dõi
          </NavLink>
        </nav>

        <div className="ml-auto">
          <SearchBox />
        </div>
      </div>
    </header>
  );
}
