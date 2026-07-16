export interface StockSeed {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  basePrice: number;
}

// Curated universe of Vietnam-listed stocks (HOSE/HNX). basePrice is only used
// by the mock provider for realistic-looking demo numbers; real providers use
// live prices and only borrow the name/exchange metadata from here.
export const STOCK_UNIVERSE: StockSeed[] = [
  // Ngân hàng
  { symbol: "VCB", name: "Ngân hàng TMCP Ngoại thương Việt Nam", exchange: "HOSE", currency: "VND", basePrice: 91200 },
  { symbol: "BID", name: "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam", exchange: "HOSE", currency: "VND", basePrice: 48700 },
  { symbol: "CTG", name: "Ngân hàng TMCP Công Thương Việt Nam", exchange: "HOSE", currency: "VND", basePrice: 36500 },
  { symbol: "TCB", name: "Ngân hàng TMCP Kỹ Thương Việt Nam", exchange: "HOSE", currency: "VND", basePrice: 23800 },
  { symbol: "MBB", name: "Ngân hàng TMCP Quân đội", exchange: "HOSE", currency: "VND", basePrice: 24100 },
  { symbol: "ACB", name: "Ngân hàng TMCP Á Châu", exchange: "HOSE", currency: "VND", basePrice: 25300 },
  { symbol: "VPB", name: "Ngân hàng TMCP Việt Nam Thịnh Vượng", exchange: "HOSE", currency: "VND", basePrice: 19200 },
  { symbol: "STB", name: "Ngân hàng TMCP Sài Gòn Thương Tín", exchange: "HOSE", currency: "VND", basePrice: 33400 },
  { symbol: "SHB", name: "Ngân hàng TMCP Sài Gòn - Hà Nội", exchange: "HOSE", currency: "VND", basePrice: 12700 },
  { symbol: "HDB", name: "Ngân hàng TMCP Phát triển TP.HCM", exchange: "HOSE", currency: "VND", basePrice: 24600 },
  { symbol: "TPB", name: "Ngân hàng TMCP Tiên Phong", exchange: "HOSE", currency: "VND", basePrice: 16800 },
  { symbol: "VIB", name: "Ngân hàng TMCP Quốc tế Việt Nam", exchange: "HOSE", currency: "VND", basePrice: 19500 },
  { symbol: "EIB", name: "Ngân hàng TMCP Xuất Nhập khẩu Việt Nam", exchange: "HOSE", currency: "VND", basePrice: 18900 },
  { symbol: "MSB", name: "Ngân hàng TMCP Hàng Hải Việt Nam", exchange: "HOSE", currency: "VND", basePrice: 13200 },

  // Bất động sản
  { symbol: "VIC", name: "Tập đoàn Vingroup", exchange: "HOSE", currency: "VND", basePrice: 45200 },
  { symbol: "VHM", name: "Vinhomes", exchange: "HOSE", currency: "VND", basePrice: 41800 },
  { symbol: "VRE", name: "Vincom Retail", exchange: "HOSE", currency: "VND", basePrice: 20500 },
  { symbol: "NVL", name: "Novaland", exchange: "HOSE", currency: "VND", basePrice: 11800 },
  { symbol: "PDR", name: "Phát Đạt", exchange: "HOSE", currency: "VND", basePrice: 19700 },
  { symbol: "DXG", name: "Đất Xanh Group", exchange: "HOSE", currency: "VND", basePrice: 14300 },
  { symbol: "KDH", name: "Nhà Khang Điền", exchange: "HOSE", currency: "VND", basePrice: 32600 },
  { symbol: "NLG", name: "Nam Long Group", exchange: "HOSE", currency: "VND", basePrice: 33800 },
  { symbol: "DIG", name: "DIC Corp", exchange: "HOSE", currency: "VND", basePrice: 18400 },
  { symbol: "KBC", name: "Tổng Công ty Phát triển Đô thị Kinh Bắc", exchange: "HOSE", currency: "VND", basePrice: 25900 },

  // Bán lẻ / hàng tiêu dùng
  { symbol: "VNM", name: "Vinamilk", exchange: "HOSE", currency: "VND", basePrice: 67500 },
  { symbol: "MWG", name: "Thế Giới Di Động", exchange: "HOSE", currency: "VND", basePrice: 62100 },
  { symbol: "PNJ", name: "Vàng bạc Đá quý Phú Nhuận", exchange: "HOSE", currency: "VND", basePrice: 94500 },
  { symbol: "MSN", name: "Tập đoàn Masan", exchange: "HOSE", currency: "VND", basePrice: 71600 },
  { symbol: "SAB", name: "Sabeco", exchange: "HOSE", currency: "VND", basePrice: 58900 },
  { symbol: "KDC", name: "Tập đoàn KIDO", exchange: "HOSE", currency: "VND", basePrice: 44200 },
  { symbol: "DGW", name: "Digiworld", exchange: "HOSE", currency: "VND", basePrice: 41300 },
  { symbol: "FRT", name: "FPT Retail", exchange: "HOSE", currency: "VND", basePrice: 156000 },

  // Công nghiệp / vật liệu
  { symbol: "HPG", name: "Hòa Phát Group", exchange: "HOSE", currency: "VND", basePrice: 27300 },
  { symbol: "HSG", name: "Tập đoàn Hoa Sen", exchange: "HOSE", currency: "VND", basePrice: 19800 },
  { symbol: "NKG", name: "Thép Nam Kim", exchange: "HOSE", currency: "VND", basePrice: 16500 },
  { symbol: "GVR", name: "Tập đoàn Công nghiệp Cao su Việt Nam", exchange: "HOSE", currency: "VND", basePrice: 32100 },
  { symbol: "DGC", name: "Hóa chất Đức Giang", exchange: "HOSE", currency: "VND", basePrice: 108000 },

  // Năng lượng / hạ tầng
  { symbol: "GAS", name: "PetroVietnam Gas", exchange: "HOSE", currency: "VND", basePrice: 68900 },
  { symbol: "PLX", name: "Petrolimex", exchange: "HOSE", currency: "VND", basePrice: 38700 },
  { symbol: "POW", name: "PV Power", exchange: "HOSE", currency: "VND", basePrice: 12600 },
  { symbol: "PVD", name: "PV Drilling", exchange: "HOSE", currency: "VND", basePrice: 25400 },
  { symbol: "PVS", name: "PTSC", exchange: "HNX", currency: "VND", basePrice: 33200 },
  { symbol: "BCM", name: "Becamex IDC", exchange: "HOSE", currency: "VND", basePrice: 62800 },

  // Chứng khoán
  { symbol: "SSI", name: "Chứng khoán SSI", exchange: "HOSE", currency: "VND", basePrice: 34200 },
  { symbol: "VND", name: "Chứng khoán VNDirect", exchange: "HOSE", currency: "VND", basePrice: 15600 },
  { symbol: "HCM", name: "Chứng khoán TP.HCM (HSC)", exchange: "HOSE", currency: "VND", basePrice: 22400 },
  { symbol: "VCI", name: "Chứng khoán Bản Việt", exchange: "HOSE", currency: "VND", basePrice: 39500 },
  { symbol: "VIX", name: "Chứng khoán VIX", exchange: "HOSE", currency: "VND", basePrice: 14200 },

  // Công nghệ
  { symbol: "FPT", name: "Tập đoàn FPT", exchange: "HOSE", currency: "VND", basePrice: 134500 },
  { symbol: "CMG", name: "CMC Corporation", exchange: "HOSE", currency: "VND", basePrice: 45800 },

  // Hàng không
  { symbol: "VJC", name: "Vietjet Air", exchange: "HOSE", currency: "VND", basePrice: 98700 },
  { symbol: "HVN", name: "Vietnam Airlines", exchange: "HOSE", currency: "VND", basePrice: 20800 },

  // Khác
  { symbol: "BVH", name: "Tập đoàn Bảo Việt", exchange: "HOSE", currency: "VND", basePrice: 42600 },
  { symbol: "GEX", name: "Gelex Group", exchange: "HOSE", currency: "VND", basePrice: 18900 },
];

export function findSeed(symbol: string): StockSeed | undefined {
  return STOCK_UNIVERSE.find((s) => s.symbol.toUpperCase() === symbol.toUpperCase());
}
