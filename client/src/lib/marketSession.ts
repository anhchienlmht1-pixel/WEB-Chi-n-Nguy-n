// Phiên giao dịch HOSE theo giờ Việt Nam (UTC+7). Không biết ngày nghỉ lễ:
// nơi cần chính xác thì so thêm với ngày của nến gần nhất (xem TickerTape).

export type SessionId = "pre" | "ato" | "open" | "lunch" | "atc" | "pt" | "closed" | "weekend";

export interface SessionInfo {
  id: SessionId;
  label: string;
  /** Giá đang thay đổi (ATO, liên tục, ATC). */
  live: boolean;
  /** Giờ VN dạng HH:MM:SS. */
  clock: string;
  /** Ngày VN yyyy-mm-dd. */
  date: string;
}

export function vnNow(ms = Date.now()) {
  return new Date(ms + 7 * 3600 * 1000); // read with getUTC*()
}

export function marketSession(ms = Date.now()): SessionInfo {
  const d = vnNow(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  const clock = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  const date = d.toISOString().slice(0, 10);
  const dow = d.getUTCDay();
  const m = d.getUTCHours() * 60 + d.getUTCMinutes();
  const at = (h: number, mi: number) => h * 60 + mi;
  const mk = (id: SessionId, label: string, live: boolean): SessionInfo => ({ id, label, live, clock, date });
  if (dow === 0 || dow === 6) return mk("weekend", "Nghỉ cuối tuần", false);
  if (m < at(9, 0)) return mk("pre", "Chờ mở cửa", false);
  if (m < at(9, 15)) return mk("ato", "Phiên ATO", true);
  if (m < at(11, 30)) return mk("open", "Đang giao dịch", true);
  if (m < at(13, 0)) return mk("lunch", "Nghỉ trưa", false);
  if (m < at(14, 30)) return mk("open", "Đang giao dịch", true);
  if (m < at(14, 45)) return mk("atc", "Phiên ATC", true);
  if (m < at(15, 0)) return mk("pt", "Thỏa thuận", false);
  return mk("closed", "Đã đóng cửa", false);
}
