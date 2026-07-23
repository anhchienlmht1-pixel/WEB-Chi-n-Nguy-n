// Reads live data straight from a Google Sheet that has been published to
// the web (File → Share → "Publish to web" in Google Sheets), which hands
// out a stable `/d/e/{PUBLISHED_ID}/...` link distinct from the sheet's own
// document ID. Publishing this way is what makes the CSV export work with
// no Sheets API key/OAuth — if publishing is ever turned off, the endpoint
// falls back to Google's HTML page instead of CSV and the request below is
// rejected with a specific error explaining that.
const PUBLISHED_ID =
  "2PACX-1vT81Bi4SZ33zZ6URMkTxl_yB158q89qIwVE27W_8Pxt8gGd2-obA4NV2EPQI_EqYAJn8DzdC34vwzpx";

export interface StockOutlookRecord {
  symbol: string;
  updatedAt: string;
  outlookText: string;
  recommendations: { broker: string; price: string }[];
}

// The sheet is a single-selection dashboard: a "MÃ" dropdown cell picks one
// stock, and the rest of the sheet (via formulas) shows that stock's data —
// there is no separate tab listing every stock in row form. So the CSV
// export always reflects whichever stock is currently selected in the
// sheet's dropdown, not a full table. Parsing below locates each labeled
// cell ("MÃ", "Ngày cập nhật", "Triển vọng đầu tư", "Giá khuyến nghị")
// wherever it lands in the exported grid, rather than assuming fixed
// row/column positions, since merged cells shift depending on layout.
// Normalizes for label comparison: Unicode NFC (Sheets/Drive sometimes
// serve Vietnamese diacritics as NFD-decomposed combining characters,
// which look identical on screen but compare unequal as raw strings),
// trims whitespace, drops a trailing colon, and uppercases.
function normalizeLabel(s: string): string {
  return s.normalize("NFC").trim().replace(/:\s*$/, "").toUpperCase();
}

// A stock sheet can contain more than one cell literally named "Mã" — e.g.
// a reference table's header row ("Mã | Tên công ty | ...") as well as the
// actual dropdown selector cell. `valueLooksLike`, when given, rejects a
// candidate whose adjacent value doesn't look right (a ticker is short,
// no spaces, no lowercase Vietnamese text) so the search keeps going to
// the next occurrence instead of locking onto a header by mistake.
function findLabelCell(
  table: string[][],
  label: string,
  valueLooksLike?: (value: string) => boolean
): { row: number; col: number } | null {
  const target = normalizeLabel(label);
  for (let r = 0; r < table.length; r++) {
    for (let c = 0; c < table[r].length; c++) {
      const cell = normalizeLabel(table[r][c] || "");
      // Exact match, or the cell starts with the label plus a short suffix
      // (e.g. "Mã CP" for a "Mã" search) — but not an arbitrary paragraph
      // that happens to start with the same word.
      if (cell === target || (cell.startsWith(target) && cell.length <= target.length + 15)) {
        if (valueLooksLike && !valueLooksLike(nextNonEmptyInRow(table, r, c))) continue;
        return { row: r, col: c };
      }
    }
  }
  return null;
}

const looksLikeTicker = (v: string) => /^[A-Za-z0-9]{1,10}$/.test(v.trim());

function nextNonEmptyInRow(table: string[][], row: number, afterCol: number): string {
  const cells = table[row] || [];
  for (let c = afterCol + 1; c < cells.length; c++) {
    if ((cells[c] || "").trim() !== "") return cells[c].trim();
  }
  return "";
}

function collectColumnBelow(table: string[][], startRow: number, col: number, stopLabels: string[]): string[] {
  const stopSet = new Set(stopLabels.map(normalizeLabel));
  const out: string[] = [];
  for (let r = startRow; r < table.length; r++) {
    const cell = (table[r][col] || "").trim();
    if (!cell) continue;
    if (stopSet.has(normalizeLabel(cell))) break;
    out.push(cell);
  }
  return out;
}

export function parseStockOutlook(table: string[][]): StockOutlookRecord {
  const symbolLabel = findLabelCell(table, "Mã", looksLikeTicker);
  const symbol = symbolLabel ? nextNonEmptyInRow(table, symbolLabel.row, symbolLabel.col) : "";

  const dateLabel = findLabelCell(table, "Ngày cập nhật");
  const updatedAt = dateLabel ? nextNonEmptyInRow(table, dateLabel.row, dateLabel.col) : "";

  const outlookLabel = findLabelCell(table, "Triển vọng đầu tư");
  const outlookText = outlookLabel
    ? collectColumnBelow(table, outlookLabel.row + 1, outlookLabel.col, ["Giá khuyến nghị"]).join("\n")
    : "";

  const recoLabel = findLabelCell(table, "Giá khuyến nghị");
  const recoLines = recoLabel ? collectColumnBelow(table, recoLabel.row + 1, recoLabel.col, []) : [];
  const recommendations = recoLines
    .flatMap((line) => line.split("\n"))
    .map((line) => line.replace(/^[-•]+\s*/, "").trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^(.+?)[:\s]{1,4}([\d.,]+)\s*$/);
      return m ? { broker: m[1].trim(), price: m[2].trim() } : { broker: line, price: "" };
    });

  return { symbol, updatedAt, outlookText, recommendations };
}

// Minimal RFC 4180 CSV parser (quoted fields, embedded commas/newlines,
// "" as an escaped quote) — exactly what Google Sheets' CSV export emits,
// so no external dependency is needed for it.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\r") {
      i++;
      continue;
    }
    if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Drop fully-blank rows (Sheets pads trailing empty rows in the export).
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

