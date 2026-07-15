import { Exchange, StockMeta, TvTab } from "./types";

// Curated list of liquid, widely-followed Vietnamese tickers (VN30 + notable
// HNX/UPCOM names). This powers the price board, search and watchlist.
// It is static metadata only (symbol/name/exchange/industry) — prices are
// always fetched live, never hardcoded.
export const STOCKS: StockMeta[] = [
  { symbol: "ACB", name: "Ngân hàng TMCP Á Châu", exchange: "HOSE", industry: "Ngân hàng" },
  { symbol: "BCM", name: "Tổng Công ty Đầu tư và Phát triển Công nghiệp", exchange: "HOSE", industry: "Bất động sản KCN" },
  { symbol: "BID", name: "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam", exchange: "HOSE", industry: "Ngân hàng" },
  { symbol: "BVH", name: "Tập đoàn Bảo Việt", exchange: "HOSE", industry: "Bảo hiểm" },
  { symbol: "CTG", name: "Ngân hàng TMCP Công Thương Việt Nam", exchange: "HOSE", industry: "Ngân hàng" },
  { symbol: "FPT", name: "Công ty CP FPT", exchange: "HOSE", industry: "Công nghệ" },
  { symbol: "GAS", name: "Tổng Công ty Khí Việt Nam", exchange: "HOSE", industry: "Dầu khí" },
  { symbol: "GVR", name: "Tập đoàn Công nghiệp Cao su Việt Nam", exchange: "HOSE", industry: "Cao su" },
  { symbol: "HDB", name: "Ngân hàng TMCP Phát triển TP.HCM", exchange: "HOSE", industry: "Ngân hàng" },
  { symbol: "HPG", name: "Tập đoàn Hòa Phát", exchange: "HOSE", industry: "Thép" },
  { symbol: "MBB", name: "Ngân hàng TMCP Quân đội", exchange: "HOSE", industry: "Ngân hàng" },
  { symbol: "MSN", name: "Tập đoàn Masan", exchange: "HOSE", industry: "Hàng tiêu dùng" },
  { symbol: "MWG", name: "Công ty CP Đầu tư Thế Giới Di Động", exchange: "HOSE", industry: "Bán lẻ" },
  { symbol: "PLX", name: "Tập đoàn Xăng dầu Việt Nam", exchange: "HOSE", industry: "Dầu khí" },
  { symbol: "POW", name: "Tổng Công ty Điện lực Dầu khí Việt Nam", exchange: "HOSE", industry: "Điện" },
  { symbol: "SAB", name: "Tổng CP Bia - Rượu - NGK Sài Gòn", exchange: "HOSE", industry: "Đồ uống" },
  { symbol: "SHB", name: "Ngân hàng TMCP Sài Gòn - Hà Nội", exchange: "HOSE", industry: "Ngân hàng" },
  { symbol: "SSB", name: "Ngân hàng TMCP Đông Nam Á", exchange: "HOSE", industry: "Ngân hàng" },
  { symbol: "SSI", name: "Công ty CP Chứng khoán SSI", exchange: "HOSE", industry: "Chứng khoán" },
  { symbol: "STB", name: "Ngân hàng TMCP Sài Gòn Thương Tín", exchange: "HOSE", industry: "Ngân hàng" },
  { symbol: "TCB", name: "Ngân hàng TMCP Kỹ Thương Việt Nam", exchange: "HOSE", industry: "Ngân hàng" },
  { symbol: "TPB", name: "Ngân hàng TMCP Tiên Phong", exchange: "HOSE", industry: "Ngân hàng" },
  { symbol: "VCB", name: "Ngân hàng TMCP Ngoại thương Việt Nam", exchange: "HOSE", industry: "Ngân hàng" },
  { symbol: "VHM", name: "Công ty CP Vinhomes", exchange: "HOSE", industry: "Bất động sản" },
  { symbol: "VIB", name: "Ngân hàng TMCP Quốc tế Việt Nam", exchange: "HOSE", industry: "Ngân hàng" },
  { symbol: "VIC", name: "Tập đoàn Vingroup", exchange: "HOSE", industry: "Bất động sản" },
  { symbol: "VJC", name: "Công ty CP Hàng không Vietjet", exchange: "HOSE", industry: "Hàng không" },
  { symbol: "VNM", name: "Công ty CP Sữa Việt Nam - Vinamilk", exchange: "HOSE", industry: "Hàng tiêu dùng" },
  { symbol: "VPB", name: "Ngân hàng TMCP Việt Nam Thịnh Vượng", exchange: "HOSE", industry: "Ngân hàng" },
  { symbol: "VRE", name: "Công ty CP Vincom Retail", exchange: "HOSE", industry: "Bất động sản bán lẻ" },
  { symbol: "DGC", name: "Công ty CP Tập đoàn Hóa chất Đức Giang", exchange: "HOSE", industry: "Hóa chất" },
  { symbol: "DIG", name: "Tổng CP Đầu tư Phát triển Xây dựng", exchange: "HOSE", industry: "Bất động sản" },
  { symbol: "DXG", name: "Công ty CP Tập đoàn Đất Xanh", exchange: "HOSE", industry: "Bất động sản" },
  { symbol: "KDH", name: "Công ty CP Đầu tư và Kinh doanh Nhà Khang Điền", exchange: "HOSE", industry: "Bất động sản" },
  { symbol: "NVL", name: "Công ty CP Tập đoàn Đầu tư Địa ốc No Va", exchange: "HOSE", industry: "Bất động sản" },
  { symbol: "PDR", name: "Công ty CP Phát triển Bất động sản Phát Đạt", exchange: "HOSE", industry: "Bất động sản" },
  { symbol: "PNJ", name: "Công ty CP Vàng bạc Đá quý Phú Nhuận", exchange: "HOSE", industry: "Bán lẻ" },
  { symbol: "REE", name: "Công ty CP Cơ Điện Lạnh", exchange: "HOSE", industry: "Công nghiệp" },
  { symbol: "GEX", name: "Công ty CP Tập đoàn Gelex", exchange: "HOSE", industry: "Công nghiệp" },
  { symbol: "HSG", name: "Công ty CP Tập đoàn Hoa Sen", exchange: "HOSE", industry: "Thép" },
  { symbol: "SHS", name: "Công ty CP Chứng khoán Sài Gòn - Hà Nội", exchange: "HNX", industry: "Chứng khoán" },
  { symbol: "PVS", name: "Tổng CP Dịch vụ Kỹ thuật Dầu khí VN", exchange: "HNX", industry: "Dầu khí" },
  { symbol: "CEO", name: "Công ty CP Tập đoàn C.E.O", exchange: "HNX", industry: "Bất động sản" },
  { symbol: "IDC", name: "Tổng CP IDICO", exchange: "HNX", industry: "Bất động sản KCN" },
  { symbol: "THD", name: "Công ty CP Thaiholdings", exchange: "HNX", industry: "Đa ngành" },
  { symbol: "VCS", name: "Công ty CP Vicostone", exchange: "HNX", industry: "Vật liệu xây dựng" },
  { symbol: "NTP", name: "Công ty CP Nhựa Thiếu Niên Tiền Phong", exchange: "HNX", industry: "Nhựa" },
  { symbol: "ACV", name: "Tổng Công ty Cảng hàng không Việt Nam", exchange: "UPCOM", industry: "Hàng không" },
  { symbol: "BSR", name: "Công ty CP Lọc Hóa dầu Bình Sơn", exchange: "UPCOM", industry: "Dầu khí" },
  { symbol: "VEA", name: "Tổng Công ty Máy động lực và Máy nông nghiệp VN", exchange: "UPCOM", industry: "Công nghiệp" },
  { symbol: "VGT", name: "Tập đoàn Dệt May Việt Nam", exchange: "UPCOM", industry: "Dệt may" },
  { symbol: "QNS", name: "Công ty CP Đường Quảng Ngãi", exchange: "UPCOM", industry: "Hàng tiêu dùng" },
];

