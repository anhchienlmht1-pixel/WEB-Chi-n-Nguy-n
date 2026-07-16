import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { searchSymbols } from "../api/client";
import type { SearchResult } from "../types";

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
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && results.length > 0) goTo(results[0].symbol);
        }}
        placeholder="Tìm mã cổ phiếu (VD: VNM, AAPL)..."
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
      />
      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
          {results.map((r) => (
            <button
              key={r.symbol}
              onClick={() => goTo(r.symbol)}
              className="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-slate-800"
            >
              <span className="font-semibold text-slate-100">{r.symbol}</span>
              <span className="truncate pl-3 text-slate-400">{r.name}</span>
              <span className="pl-3 text-xs text-slate-500">{r.exchange}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
