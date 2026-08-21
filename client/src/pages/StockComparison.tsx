import StockComparator from "../components/StockComparator";

export default function StockComparison() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
          📊 So Sánh Giá Cổ Phiếu
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Thêm các mã cổ phiếu để so sánh giá, khối lượng và biến động thị trường cùng lúc
        </p>
      </div>

      <StockComparator />
    </div>
  );
}
