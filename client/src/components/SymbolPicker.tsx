import { useEffect, useRef, useState } from "react";
import { searchSymbols } from "../api/client";
import type { SearchResult } from "../types";

export default function SymbolPicker({ value, onChange }: { value: string; onChange: (symbol: string) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      try {
        setResults(await searchSymbols(query));
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function select(symbol: string) {
    onChange(symbol);
    setOpen(false);
    setQuery("");
    setResults([]);
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      <input
        value={open ? query : value}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && results.length > 0) select(results[0].symbol);
        }}
        placeholder="Đổi mã cổ phiếu..."
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
      />
      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {results.map((r) => (
            <button
              key={r.symbol}
              onClick={() => select(r.symbol)}
              className="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <span className="font-semibold text-slate-900 dark:text-slate-100">{r.symbol}</span>
              <span className="truncate pl-3 text-slate-500 dark:text-slate-400">{r.name}</span>
              <span className="pl-3 text-xs text-slate-400 dark:text-slate-500">{r.exchange}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
