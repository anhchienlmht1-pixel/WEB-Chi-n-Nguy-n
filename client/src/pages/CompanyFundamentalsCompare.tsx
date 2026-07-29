import { useState } from "react";
import BankCompare from "./BankCompare";
import SecuritiesCompare from "./SecuritiesCompare";
import RealEstateCompare from "./RealEstateCompare";

type Group = "bank" | "securities" | "realestate";

const GROUPS: { value: Group; label: string }[] = [
  { value: "bank", label: "Ngân hàng" },
  { value: "securities", label: "Chứng khoán" },
  { value: "realestate", label: "Bất động sản" },
];

// Merges the three former standalone nav items (So sánh ngân hàng/chứng
// khoán/bất động sản) into one "Cơ bản doanh nghiệp" tab. Each group is
// still the same self-contained page component as before (own heading,
// data fetching, chart) — this just switches which one renders, nothing
// inside them changed.
export default function CompanyFundamentalsCompare() {
  const [group, setGroup] = useState<Group>("bank");

  return (
    <div>
      <div className="mx-auto max-w-[1400px] px-4 pt-6">
        <div className="flex w-fit gap-1 rounded-lg border border-slate-200 p-1 text-sm font-medium dark:border-slate-800">
          {GROUPS.map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => setGroup(g.value)}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                group === g.value
                  ? "bg-emerald-500 text-slate-950"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {group === "bank" && <BankCompare />}
      {group === "securities" && <SecuritiesCompare />}
      {group === "realestate" && <RealEstateCompare />}
    </div>
  );
}