async function fetchPublishedCsvTable(gid?: string): Promise<string[][]> {
  const params = new URLSearchParams({ output: "csv" });
  if (gid) {
    params.set("gid", gid);
    params.set("single", "true");
  }
  const url = `https://docs.google.com/spreadsheets/d/e/${PUBLISHED_ID}/pub?${params.toString()}`;
  const res = await fetch(url, { redirect: "follow" });

  if (!res.ok) {
    throw Object.assign(
      new Error(
        `Google Sheets trả về lỗi HTTP ${res.status}. Kiểm tra trang tính vẫn đang ở trạng thái "Xuất bản lên web" (File → Chia sẻ → Xuất bản lên web) chưa.`
      ),
      { status: 502 }
    );
  }

  const text = await res.text();
  // If publishing was ever turned off, this endpoint falls back to
  // Google's HTML page instead of returning CSV — still a 200 OK, so
  // checking the body's shape is the only reliable signal for that.
  if (text.trimStart().startsWith("<")) {
    throw Object.assign(
      new Error(
        'Không đọc được trang tính — có thể tính năng "Xuất bản lên web" đã bị tắt. Vào File → Chia sẻ → Xuất bản lên web trong Google Sheets, bật lại rồi thử lại.'
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

export async function fetchInvestmentOutlook(gid?: string): Promise<StockOutlookRecord> {
  const table = await fetchPublishedCsvTable(gid);
  const record = parseStockOutlook(table);
  if (!record.symbol) {
    // Surface a preview of what was actually read back in the error text —
    // this lets a real user relay the true sheet structure by just
    // screenshotting the on-page error, without needing to manually open
    // the CSV export URL themselves.
    const preview = JSON.stringify(table.slice(0, 8).map((r) => r.slice(0, 8))).slice(0, 1200);
    throw Object.assign(
      new Error(`Không tìm thấy ô "MÃ" trong trang tính. Dữ liệu đọc được: ${preview}`),
      { status: 502 }
    );
  }
  return record;
}

// Three sector tabs ("P/B ngành ngân hàng", "P/B ngành chứng khoán", "P/B
// ngành bất động sản") the user maintains with real daily P/B values per
// symbol — the sheet's own header row names the symbols and each
// following row is one date, so unlike the single-record outlook tab
// these genuinely are database-shaped tables already; no label-hunting
// needed. Reading this directly is far more accurate than deriving P/B
// ourselves from price × approximate share count.
//
// The user later pointed these at other tabs meant to hold a fuller
// 5-year history, but every one of those turned out to be a chart/
// dashboard tab (just a "Thời gian" selector cell — a chart itself
// doesn't export via CSV, so the export just reflects whatever that
// dropdown is currently set to in the live sheet), not a raw data table:
// confirmed live for bank (234525846), real-estate (1676846069), and
// securities (2087389393) — all three came back at some point as
// literally [["Thời gian","<n> Năm"]]. None of the sheet's three sectors
// currently has a real data table going back further than ~mid-2023, so
// all three stay on their original raw-data tabs (~3 years) until the
// user adds older history to the actual underlying tables.
const BANK_PB_HISTORY_GID = "492106203";
const SECURITIES_PB_HISTORY_GID = "1429690230";
const REAL_ESTATE_PB_HISTORY_GID = "454354295";

export interface PbHistoryRow {
  date: string;
  values: (number | null)[];
}

export interface PbHistoryTable {
  symbols: string[];
  rows: PbHistoryRow[];
}

// The sheet displays numbers in Vietnamese locale (comma decimal, dot
// thousands separator) — Google's CSV export keeps that formatted text
// verbatim (quoted, since the comma would otherwise look like a field
// separator), so cells arrive as e.g. "2,18" rather than "2.18".
function parseVnNumber(raw: string | undefined): number | null {
  if (raw == null) return null;
  const s = raw.trim();
  if (!s) return null;
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function parsePbHistoryTable(table: string[][]): PbHistoryTable {
  const [header, ...dataRows] = table;
  const symbols = (header ?? []).map((h) => h.trim()).filter(Boolean);
  const rows: PbHistoryRow[] = dataRows
    .map((row) => ({
      date: (row[0] ?? "").trim(),
      values: symbols.map((_, i) => parseVnNumber(row[i + 1])),
    }))
    .filter((r) => r.date !== "");
  return { symbols, rows };
}

async function fetchPbHistory(gid: string, sectorLabel: string): Promise<PbHistoryTable> {
  const table = await fetchPublishedCsvTable(gid);
  const parsed = parsePbHistoryTable(table);
  if (parsed.symbols.length === 0 || parsed.rows.length === 0) {
    const preview = JSON.stringify(table.slice(0, 4).map((r) => r.slice(0, 6))).slice(0, 1200);
    throw Object.assign(
      new Error(`Không đọc được bảng P/B ${sectorLabel} — kiểm tra lại cấu trúc tab. Dữ liệu đọc được: ${preview}`),
      { status: 502 }
    );
  }
  return parsed;
}

export function fetchBankPbHistory(): Promise<PbHistoryTable> {
  return fetchPbHistory(BANK_PB_HISTORY_GID, "ngân hàng");
}

export function fetchSecuritiesPbHistory(): Promise<PbHistoryTable> {
  return fetchPbHistory(SECURITIES_PB_HISTORY_GID, "chứng khoán");
}

export function fetchRealEstatePbHistory(): Promise<PbHistoryTable> {
  return fetchPbHistory(REAL_ESTATE_PB_HISTORY_GID, "bất động sản");
}
