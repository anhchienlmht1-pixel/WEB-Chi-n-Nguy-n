"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { searchStocks } from "@/lib/symbols";

export function SearchBox() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const results = searchStocks(query);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function goTo(symbol: string) {
    setOpen(false);
    setQuery("");
    router.push(`/co-phieu/${symbol}`);
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5">
        <Search size={16} className="text-neutral-400" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results.length > 0) goTo(results[0].symbol);
          }}
          placeholder="Tìm mã CK, tên công ty..."
          className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg">
          {results.map((r) => (
            <button
              key={r.symbol}
              onClick={() => goTo(r.symbol)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-neutral-50"
            >
              <span className="font-semibold text-neutral-900">{r.symbol}</span>
              <span className="truncate text-xs text-neutral-500 ml-2">{r.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
