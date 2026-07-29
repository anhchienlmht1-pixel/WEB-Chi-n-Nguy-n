import { fetchPublishedCsvTable } from "./googleSheet.js";

// A second "Publish to web" Google Sheet (separate from googleSheet.ts's
// investment-outlook one). Its actual layout — confirmed from a live error
// preview after the first (wrong) generic-table parser attempt below found
// nothing — is NOT a "Mã | metric columns" table. It's several sector
// groups laid out side by side as (symbol, score) column pairs, each
// sector already ranked descending by score within its own pair:
//
//   THÉP          BĐS           CHỨNG KHOÁN   NGÂN HÀNG
//   NKG 309       VIC 515       HCM 520       MSB 525
//   HSG 303       VHM 420       ORS 430       LPB 486
//   HPG 278       NVL 375       VND 352       STB 467
//   VGS 186       ASM 343       VCI 295       ACB 450
//                 DTD 251       SHS 288       HDB 358
//                 NLG 234       MBS 283       OCB 293
//
// Sector names and count of sectors aren't hard-coded — a sector's column
// pair is detected generically (a non-ticker header cell whose column,
// one row down, holds a ticker+number), so adding/removing/renaming a
// sector column in the sheet doesn't require a code change.
const PUBLISHED_ID =
  "2PACX-1vR1J67anMdtDHEkz7g60hMenqJs3BbC0bRacN9PTPP_KLopSR4XY1uUm34vJ64fxkeSK9kDBBi-yy-J";

// The sheet's edit URL was shared as .../edit?gid=621128686 — a specific
// tab, not the workbook's default one.
const DEFAULT_GID = "621128686";

export interface MoneyFlowRecord {
  symbol: string;
  sector: string;
  score: number;
  /** 1-based position within its sector's column, already ranked
   * descending by score in the sheet itself — highest score first. */
  rank: number;
}

// Real VN tickers are plain ASCII letters/digits, no diacritics or spaces —
// which is exactly what distinguishes a symbol cell ("NKG") from a sector
// name cell ("BĐS", "CHỨNG KHOÁN"): Vietnamese sector names always carry a
// diacritic or a space, so they fail this check and a ticker cell passes.
const looksLikeTicker = (v: string) => /^[A-Z0-9]{2,10}$/.test(v.trim().toUpperCase());

function parseNumber(v: string): number | null {
  const n = Number(v.trim().replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

interface SectorColumn {
  headerRow: number;
  sector: string;
  symbolCol: number;
  scoreCol: number;
}

// A sector column pair is (headerCell, blank) directly above a (ticker,
// number) row — found by scanning every cell rather than assuming a fixed
// header row index, since there's a title/date row above it in the real
// sheet.
function findSectorColumns(table: string[][]): SectorColumn[] {
  const columns: SectorColumn[] = [];
  for (let r = 0; r < table.length - 1; r++) {
    const row = table[r];
    for (let c = 0; c < row.length - 1; c++) {
      const headerCell = (row[c] || "").trim();
      if (!headerCell || looksLikeTicker(headerCell)) continue;

      const nextRow = table[r + 1] || [];
      const belowSymbol = (nextRow[c] || "").trim();
      const belowScore = (nextRow[c + 1] || "").trim();
      if (looksLikeTicker(belowSymbol) && parseNumber(belowScore) !== null) {
        columns.push({ headerRow: r, sector: headerCell, symbolCol: c, scoreCol: c + 1 });
      }
    }
  }
  return columns;
}

export function parseMoneyFlowTable(table: string[][]): MoneyFlowRecord[] {
  const sectorColumns = findSectorColumns(table);
  const records: MoneyFlowRecord[] = [];

  for (const { headerRow, sector, symbolCol, scoreCol } of sectorColumns) {
    let rank = 0;
    for (let r = headerRow + 1; r < table.length; r++) {
      const row = table[r];
      const symbolRaw = (row[symbolCol] || "").trim().toUpperCase();
      if (!symbolRaw) continue; // this sector's column can run shorter than others
      if (!looksLikeTicker(symbolRaw)) continue;
      const score = parseNumber(row[scoreCol] || "");
      if (score === null) continue;
      rank += 1;
      records.push({ symbol: symbolRaw, sector, score, rank });
    }
  }

  return records;
}

/** First cell in the table that looks like a DD/MM/YYYY date, if any. */
function findUpdatedAt(table: string[][]): string | null {
  for (const row of table) {
    for (const cell of row) {
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test((cell || "").trim())) return cell.trim();
    }
  }
  return null;
}

export interface MoneyFlowTable {
  items: MoneyFlowRecord[];
  sectors: string[];
  updatedAt: string | null;
}

export async function fetchMoneyFlowTable(gid?: string): Promise<MoneyFlowTable> {
  const table = await fetchPublishedCsvTable(PUBLISHED_ID, gid ?? DEFAULT_GID);
  const items = parseMoneyFlowTable(table);
  if (items.length === 0) {
    const preview = JSON.stringify(table.slice(0, 8).map((r) => r.slice(0, 8))).slice(0, 1200);
    throw Object.assign(
      new Error(`Không nhận diện được nhóm ngành/mã nào trong trang tính. Dữ liệu đọc được: ${preview}`),
      { status: 502 }
    );
  }

  const sectors: string[] = [];
  for (const item of items) {
    if (!sectors.includes(item.sector)) sectors.push(item.sector);
  }

  return { items, sectors, updatedAt: findUpdatedAt(table) };
}
