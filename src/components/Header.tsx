import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { SearchBox } from "./SearchBox";
import { NavLinks } from "./NavLinks";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/85 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-950/85">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white shadow-[0_0_16px_rgba(39,133,122,0.55)]">
            <TrendingUp size={18} strokeWidth={2.5} />
          </span>
          <span className="text-lg font-bold tracking-tight text-neutral-900 whitespace-nowrap dark:text-neutral-50">
            Chiến Nguyễn Invest
          </span>
        </Link>
        <NavLinks />
        <div className="ml-auto flex items-center gap-2">
          <SearchBox />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
