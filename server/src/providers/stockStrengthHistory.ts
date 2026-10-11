import { put, head } from "@vercel/blob";
import type { StockStrengthSheet } from "./stockStrength.js";

// Durable day-by-day archive of "Sức mạnh cổ phiếu" breadth. The Google
// Sheet behind stockStrength.ts only ever shows TODAY's scores (no
// history) -- this persists one snapshot per calendar day to Vercel Blob,
// the same pattern already used for the daily-digest archive (see
// digest/digestHistory.ts), so a real history of leadership breadth
// builds up going forward. There is no way to backfill past days: their
// scores were never recorded anywhere before this existed.
//
// Requires BLOB_READ_WRITE_TOKEN (already connected on this project for
// the digest archive) -- without it, every function here is a no-op.

const PATHNAME = "stock-strength-history/snapshots.json";

// Mirrors client/src/utils/stockStrength.ts's "Khỏe" band threshold: the
// two highest bands ("Khỏe", "Rất Khỏe") are what that sheet's own legend
// treats as a stock actively leading, not just holding up.
const LEADING_SCORE_THRESHOLD = 550;

export interface SectorBreadth {
  sector: string;
  leadingCount: number;
  totalCount: number;
  breadthPct: number;
}

export interface StockStrengthSnapshot {
  date: string; // YYYY-MM-DD
  leadingCount: number;
  totalCount: number;
  breadthPct: number;
  bySector: SectorBreadth[];
}

function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

// The sheet's own asOfDate is DD/MM/YYYY when present; falls back to
// today (server clock, UTC) when missing or unparsable so a snapshot is
// still recorded rather than dropped.
function toIsoDate(sheetDate: string | null): string {
  const m = sheetDate?.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return new Date().toISOString().slice(0, 10);
}

function computeBreadth(sheet: StockStrengthSheet): StockStrengthSnapshot {
  const bySector: SectorBreadth[] = sheet.sectors.map((s) => {
    const leadingCount = s.stocks.filter((st) => st.score >= LEADING_SCORE_THRESHOLD).length;
    const totalCount = s.stocks.length;
    return {
      sector: s.sector,
      leadingCount,
      totalCount,
      breadthPct: totalCount > 0 ? (leadingCount / totalCount) * 100 : 0,
    };
  });
  const leadingCount = bySector.reduce((sum, s) => sum + s.leadingCount, 0);
  const totalCount = bySector.reduce((sum, s) => sum + s.totalCount, 0);
  return {
    date: toIsoDate(sheet.asOfDate),
    leadingCount,
    totalCount,
    breadthPct: totalCount > 0 ? (leadingCount / totalCount) * 100 : 0,
    bySector,
  };
}

async function readSnapshots(): Promise<StockStrengthSnapshot[]> {
  try {
    const meta = await head(PATHNAME);
    const res = await fetch(meta.url);
    if (!res.ok) return [];
    return (await res.json()) as StockStrengthSnapshot[];
  } catch {
    // Covers both "nothing saved yet" (BlobNotFoundError -- expected the
    // very first time this runs) and any transient error -- either way,
    // callers treat "no data" the same as "not saved yet".
    return [];
  }
}

async function writeSnapshots(snapshots: StockStrengthSnapshot[]): Promise<void> {
  await put(PATHNAME, JSON.stringify(snapshots), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

// Best-effort, called from the /stock-strength route every time its own
// 5-min cache re-fetches the sheet -- overwrites today's entry each time
// (rather than appending a duplicate) so the recorded value is always the
// latest read for the day, not frozen at whatever it was first thing in
// the morning. A Blob failure here must never break the live sheet
// response, so this only logs and moves on.
export async function recordStockStrengthSnapshot(sheet: StockStrengthSheet): Promise<void> {
  if (!blobConfigured()) return;
  if (sheet.sectors.length === 0) return;
  try {
    const snapshot = computeBreadth(sheet);
    const existing = await readSnapshots();
    const next = [...existing.filter((s) => s.date !== snapshot.date), snapshot].sort((a, b) =>
      a.date < b.date ? -1 : 1
    );
    await writeSnapshots(next);
  } catch (err) {
    console.error(
      `[stock-strength-history] Không lưu được snapshot: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

export async function listStockStrengthHistory(): Promise<StockStrengthSnapshot[]> {
  if (!blobConfigured()) return [];
  return readSnapshots();
}

export function isStockStrengthHistoryEnabled(): boolean {
  return blobConfigured();
}
