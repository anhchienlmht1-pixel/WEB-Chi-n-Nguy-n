import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { SearchBox } from "./SearchBox";
import { NavLinks } from "./NavLinks";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200/80 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white">
            <TrendingUp size={18} strokeWidth={2.5} />
          </span>
          <span className="text-lg font-bold tracking-tight text-neutral-900">VStock</span>
        </Link>
        <NavLinks />
        <div className="ml-auto">
          <SearchBox />
        </div>
      </div>
    </header>
  );
}
