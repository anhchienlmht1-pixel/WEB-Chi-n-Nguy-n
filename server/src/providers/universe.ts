export interface StockSeed {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  basePrice: number;
}

// Curated universe of Vietnam-listed stocks (HOSE/HNX/UPCOM). basePrice is only used
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
  { symbol: "LPB", name: "Ngân hàng TMCP Lộc Phát Việt Nam", exchange: "HOSE", currency: "VND", basePrice: 52600 },

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

  // Ngân hàng (bổ sung)
  { symbol: "OCB", name: "Ngân hàng TMCP Phương Đông", exchange: "HOSE", currency: "VND", basePrice: 13200 },
  { symbol: "SSB", name: "Ngân hàng TMCP Đông Nam Á", exchange: "HOSE", currency: "VND", basePrice: 15800 },
  { symbol: "ABB", name: "Ngân hàng TMCP An Bình", exchange: "UPCOM", currency: "VND", basePrice: 8200 },
  { symbol: "NAB", name: "Ngân hàng TMCP Nam Á", exchange: "HOSE", currency: "VND", basePrice: 14600 },
  { symbol: "BAB", name: "Ngân hàng TMCP Bắc Á", exchange: "UPCOM", currency: "VND", basePrice: 16800 },
  { symbol: "SGB", name: "Ngân hàng TMCP Sài Gòn Công Thương", exchange: "UPCOM", currency: "VND", basePrice: 12400 },
  { symbol: "KLB", name: "Ngân hàng TMCP Kiên Long", exchange: "UPCOM", currency: "VND", basePrice: 11200 },
  { symbol: "PGB", name: "Ngân hàng TMCP Xăng dầu Petrolimex", exchange: "UPCOM", currency: "VND", basePrice: 18600 },
  { symbol: "VAB", name: "Ngân hàng TMCP Việt Á", exchange: "UPCOM", currency: "VND", basePrice: 8400 },
  { symbol: "VBB", name: "Ngân hàng TMCP Việt Nam Thương Tín", exchange: "UPCOM", currency: "VND", basePrice: 9800 },

  // Chứng khoán (bổ sung)
  { symbol: "FTS", name: "Chứng khoán FPT", exchange: "HOSE", currency: "VND", basePrice: 44200 },
  { symbol: "CTS", name: "Chứng khoán Công Thương", exchange: "HOSE", currency: "VND", basePrice: 22400 },
  { symbol: "BSI", name: "Chứng khoán BIDV", exchange: "HOSE", currency: "VND", basePrice: 38600 },
  { symbol: "AGR", name: "Chứng khoán Agribank", exchange: "HOSE", currency: "VND", basePrice: 16200 },
  { symbol: "VDS", name: "Chứng khoán Rồng Việt", exchange: "HOSE", currency: "VND", basePrice: 16800 },
  { symbol: "APG", name: "Chứng khoán APG", exchange: "HOSE", currency: "VND", basePrice: 8600 },
  { symbol: "ORS", name: "Chứng khoán Tiên Phong", exchange: "HOSE", currency: "VND", basePrice: 14200 },
  { symbol: "EVS", name: "Chứng khoán Everest", exchange: "HNX", currency: "VND", basePrice: 9200 },
  { symbol: "TVS", name: "Chứng khoán Thiên Việt", exchange: "HOSE", currency: "VND", basePrice: 24600 },
  { symbol: "VIG", name: "Chứng khoán Thương mại và Công nghiệp Việt Nam", exchange: "HNX", currency: "VND", basePrice: 5400 },

  // Bất động sản (bổ sung)
  { symbol: "HDG", name: "Hà Đô Group", exchange: "HOSE", currency: "VND", basePrice: 32600 },
  { symbol: "AGG", name: "An Gia", exchange: "HOSE", currency: "VND", basePrice: 26400 },
  { symbol: "DXS", name: "Đất Xanh Services", exchange: "HOSE", currency: "VND", basePrice: 9800 },
  { symbol: "SCR", name: "TTC Land", exchange: "HOSE", currency: "VND", basePrice: 6200 },
  { symbol: "IJC", name: "Becamex IJC", exchange: "HOSE", currency: "VND", basePrice: 14800 },
  { symbol: "ITA", name: "Tân Tạo", exchange: "HOSE", currency: "VND", basePrice: 4200 },
  { symbol: "HQC", name: "Địa ốc Hoàng Quân", exchange: "HOSE", currency: "VND", basePrice: 3400 },
  { symbol: "LDG", name: "LDG Group", exchange: "HOSE", currency: "VND", basePrice: 3800 },
  { symbol: "VPI", name: "Văn Phú Invest", exchange: "HOSE", currency: "VND", basePrice: 62400 },
  { symbol: "NTL", name: "Phát triển Đô thị Từ Liêm", exchange: "HOSE", currency: "VND", basePrice: 36200 },
  { symbol: "D2D", name: "Phát triển Đô thị Công nghiệp số 2", exchange: "HOSE", currency: "VND", basePrice: 48600 },
  { symbol: "SZC", name: "Sonadezi Châu Đức", exchange: "HOSE", currency: "VND", basePrice: 38400 },
  { symbol: "TCH", name: "Tài chính Hoàng Huy", exchange: "HOSE", currency: "VND", basePrice: 16800 },
  { symbol: "CII", name: "Đầu tư Hạ tầng Kỹ thuật TP.HCM", exchange: "HOSE", currency: "VND", basePrice: 16200 },
  { symbol: "QCG", name: "Quốc Cường Gia Lai", exchange: "HOSE", currency: "VND", basePrice: 9800 },
  { symbol: "SJS", name: "Sudico", exchange: "HOSE", currency: "VND", basePrice: 32600 },
  { symbol: "API", name: "Đầu tư Châu Á - Thái Bình Dương", exchange: "HNX", currency: "VND", basePrice: 8200 },
  { symbol: "LHG", name: "Long Hậu", exchange: "HOSE", currency: "VND", basePrice: 32400 },
  { symbol: "NBB", name: "Đầu tư Năm Bảy Bảy", exchange: "HOSE", currency: "VND", basePrice: 18600 },
  { symbol: "NHA", name: "Tổng Công ty Đầu tư Phát triển Nhà và Đô thị Nam Hà Nội", exchange: "HNX", currency: "VND", basePrice: 22400 },
  { symbol: "HDC", name: "Phát triển nhà Bà Rịa - Vũng Tàu", exchange: "HOSE", currency: "VND", basePrice: 36200 },
  { symbol: "CRE", name: "Bất động sản Thế Kỷ (Cen Land)", exchange: "HOSE", currency: "VND", basePrice: 12400 },

  // Vật liệu / xây dựng công nghiệp (bổ sung)
  { symbol: "POM", name: "Thép Pomina", exchange: "HOSE", currency: "VND", basePrice: 4800 },
  { symbol: "SMC", name: "Đầu tư Thương mại SMC", exchange: "HOSE", currency: "VND", basePrice: 8600 },
  { symbol: "TLH", name: "Thép Tiến Lên", exchange: "HOSE", currency: "VND", basePrice: 6400 },
  { symbol: "VGS", name: "Ống thép Việt Đức", exchange: "HNX", currency: "VND", basePrice: 18600 },
  { symbol: "HT1", name: "Xi măng Hà Tiên 1", exchange: "HOSE", currency: "VND", basePrice: 12400 },
  { symbol: "BMP", name: "Nhựa Bình Minh", exchange: "HOSE", currency: "VND", basePrice: 112000 },
  { symbol: "AAA", name: "An Phát Bioplastics", exchange: "HOSE", currency: "VND", basePrice: 11200 },
  { symbol: "PHR", name: "Cao su Phước Hòa", exchange: "HOSE", currency: "VND", basePrice: 52400 },
  { symbol: "DPR", name: "Cao su Đồng Phú", exchange: "HOSE", currency: "VND", basePrice: 42600 },
  { symbol: "TRC", name: "Cao su Tây Ninh", exchange: "HOSE", currency: "VND", basePrice: 46800 },
  { symbol: "DRC", name: "Cao su Đà Nẵng", exchange: "HOSE", currency: "VND", basePrice: 24600 },
  { symbol: "CSM", name: "Công nghiệp Cao su Miền Nam (Casumina)", exchange: "HOSE", currency: "VND", basePrice: 13800 },
  { symbol: "BFC", name: "Phân bón Bình Điền", exchange: "HOSE", currency: "VND", basePrice: 22400 },
  { symbol: "DCM", name: "Phân bón Dầu khí Cà Mau", exchange: "HOSE", currency: "VND", basePrice: 32600 },
  { symbol: "DPM", name: "Phân bón Phú Mỹ", exchange: "HOSE", currency: "VND", basePrice: 36400 },
  { symbol: "LAS", name: "Phân bón Lâm Thao", exchange: "HNX", currency: "VND", basePrice: 18600 },
  { symbol: "HBC", name: "Xây dựng Hòa Bình", exchange: "HOSE", currency: "VND", basePrice: 8600 },
  { symbol: "CTD", name: "Coteccons", exchange: "HOSE", currency: "VND", basePrice: 62400 },
  { symbol: "FCN", name: "FECON", exchange: "HOSE", currency: "VND", basePrice: 14800 },
  { symbol: "PC1", name: "PC1 Group", exchange: "HOSE", currency: "VND", basePrice: 26400 },
  { symbol: "TV2", name: "Tư vấn Xây dựng Điện 2", exchange: "HNX", currency: "VND", basePrice: 48600 },
  { symbol: "VC3", name: "Xây dựng số 3", exchange: "HNX", currency: "VND", basePrice: 22400 },
  { symbol: "VCG", name: "Vinaconex", exchange: "HOSE", currency: "VND", basePrice: 22600 },

  // Tiêu dùng / thực phẩm (bổ sung)
  { symbol: "DBC", name: "Dabaco Việt Nam", exchange: "HOSE", currency: "VND", basePrice: 28600 },
  { symbol: "VHC", name: "Vĩnh Hoàn Corp", exchange: "HOSE", currency: "VND", basePrice: 68400 },
  { symbol: "ANV", name: "Nam Việt (Navico)", exchange: "HOSE", currency: "VND", basePrice: 22600 },
  { symbol: "BHN", name: "Habeco", exchange: "HOSE", currency: "VND", basePrice: 48600 },
  { symbol: "HAG", name: "Hoàng Anh Gia Lai", exchange: "HOSE", currency: "VND", basePrice: 11200 },
  { symbol: "HNG", name: "HAGL Agrico", exchange: "HOSE", currency: "VND", basePrice: 6200 },
  { symbol: "PAN", name: "Tập đoàn PAN", exchange: "HOSE", currency: "VND", basePrice: 22400 },
  { symbol: "BAF", name: "BAF Việt Nam", exchange: "HOSE", currency: "VND", basePrice: 28600 },
  { symbol: "LSS", name: "Mía đường Lam Sơn", exchange: "HOSE", currency: "VND", basePrice: 12400 },
  { symbol: "SBT", name: "TTC Sugar", exchange: "HOSE", currency: "VND", basePrice: 12800 },
  { symbol: "TCM", name: "Dệt may Thành Công", exchange: "HOSE", currency: "VND", basePrice: 38600 },
  { symbol: "STK", name: "Sợi Thế Kỷ", exchange: "HOSE", currency: "VND", basePrice: 28400 },
  { symbol: "GIL", name: "Gilimex", exchange: "HOSE", currency: "VND", basePrice: 22600 },
  { symbol: "MSH", name: "May Sông Hồng", exchange: "HOSE", currency: "VND", basePrice: 48600 },
  { symbol: "VGT", name: "Tập đoàn Dệt May Việt Nam (Vinatex)", exchange: "UPCOM", currency: "VND", basePrice: 14600 },
  { symbol: "PTB", name: "Phú Tài", exchange: "HOSE", currency: "VND", basePrice: 62400 },
  { symbol: "GDT", name: "Gỗ Đức Thành", exchange: "HOSE", currency: "VND", basePrice: 48600 },
  { symbol: "HAX", name: "Dịch vụ Ô tô Hàng Xanh", exchange: "HOSE", currency: "VND", basePrice: 18600 },
  { symbol: "SVC", name: "Savico", exchange: "HOSE", currency: "VND", basePrice: 42600 },
  { symbol: "SKG", name: "Superdong Kiên Giang", exchange: "HOSE", currency: "VND", basePrice: 28600 },

  // Công nghiệp / hạ tầng tổng hợp (bổ sung)
  { symbol: "REE", name: "REE Corp", exchange: "HOSE", currency: "VND", basePrice: 62400 },
  { symbol: "BCG", name: "Bamboo Capital", exchange: "HOSE", currency: "VND", basePrice: 12400 },
  { symbol: "GEE", name: "Gelex Electric", exchange: "HOSE", currency: "VND", basePrice: 48600 },
  { symbol: "HHV", name: "Đèo Cả", exchange: "HOSE", currency: "VND", basePrice: 14200 },
  { symbol: "DPG", name: "Đạt Phương", exchange: "HOSE", currency: "VND", basePrice: 48600 },
  { symbol: "VTP", name: "Viettel Post", exchange: "HOSE", currency: "VND", basePrice: 88600 },
  { symbol: "EVF", name: "Tài chính Điện lực (EVNFinance)", exchange: "HOSE", currency: "VND", basePrice: 12400 },
  { symbol: "ASM", name: "Sao Mai Group", exchange: "HOSE", currency: "VND", basePrice: 8600 },
  { symbol: "TDM", name: "Nước Thủ Dầu Một", exchange: "HOSE", currency: "VND", basePrice: 42600 },

  // Dược phẩm (bổ sung)
  { symbol: "DHG", name: "Dược Hậu Giang", exchange: "HOSE", currency: "VND", basePrice: 98600 },
  { symbol: "IMP", name: "Imexpharm", exchange: "HOSE", currency: "VND", basePrice: 62400 },
  { symbol: "DBD", name: "Bidiphar", exchange: "HOSE", currency: "VND", basePrice: 58600 },
  { symbol: "DVN", name: "Tổng Công ty Dược Việt Nam", exchange: "UPCOM", currency: "VND", basePrice: 18600 },
  { symbol: "TRA", name: "Traphaco", exchange: "HOSE", currency: "VND", basePrice: 48600 },

  // Điện / hạ tầng năng lượng (bổ sung)
  { symbol: "NT2", name: "Điện lực Dầu khí Nhơn Trạch 2", exchange: "HOSE", currency: "VND", basePrice: 22600 },
  { symbol: "PPC", name: "Nhiệt điện Phả Lại", exchange: "HOSE", currency: "VND", basePrice: 16800 },
  { symbol: "QTP", name: "Nhiệt điện Quảng Ninh", exchange: "UPCOM", currency: "VND", basePrice: 16800 },
  { symbol: "HND", name: "Nhiệt điện Hải Phòng", exchange: "UPCOM", currency: "VND", basePrice: 14600 },
  { symbol: "SBA", name: "Thủy điện - Điện lực 3 (Sông Ba)", exchange: "UPCOM", currency: "VND", basePrice: 18600 },
  { symbol: "VSH", name: "Thủy điện Vĩnh Sơn - Sông Hinh", exchange: "HOSE", currency: "VND", basePrice: 42600 },
  { symbol: "BWE", name: "Nước - Môi trường Bình Dương (Biwase)", exchange: "HOSE", currency: "VND", basePrice: 48600 },
  { symbol: "GEG", name: "Điện Gia Lai", exchange: "HOSE", currency: "VND", basePrice: 14600 },
  { symbol: "PVT", name: "Vận tải Dầu khí (PV Trans)", exchange: "HOSE", currency: "VND", basePrice: 22600 },
  { symbol: "PVC", name: "Bọc ống Dầu khí (PV Coating)", exchange: "HNX", currency: "VND", basePrice: 8600 },

  // Logistics / hàng không (bổ sung)
  { symbol: "GMD", name: "Gemadept", exchange: "HOSE", currency: "VND", basePrice: 62400 },
  { symbol: "VSC", name: "Viconship", exchange: "HOSE", currency: "VND", basePrice: 28600 },
  { symbol: "HAH", name: "Vận tải và Xếp dỡ Hải An", exchange: "HOSE", currency: "VND", basePrice: 48600 },
  { symbol: "PHP", name: "Cảng Hải Phòng", exchange: "UPCOM", currency: "VND", basePrice: 32600 },
  { symbol: "DVP", name: "Cảng Đình Vũ", exchange: "HOSE", currency: "VND", basePrice: 48600 },
  { symbol: "TMS", name: "Transimex", exchange: "HOSE", currency: "VND", basePrice: 58600 },
  { symbol: "STG", name: "Sotrans", exchange: "HOSE", currency: "VND", basePrice: 48600 },

  // Bảo hiểm (bổ sung)
  { symbol: "BMI", name: "Bảo hiểm Bảo Minh", exchange: "HOSE", currency: "VND", basePrice: 28600 },
  { symbol: "MIG", name: "Bảo hiểm Quân Đội (MIC)", exchange: "HOSE", currency: "VND", basePrice: 18600 },
  { symbol: "PTI", name: "Bảo hiểm Bưu điện", exchange: "HNX", currency: "VND", basePrice: 32600 },
  { symbol: "VNR", name: "Tổng Công ty Tái Bảo hiểm Quốc gia Việt Nam", exchange: "HNX", currency: "VND", basePrice: 22600 },

  // Công nghệ (bổ sung)
  { symbol: "ELC", name: "Elcom", exchange: "HOSE", currency: "VND", basePrice: 12400 },
  { symbol: "ITD", name: "Công nghệ Tiên Phong", exchange: "HOSE", currency: "VND", basePrice: 8600 },
  { symbol: "SAM", name: "SAM Holdings", exchange: "HOSE", currency: "VND", basePrice: 6200 },

  // UPCOM (bổ sung)
  { symbol: "MML", name: "Masan MeatLife", exchange: "UPCOM", currency: "VND", basePrice: 48600 },
  { symbol: "SIP", name: "Đầu tư Sài Gòn VRG", exchange: "UPCOM", currency: "VND", basePrice: 88600 },

  // Sàn HNX (PVS ở trên cũng niêm yết HNX — nhóm này bổ sung để "Top 10 HNX"
  // có đủ mã thay vì gần như trống)
  { symbol: "SHS", name: "Chứng khoán Sài Gòn - Hà Nội", exchange: "HNX", currency: "VND", basePrice: 20000 },
  { symbol: "MBS", name: "Chứng khoán MB", exchange: "HNX", currency: "VND", basePrice: 28000 },
  { symbol: "CEO", name: "Tập đoàn C.E.O", exchange: "HNX", currency: "VND", basePrice: 22000 },
  { symbol: "PVI", name: "Bảo hiểm PVI", exchange: "HNX", currency: "VND", basePrice: 48000 },
  { symbol: "IDC", name: "Tổng Công ty IDICO", exchange: "HNX", currency: "VND", basePrice: 58000 },
  { symbol: "TNG", name: "TNG Investment", exchange: "HNX", currency: "VND", basePrice: 24000 },
  { symbol: "VCS", name: "Vicostone", exchange: "HNX", currency: "VND", basePrice: 68000 },
  { symbol: "NTP", name: "Nhựa Tiền Phong", exchange: "HNX", currency: "VND", basePrice: 55000 },
  { symbol: "HUT", name: "Tasco", exchange: "HNX", currency: "VND", basePrice: 12000 },

  // UPCOM
  { symbol: "ACV", name: "Tổng Công ty Cảng hàng không Việt Nam", exchange: "UPCOM", currency: "VND", basePrice: 118000 },
  { symbol: "VGI", name: "Viettel Global", exchange: "UPCOM", currency: "VND", basePrice: 68500 },
  { symbol: "MCH", name: "Masan Consumer", exchange: "UPCOM", currency: "VND", basePrice: 205000 },
  { symbol: "BSR", name: "Lọc hóa dầu Bình Sơn", exchange: "UPCOM", currency: "VND", basePrice: 22400 },
  { symbol: "OIL", name: "PV OIL", exchange: "UPCOM", currency: "VND", basePrice: 13800 },
  { symbol: "VEA", name: "VEAM Corp", exchange: "UPCOM", currency: "VND", basePrice: 39700 },
  { symbol: "QNS", name: "Đường Quảng Ngãi", exchange: "UPCOM", currency: "VND", basePrice: 48200 },
  { symbol: "FOX", name: "FPT Telecom", exchange: "UPCOM", currency: "VND", basePrice: 62300 },
];

export function findSeed(symbol: string): StockSeed | undefined {
  return STOCK_UNIVERSE.find((s) => s.symbol.toUpperCase() === symbol.toUpperCase());
}
