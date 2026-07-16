"use client";

import { StockTable } from "@/components/StockTable";
import { useWatchlist } from "@/lib/watchlist";

export default function DanhMucPage() {
  const { symbols, remove } = useWatchlist();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">Danh mục theo dõi</h1>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Danh sách được lưu trên trình duyệt của bạn. Bấm biểu tượng ngôi sao ở bảng giá để thêm mã vào đây.
      </p>
      <StockTable
        symbols={symbols}
        onRemove={remove}
        emptyMessage="Danh mục theo dõi đang trống. Hãy thêm mã cổ phiếu từ trang Bảng giá."
      />
    </div>
  );
}
