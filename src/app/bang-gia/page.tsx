import { TradingViewMarketOverview } from "@/components/TradingViewMarketOverview";
import { STOCKS, buildExchangeTabs } from "@/lib/symbols";

const TABS = buildExchangeTabs(STOCKS);

export default function BangGiaPage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">Bảng giá cổ phiếu</h1>
      <p className="text-xs text-neutral-500">
        Dữ liệu trực tiếp từ TradingView. Chọn sàn HOSE / HNX / UPCOM ở các tab bên trong bảng.
      </p>
      <TradingViewMarketOverview tabs={TABS} height={600} />
    </div>
  );
}
