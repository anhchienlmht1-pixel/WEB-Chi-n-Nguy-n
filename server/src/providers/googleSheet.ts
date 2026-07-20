// Reads live data straight from a Google Sheet that has been published to
// the web (File → Share → "Publish to web" in Google Sheets), which hands
// out a stable `/d/e/{PUBLISHED_ID}/...` link distinct from the sheet's own
// document ID. Publishing this way is what makes the CSV export work with
// no Sheets API key/OAuth — if publishing is ever turned off, the endpoint
// falls back to Google's HTML page instead of CSV and the request below is
// rejected with a specific error explaining that.
const PUBLISHED_ID =
  "2PACX-1vT81Bi4SZ33zZ6URMkTxl_yB158q89qIwVE27W_8Pxt8gGd2-obA4NV2EPQI_EqYAJn8DzdC34vwzpx";

export interface SheetOutlook {
  headers: string[];
  rows: string[][];
  updatedAt: string;
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

export async function fetchInvestmentOutlook(gid?: string): Promise<SheetOutlook> {
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

  const [headers, ...rows] = table;
  return { headers, rows, updatedAt: new Date().toISOString() };
}
