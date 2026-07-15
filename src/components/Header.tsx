import Link from "next/link";
import { LineChart } from "lucide-react";
import { SearchBox } from "./SearchBox";

const NAV = [
  { href: "/", label: "Tổng quan" },
  { href: "/bang-gia", label: "Bảng giá" },
  { href: "/danh-muc", label: "Danh mục theo dõi" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-neutral-900">
          <LineChart size={22} className="text-rose-500" />
          <span>VStock</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto">
          <SearchBox />
        </div>
      </div>
    </header>
  );
}
