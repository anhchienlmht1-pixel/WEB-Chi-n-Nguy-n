import { fetchPublishedCsvTable } from "./googleSheet.js";

// A second "Publish to web" Google Sheet (separate from googleSheet.ts's
// investment-outlook one — different sheet, different published link),
// listing one row per symbol with one or more "money flow strength"
// columns. Column names aren't known ahead of time (this integration was
// wired up without live network access to the sheet itself — the sandbox
// this was built in blocks docs.google.com entirely, same limitation the
// README already documents for other data sources), so parsing below finds
// the header row and symbol column generically instead of assuming fixed
// positions, and carries every other column through verbatim under its own
// sheet-given label rather than guessing which one is "the" score.
const PUBLISHED_ID =
  "2PACX-1vR1J67anMdtDHEkz7g60hMenqJs3BbC0bRacN9PTPP_KLopSR4XY1uUm34vJ64fxkeSK9kDBBi-yy-J";

// The sheet's edit URL was shared as .../edit?gid=621128686 — a specific
// tab, not the workbook's default one. Without this, fetchPublishedCsvTable
// silently reads whichever tab "pub" treats as default, which is very
// possibly a different (e.g. empty, or a different sheet's) tab — that
// mismatch is the leading suspect for the money-flow column not showing up
// live at all despite parsing degrading gracefully.
const DEFAULT_GID = "621128686";

export interface MoneyFlowRecord {
  symbol: string;
  /** Best-guess "main" column (header containing "dòng tiền"/"sức mạnh"/
   * "mfi"/"money flow"), so the Dashboard can show one value per row
   * without needing to know the sheet's exact column name. */
  primaryLabel: string | null;
  primaryValue: string | null;
  /** Every other column on that row, keyed by its own header text as-is —
   * nothing is dropped even if primaryLabel guessed wrong. */
  metrics: Record<string, string>;
}

function normalize(s: string): string {
  return s.normalize("NFC").trim().toLowerCase();
}

const looksLikeTicker = (v: string) => /^[A-Z0-9]{1,10}$/.test(v.trim().toUpperCase());

const PRIMARY_KEYWORDS = ["dòng tiền", "dong tien", "sức mạnh", "suc manh", "mfi", "money flow"];

function findHeaderRow(table: string[][]): { rowIdx: number; symbolCol: number } | null {
  for (let r = 0; r < table.length; r++) {
    for (let c = 0; c < table[r].length; c++) {
      const cell = normalize(table[r][c] || "");
      if (cell === "mã" || cell === "ma" || cell === "symbol" || cell === "ticker" || cell === "mã cp") {
        return { rowIdx: r, symbolCol: c };
      }
    }
  }
  return null;
}

export function parseMoneyFlowTable(table: string[][]): MoneyFlowRecord[] {
  const header = findHeaderRow(table);
  if (!header) return [];
  const { rowIdx, symbolCol } = header;
  const headerRow = table[rowIdx];

  const columns = headerRow
    .map((label, col) => ({ col, label: (label || "").trim() }))
    .filter(({ col, label }) => col !== symbolCol && label !== "");

  const primaryCol =
    columns.find(({ label }) => PRIMARY_KEYWORDS.some((kw) => normalize(label).includes(kw))) ?? columns[0];

  const records: MoneyFlowRecord[] = [];
  for (let r = rowIdx + 1; r < table.length; r++) {
    const row = table[r];
    const symbolRaw = (row[symbolCol] || "").trim().toUpperCase();
    if (!symbolRaw || !looksLikeTicker(symbolRaw)) continue;

    const metrics: Record<string, string> = {};
    for (const { col, label } of columns) {
      const value = (row[col] || "").trim();
      if (value) metrics[label] = value;
    }

    const primaryValue = primaryCol ? (row[primaryCol.col] || "").trim() : "";

    records.push({
      symbol: symbolRaw,
      primaryLabel: primaryCol?.label ?? null,
      primaryValue: primaryValue || null,
      metrics,
    });
  }

  return records;
}

export async function fetchMoneyFlowTable(gid?: string): Promise<MoneyFlowRecord[]> {
  const table = await fetchPublishedCsvTable(PUBLISHED_ID, gid ?? DEFAULT_GID);
  const records = parseMoneyFlowTable(table);
  if (records.length === 0) {
    const preview = JSON.stringify(table.slice(0, 8).map((r) => r.slice(0, 8))).slice(0, 1200);
    throw Object.assign(
      new Error(`Không tìm thấy cột "Mã" hoặc không có hàng dữ liệu nào trong trang tính. Dữ liệu đọc được: ${preview}`),
      { status: 502 }
    );
  }
  return records;
}
