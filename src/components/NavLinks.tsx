"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const NAV = [
  { href: "/", label: "Tổng quan" },
  { href: "/bang-gia", label: "Bảng giá" },
  { href: "/danh-muc", label: "Danh mục theo dõi" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 text-sm font-medium">
      {NAV.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "rounded-full px-3.5 py-1.5 transition-colors",
              active ? "bg-brand-500/15 text-brand-300" : "text-neutral-400 hover:bg-neutral-800/70 hover:text-neutral-100"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
