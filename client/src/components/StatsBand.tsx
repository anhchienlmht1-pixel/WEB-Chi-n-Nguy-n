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
    <section className="mb-12 rounded-xl border border-slate-800 bg-gradient-to-br from-slate-950 via-[#0c1d22] to-[#07332f] px-6 py-10 sm:px-10">
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="text-center">
            <div className="text-3xl font-bold text-emerald-400 sm:text-4xl">{s.value}</div>
            <div className="mt-2 text-xs leading-snug text-slate-400 sm:text-sm">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
