import { Check } from "lucide-react";

interface Offer {
  rate: string;
  title: string;
  shortTitle: string;
  description: string;
  badge?: string;
  benefits: string[];
  link: string;
}

const OFFERS: Offer[] = [
  {
    rate: "0",
    title: "Gói vay kỳ quỹ Margin T",
    shortTitle: "MARGIN T",
    description: "Lãi suất 0%",
    badge: "MỚI",
    benefits: ["Lãi suất chỉ từ 0%/năm", "Áp dụng cho khách hàng lướt sóng", "Thời gian nắm giữ ngắn hạn"],
    link: "https://kafi.vn/margin-t",
  },
  {
    rate: "0",
    title: "Gói vay kỳ quỹ Margin-Zero",
    shortTitle: "MARGIN-ZERO",
    description: "Vay 0% lên đến 100 triệu",
    badge: "BEST SELLER",
    benefits: ["Lãi vay margin 0%", "Dành cho dư nợ đến 100 triệu VND", "Thủ tục đơn giản, giải ngân nhanh"],
    link: "https://kafi.vn/margin-zero",
  },
  {
    rate: "8",
    title: "Gói vay kỳ quỹ Margin Cashback",
    shortTitle: "MARGIN CASHBACK",
    description: "Giao dịch tần suất cao",
    benefits: ["Lãi suất chỉ từ 8%/năm", "Dành cho khách hàng giao dịch tần suất cao", "Ưu đãi hoàn phí giao dịch"],
    link: "https://kafi.vn/margin-cashback",
  },
  {
    rate: "10",
    title: "Gói vay kỳ quỹ Margin Plus",
    shortTitle: "MARGIN PLUS",
    description: "Dư nợ lớn – linh hoạt",
    benefits: ["Lãi vay margin chỉ 10%/năm", "Dành cho dư nợ từ 2 - 20 tỷ VND", "Hạn mức linh hoạt, hỗ trợ tối đa"],
    link: "https://kafi.vn/margin-plus",
  },
];

export default function SpecialOffers() {
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/40 sm:p-8">
      <h2 className="mb-6 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
        Gói vay ký quỹ Margin
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {OFFERS.map((offer) => (
          <a
            key={offer.shortTitle}
            href={offer.link}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex flex-col rounded-xl border border-slate-200 bg-white p-5 transition-shadow duration-300 hover:shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:border-slate-800 dark:bg-slate-900"
          >
            {offer.badge && (
              <span className="absolute right-4 top-4 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                {offer.badge}
              </span>
            )}

            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {offer.rate}%<span className="ml-1 text-xs font-medium text-slate-400">/năm</span>
            </div>
            <h3 className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{offer.shortTitle}</h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{offer.description}</p>

            <ul className="mt-4 flex-1 space-y-1.5">
              {offer.benefits.map((b) => (
                <li key={b} className="flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
                  {b}
                </li>
              ))}
            </ul>

            <span className="mt-4 inline-flex items-center justify-center rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-700 transition-colors duration-300 group-hover:border-emerald-600 group-hover:text-emerald-600 dark:border-slate-700 dark:text-slate-300 dark:group-hover:border-emerald-500 dark:group-hover:text-emerald-400">
              Chi tiết →
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
