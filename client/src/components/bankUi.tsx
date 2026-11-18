import type React from "react";
import { BANKS, type BankGroup } from "../data/bankSector";

// Dùng chung cho các mục của trang Ngành ngân hàng.
export const GROUPS: ("Tất cả" | BankGroup)[] = ["Tất cả", "SOBs", "NHTM lớn", "NHTM vừa"];
export type GroupFilter = (typeof GROUPS)[number];
export const groupOf = (bank: string) => BANKS.find((b) => b.bank === bank)?.group;
export const banksIn = (g: GroupFilter) => BANKS.filter((b) => g === "Tất cả" || b.group === g).map((b) => b.bank);

// Mean / standard deviation of a metric across all 16 banks (level) and of its
// year-on-year change, for the heat-map intensity.
export function stats(xs: number[]) {
  const m = xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length || 1)) || 1;
  return { m, sd };
}
export type Mode = "Theo TB ngành" | "Theo cùng kỳ";
export const MODES: Mode[] = ["Theo TB ngành", "Theo cùng kỳ"];
// |z| → mix strength (4 steps) so strong outliers stand out.
export const STEPS = [0, 18, 32, 48, 66];
export function step(z: number) {
  const a = Math.abs(z);
  return a < 0.25 ? 0 : a < 0.75 ? 1 : a < 1.25 ? 2 : a < 1.75 ? 3 : 4;
}
export function heat(signed: number, z: number): React.CSSProperties | undefined {
  const k = step(z);
  if (!k || !signed) return undefined;
  const c = signed > 0 ? "var(--heat-up)" : "var(--heat-down)";
  return {
    background: `color-mix(in srgb, ${c} ${STEPS[k]}%, transparent)`,
    color: k >= 3 ? "var(--heat-ink-strong)" : "var(--heat-ink)",
    fontWeight: k >= 3 ? 700 : 500,
  };
}

export const vn = (x: number, d = 2) => x.toLocaleString("vi-VN", { minimumFractionDigits: d, maximumFractionDigits: d });
export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="min-w-0 flex-[1_1_12rem] border-[var(--ab-line)] px-5 py-3.5 [&:not(:first-child)]:border-l">
      <p className="text-[0.82rem] text-[var(--ab-muted)]">{label}</p>
      <p className="mt-0.5 text-[1.75rem] font-bold tabular-nums leading-tight text-[var(--ab-strong)]">{value}</p>
      <p className="mt-0.5 text-xs text-[var(--ab-muted)]">{sub}</p>
    </div>
  );
}

export function Seg<T extends string>({ items, value, onChange, label }: { items: readonly T[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex overflow-hidden rounded-lg border border-[var(--ab-line)]">
      {items.map((t) => (
        <button
          key={t}
          type="button"
          aria-pressed={t === value}
          onClick={() => onChange(t)}
          className={`px-3 py-1.5 text-[0.82rem] transition-colors ${
            t === value ? "bg-[var(--ab-accent)] font-bold text-[var(--ab-bg)]" : "text-[var(--ab-muted)] hover:bg-[var(--ab-hover)]"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

