interface Offer {
  rate: string;
  rateImage?: string; // Optional: path to 3D number image
  title: string;
  description: string;
  color: string;
  link: string;
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
            {/* Rate Display */}
            <div className="flex items-center justify-center bg-gradient-to-b from-slate-50 to-white px-4 py-10 dark:from-slate-800/50 dark:to-slate-900/50">
              {offer.rateImage ? (
                <img src={offer.rateImage} alt={`${offer.rate}%`} className="h-32 object-contain" />
              ) : (
                <div className="relative inline-block">
                  {/* 3D Number Display */}
                  <div className="relative text-center">
                    {/* Shadow layers for 3D effect */}
                    <div className="absolute inset-0 -z-10 bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 blur-2xl rounded-full" />

                    {/* Main number */}
                    <div className="text-8xl font-black leading-none">
                      <span className="bg-gradient-to-b from-emerald-500 to-teal-600 bg-clip-text text-transparent drop-shadow-2xl">
                        {offer.rate}
                      </span>
                    </div>

                    {/* Percent symbol */}
                    <div className="absolute bottom-4 right-0 text-2xl font-bold">
                      <span className="bg-gradient-to-b from-emerald-500 to-teal-600 bg-clip-text text-transparent">
                        %
                      </span>
                    </div>
                  </div>
                </div>
              )}
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
