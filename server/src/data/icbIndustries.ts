// ICB Level-3 industry classification for symbols in STOCK_UNIVERSE, hand
// transcribed from a FiinTrade Ranking report (Q2/2019) the user pasted
// directly into the conversation. Only the industry LABELS are taken from
// that document — its numeric ranks/totals are a 2019 snapshot and are
// deliberately NOT used anywhere (see industryRanking.ts), since presenting
// a 6-year-stale rank as current would be misleading. Industry membership
// itself changes far less often than rank order, so treating these labels
// as still-valid reference data is reasonable; a symbol not covered by that
// document (e.g. MSB, which wasn't listed on an ICB-classified exchange in
// 2019) is simply omitted rather than guessed.
export const ICB_INDUSTRY: Record<string, string> = {
  // Ngân hàng
  VCB: "Ngân hàng",
  BID: "Ngân hàng",
  CTG: "Ngân hàng",
  TCB: "Ngân hàng",
  MBB: "Ngân hàng",
  ACB: "Ngân hàng",
  VPB: "Ngân hàng",
  STB: "Ngân hàng",
  SHB: "Ngân hàng",
  HDB: "Ngân hàng",
  TPB: "Ngân hàng",
  VIB: "Ngân hàng",
  EIB: "Ngân hàng",

  // Bất động sản
  VIC: "Bất động sản",
  VHM: "Bất động sản",
  VRE: "Bất động sản",
  NVL: "Bất động sản",
  PDR: "Bất động sản",
  DXG: "Bất động sản",
  KDH: "Bất động sản",
  NLG: "Bất động sản",
  DIG: "Bất động sản",
  KBC: "Bất động sản",
  BCM: "Bất động sản",
  CEO: "Bất động sản",
  IDC: "Bất động sản",

  // Bán lẻ / hàng tiêu dùng
  MWG: "Bán lẻ",
  DGW: "Bán lẻ",
  FRT: "Bán lẻ",
  VNM: "Sản xuất thực phẩm",
  MSN: "Sản xuất thực phẩm",
  KDC: "Sản xuất thực phẩm",
  MCH: "Sản xuất thực phẩm",
  QNS: "Sản xuất thực phẩm",
  PNJ: "Hàng cá nhân",
  TNG: "Hàng cá nhân",
  SAB: "Bia và đồ uống",

  // Công nghiệp / vật liệu
  HPG: "Kim loại",
  HSG: "Kim loại",
  NKG: "Kim loại",
  GVR: "Hóa chất",
  DGC: "Hóa chất",
  VCS: "Xây dựng và Vật liệu",
  NTP: "Xây dựng và Vật liệu",
  HUT: "Xây dựng và Vật liệu",
  VEA: "Công nghiệp nặng",
  GEX: "Điện tử & Thiết bị điện",

  // Năng lượng / hạ tầng
  GAS: "Nước & Khí đốt",
  PLX: "Sản xuất Dầu khí",
  BSR: "Sản xuất Dầu khí",
  OIL: "Sản xuất Dầu khí",
  POW: "Sản xuất & Phân phối Điện",
  PVD: "Thiết bị, Dịch vụ và Phân phối Dầu khí",
  PVS: "Thiết bị, Dịch vụ và Phân phối Dầu khí",

  // Chứng khoán / dịch vụ tài chính
  SSI: "Dịch vụ tài chính",
  VND: "Dịch vụ tài chính",
  HCM: "Dịch vụ tài chính",
  VCI: "Dịch vụ tài chính",
  VIX: "Dịch vụ tài chính",
  SHS: "Dịch vụ tài chính",
  MBS: "Dịch vụ tài chính",

  // Công nghệ / viễn thông
  FPT: "Phần mềm & Dịch vụ Máy tính",
  CMG: "Phần mềm & Dịch vụ Máy tính",
  VGI: "Viễn thông di động",
  FOX: "Viễn thông cố định",

  // Hàng không / vận tải
  VJC: "Du lịch & Giải trí",
  HVN: "Du lịch & Giải trí",
  ACV: "Vận tải",

  // Bảo hiểm
  BVH: "Bảo hiểm nhân thọ",
  PVI: "Bảo hiểm phi nhân thọ",
};

export function industryOf(symbol: string): string | undefined {
  return ICB_INDUSTRY[symbol.toUpperCase()];
}

export function symbolsInIndustry(industry: string): string[] {
  return Object.entries(ICB_INDUSTRY)
    .filter(([, ind]) => ind === industry)
    .map(([symbol]) => symbol);
}
