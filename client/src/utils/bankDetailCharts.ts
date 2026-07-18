import type { BankMetricFormat } from "./bankDetailFormat";

export interface SeriesRef {
  id: string;
  label: string;
  color: string;
}

export type ChartKind = "dualLine" | "multiLine" | "stackedShare" | "stackedBar" | "comboBarLine";

export interface ChartDef {
  title: string;
  kind: ChartKind;
  bars?: SeriesRef[];
  lines?: SeriesRef[];
  format: BankMetricFormat;
  lineFormat?: BankMetricFormat;
}

const BLUE = "#3b82f6";
const GREEN = "#10b981";
const AMBER = "#f59e0b";
const PURPLE = "#a78bfa";
const PINK = "#f472b6";
const RED = "#f87171";
const INDIGO = "#818cf8";
const LIME = "#a3e635";
const SLATE = "#94a3b8";

// Replicates the source Excel's own "Chi tiết" dashboard sheet (28 chart
// panels), grouped the same way as the user's reference screenshot.
// Every series id here traces to a specific row/formula in
// scripts/export-bank-detail.py — see that script's header for the
// row-number vs. "Dữ liệu Chung"-label provenance of each one.
export const CHART_GROUPS: { section: string; charts: ChartDef[] }[] = [
  {
    section: "So sánh với trung bình ngành",
    charts: [
      { title: "NIM", kind: "dualLine", format: "percent", lines: [{ id: "nim", label: "Ngân hàng", color: BLUE }] },
      { title: "CASA", kind: "dualLine", format: "percent", lines: [{ id: "casa", label: "Ngân hàng", color: BLUE }] },
      { title: "COF", kind: "dualLine", format: "percent", lines: [{ id: "cof", label: "Ngân hàng", color: BLUE }] },
      { title: "CIR", kind: "dualLine", format: "percent", lines: [{ id: "cir", label: "Ngân hàng", color: BLUE }] },
      { title: "ROE (4 quý gần nhất)", kind: "dualLine", format: "percent", lines: [{ id: "roe4q", label: "Ngân hàng", color: BLUE }] },
      { title: "ROA (4 quý gần nhất)", kind: "dualLine", format: "percent", lines: [{ id: "roa4q", label: "Ngân hàng", color: BLUE }] },
      { title: "LDR", kind: "dualLine", format: "percent", lines: [{ id: "ldr", label: "Ngân hàng", color: BLUE }] },
    ],
  },
  {
    section: "Huy động & tín dụng",
    charts: [
      {
        title: "Tăng trưởng Huy động & Tín dụng",
        kind: "multiLine",
        format: "percent",
        lines: [
          { id: "creditGrowth", label: "Tăng trưởng tín dụng (từ đầu năm)", color: BLUE },
          { id: "depositGrowth", label: "Tăng trưởng huy động (từ đầu năm)", color: GREEN },
        ],
      },
      { title: "Chênh lệch Tín dụng và Huy động", kind: "multiLine", format: "percent", lines: [{ id: "creditDepositGap", label: "Chênh lệch", color: AMBER }] },
      {
        title: "Tăng trưởng huy động",
        kind: "comboBarLine",
        format: "money",
        lineFormat: "percent",
        bars: [
          { id: "depositsCustomer", label: "Tiền gửi KH", color: BLUE },
          { id: "depositsInterbank", label: "Tiền gửi TCTD khác", color: AMBER },
          { id: "valuablePapers", label: "Giấy tờ có giá", color: PURPLE },
        ],
        lines: [{ id: "fundingGrowth", label: "Tăng trưởng huy động theo kỳ (%)", color: GREEN }],
      },
      {
        title: "Tăng trưởng huy động từng mảng",
        kind: "multiLine",
        format: "percent",
        lines: [
          { id: "depositsCustomerGrowthQoQ", label: "Tiền gửi KH", color: BLUE },
          { id: "depositsInterbankGrowthQoQ", label: "Tiền gửi TCTD khác", color: AMBER },
          { id: "valuablePapersGrowthQoQ", label: "Giấy tờ có giá", color: PURPLE },
        ],
      },
      {
        title: "Tăng trưởng tín dụng từng mảng",
        kind: "comboBarLine",
        format: "money",
        lineFormat: "percent",
        bars: [
          { id: "loansPersonal", label: "Tín dụng KHCN", color: GREEN },
          { id: "loansCorporate", label: "Tín dụng KHDN", color: INDIGO },
        ],
        lines: [{ id: "creditGrowth", label: "Tăng trưởng tín dụng (từ đầu năm)", color: AMBER }],
      },
      {
        title: "Tỷ trọng cho vay theo nhóm khách hàng",
        kind: "stackedShare",
        format: "percent",
        bars: [
          { id: "loansCorporateShare", label: "KHDN", color: INDIGO },
          { id: "loansPersonalShare", label: "KHCN", color: GREEN },
          { id: "loansOtherShare", label: "KH khác", color: SLATE },
        ],
      },
      {
        title: "Tỷ trọng cho vay theo thời gian",
        kind: "stackedShare",
        format: "percent",
        bars: [
          { id: "loansShortTermShare", label: "Ngắn hạn", color: BLUE },
          { id: "loansMediumTermShare", label: "Trung hạn", color: AMBER },
          { id: "loansLongTermShare", label: "Dài hạn", color: PURPLE },
        ],
      },
      {
        title: "Tỷ trọng cho vay theo ngành",
        kind: "stackedShare",
        format: "percent",
        bars: [
          { id: "sectorTrade", label: "Thương mại", color: BLUE },
          { id: "sectorMfg", label: "Sản xuất", color: GREEN },
          { id: "sectorConstruction", label: "Xây dựng", color: AMBER },
          { id: "sectorService", label: "Dịch vụ cộng đồng & cá nhân", color: PURPLE },
          { id: "sectorRealEstate", label: "Bất động sản & tư vấn", color: PINK },
        ],
      },
      {
        title: "Cơ cấu cho vay theo thời hạn",
        kind: "comboBarLine",
        format: "money",
        lineFormat: "percent",
        bars: [
          { id: "loansShortTerm", label: "Ngắn hạn", color: BLUE },
          { id: "loansMediumTerm", label: "Trung hạn", color: AMBER },
          { id: "loansLongTerm", label: "Dài hạn", color: PURPLE },
        ],
        lines: [{ id: "ldr", label: "LDR (%)", color: GREEN }],
      },
    ],
  },
  {
    section: "Thu nhập & lợi nhuận",
    charts: [
      {
        title: "Thu nhập hoạt động",
        kind: "comboBarLine",
        format: "money",
        lineFormat: "percent",
        bars: [
          { id: "nii", label: "Thu nhập lãi thuần (NII)", color: BLUE },
          { id: "nonii", label: "Thu nhập ngoài lãi (NonII)", color: AMBER },
        ],
        lines: [
          { id: "niiGrowth", label: "Tăng trưởng NII YoY (%)", color: GREEN },
          { id: "toiGrowth", label: "Tăng trưởng TOI YoY (%)", color: PURPLE },
        ],
      },
      {
        title: "Cơ cấu thu nhập hoạt động",
        kind: "stackedShare",
        format: "percent",
        bars: [
          { id: "niiShare", label: "NII (%)", color: BLUE },
          { id: "noniiShare", label: "NonII (%)", color: AMBER },
        ],
      },
      {
        title: "Thu nhập ngoài lãi",
        kind: "comboBarLine",
        format: "money",
        lineFormat: "percent",
        bars: [
          { id: "feeIncome", label: "Hoạt động dịch vụ", color: BLUE },
          { id: "fxIncome", label: "Kinh doanh ngoại hối", color: AMBER },
          { id: "securitiesIncome", label: "Kinh doanh & Đầu tư CK", color: PURPLE },
          { id: "otherIncome", label: "Thu nhập khác", color: SLATE },
        ],
        lines: [{ id: "noniiGrowth", label: "Tăng trưởng NonII (%)", color: RED }],
      },
      {
        title: "Lợi nhuận trước thuế",
        kind: "comboBarLine",
        format: "money",
        lineFormat: "percent",
        bars: [
          { id: "toi", label: "TOI", color: BLUE },
          { id: "operatingExpense", label: "Chi phí hoạt động", color: AMBER },
          { id: "provisionExpense", label: "Chi phí dự phòng", color: RED },
          { id: "pbt", label: "LN trước thuế (PBT)", color: GREEN },
        ],
        lines: [{ id: "provisionToToi", label: "Chi phí dự phòng / TOI (%)", color: PURPLE }],
      },
    ],
  },
  {
    section: "Chất lượng tài sản",
    charts: [
      {
        title: "Nợ xấu — NPL",
        kind: "multiLine",
        format: "percent",
        lines: [
          { id: "npl2", label: "Nợ nhóm 2 (%)", color: AMBER },
          { id: "npl", label: "NPL (%)", color: RED },
          { id: "llr", label: "LLR (%)", color: GREEN },
        ],
      },
      {
        title: "Tỷ lệ nợ xấu hình thành mới",
        kind: "multiLine",
        format: "percent",
        lines: [
          { id: "newNplFormation", label: "Nợ xấu hình thành mới (%)", color: RED },
          { id: "provisionToLoan", label: "Trích lập / Cho vay (%)", color: AMBER },
          { id: "llr", label: "LLR (%)", color: GREEN },
        ],
      },
      {
        title: "Cơ cấu nợ",
        kind: "stackedBar",
        format: "money",
        bars: [
          { id: "npl2Abs", label: "Nợ cần chú ý", color: AMBER },
          { id: "npl3Abs", label: "Nợ dưới tiêu chuẩn", color: BLUE },
          { id: "npl4Abs", label: "Nợ nghi ngờ", color: PURPLE },
          { id: "npl5Abs", label: "Nợ có khả năng mất vốn", color: RED },
        ],
      },
      {
        title: "Tỷ trọng nợ",
        kind: "multiLine",
        format: "percent",
        lines: [
          { id: "npl2", label: "Nợ nhóm 2 (%)", color: AMBER },
          { id: "npl3", label: "Nợ dưới tiêu chuẩn (%)", color: BLUE },
          { id: "npl4", label: "Nợ nghi ngờ (%)", color: PURPLE },
          { id: "npl5", label: "Nợ có khả năng mất vốn (%)", color: RED },
        ],
      },
    ],
  },
  {
    section: "Thanh khoản & cân đối bảng cân đối",
    charts: [
      { title: "LDR", kind: "dualLine", format: "percent", lines: [{ id: "ldr", label: "Ngân hàng", color: BLUE }] },
      {
        title: "Tỷ lệ thanh khoản LDR & SMLR",
        kind: "multiLine",
        format: "percent",
        lines: [
          { id: "ldr", label: "LDR (%)", color: BLUE },
          { id: "smlr", label: "SMLR (%)", color: AMBER },
        ],
      },
      {
        title: "Cơ cấu tiền gửi",
        kind: "comboBarLine",
        format: "money",
        lineFormat: "percent",
        bars: [
          { id: "depositsDemand", label: "Không kỳ hạn", color: BLUE },
          { id: "depositsTerm", label: "Có kỳ hạn", color: AMBER },
          { id: "depositsMargin", label: "Ký quỹ", color: PURPLE },
          { id: "depositsOther", label: "Khác", color: SLATE },
        ],
        lines: [{ id: "casa", label: "CASA (%)", color: GREEN }],
      },
      {
        title: "Các khoản dự phòng",
        kind: "stackedBar",
        format: "money",
        bars: [
          { id: "provisionInterbank", label: "Dự phòng cho vay TCTD khác", color: BLUE },
          { id: "provisionTrading", label: "Dự phòng CK kinh doanh", color: AMBER },
          { id: "provisionLoan", label: "Dự phòng cho vay KH", color: RED },
          { id: "provisionInvestment", label: "Dự phòng CK đầu tư", color: PURPLE },
          { id: "provisionLongTerm", label: "Dự phòng đầu tư dài hạn", color: LIME },
        ],
      },
      {
        title: "Cơ cấu nợ phải trả có lãi",
        kind: "stackedShare",
        format: "percent",
        bars: [
          { id: "liabDepositsShare", label: "Tiền gửi KH", color: BLUE },
          { id: "liabInterbankShare", label: "Tiền gửi liên NH", color: AMBER },
          { id: "liabPapersShare", label: "Giấy tờ có giá", color: PURPLE },
        ],
      },
      {
        title: "Cơ cấu nợ phải trả có lãi (giá trị)",
        kind: "stackedBar",
        format: "money",
        bars: [
          { id: "depositsCustomer", label: "Tiền gửi KH", color: BLUE },
          { id: "depositsInterbank", label: "Tiền gửi liên NH", color: AMBER },
          { id: "valuablePapers", label: "Giấy tờ có giá", color: PURPLE },
        ],
      },
      {
        title: "Cơ cấu tài sản có lãi",
        kind: "stackedShare",
        format: "percent",
        bars: [
          { id: "earningAssetsLoanShare", label: "Cho vay KH", color: BLUE },
          { id: "earningAssetsInterbankShare", label: "Cho vay liên NH", color: AMBER },
          { id: "earningAssetsInvestmentShare", label: "DM đầu tư", color: PURPLE },
          { id: "earningAssetsOtherShare", label: "Tài sản sinh lãi khác", color: SLATE },
        ],
      },
      {
        title: "Cơ cấu tài sản có lãi (giá trị)",
        kind: "stackedBar",
        format: "money",
        bars: [
          { id: "earningAssetsLoan", label: "Cho vay KH", color: BLUE },
          { id: "earningAssetsInterbank", label: "Cho vay liên NH", color: AMBER },
          { id: "earningAssetsInvestment", label: "DM đầu tư", color: PURPLE },
          { id: "earningAssetsOther", label: "Tài sản sinh lãi khác", color: SLATE },
        ],
      },
      {
        title: "Cơ cấu danh mục đầu tư",
        kind: "stackedShare",
        format: "percent",
        bars: [
          { id: "investGovBondsShare", label: "TPCP", color: BLUE },
          { id: "investCreditInstShare", label: "TCTD", color: AMBER },
          { id: "investCorpBondsShare", label: "TPDN", color: PURPLE },
        ],
      },
      {
        title: "Cơ cấu danh mục đầu tư (giá trị)",
        kind: "stackedBar",
        format: "money",
        bars: [
          { id: "investGovBonds", label: "TPCP", color: BLUE },
          { id: "investCreditInst", label: "TCTD", color: AMBER },
          { id: "investCorpBonds", label: "TPDN", color: PURPLE },
        ],
      },
      {
        title: "Vốn chủ và Nợ phải trả",
        kind: "stackedBar",
        format: "money",
        bars: [
          { id: "capitalDeposits", label: "Tiền gửi KH", color: GREEN },
          { id: "capitalOtherLiab", label: "Nghĩa vụ phải trả khác", color: RED },
          { id: "capitalEquity", label: "Vốn chủ sở hữu", color: BLUE },
        ],
      },
      {
        title: "Cơ cấu Vốn chủ và Nợ phải trả",
        kind: "stackedShare",
        format: "percent",
        bars: [
          { id: "capitalDepositsShare", label: "Tiền gửi KH", color: GREEN },
          { id: "capitalOtherLiabShare", label: "Nghĩa vụ phải trả khác", color: RED },
          { id: "capitalEquityShare", label: "Vốn chủ sở hữu", color: BLUE },
        ],
      },
    ],
  },
];
