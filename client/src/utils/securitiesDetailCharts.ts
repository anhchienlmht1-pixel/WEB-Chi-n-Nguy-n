import type { SecuritiesMetricFormat } from "./securitiesDetailFormat";

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
  format: SecuritiesMetricFormat;
  lineFormat?: SecuritiesMetricFormat;
}

const BLUE = "#3b82f6";
const GREEN = "#10b981";
const AMBER = "#f59e0b";
const PURPLE = "#a78bfa";
const PINK = "#f472b6";
const TEAL = "#2dd4bf";
const RED = "#f87171";
const INDIGO = "#818cf8";
const LIME = "#a3e635";
const SLATE = "#94a3b8";

// Replicates the securities-industry workbook's own "Chi tiết" dashboard
// sheet, grouped analogously to the bank feature's bankDetailCharts.ts.
// Every series id here traces to a specific row/formula in
// scripts/export-securities-detail.py — see that script's header for two
// labeling bugs caught in the source workbook's own chart-data sheet
// while reverse-engineering these.
export const CHART_GROUPS: { section: string; charts: ChartDef[] }[] = [
  {
    section: "So sánh với trung bình ngành",
    charts: [
      { title: "ROE", kind: "dualLine", format: "percent", lines: [{ id: "roe", label: "Công ty", color: BLUE }] },
      { title: "ROA", kind: "dualLine", format: "percent", lines: [{ id: "roa", label: "Công ty", color: GREEN }] },
      { title: "EPS cơ bản", kind: "dualLine", format: "perShare", lines: [{ id: "epsBasic", label: "Công ty", color: AMBER }] },
      { title: "BVPS", kind: "dualLine", format: "perShare", lines: [{ id: "bvps", label: "Công ty", color: PURPLE }] },
      { title: "Biên lợi nhuận gộp", kind: "dualLine", format: "percent", lines: [{ id: "grossMargin", label: "Công ty", color: PINK }] },
      { title: "Biên LNTT", kind: "dualLine", format: "percent", lines: [{ id: "pretaxMargin", label: "Công ty", color: TEAL }] },
      { title: "Biên LNST", kind: "dualLine", format: "percent", lines: [{ id: "netMargin", label: "Công ty", color: RED }] },
      { title: "Biên LN môi giới", kind: "dualLine", format: "percent", lines: [{ id: "brokerageMargin", label: "Công ty", color: INDIGO }] },
      { title: "Tỷ trọng LN tự doanh", kind: "dualLine", format: "percent", lines: [{ id: "propProfitShare", label: "Công ty", color: LIME }] },
    ],
  },
  {
    section: "Doanh thu & lợi nhuận theo mảng",
    charts: [
      {
        title: "Doanh thu từng mảng",
        kind: "comboBarLine",
        format: "money",
        lineFormat: "percent",
        bars: [
          { id: "dtFvtpl", label: "FVTPL", color: BLUE },
          { id: "dtHtm", label: "HTM", color: AMBER },
          { id: "dtAfs", label: "AFS", color: PURPLE },
          { id: "dtChoVay", label: "Cho vay", color: GREEN },
          { id: "dtMoiGioi", label: "Môi giới", color: PINK },
          { id: "dtKhac", label: "Khác", color: SLATE },
        ],
        lines: [{ id: "revenueGrowth", label: "Tăng trưởng doanh thu (%)", color: RED }],
      },
      {
        title: "Tỷ trọng doanh thu từng mảng",
        kind: "stackedShare",
        format: "percent",
        bars: [
          { id: "dtFvtplShare", label: "FVTPL", color: BLUE },
          { id: "dtHtmShare", label: "HTM", color: AMBER },
          { id: "dtAfsShare", label: "AFS", color: PURPLE },
          { id: "dtChoVayShare", label: "Cho vay", color: GREEN },
          { id: "dtMoiGioiShare", label: "Môi giới", color: PINK },
          { id: "dtKhacShare", label: "Khác", color: SLATE },
        ],
      },
      {
        title: "Lợi nhuận từng mảng",
        kind: "stackedBar",
        format: "money",
        bars: [
          { id: "lnFvtpl", label: "FVTPL", color: BLUE },
          { id: "lnHtm", label: "HTM", color: AMBER },
          { id: "lnAfs", label: "AFS", color: PURPLE },
          { id: "lnChoVay", label: "Cho vay", color: GREEN },
          { id: "lnMoiGioi", label: "Môi giới", color: PINK },
          { id: "lnKhac", label: "Khác", color: SLATE },
        ],
      },
      {
        title: "Tỷ trọng lợi nhuận từng mảng",
        kind: "stackedShare",
        format: "percent",
        bars: [
          { id: "lnFvtplShare", label: "FVTPL", color: BLUE },
          { id: "lnHtmShare", label: "HTM", color: AMBER },
          { id: "lnAfsShare", label: "AFS", color: PURPLE },
          { id: "lnChoVayShare", label: "Cho vay", color: GREEN },
          { id: "lnMoiGioiShare", label: "Môi giới", color: PINK },
          { id: "lnKhacShare", label: "Khác", color: SLATE },
        ],
      },
      {
        title: "Biên lợi nhuận từng mảng",
        kind: "multiLine",
        format: "percent",
        lines: [
          { id: "blnFvtpl", label: "FVTPL", color: BLUE },
          { id: "blnHtm", label: "HTM", color: AMBER },
          { id: "blnAfs", label: "AFS", color: PURPLE },
          { id: "blnChoVay", label: "Cho vay", color: GREEN },
          { id: "blnMoiGioi", label: "Môi giới", color: PINK },
        ],
      },
      {
        title: "Cấu phần lợi nhuận trước thuế",
        kind: "comboBarLine",
        format: "money",
        lineFormat: "money",
        bars: [
          { id: "lnTuHDKD", label: "LN từ HĐKD", color: BLUE },
          { id: "lnTaiChinh", label: "LN tài chính", color: AMBER },
          { id: "lnCtyLienKet", label: "LN công ty liên kết", color: PURPLE },
        ],
        lines: [{ id: "lntt", label: "Tổng LNTT", color: GREEN }],
      },
    ],
  },
  {
    section: "Mảng kinh doanh",
    charts: [
      {
        title: "Mảng Môi giới",
        kind: "comboBarLine",
        format: "money",
        lineFormat: "percent",
        bars: [
          { id: "moiGioiDT", label: "Doanh thu", color: BLUE },
          { id: "moiGioiLN", label: "Lợi nhuận", color: GREEN },
        ],
        lines: [{ id: "moiGioiBLN", label: "Biên LN (%)", color: AMBER }],
      },
      {
        title: "Mảng Tự doanh",
        kind: "comboBarLine",
        format: "money",
        lineFormat: "percent",
        bars: [
          { id: "tuDoanhDT", label: "Doanh thu", color: BLUE },
          { id: "tuDoanhLN", label: "Lợi nhuận", color: GREEN },
        ],
        lines: [{ id: "tuDoanhBLN", label: "Biên LN (%)", color: AMBER }],
      },
      {
        title: "Mảng Cho vay",
        kind: "comboBarLine",
        format: "money",
        lineFormat: "percent",
        bars: [
          { id: "choVayDT", label: "Doanh thu", color: BLUE },
          { id: "choVayLN", label: "Lợi nhuận", color: GREEN },
        ],
        lines: [{ id: "choVayBLN", label: "Biên LN (%)", color: AMBER }],
      },
      {
        title: "Mảng Ngân hàng đầu tư (IB)",
        kind: "comboBarLine",
        format: "money",
        lineFormat: "percent",
        bars: [
          { id: "ibDT", label: "Doanh thu", color: BLUE },
          { id: "ibLN", label: "Lợi nhuận", color: GREEN },
        ],
        lines: [{ id: "ibBLN", label: "Biên LN (%)", color: AMBER }],
      },
      {
        title: "Tăng trưởng lợi nhuận từng mảng",
        kind: "multiLine",
        format: "percent",
        lines: [
          { id: "moiGioiLNGrowth", label: "Môi giới", color: BLUE },
          { id: "tuDoanhLNGrowth", label: "Tự doanh", color: GREEN },
          { id: "choVayLNGrowth", label: "Cho vay", color: AMBER },
          { id: "ibLNGrowth", label: "IB", color: PURPLE },
        ],
      },
    ],
  },
  {
    section: "Danh mục tự doanh",
    charts: [
      {
        title: "Cơ cấu tài sản tự doanh",
        kind: "comboBarLine",
        format: "money",
        lineFormat: "percent",
        bars: [
          { id: "tsFvtpl", label: "FVTPL", color: BLUE },
          { id: "tsHtm", label: "HTM", color: AMBER },
          { id: "tsAfs", label: "AFS", color: PURPLE },
        ],
        lines: [{ id: "propAssetsGrowth", label: "Tăng trưởng tài sản (%)", color: GREEN }],
      },
      {
        title: "Tỷ trọng tài sản tự doanh",
        kind: "stackedShare",
        format: "percent",
        bars: [
          { id: "tsFvtplShare", label: "FVTPL", color: BLUE },
          { id: "tsHtmShare", label: "HTM", color: AMBER },
          { id: "tsAfsShare", label: "AFS", color: PURPLE },
        ],
      },
      {
        title: "Cơ cấu FVTPL theo loại tài sản",
        kind: "stackedShare",
        format: "percent",
        bars: [
          { id: "fvtplListedShare", label: "CP niêm yết", color: BLUE },
          { id: "fvtplUnlistedShare", label: "CP chưa niêm yết", color: AMBER },
          { id: "fvtplFundShare", label: "Chứng chỉ quỹ", color: PURPLE },
          { id: "fvtplBondShare", label: "Trái phiếu", color: GREEN },
          { id: "fvtplMoneyMktShare", label: "Công cụ TT tiền tệ", color: SLATE },
        ],
      },
      {
        title: "Cơ cấu HTM theo loại tài sản",
        kind: "stackedShare",
        format: "percent",
        bars: [
          { id: "htmListedShare", label: "CP niêm yết", color: BLUE },
          { id: "htmUnlistedShare", label: "CP chưa niêm yết", color: AMBER },
          { id: "htmFundShare", label: "Chứng chỉ quỹ", color: PURPLE },
          { id: "htmBondShare", label: "Trái phiếu", color: GREEN },
          { id: "htmMoneyMktShare", label: "Công cụ TT tiền tệ", color: SLATE },
        ],
      },
      {
        title: "Cơ cấu AFS theo loại tài sản",
        kind: "stackedShare",
        format: "percent",
        bars: [
          { id: "afsListedShare", label: "CP niêm yết", color: BLUE },
          { id: "afsUnlistedShare", label: "CP chưa niêm yết", color: AMBER },
          { id: "afsFundShare", label: "Chứng chỉ quỹ", color: PURPLE },
          { id: "afsBondShare", label: "Trái phiếu", color: GREEN },
          { id: "afsMoneyMktShare", label: "Công cụ TT tiền tệ", color: SLATE },
        ],
      },
      {
        title: "Cơ cấu lãi từ FVTPL",
        kind: "stackedShare",
        format: "percent",
        bars: [
          { id: "fvtplLaiBanShare", label: "Lãi bán tài sản", color: BLUE },
          { id: "fvtplDanhGiaLaiShare", label: "Chênh lệch đánh giá lại", color: AMBER },
          { id: "fvtplCoTucShare", label: "Cổ tức & tiền lãi", color: GREEN },
        ],
      },
      {
        title: "Hiệu suất đầu tư tự doanh",
        kind: "multiLine",
        format: "percent",
        lines: [{ id: "propReturn", label: "LN tự doanh / TS tự doanh", color: BLUE }],
      },
    ],
  },
  {
    section: "Cho vay ký quỹ & nguồn vốn",
    charts: [
      {
        title: "Cho vay ký quỹ & VCSH",
        kind: "comboBarLine",
        format: "money",
        lineFormat: "percent",
        bars: [
          { id: "margin", label: "Dư nợ margin", color: BLUE },
          { id: "equity", label: "VCSH", color: AMBER },
        ],
        lines: [{ id: "marginToEquity", label: "Margin / VCSH (%)", color: GREEN }],
      },
      {
        title: "Tỷ lệ margin đang cho vay",
        kind: "comboBarLine",
        format: "money",
        lineFormat: "percent",
        bars: [
          { id: "margin", label: "Dư nợ margin", color: BLUE },
          { id: "marginCapacity", label: "Hạn mức có thể cho vay", color: SLATE },
        ],
        lines: [{ id: "marginUtilization", label: "Tỷ lệ đang cho vay (%)", color: GREEN }],
      },
      {
        title: "Tăng trưởng dư nợ margin",
        kind: "comboBarLine",
        format: "money",
        lineFormat: "percent",
        bars: [{ id: "margin", label: "Dư nợ margin", color: BLUE }],
        lines: [{ id: "marginGrowth", label: "Tăng trưởng (%)", color: GREEN }],
      },
      {
        title: "Lợi suất cho vay margin",
        kind: "multiLine",
        format: "percent",
        lines: [{ id: "marginYield", label: "Lợi suất bình quân năm", color: BLUE }],
      },
      {
        title: "Chi phí vốn",
        kind: "comboBarLine",
        format: "money",
        lineFormat: "percent",
        bars: [{ id: "shortDebt", label: "Nợ vay ngắn hạn", color: BLUE }],
        lines: [{ id: "fundingCost", label: "Chi phí vốn bình quân năm (%)", color: RED }],
      },
      {
        title: "NAV quản lý & tiền gửi nhà đầu tư",
        kind: "stackedBar",
        format: "money",
        bars: [
          { id: "nav", label: "NAV nhà đầu tư", color: BLUE },
          { id: "investorDeposits", label: "Tiền gửi nhà đầu tư", color: GREEN },
        ],
      },
    ],
  },
  {
    section: "Cấu trúc tài sản",
    charts: [
      {
        title: "Cấu trúc phân bổ tài sản",
        kind: "stackedShare",
        format: "percent",
        bars: [
          { id: "cashShare", label: "Tiền & tương đương tiền", color: BLUE },
          { id: "fvtplAllocShare", label: "FVTPL", color: AMBER },
          { id: "htmAllocShare", label: "HTM", color: PURPLE },
          { id: "choVayAllocShare", label: "Cho vay", color: GREEN },
          { id: "afsAllocShare", label: "AFS", color: SLATE },
        ],
      },
    ],
  },
];
