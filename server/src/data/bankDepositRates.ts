// "Lãi suất huy động trung bình" — snapshot tĩnh lấy từ SSI MCP (phiên
// chat, không gọi được từ server production — xem ghi chú trong phiên
// làm việc). KHÔNG có lãi suất cho vay: SSI không có nguồn nào cho lãi
// suất cho vay (chỉ có lãi suất tiền gửi theo kỳ hạn của từng ngân hàng),
// nên bảng này chỉ có huy động. Muốn cập nhật, cần vào lại phiên chat,
// cào lại SSI MCP rồi deploy đè lên — không tự động.
export interface BankDepositRateRow {
  bank: string;
  // Lãi suất theo kỳ hạn (%/năm), null = ngân hàng không có sản phẩm kỳ
  // hạn đó (SSI trả 0, loại khỏi bảng và khỏi tính bình quân).
  terms: {
    "1": number | null;
    "3": number | null;
    "6": number | null;
    "9": number | null;
    "12": number | null;
    "13": number | null;
    "18": number | null;
    "24": number | null;
    "36": number | null;
  };
}

export const BANK_DEPOSIT_RATES_AS_OF = "2026-10-17";

export const BANK_DEPOSIT_RATES: BankDepositRateRow[] = [
  { bank: "Agribank", terms: { "1": 2.6, "3": 2.9, "6": 4.0, "9": 4.0, "12": 5.9, "13": 5.9, "18": 5.9, "24": 6.0, "36": null } },
  { bank: "BIDV", terms: { "1": 2.1, "3": 2.4, "6": 3.5, "9": 3.5, "12": 5.9, "13": 5.9, "18": 5.9, "24": 6.0, "36": 6.0 } },
  { bank: "MB", terms: { "1": 3.2, "3": 3.6, "6": 4.2, "9": 4.2, "12": 4.85, "13": 4.85, "18": 4.85, "24": 5.7, "36": 5.7 } },
  { bank: "MSB", terms: { "1": 4.5, "3": 4.5, "6": 6.1, "9": 6.1, "12": 6.5, "13": 6.3, "18": 6.3, "24": 6.3, "36": 5.8 } },
  { bank: "OCB", terms: { "1": 4.75, "3": 4.75, "6": 6.4, "9": 6.4, "12": 6.7, "13": 6.4, "18": 6.6, "24": 6.8, "36": 7.0 } },
  { bank: "SeABank", terms: { "1": 2.95, "3": 3.45, "6": 3.75, "9": 3.95, "12": 4.5, "13": null, "18": 5.45, "24": 5.45, "36": 5.45 } },
  { bank: "TPBank", terms: { "1": 4.2, "3": 4.2, "6": 5.5, "9": null, "12": null, "13": null, "18": 5.9, "24": null, "36": 6.0 } },
  { bank: "VIB", terms: { "1": 4.45, "3": 4.55, "6": 5.7, "9": 5.8, "12": 7.0, "13": null, "18": 5.9, "24": 6.0, "36": 6.0 } },
  { bank: "Vietcombank", terms: { "1": 2.1, "3": 2.4, "6": 3.5, "9": 3.5, "12": 5.9, "13": null, "18": null, "24": 6.0, "36": 5.3 } },
  { bank: "VietinBank", terms: { "1": 2.1, "3": 2.4, "6": 3.5, "9": 3.5, "12": 5.9, "13": null, "18": 5.9, "24": 6.0, "36": 6.0 } },
  { bank: "VPBank", terms: { "1": 4.75, "3": null, "6": 7.0, "9": null, "12": 7.1, "13": null, "18": null, "24": 7.1, "36": null } },
];
