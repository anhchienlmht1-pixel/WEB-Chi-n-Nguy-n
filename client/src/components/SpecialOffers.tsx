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
    <div className="mb-8 -mx-4 px-4">
      {/* Dark Background Section */}
      <div className="rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-8 relative overflow-hidden dark:from-slate-950 dark:via-black dark:to-slate-950">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl" />
        </div>

        <div className="relative z-10">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="text-emerald-400 text-sm font-semibold uppercase tracking-widest mb-2">
              — GÓI VAY KÝ QUỸ —
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-3 leading-tight">
              MARGIN LINH HOẠT – HIỆU QUẢ TỐI ƯU
            </h2>
            <p className="text-slate-300 text-lg">Đa dạng gói vay – Lãi suất cạnh tranh – Hỗ trợ nhà đầu tư tối đa</p>
          </div>

          {/* Offers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
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
                  className={`relative rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border ${
                    glowClasses[offer.glowColor as keyof typeof glowClasses]
                  } shadow-2xl overflow-hidden group hover:shadow-2xl transition-all dark:from-slate-900 dark:to-black block h-full cursor-pointer`}
                >
                  {/* Glow Effect Border */}
                  <div
                    className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`}
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

                  {/* Badge */}
                  {offer.badge && (
                    <div className="absolute top-4 left-4 z-10">
                      <div className={`text-white px-3 py-1 rounded-full text-xs font-bold transform -rotate-12 ${
                        offer.badge === "BEST SELLER"
                          ? "bg-cyan-500"
                          : "bg-emerald-500"
                      }`}>
                        {offer.badge}
                      </div>
                    </div>
                  )}

                  <div className="relative z-10 p-6 h-full flex flex-col">
                    {/* Rate Display */}
                    <div className="text-center mb-4">
                      <div className="text-5xl md:text-6xl font-black text-emerald-400 leading-none mb-1">
                        {offer.rate}%
                      </div>
                      <div className="text-xl font-bold text-emerald-300">/năm</div>
                    </div>

                    {/* Title */}
                    <h3 className="text-white font-black text-lg mb-1 text-center">{offer.shortTitle}</h3>
                    <div className="bg-emerald-500/20 border border-emerald-500/50 rounded-lg px-3 py-1 text-center mb-4">
                      <p className="text-emerald-300 text-xs font-semibold">{offer.description}</p>
                    </div>

                    {/* Benefits */}
                    <div className="space-y-3 mb-6 flex-1">
                      {offer.benefits.map((benefit, idx) => (
                        <div key={idx} className="flex gap-3">
                          <div className="text-xl shrink-0">{benefit.icon}</div>
                          <p className="text-sm text-slate-300 leading-snug">{benefit.text}</p>
                        </div>
                      ))}
                    </div>

                    {/* CTA Button */}
                    <div className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 group-hover:from-emerald-500 group-hover:to-emerald-400 text-white font-bold py-3 px-4 rounded-lg transition-all text-center text-sm">
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
