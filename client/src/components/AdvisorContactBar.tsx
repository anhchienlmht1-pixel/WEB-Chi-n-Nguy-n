import { ArrowRight, Phone } from "lucide-react";

// Sticky "talk to a human" bar for the stock detail page — same contact
// info as Footer.tsx, just surfaced right where someone reading a chart is
// most likely to want it, instead of only at the very bottom of the site.
// `sticky bottom-0` inside StockDetail's own content column means it stays
// pinned to the viewport while scrolling through that page, then scrolls
// away normally once the page content ends and the global Footer begins.
export default function AdvisorContactBar() {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 text-sm">
          <span className="font-semibold text-slate-900 dark:text-slate-100">Nguyễn Anh Chiến</span>
          <span className="mx-2 text-slate-300 dark:text-slate-700">·</span>
          <a
            href="tel:0886284212"
            className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
          >
            <Phone className="h-3.5 w-3.5" strokeWidth={1.75} />
            0886.284.212
          </a>
          <span className="ml-2 hidden text-slate-400 dark:text-slate-500 sm:inline">
            Chuyên viên tư vấn đầu tư — CTCP Chứng khoán KAFI
          </span>
        </div>
        <a
          href="https://zalo.me/0886284212"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors duration-300 hover:bg-emerald-700"
        >
          Tư vấn qua Zalo
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
        </a>
      </div>
    </div>
  );
}
