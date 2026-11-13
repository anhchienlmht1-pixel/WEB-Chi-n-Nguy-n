import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { searchSymbols } from "../api/client";
import type { SearchResult } from "../types";
import CompanyLogo from "./CompanyLogo";

export default function SearchBox() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handle = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      try {
        const data = await searchSymbols(query);
        setResults(data);
        // Typing out the exact symbol (case-insensitive) is already
        // unambiguous — jump straight there instead of making the reader
        // press Enter or click the one row that could possibly match.
        const exact = data.find((r) => r.symbol.toUpperCase() === query.trim().toUpperCase());
        if (exact) goTo(exact.symbol);
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

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
    setResults([]);
    navigate(`/stock/${symbol}`);
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <input
        type="text"
        inputMode="search"
        autoComplete="off"
        aria-label="Tìm mã cổ phiếu"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && results.length > 0) goTo(results[0].symbol);
        }}
        placeholder="Tìm mã cổ phiếu"
        className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-900 placeholder:text-slate-500 focus:border-brand-700"
      />
      {open && results.length > 0 && (
        <div className="absolute right-0 z-20 mt-1 w-72 max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
          {results.map((r) => (
            <button
              key={r.symbol}
              onClick={() => goTo(r.symbol)}
              className="flex min-h-11 w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-slate-50"
            >
              <span className="flex items-center gap-2">
                <CompanyLogo symbol={r.symbol} size={22} fallback="space" />
                <span className="font-bold text-slate-900">{r.symbol}</span>
              </span>
              <span className="truncate pl-3 text-slate-600">{r.name}</span>
              <span className="pl-3 text-xs text-slate-500">{r.exchange}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
