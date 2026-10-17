// Tương quan VNINDEX và lãi suất tiền gửi 6 tháng của Vietcombank — snapshot
// tĩnh lấy từ SSI MCP (phiên chat, không tự cập nhật — xem
// bankDepositRates.ts cho cùng giới hạn). Lấy mẫu theo tuần, khoảng thời
// gian giới hạn bởi lịch sử lãi suất của SSI (chỉ có từ 27/10/2025), dù
// VNINDEX có lịch sử dài hơn nhiều. VCB's 6-month rate chỉ đổi đúng 1 lần
// trong cả giai đoạn (2,9% -> 3,5% ngày 04/05/2026) theo dữ liệu SSI thật.
export interface VnindexVcbRatePoint {
  date: string; // YYYY-MM-DD
  vnindex: number;
  vcb6mRate: number; // %/năm, lãi suất tiền gửi kỳ hạn 6 tháng của Vietcombank
}

export const VNINDEX_VS_VCB_RATE_AS_OF = "2026-10-17";

export const VNINDEX_VS_VCB_RATE: VnindexVcbRatePoint[] = [
  { date: "2025-10-27", vnindex: 1652.54, vcb6mRate: 2.9 },
  { date: "2025-11-03", vnindex: 1617.0, vcb6mRate: 2.9 },
  { date: "2025-11-10", vnindex: 1580.54, vcb6mRate: 2.9 },
  { date: "2025-11-17", vnindex: 1654.42, vcb6mRate: 2.9 },
  { date: "2025-11-24", vnindex: 1667.98, vcb6mRate: 2.9 },
  { date: "2025-12-01", vnindex: 1701.67, vcb6mRate: 2.9 },
  { date: "2025-12-08", vnindex: 1753.74, vcb6mRate: 2.9 },
  { date: "2025-12-15", vnindex: 1646.01, vcb6mRate: 2.9 },
  { date: "2025-12-22", vnindex: 1751.03, vcb6mRate: 2.9 },
  { date: "2025-12-29", vnindex: 1754.84, vcb6mRate: 2.9 },
  { date: "2026-01-05", vnindex: 1788.4, vcb6mRate: 2.9 },
  { date: "2026-01-12", vnindex: 1877.33, vcb6mRate: 2.9 },
  { date: "2026-01-19", vnindex: 1896.59, vcb6mRate: 2.9 },
  { date: "2026-01-26", vnindex: 1843.72, vcb6mRate: 2.9 },
  { date: "2026-02-02", vnindex: 1806.5, vcb6mRate: 2.9 },
  { date: "2026-02-09", vnindex: 1754.82, vcb6mRate: 2.9 },
  { date: "2026-02-16", vnindex: 1824.09, vcb6mRate: 2.9 },
  { date: "2026-02-23", vnindex: 1860.14, vcb6mRate: 2.9 },
  { date: "2026-03-02", vnindex: 1846.1, vcb6mRate: 2.9 },
  { date: "2026-03-09", vnindex: 1652.79, vcb6mRate: 2.9 },
  { date: "2026-03-16", vnindex: 1693.21, vcb6mRate: 2.9 },
  { date: "2026-03-23", vnindex: 1591.17, vcb6mRate: 2.9 },
  { date: "2026-03-30", vnindex: 1662.54, vcb6mRate: 2.9 },
  { date: "2026-04-06", vnindex: 1674.99, vcb6mRate: 2.9 },
  { date: "2026-04-13", vnindex: 1758.96, vcb6mRate: 2.9 },
  { date: "2026-04-20", vnindex: 1837.11, vcb6mRate: 2.9 },
  { date: "2026-04-27", vnindex: 1853.29, vcb6mRate: 2.9 },
  { date: "2026-05-04", vnindex: 1854.06, vcb6mRate: 3.5 },
  { date: "2026-05-11", vnindex: 1895.5, vcb6mRate: 3.5 },
  { date: "2026-05-18", vnindex: 1927.94, vcb6mRate: 3.5 },
  { date: "2026-05-25", vnindex: 1886.03, vcb6mRate: 3.5 },
  { date: "2026-06-01", vnindex: 1844.54, vcb6mRate: 3.5 },
  { date: "2026-06-08", vnindex: 1790.53, vcb6mRate: 3.5 },
  { date: "2026-06-15", vnindex: 1799.31, vcb6mRate: 3.5 },
  { date: "2026-06-22", vnindex: 1857.91, vcb6mRate: 3.5 },
  { date: "2026-06-29", vnindex: 1854.97, vcb6mRate: 3.5 },
  { date: "2026-07-06", vnindex: 1843.5, vcb6mRate: 3.5 },
  { date: "2026-07-13", vnindex: 1800.54, vcb6mRate: 3.5 },
  { date: "2026-07-20", vnindex: 1743.51, vcb6mRate: 3.5 },
  { date: "2026-07-27", vnindex: 1669.01, vcb6mRate: 3.5 },
  { date: "2026-08-03", vnindex: 1762.84, vcb6mRate: 3.5 },
  { date: "2026-08-10", vnindex: 1776.77, vcb6mRate: 3.5 },
  { date: "2026-08-17", vnindex: 1727.46, vcb6mRate: 3.5 },
  { date: "2026-08-24", vnindex: 1788.78, vcb6mRate: 3.5 },
  { date: "2026-08-31", vnindex: 1832.12, vcb6mRate: 3.5 },
  { date: "2026-09-07", vnindex: 1821.64, vcb6mRate: 3.5 },
  { date: "2026-09-14", vnindex: 1788.23, vcb6mRate: 3.5 },
  { date: "2026-09-21", vnindex: 1799.67, vcb6mRate: 3.5 },
  { date: "2026-09-28", vnindex: 1780.68, vcb6mRate: 3.5 },
  { date: "2026-10-05", vnindex: 1753.2, vcb6mRate: 3.5 },
  { date: "2026-10-12", vnindex: 1720.98, vcb6mRate: 3.5 },
  { date: "2026-10-17", vnindex: 1705.91, vcb6mRate: 3.5 },
];
