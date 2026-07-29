// Maps each symbol in STOCK_UNIVERSE (server/src/providers/universe.ts) to a
// display sector name, used only for the market digest's sector-rotation
// topic (server/src/digest/marketDigest.ts) — grouping mirrors the comment
// headers in universe.ts, with the HNX/UPCOM tail assigned by actual line of
// business since that file doesn't group those by sector.
export const SECTOR_MAP: Record<string, string> = {
  // Ngân hàng
  VCB: "Ngân hàng", BID: "Ngân hàng", CTG: "Ngân hàng", TCB: "Ngân hàng", MBB: "Ngân hàng",
  ACB: "Ngân hàng", VPB: "Ngân hàng", STB: "Ngân hàng", SHB: "Ngân hàng", HDB: "Ngân hàng",
  TPB: "Ngân hàng", VIB: "Ngân hàng", EIB: "Ngân hàng", MSB: "Ngân hàng", LPB: "Ngân hàng",

  // Bất động sản
  VIC: "Bất động sản", VHM: "Bất động sản", VRE: "Bất động sản", NVL: "Bất động sản",
  PDR: "Bất động sản", DXG: "Bất động sản", KDH: "Bất động sản", NLG: "Bất động sản",
  DIG: "Bất động sản", KBC: "Bất động sản", CEO: "Bất động sản", IDC: "Bất động sản",

  // Bán lẻ / hàng tiêu dùng
  VNM: "Bán lẻ / hàng tiêu dùng", MWG: "Bán lẻ / hàng tiêu dùng", PNJ: "Bán lẻ / hàng tiêu dùng",
  MSN: "Bán lẻ / hàng tiêu dùng", SAB: "Bán lẻ / hàng tiêu dùng", KDC: "Bán lẻ / hàng tiêu dùng",
  DGW: "Bán lẻ / hàng tiêu dùng", FRT: "Bán lẻ / hàng tiêu dùng", MCH: "Bán lẻ / hàng tiêu dùng",
  QNS: "Bán lẻ / hàng tiêu dùng",

  // Công nghiệp / vật liệu
  HPG: "Công nghiệp / vật liệu", HSG: "Công nghiệp / vật liệu", NKG: "Công nghiệp / vật liệu",
  GVR: "Công nghiệp / vật liệu", DGC: "Công nghiệp / vật liệu", VCS: "Công nghiệp / vật liệu",
  NTP: "Công nghiệp / vật liệu", VEA: "Công nghiệp / vật liệu",

  // Năng lượng / hạ tầng
  GAS: "Năng lượng / hạ tầng", PLX: "Năng lượng / hạ tầng", POW: "Năng lượng / hạ tầng",
  PVD: "Năng lượng / hạ tầng", PVS: "Năng lượng / hạ tầng", BCM: "Năng lượng / hạ tầng",
  BSR: "Năng lượng / hạ tầng", OIL: "Năng lượng / hạ tầng",

  // Chứng khoán
  SSI: "Chứng khoán", VND: "Chứng khoán", HCM: "Chứng khoán", VCI: "Chứng khoán",
  VIX: "Chứng khoán", SHS: "Chứng khoán", MBS: "Chứng khoán",

  // Công nghệ / viễn thông
  FPT: "Công nghệ / viễn thông", CMG: "Công nghệ / viễn thông", FOX: "Công nghệ / viễn thông",
  VGI: "Công nghệ / viễn thông",

  // Hàng không
  VJC: "Hàng không", HVN: "Hàng không", ACV: "Hàng không",

  // Khác (bảo hiểm, công nghiệp phụ trợ...)
  BVH: "Khác", GEX: "Khác", PVI: "Khác", HUT: "Khác", TNG: "Khác",
};
