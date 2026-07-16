// Shared between the server-only Vietcap client and the client-side
// financial ratios table — field codes and their Vietnamese labels.
// Labels for the metrics also shown on brokerage "bảng điện" ratio pages
// (NIM, LDR, Tỷ lệ Nợ xấu, ...) match that convention.
export const RATIO_FIELDS: { key: string; label: string; percent: boolean }[] = [
  { key: "netInterestMargin", label: "NIM", percent: true },
  { key: "depositGrowth", label: "Tăng trưởng tiền gửi", percent: true },
  { key: "loansGrowth", label: "Tăng trưởng tín dụng", percent: true },
  { key: "equityToLiabilities", label: "Vốn CSH/Tổng Nợ", percent: false },
  { key: "ldrLoanDepositRatio", label: "LDR", percent: true },
  { key: "npl", label: "Tỷ lệ Nợ xấu", percent: true },
  { key: "loansLossReservesToNPLs", label: "Dự phòng RR tín dụng/Nợ xấu", percent: true },
  { key: "casaRatio", label: "CASA", percent: true },
  { key: "roe", label: "ROE", percent: true },
  { key: "roa", label: "ROA", percent: true },
  { key: "costToIncome", label: "CIR", percent: true },
  { key: "averageYieldOnEarningAssets", label: "YOEA", percent: true },
  { key: "averageCostOfFinancing", label: "COF", percent: true },
  { key: "car", label: "CAR", percent: true },
  { key: "pe", label: "P/E", percent: false },
  { key: "pb", label: "P/B", percent: false },
  { key: "roic", label: "ROIC", percent: true },
  { key: "grossMargin", label: "Biên lợi nhuận gộp", percent: true },
  { key: "debtToEquity", label: "Nợ/Vốn chủ sở hữu", percent: false },
];

// Not displayed directly as table rows — fetched to compute BVPS.
export const BVPS_INPUT_FIELDS = ["ownersEquity", "numberOfSharesMktCap"];
