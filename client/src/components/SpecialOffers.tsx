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
      {/* Dark Background Section - Compact */}
      <div className="rounded-lg bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-4 relative overflow-hidden dark:from-slate-950 dark:via-black dark:to-slate-950">
        {/* Background Pattern - Subtle */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl" />
        </div>

        <div className="relative z-10">
          {/* Header - Minimal */}
          <div className="text-center mb-4">
            <div className="text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-1">
              GÓI VAY KÝ QUỸ
            </div>
            <h2 className="text-lg md:text-xl font-bold text-white mb-1 leading-tight">
              MARGIN LINH HOẠT
            </h2>
            <p className="text-slate-300 text-xs">Lãi suất cạnh tranh – Hỗ trợ tối đa</p>
          </div>

          {/* Offers Grid - 2 columns max */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
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
                  className={`relative rounded-lg bg-gradient-to-b from-slate-800 to-slate-900 border ${
                    glowClasses[offer.glowColor as keyof typeof glowClasses]
                  } shadow-lg overflow-hidden group hover:shadow-lg transition-all dark:from-slate-900 dark:to-black block h-full cursor-pointer`}
                >
                  {/* Glow Effect Border */}
                  <div
                    className={`absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`}
                    style={{
                      background: `radial-gradient(circle at center, ${
                        offer.glowColor === "emerald"
                          ? "#10b981"
                          : offer.glowColor === "cyan"
                            ? "#06b6d4"
                            : "#f59e0b"
                      }20, transparent)`,
                    }}
                  />

                  {/* Badge - Compact */}
                  {offer.badge && (
                    <div className="absolute top-2 left-2 z-10">
                      <div className={`text-white px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        offer.badge === "BEST SELLER"
                          ? "bg-cyan-500"
                          : "bg-emerald-500"
                      }`}>
                        {offer.badge}
                      </div>
                    </div>
                  )}

                  <div className="relative z-10 p-3 h-full flex flex-col">
                    {/* Rate Display - Compact */}
                    <div className="text-center mb-2">
                      <div className="text-3xl font-black text-emerald-400 leading-none mb-0.5">
                        {offer.rate}%
                      </div>
                      <div className="text-xs font-semibold text-emerald-300">/năm</div>
                    </div>

                    {/* Title */}
                    <h3 className="text-white font-bold text-sm mb-1 text-center">{offer.shortTitle}</h3>
                    <div className="bg-emerald-500/20 border border-emerald-500/50 rounded px-2 py-0.5 text-center mb-2">
                      <p className="text-emerald-300 text-[11px] font-semibold">{offer.description}</p>
                    </div>

                    {/* Benefits - Minimal */}
                    <div className="space-y-1 mb-2 flex-1 text-[11px]">
                      {offer.benefits.slice(0, 2).map((benefit, idx) => (
                        <div key={idx} className="flex gap-1.5">
                          <div className="text-sm shrink-0">{benefit.icon}</div>
                          <p className="text-slate-400 leading-tight">{benefit.text}</p>
                        </div>
                      ))}
                    </div>

                    {/* CTA Button */}
                    <div className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 group-hover:from-emerald-500 group-hover:to-emerald-400 text-white font-bold py-2 px-3 rounded transition-all text-center text-[11px]">
                      TÌM HIỂU THÊM →
                    </div>
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
