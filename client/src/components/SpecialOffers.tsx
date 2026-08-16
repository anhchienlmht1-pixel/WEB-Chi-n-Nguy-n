interface Offer {
  rate: string;
  title: string;
  description: string;
  color: string;
  link: string;
}

// SVG number display with 3D effect
function RateSVG({ number }: { number: string }) {
  return (
    <svg viewBox="0 0 200 160" className="h-32 w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={`grad-${number}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="50%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
        <filter id={`shadow-${number}`} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="4" dy="4" stdDeviation="6" floodOpacity="0.3" />
          <feDropShadow dx="2" dy="-2" stdDeviation="3" floodOpacity="0.2" floodColor="white" />
        </filter>
      </defs>

      {/* Main number */}
      <text
        x="50%"
        y="65%"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="100"
        fontWeight="900"
        fill={`url(#grad-${number})`}
        filter={`url(#shadow-${number})`}
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        {number}
      </text>

      {/* Percent symbol */}
      <text
        x="75%"
        y="50%"
        textAnchor="start"
        dominantBaseline="middle"
        fontSize="32"
        fontWeight="700"
        fill={`url(#grad-${number})`}
        filter={`url(#shadow-${number})`}
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        %
      </text>
    </svg>
  );
}

const OFFERS: Offer[] = [
  {
    rate: "0",
    title: "Gói vay kỳ quỹ Margin T",
    description: "Gói vay linh hoạt với lãi suất chỉ từ 0%/năm. Áp dụng cho khách hàng lướt sóng, thời gian năm giữ ngắn hạn.",
    color: "from-emerald-500 to-teal-500",
    link: "https://kafi.vn/margin-t",
  },
  {
    rate: "0",
    title: "Gói vay kỳ quỹ Margin-Zero",
    description: "Lãi vay margin 0% dành cho dư nợ đến 100 triệu VND",
    color: "from-cyan-500 to-emerald-500",
    link: "https://kafi.vn/margin-zero",
  },
  {
    rate: "8",
    title: "Gói vay kỳ quỹ Margin Cashback",
    description: "Gói vay linh hoạt với lãi suất chỉ từ 8%/năm. Áp dụng cho khách hàng giao dịch tần suất cao.",
    color: "from-teal-500 to-cyan-500",
    link: "https://kafi.vn/margin-cashback",
  },
  {
    rate: "10",
    title: "Gói vay kỳ quỹ Margin Plus",
    description: "Lãi vay margin chỉ 10% dành cho dư nợ từ 2 - 20 tỷ VND (2 tỷ ≤ dư nợ ≤ 20 tỷ)",
    color: "from-emerald-400 to-teal-600",
    link: "https://kafi.vn/margin-plus",
  },
];

export default function SpecialOffers() {
  return (
    <section className="mb-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">🎁 Ưu đãi</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {OFFERS.map((offer) => (
          <div
            key={offer.title}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/40"
          >
            {/* Rate Display - SVG */}
            <div className="flex items-center justify-center bg-slate-50/50 px-4 py-6 dark:bg-slate-800/30">
              <RateSVG number={offer.rate} />
            </div>

            {/* Content */}
            <div className="p-5">
              <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-100">
                {offer.title}
              </h3>
              <p className="mb-4 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {offer.description}
              </p>
            </div>

            {/* CTA */}
            <div className="border-t border-slate-100 px-5 py-3 dark:border-slate-800">
              <a
                href={offer.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center rounded-md bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
              >
                Tìm hiểu thêm →
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
