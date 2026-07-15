import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketIndexCards } from "@/components/MarketIndexCard";
import { TopMovers } from "@/components/TopMovers";
import { StockTable } from "@/components/StockTable";
import { DEFAULT_BOARD_SYMBOLS } from "@/lib/symbols";

export default function HomePage() {
  const watchSample = DEFAULT_BOARD_SYMBOLS.slice(0, 10);

  return (
    <div className="flex flex-col gap-10">
      <section className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-50 px-6 py-14 dark:border-neutral-800 dark:bg-neutral-900/40 sm:px-10 sm:py-20">
        <div className="glow-radial pointer-events-none absolute inset-0" />
        <div className="relative flex flex-col items-start gap-5">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400">
            Theo dõi · Phân tích · Đầu tư
          </span>
          <h1 className="max-w-2xl text-4xl font-bold leading-tight text-neutral-900 dark:text-neutral-50 sm:text-5xl">
            Thị trường chứng khoán Việt Nam,{" "}
            <span className="italic text-brand-600 dark:text-brand-400">trong tầm tay bạn</span>
          </h1>
          <p className="max-w-xl text-neutral-600 dark:text-neutral-400">
            Cập nhật VN-Index, HNX-Index, UPCOM-Index và bảng giá cổ phiếu theo thời gian thực —
            miễn phí, không cần đăng nhập.
          </p>
          <Link
            href="/bang-gia"
            className="mt-2 inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(39,133,122,0.5)] transition-transform hover:scale-[1.02]"
          >
            Xem bảng giá
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold text-neutral-900 dark:text-neutral-50">Tổng quan thị trường</h2>
        <MarketIndexCards />
      </section>

      <section>
        <TopMovers />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">Cổ phiếu tiêu biểu</h2>
          <Link
            href="/bang-gia"
            className="text-sm font-semibold text-brand-700 hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300"
          >
            Xem toàn bộ bảng giá →
          </Link>
        </div>
        <StockTable symbols={watchSample} />
      </section>
    </div>
  );
}
