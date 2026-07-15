import { MarketIndexCards } from "@/components/MarketIndexCard";
import { TopMovers } from "@/components/TopMovers";
import { StockTable } from "@/components/StockTable";
import { DEFAULT_BOARD_SYMBOLS } from "@/lib/symbols";

export default function HomePage() {
  const watchSample = DEFAULT_BOARD_SYMBOLS.slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h1 className="mb-3 text-lg font-semibold text-neutral-800">Tổng quan thị trường</h1>
        <MarketIndexCards />
      </section>

      <section>
        <TopMovers />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-800">Cổ phiếu tiêu biểu</h2>
          <a href="/bang-gia" className="text-sm font-medium text-rose-600 hover:underline">
            Xem toàn bộ bảng giá →
          </a>
        </div>
        <StockTable symbols={watchSample} />
      </section>
    </div>
  );
}
