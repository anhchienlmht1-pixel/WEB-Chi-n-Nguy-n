import { parseCsv } from "./googleSheet.js";

// Reads the user's own "Sức mạnh cổ phiếu" (stock strength) Google Sheet —
// a wide, sector-by-sector grid (Thép | BĐS | Chứng khoán | Ngân hàng | ...),
// each sector taking two columns (mã CK, điểm SM). Uses the sheet's own
// /export?format=csv endpoint (requires the sheet's sharing set to at
// least "Anyone with the link can view") rather than the "Publish to web"
// flow googleSheet.ts's other functions use, since the user only shared a
// normal edit-mode link, not a published one.
const DOC_ID = "1GYUSorWqVmB69FkKLCFlEftONuKRsuSnoh18Pi3lA-0";
const GID = "621128686";
const FETCH_TIMEOUT_MS = 10_000;

export interface StockStrengthEntry {
  symbol: string;
  score: number;
}

export interface StockStrengthSector {
  sector: string;
  stocks: StockStrengthEntry[];
}

export interface StockStrengthSheet {
  asOfDate: string | null;
  sectors: StockStrengthSector[];
}

async function fetchCsvTable(): Promise<string[][]> {
  const url = `https://docs.google.com/spreadsheets/d/${DOC_ID}/export?format=csv&gid=${GID}`;

  let res: Response;
  try {
    res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    throw Object.assign(
      new Error(
        timedOut
          ? `Google Sheets phản hồi quá chậm (quá ${FETCH_TIMEOUT_MS / 1000}s), đã huỷ yêu cầu.`
          : `Không kết nối được tới Google Sheets: ${err instanceof Error ? err.message : String(err)}`
      ),
      { status: 502 }
    );
  }

  if (!res.ok) {
    throw Object.assign(
      new Error(
        `Google Sheets trả về lỗi HTTP ${res.status}. Kiểm tra trang tính đã bật chia sẻ "Bất kỳ ai có đường liên kết" (ít nhất ở chế độ Xem) chưa.`
      ),
      { status: 502 }
    );
  }

  const text = await res.text();
  if (text.trimStart().startsWith("<")) {
    throw Object.assign(
      new Error(
        'Không đọc được trang tính — có thể chưa bật chia sẻ công khai. Vào Chia sẻ → "Bất kỳ ai có đường liên kết" trong Google Sheets, bật lại rồi thử lại.'
      ),
      { status: 502 }
    );
  }

  const table = parseCsv(text);
  if (table.length === 0) {
    throw Object.assign(new Error("Trang tính rỗng."), { status: 502 });
  }
  return table;
}

const TICKER_RE = /^[A-Z0-9]{2,6}$/;
// A sector-header cell in this sheet is short, all-letters/spaces Vietnamese
// text ("THÉP", "BĐS KCN", "PHÂN BÓN - HÓA CHẤT") — never a bare ticker or a
// number, so this excludes both to avoid a stray uppercase symbol getting
// mistaken for a header when scanning for the header row.
function looksLikeSectorHeader(cell: string): boolean {
  const s = cell.trim();
  if (!s || s.length < 2 || s.length > 40) return false;
  if (TICKER_RE.test(s)) return false;
  if (/^\d/.test(s)) return false;
  return /[A-Za-zÀ-ỹ]/.test(s);
}

// The header row isn't necessarily row 0 (a title/date banner usually sits
// above it) — this picks whichever row has the most header-shaped cells,
// each at least 2 columns apart (so "NGÂN HÀNG" in one cell and its own
// data column right after aren't both counted as separate headers).
function findHeaderRow(table: string[][]): number {
  let bestRow = -1;
  let bestCount = 0;
  for (let r = 0; r < Math.min(table.length, 10); r++) {
    let count = 0;
    let lastCol = -Infinity;
    for (let c = 0; c < table[r].length; c++) {
      if (looksLikeSectorHeader(table[r][c]) && c - lastCol >= 2) {
        count++;
        lastCol = c;
      }
    }
    if (count > bestCount) {
      bestCount = count;
      bestRow = r;
    }
  }
  return bestRow;
}

function findAsOfDate(table: string[][], headerRow: number): string | null {
  for (let r = 0; r < headerRow; r++) {
    for (const cell of table[r] || []) {
      const s = cell.trim();
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) return s;
    }
  }
  return null;
}

export function parseStockStrengthSheet(table: string[][]): StockStrengthSheet {
  const headerRow = findHeaderRow(table);
  if (headerRow === -1) {
    const preview = JSON.stringify(table.slice(0, 6).map((r) => r.slice(0, 10))).slice(0, 1200);
    throw Object.assign(
      new Error(`Không tìm thấy hàng tiêu đề ngành trong trang tính. Dữ liệu đọc được: ${preview}`),
      { status: 502 }
    );
  }

  const headerCells = table[headerRow];
  const sectorStarts: { col: number; sector: string }[] = [];
  for (let c = 0; c < headerCells.length; c++) {
    if (looksLikeSectorHeader(headerCells[c])) sectorStarts.push({ col: c, sector: headerCells[c].trim() });
  }

  const sectors: StockStrengthSector[] = sectorStarts.map(({ col, sector }) => {
    const stocks: StockStrengthEntry[] = [];
    for (let r = headerRow + 1; r < table.length; r++) {
      const row = table[r] || [];
      const symbolRaw = (row[col] || "").trim().toUpperCase();
      const scoreRaw = (row[col + 1] || "").trim().replace(/,/g, "");
      if (!symbolRaw) continue;
      if (!TICKER_RE.test(symbolRaw)) continue;
      const score = Number(scoreRaw);
      if (!Number.isFinite(score)) continue;
      stocks.push({ symbol: symbolRaw, score });
    }
    return { sector, stocks };
  });

  return { asOfDate: findAsOfDate(table, headerRow), sectors: sectors.filter((s) => s.stocks.length > 0) };
}

export async function fetchStockStrength(): Promise<StockStrengthSheet> {
  const table = await fetchCsvTable();
  return parseStockStrengthSheet(table);
}
