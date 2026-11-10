import { ArrowRight, Phone } from "lucide-react";

// Sticky "talk to a human" bar for the stock detail page — same contact
// info as Footer.tsx, just surfaced right where someone reading a chart is
// most likely to want it, instead of only at the very bottom of the site.
// `sticky bottom-0` inside StockDetail's own content column means it stays
// pinned to the viewport while scrolling through that page, then scrolls
// away normally once the page content ends and the global Footer begins.
export default function AdvisorContactBar() {
  return (
    <div className="sticky bottom-0 z-20 -mx-[var(--gutter)] mt-6 border-t border-slate-200 bg-white px-[var(--gutter)] py-3">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center text-base">
          <span className="font-bold text-slate-900">Nguyễn Anh Chiến</span>
          <span className="mx-2 text-slate-300">·</span>
          <a
            href="tel:0886284212"
            className="inline-flex min-h-11 items-center gap-1 font-bold text-emerald-700 hover:underline"
          >
            <Phone className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            0886.284.212
          </a>
          <span className="ml-2 hidden text-slate-600 sm:inline">
            Chuyên viên tư vấn đầu tư — CTCP Chứng khoán KAFI
          </span>
        </div>
        <a
          href="https://zalo.me/0886284212"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md bg-orange-600 px-5 text-base font-bold text-slate-950 transition-colors duration-200 hover:bg-orange-500"
        >
          Tư vấn qua Zalo
          <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
