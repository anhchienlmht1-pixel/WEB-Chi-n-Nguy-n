interface Offer {
  rate: string;
  rateImage?: string;
  title: string;
  shortTitle: string;
  description: string;
  badge?: string;
  benefits: Array<{
    icon: string;
    text: string;
  }>;
  link: string;
  glowColor: string;
}

const OFFERS: Offer[] = [
  {
    rate: "0",
    title: "Gói vay kỳ quỹ Margin T",
    shortTitle: "MARGIN T",
    description: "Lãi suất 0%",
    badge: "MỚI",
    benefits: [
      { icon: "⚡", text: "Lãi suất chỉ từ 0%/năm" },
      { icon: "📅", text: "Áp dụng cho khách hàng lướt sóng" },
      { icon: "🛡️", text: "Thời gian năm giữ ngắn hạn" },
    ],
    link: "https://kafi.vn/margin-t",
    glowColor: "emerald",
  },
  {
    rate: "0",
    title: "Gói vay kỳ quỹ Margin-Zero",
    shortTitle: "MARGIN-ZERO",
    description: "Vay 0% lên đến 100 triệu",
    badge: "BEST SELLER",
    benefits: [
      { icon: "💰", text: "Lãi vay margin 0%" },
      { icon: "💵", text: "Dành cho dự nợ đến 100 triệu VND" },
      { icon: "👤", text: "Thủ tục đơn giản, giải ngân nhanh" },
    ],
    link: "https://kafi.vn/margin-zero",
    glowColor: "cyan",
  },
  {
    rate: "8",
    title: "Gói vay kỳ quỹ Margin Cashback",
    shortTitle: "MARGIN CASHBACK",
    description: "Giao dịch tần suất cao",
    benefits: [
      { icon: "📈", text: "Lãi suất chỉ từ 8%/năm" },
      { icon: "💳", text: "Dành cho khách hàng giao dịch tần suất cao" },
      { icon: "💵", text: "Ưu đãi hoàn phí giao dịch" },
    ],
    link: "https://kafi.vn/margin-cashback",
    glowColor: "cyan",
  },
  {
    rate: "10",
    title: "Gói vay kỳ quỹ Margin Plus",
    shortTitle: "MARGIN PLUS",
    description: "Dự nợ lớn – linh hoạt",
    benefits: [
      { icon: "📊", text: "Lãi vay margin chỉ 10%/năm" },
      { icon: "💎", text: "Dành cho dự nợ từ 2 - 20 tỷ VND" },
      { icon: "🎯", text: "Hạn mức linh hoạt, hỗ trợ tối đa" },
    ],
    link: "https://kafi.vn/margin-plus",
    glowColor: "amber",
  },
];

export default function SpecialOffers() {
  return (
    <div className="mb-2 -mx-4 px-4">
      {/* Dark Background Section - Ultra Compact */}
      <div className="rounded-md bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-3 relative overflow-hidden dark:from-slate-950 dark:via-black dark:to-slate-950">
        {/* No background pattern */}

        <div className="relative z-10">
          {/* Header - Minimal */}
          <div className="mb-2.5">
            <h2 className="text-xs font-bold text-white mb-0.5 leading-tight uppercase tracking-wide">
              Gói vay KÝ QUỸ MARGIN
            </h2>
          </div>

          {/* Offers Grid - 4 columns */}
          <div className="grid grid-cols-4 gap-2">
            {OFFERS.map((offer) => {
              const glowClasses = {
                emerald: "border-emerald-500/50 shadow-emerald-500/20",
                cyan: "border-cyan-500/50 shadow-cyan-500/20",
                amber: "border-amber-500/50 shadow-amber-500/20",
              };

              return (
                <a
                  key={offer.shortTitle}
                  href={offer.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`relative rounded border ${
                    glowClasses[offer.glowColor as keyof typeof glowClasses]
                  } shadow-sm overflow-hidden group hover:shadow-md transition-all bg-slate-800/80 dark:bg-slate-900/80 block cursor-pointer`}
                >
                  {/* Badge - Super Compact */}
                  {offer.badge && (
                    <div className="absolute top-1 left-1 z-10">
                      <div className={`text-white px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        offer.badge === "BEST SELLER"
                          ? "bg-cyan-500"
                          : "bg-emerald-500"
                      }`}>
                        {offer.badge}
                      </div>
                    </div>
                  )}

                  <div className="relative z-10 p-2 flex flex-col h-full">
                    {/* Rate Display - Ultra Compact */}
                    <div className="text-center mb-1">
                      <div className="text-2xl font-black text-emerald-400 leading-none">
                        {offer.rate}% <span className="text-[10px] font-semibold text-emerald-300">/năm</span>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-white font-bold text-[11px] mb-1 text-center leading-tight">{offer.shortTitle}</h3>
                    <p className="text-emerald-300 text-[9px] font-semibold text-center mb-1 leading-tight flex-1">
                      {offer.description}
                    </p>

                    {/* CTA Button - Minimal */}
                    <button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1 px-2 rounded text-[9px] transition-all">
                      Chi tiết →
                    </button>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
