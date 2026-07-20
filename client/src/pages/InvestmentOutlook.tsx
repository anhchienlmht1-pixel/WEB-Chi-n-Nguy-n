import { useEffect, useRef, useState } from "react";
import { fetchInvestmentOutlook, searchSymbols, type StockOutlookRecord } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import type { SearchResult } from "../types";

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vT81Bi4SZ33zZ6URMkTxl_yB158q89qIwVE27W_8Pxt8gGd2-obA4NV2EPQI_EqYAJn8DzdC34vwzpx/pubhtml";
const POLL_MS = 3 * 60 * 1000; // server itself caches 5 min — this just re-checks that cache periodically

// The sheet is a single-selection dashboard: a "MÃ" dropdown picks one
// stock and the rest of the sheet shows that stock's outlook — so this
// page always mirrors whichever stock is currently selected there, not a
// list of all stocks. To view a different stock, change the dropdown in
// the sheet itself (link below).
export default function InvestmentOutlook() {
  const { data, error, loading } = usePolling(() => fetchInvestmentOutlook(), [], POLL_MS);
  const [query, setQuery] = useState("");

  const trimmedQuery = query.trim().toUpperCase();
  const currentSymbol = data?.symbol.trim().toUpperCase() ?? "";
  const isMismatch = data !== null && trimmedQuery !== "" && trimmedQuery !== currentSymbol;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Triển vọng đầu tư</h1>
        <a
          href={SHEET_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
        >
          Mở trang tính ↗
        </a>
      </div>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        Đồng bộ trực tiếp từ Google Sheets — hiển thị đúng mã đang được chọn trong trang tính. Muốn xem mã khác, đổi
        ô "MÃ" trong trang tính.
      </p>

      <div className="mb-4 max-w-[280px]">
        <label htmlFor="outlook-symbol-input" className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
          Nhập mã cổ phiếu bạn muốn xem
        </label>
        <SymbolAutocomplete id="outlook-symbol-input" value={query} onChange={setQuery} />
      </div>

      {loading && !data && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-6 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      )}

      {error && !data && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {isMismatch && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-400">
          Trang tính hiện đang hiển thị triển vọng cho mã <strong>{data!.symbol}</strong>, chưa phải mã{" "}
          <strong>{trimmedQuery}</strong> bạn nhập. Mở trang tính, đổi ô "MÃ" thành {trimmedQuery} rồi quay lại
          trang này.
        </div>
      )}

      {data && !isMismatch && <StockOutlookRecordView record={data} />}
    </div>
  );
}

// Same debounced search-and-suggest pattern as the header's SearchBox, but
// selecting a result fills the input instead of navigating away — this
// input is used to check against the sheet's currently-selected symbol,
// not to jump to a stock page.
function SymbolAutocomplete({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (symbol: string) => void;
}) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = setTimeout(async () => {
      if (!value.trim()) {
        setResults([]);
        return;
      }
      try {
        setResults(await searchSymbols(value));
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [value]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function select(symbol: string) {
    onChange(symbol);
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value.toUpperCase());
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && results.length > 0) select(results[0].symbol);
        }}
        placeholder="VD: REE"
        maxLength={10}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm uppercase text-slate-900 placeholder:normal-case placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
      />
      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {results.map((r) => (
            <button
              key={r.symbol}
              onClick={() => select(r.symbol)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <span className="font-semibold text-slate-900 dark:text-slate-100">{r.symbol}</span>
              <span className="truncate pl-3 text-slate-500 dark:text-slate-400">{r.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function StockOutlookRecordView({ record }: { record: StockOutlookRecord }) {
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          {record.symbol}
        </span>
        {record.updatedAt && (
          <span className="text-xs text-slate-500 dark:text-slate-400">Ngày cập nhật: {record.updatedAt}</span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Triển vọng đầu tư
          </h2>
          {record.outlookText ? (
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {record.outlookText}
            </p>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500">Chưa có nội dung.</p>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Giá khuyến nghị
          </h2>
          {record.recommendations.length > 0 ? (
            <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
              {record.recommendations.map((r, i) => (
                <li key={i} className="flex items-center justify-between py-1.5">
                  <span className="text-slate-600 dark:text-slate-400">{r.broker}</span>
                  <span className="font-medium tabular-nums text-slate-900 dark:text-slate-100">
                    {r.price || "—"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500">Chưa có khuyến nghị.</p>
          )}
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
        Nội dung do người quản lý trang tính tự biên soạn, không phải khuyến nghị đầu tư từ hệ thống.
      </p>
    </>
  );
}
