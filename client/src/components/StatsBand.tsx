// Only real, verifiable numbers about the platform itself (not fabricated
// user/AUM figures this small advisory site doesn't have) — see
// server/src/providers/universe.ts (72 symbols scanned) and
// client/src/utils/indicatorCatalog.ts (27 indicator defs).
const STATS = [
  { value: "70+", label: "Mã cổ phiếu quét tín hiệu mỗi giờ" },
  { value: "27", label: "Chỉ báo kỹ thuật có sẵn" },
  { value: "10s", label: "Tần suất cập nhật bảng giá" },
  { value: "3", label: "Sàn giao dịch: HOSE, HNX, UPCOM" },
];

export default function StatsBand() {
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-10 dark:border-slate-800 dark:bg-slate-900/40 sm:px-10">
      <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="text-center">
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 sm:text-4xl">{s.value}</div>
            <div className="mt-2 text-xs leading-snug text-slate-500 dark:text-slate-400 sm:text-sm">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
