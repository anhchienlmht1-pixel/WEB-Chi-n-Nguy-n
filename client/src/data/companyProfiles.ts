// Static reference profiles for the 43 covered symbols (27 banks + 16
// securities companies). cafef.vn is unreachable from this build
// environment (network egress policy), so this was compiled from general
// public knowledge instead of scraped — deliberately sparse: a field is
// omitted wherever it couldn't be stated with confidence, and the UI
// hides missing fields rather than guessing. Financial figures shown next
// to this info come from the user's own Excel exports, not from here.
export interface CompanyProfile {
  fullName: string;
  website?: string;
  founded?: number;
  headquarters?: string;
  description?: string;
}

export const COMPANY_PROFILES: Record<string, CompanyProfile> = {
  // ---- Banks ----
  VCB: {
    fullName: "Ngân hàng TMCP Ngoại thương Việt Nam",
    website: "vietcombank.com.vn",
    founded: 1963,
    headquarters: "Hà Nội",
    description:
      "Một trong bốn ngân hàng quốc doanh lớn nhất Việt Nam, dẫn đầu về thanh toán quốc tế, ngoại hối và chất lượng tài sản.",
  },
  BID: {
    fullName: "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam",
    website: "bidv.com.vn",
    founded: 1957,
    headquarters: "Hà Nội",
    description: "Ngân hàng có tổng tài sản lớn nhất hệ thống, tiền thân là Ngân hàng Kiến thiết Việt Nam.",
  },
  CTG: {
    fullName: "Ngân hàng TMCP Công Thương Việt Nam",
    website: "vietinbank.vn",
    founded: 1988,
    headquarters: "Hà Nội",
    description: "Ngân hàng quốc doanh quy mô lớn, mạng lưới phủ khắp cả nước, cổ đông chiến lược là MUFG (Nhật Bản).",
  },
  TCB: {
    fullName: "Ngân hàng TMCP Kỹ Thương Việt Nam",
    website: "techcombank.com.vn",
    founded: 1993,
    headquarters: "Hà Nội",
    description: "Ngân hàng tư nhân hàng đầu về khách hàng doanh nghiệp lớn, trái phiếu và tỷ lệ CASA.",
  },
  VPB: {
    fullName: "Ngân hàng TMCP Việt Nam Thịnh Vượng",
    website: "vpbank.com.vn",
    founded: 1993,
    headquarters: "Hà Nội",
    description:
      "Ngân hàng tư nhân có vốn chủ sở hữu thuộc nhóm lớn nhất hệ thống, sở hữu FE Credit và cổ đông chiến lược SMBC (Nhật Bản).",
  },
  MBB: {
    fullName: "Ngân hàng TMCP Quân Đội",
    website: "mbbank.com.vn",
    founded: 1994,
    headquarters: "Hà Nội",
    description: "Ngân hàng đa năng với hệ sinh thái tài chính (chứng khoán MBS, bảo hiểm MIC), CASA thuộc nhóm cao nhất.",
  },
  ACB: {
    fullName: "Ngân hàng TMCP Á Châu",
    website: "acb.com.vn",
    founded: 1993,
    headquarters: "TP. Hồ Chí Minh",
    description: "Ngân hàng bán lẻ hàng đầu phía Nam, nổi bật về chất lượng tài sản và quản trị rủi ro thận trọng.",
  },
  LPB: {
    fullName: "Ngân hàng TMCP Lộc Phát Việt Nam",
    website: "lpbank.com.vn",
    headquarters: "Hà Nội",
    description: "Tiền thân là LienVietPostBank, có lợi thế mạng lưới qua hệ thống bưu điện rộng khắp.",
  },
  HDB: {
    fullName: "Ngân hàng TMCP Phát triển TP. Hồ Chí Minh",
    website: "hdbank.com.vn",
    headquarters: "TP. Hồ Chí Minh",
    description: "Ngân hàng tăng trưởng nhanh thuộc hệ sinh thái Sovico, sở hữu công ty tài chính tiêu dùng HD Saison.",
  },
  STB: {
    fullName: "Ngân hàng TMCP Sài Gòn Thương Tín",
    website: "sacombank.com.vn",
    founded: 1991,
    headquarters: "TP. Hồ Chí Minh",
    description: "Ngân hàng bán lẻ với mạng lưới lớn phía Nam, đang hoàn tất giai đoạn tái cơ cấu sau sáp nhập Southern Bank.",
  },
  VIB: {
    fullName: "Ngân hàng TMCP Quốc tế Việt Nam",
    website: "vib.com.vn",
    founded: 1996,
    description: "Ngân hàng tập trung bán lẻ, dẫn đầu thị phần cho vay mua ô tô, cổ đông chiến lược CBA (Úc).",
  },
  TPB: {
    fullName: "Ngân hàng TMCP Tiên Phong",
    website: "tpb.vn",
    founded: 2008,
    headquarters: "Hà Nội",
    description: "Ngân hàng số tiên phong với hệ thống LiveBank, hậu thuẫn bởi Tập đoàn DOJI và FPT.",
  },
  EIB: {
    fullName: "Ngân hàng TMCP Xuất Nhập khẩu Việt Nam",
    website: "eximbank.com.vn",
    founded: 1989,
    headquarters: "TP. Hồ Chí Minh",
    description: "Một trong những ngân hàng TMCP đầu tiên của Việt Nam, thế mạnh truyền thống về tài trợ xuất nhập khẩu.",
  },
  SHB: {
    fullName: "Ngân hàng TMCP Sài Gòn - Hà Nội",
    website: "shb.com.vn",
    founded: 1993,
    headquarters: "Hà Nội",
    description: "Ngân hàng quy mô lớn gắn với hệ sinh thái T&T Group.",
  },
  MSB: {
    fullName: "Ngân hàng TMCP Hàng Hải Việt Nam",
    website: "msb.com.vn",
    founded: 1991,
    headquarters: "Hà Nội",
    description: "Ngân hàng TMCP đầu tiên thành lập sau Pháp lệnh ngân hàng 1990, tiền thân là Maritime Bank.",
  },
  OCB: {
    fullName: "Ngân hàng TMCP Phương Đông",
    website: "ocb.com.vn",
    founded: 1996,
    headquarters: "TP. Hồ Chí Minh",
    description: "Ngân hàng tầm trung hiệu quả cao, cổ đông chiến lược Aozora Bank (Nhật Bản).",
  },
  SSB: {
    fullName: "Ngân hàng TMCP Đông Nam Á",
    website: "seabank.com.vn",
    founded: 1994,
    headquarters: "Hà Nội",
    description: "Ngân hàng bán lẻ gắn với hệ sinh thái BRG Group.",
  },
  NAB: {
    fullName: "Ngân hàng TMCP Nam Á",
    website: "namabank.com.vn",
    founded: 1992,
    headquarters: "TP. Hồ Chí Minh",
    description: "Ngân hàng tầm trung tăng trưởng nhanh, niêm yết HOSE từ 2024.",
  },
  BAB: {
    fullName: "Ngân hàng TMCP Bắc Á",
    website: "baca-bank.vn",
    founded: 1994,
    headquarters: "Nghệ An",
    description: "Ngân hàng gắn với tư vấn đầu tư cho hệ sinh thái TH Group, hội sở tại Nghệ An.",
  },
  ABB: {
    fullName: "Ngân hàng TMCP An Bình",
    website: "abbank.vn",
    founded: 1993,
    description: "Ngân hàng tầm trung, cổ đông lớn gồm Geleximco và Maybank (Malaysia).",
  },
  PGB: {
    fullName: "Ngân hàng TMCP Thịnh vượng và Phát triển",
    website: "pgbank.com.vn",
    description: "Tiền thân là PG Bank thuộc Petrolimex, đổi chủ sở hữu và nhận diện thương hiệu từ 2023.",
  },
  BVB: {
    fullName: "Ngân hàng TMCP Bản Việt",
    website: "bvbank.net.vn",
    headquarters: "TP. Hồ Chí Minh",
    description: "Ngân hàng quy mô nhỏ định hướng bán lẻ, thương hiệu BVBank từ 2023.",
  },
  VBB: {
    fullName: "Ngân hàng TMCP Việt Nam Thương Tín",
    website: "vietbank.com.vn",
    headquarters: "Sóc Trăng",
    description: "Ngân hàng quy mô nhỏ, hội sở đăng ký tại Sóc Trăng, hoạt động chính tại TP.HCM.",
  },
  VAB: {
    fullName: "Ngân hàng TMCP Việt Á",
    website: "vietabank.com.vn",
    description: "Ngân hàng quy mô nhỏ, hình thành từ hợp nhất Công ty tài chính Sài Gòn và Ngân hàng Đà Nẵng.",
  },
  NVB: {
    fullName: "Ngân hàng TMCP Quốc Dân",
    website: "ncb-bank.vn",
    founded: 1995,
    headquarters: "Hà Nội",
    description: "Tiền thân là Navibank, đang trong quá trình tái cơ cấu theo đề án được phê duyệt.",
  },
  KLB: {
    fullName: "Ngân hàng TMCP Kiên Long",
    website: "kienlongbank.com.vn",
    founded: 1995,
    headquarters: "Kiên Giang",
    description: "Ngân hàng quy mô nhỏ xuất phát từ nông thôn Đồng bằng sông Cửu Long.",
  },
  SGB: {
    fullName: "Ngân hàng TMCP Sài Gòn Công Thương",
    website: "saigonbank.com.vn",
    founded: 1987,
    headquarters: "TP. Hồ Chí Minh",
    description: "Ngân hàng TMCP thành lập sớm nhất Việt Nam, quy mô nhỏ, cổ đông chính là các đơn vị thuộc Thành ủy TP.HCM.",
  },

  // ---- Securities companies ----
  SSI: {
    fullName: "Công ty CP Chứng khoán SSI",
    website: "ssi.com.vn",
    founded: 1999,
    headquarters: "TP. Hồ Chí Minh",
    description:
      "Công ty chứng khoán tư nhân đầu tiên và thuộc nhóm lớn nhất Việt Nam về vốn, thị phần môi giới và ngân hàng đầu tư.",
  },
  VND: {
    fullName: "Công ty CP Chứng khoán VNDIRECT",
    website: "vndirect.com.vn",
    founded: 2006,
    headquarters: "Hà Nội",
    description: "Công ty chứng khoán bán lẻ quy mô lớn với nền tảng giao dịch trực tuyến phổ biến.",
  },
  HCM: {
    fullName: "Công ty CP Chứng khoán TP. Hồ Chí Minh (HSC)",
    website: "hsc.com.vn",
    founded: 2003,
    headquarters: "TP. Hồ Chí Minh",
    description: "Công ty chứng khoán lâu đời với thế mạnh môi giới tổ chức và khối khách hàng nước ngoài.",
  },
  VCI: {
    fullName: "Công ty CP Chứng khoán Vietcap",
    website: "vietcap.com.vn",
    founded: 2007,
    headquarters: "TP. Hồ Chí Minh",
    description: "Dẫn đầu mảng ngân hàng đầu tư (IB) và môi giới tổ chức, tiền thân là Chứng khoán Bản Việt (VCSC).",
  },
  VIX: {
    fullName: "Công ty CP Chứng khoán VIX",
    description: "Công ty chứng khoán có tỷ trọng tự doanh lớn trong cơ cấu lợi nhuận.",
  },
  MBS: {
    fullName: "Công ty CP Chứng khoán MB",
    website: "mbs.com.vn",
    founded: 2000,
    headquarters: "Hà Nội",
    description: "Thành viên của MB Group, thế mạnh môi giới bán lẻ và phân tích.",
  },
  FTS: {
    fullName: "Công ty CP Chứng khoán FPT",
    website: "fpts.com.vn",
    founded: 2007,
    headquarters: "Hà Nội",
    description: "Công ty chứng khoán thuộc hệ sinh thái FPT, chi phí vận hành thấp nhờ nền tảng công nghệ tự phát triển.",
  },
  SHS: {
    fullName: "Công ty CP Chứng khoán Sài Gòn - Hà Nội",
    website: "shs.com.vn",
    founded: 2007,
    headquarters: "Hà Nội",
    description: "Công ty chứng khoán liên kết với SHB, hoạt động mạnh về tự doanh và trái phiếu.",
  },
  BSI: {
    fullName: "Công ty CP Chứng khoán BIDV",
    website: "bsc.com.vn",
    founded: 1999,
    headquarters: "Hà Nội",
    description: "Công ty chứng khoán thuộc BIDV, cổ đông chiến lược Hana Securities (Hàn Quốc).",
  },
  DSE: {
    fullName: "Công ty CP Chứng khoán DNSE",
    website: "dnse.com.vn",
    headquarters: "Hà Nội",
    description: "Công ty chứng khoán số định hướng công nghệ, niêm yết HOSE từ 2024.",
  },
  CTS: {
    fullName: "Công ty CP Chứng khoán Ngân hàng Công Thương Việt Nam",
    website: "cts.vn",
    founded: 2000,
    headquarters: "Hà Nội",
    description: "Công ty chứng khoán thuộc VietinBank.",
  },
  VDS: {
    fullName: "Công ty CP Chứng khoán Rồng Việt",
    website: "vdsc.com.vn",
    founded: 2006,
    headquarters: "TP. Hồ Chí Minh",
    description: "Công ty chứng khoán tầm trung với thế mạnh phân tích và môi giới bán lẻ phía Nam.",
  },
  ORS: {
    fullName: "Công ty CP Chứng khoán Tiên Phong",
    description: "Công ty chứng khoán liên kết với TPBank, hoạt động mạnh mảng trái phiếu doanh nghiệp.",
  },
  VCK: {
    fullName: "Công ty CP Chứng khoán VPS",
    website: "vps.com.vn",
    headquarters: "Hà Nội",
    description: "Công ty chứng khoán giữ thị phần môi giới cổ phiếu và phái sinh số 1 thị trường nhiều năm liền.",
  },
  VPX: {
    fullName: "Công ty CP Chứng khoán VPBank",
    website: "vpbanks.com.vn",
    headquarters: "Hà Nội",
    description: "Công ty chứng khoán thuộc VPBank, tái ra mắt từ 2022 với quy mô vốn chủ thuộc nhóm lớn nhất ngành.",
  },
  TCX: {
    fullName: "Công ty CP Chứng khoán Kỹ Thương (TCBS)",
    website: "tcbs.com.vn",
    headquarters: "Hà Nội",
    description:
      "Công ty chứng khoán thuộc Techcombank, dẫn đầu về lợi nhuận toàn ngành với thế mạnh trái phiếu và quản lý gia sản.",
  },
};
