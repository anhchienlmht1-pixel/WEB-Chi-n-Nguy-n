// Reads live data straight from a Google Sheet via its public CSV export
// endpoint — no Sheets API key/OAuth needed, but the sheet must be shared
// as "Anyone with the link" → Viewer (File → Share in Google Sheets), or
// this returns Google's HTML sign-in page instead of CSV and the request
// below is rejected with a specific error explaining that.
const SHEET_ID = "167qd-YmY3wa6bnvjjAPMHnd_DqR-pMTYQVV79fPdrKs";

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

export async function fetchInvestmentOutlook(gid = "0"): Promise<SheetOutlook> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${encodeURIComponent(gid)}`;
  const res = await fetch(url, { redirect: "follow" });

  if (!res.ok) {
    throw Object.assign(
      new Error(
        `Google Sheets trả về lỗi HTTP ${res.status}. Kiểm tra trang tính đã bật chia sẻ "Bất kỳ ai có đường liên kết" (Viewer) chưa.`
      ),
      { status: 502 }
    );
  }

  const text = await res.text();
  // A private sheet's export URL redirects to Google's HTML sign-in page
  // instead of returning CSV — this is the only reliable signal for that,
  // since it still comes back as a 200 OK.
  if (text.trimStart().startsWith("<")) {
    throw Object.assign(
      new Error(
        'Không đọc được trang tính — có thể chưa bật chia sẻ công khai. Vào Chia sẻ → "Bất kỳ ai có đường liên kết" → Người xem, rồi thử lại.'
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
