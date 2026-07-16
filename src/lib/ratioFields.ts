// Shared between the server-only Vietcap client and the client-side
// financial ratios table — field codes and their Vietnamese labels.
export const RATIO_FIELDS: { key: string; label: string; percent: boolean }[] = [
  { key: "casaRatio", label: "CASA", percent: true },
  { key: "loansGrowth", label: "Tăng trưởng cho vay", percent: true },
  { key: "depositGrowth", label: "Tăng trưởng tiền gửi", percent: true },
  { key: "roe", label: "ROE", percent: true },
  { key: "roa", label: "ROA", percent: true },
  { key: "netInterestMargin", label: "NIM", percent: true },
  { key: "ldrLoanDepositRatio", label: "LDR", percent: true },
  { key: "npl", label: "Nợ xấu (NPL)", percent: true },
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