export const STOCK_MAP: Record<string, StockMeta> = Object.fromEntries(
  STOCKS.map((s) => [s.symbol, s])
);

export function findStock(symbol: string): StockMeta | undefined {
  return STOCK_MAP[symbol.toUpperCase()];
}

export function searchStocks(query: string, limit = 8): StockMeta[] {
  const q = query.trim().toUpperCase();
  if (!q) return [];
  const bySymbol = STOCKS.filter((s) => s.symbol.startsWith(q));
  const byName = STOCKS.filter(
    (s) => !s.symbol.startsWith(q) && s.name.toUpperCase().includes(q)
  );
  return [...bySymbol, ...byName].slice(0, limit);
}

/** TradingView symbol format: "EXCHANGE:SYMBOL". */
export function tvSymbol(meta: Pick<StockMeta, "symbol" | "exchange">): string {
  return `${meta.exchange}:${meta.symbol}`;
}

const EXCHANGE_ORDER: Exchange[] = ["HOSE", "HNX", "UPCOM"];

/** Groups stocks into one TradingView Market Overview tab per exchange. */
export function buildExchangeTabs(stocks: StockMeta[]): TvTab[] {
  return EXCHANGE_ORDER.map((exchange) => ({
    title: exchange,
    symbols: stocks
      .filter((s) => s.exchange === exchange)
      .map((s) => ({ s: tvSymbol(s), d: s.name })),
  })).filter((tab) => tab.symbols.length > 0);
}

export const INDEX_TABS: TvTab[] = [
  {
    title: "Chỉ số",
    symbols: [
      { s: "HOSE:VNINDEX", d: "VN-Index" },
      { s: "HNX:HNXINDEX", d: "HNX-Index" },
      { s: "HNX:301", d: "UPCOM-Index" },
    ],
  },
];
