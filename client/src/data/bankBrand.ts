// Màu chủ đạo trong nhận diện thương hiệu (logo) của từng ngân hàng, dùng tô
// cột biểu đồ để người xem nhận ra ngân hàng nhanh hơn. Mã màu lấy gần đúng
// theo logo hiện hành; nhãn mã ngân hàng vẫn luôn hiện dưới mỗi cột nên không
// phụ thuộc vào màu để phân biệt.
export const BANK_BRAND: Record<string, string> = {
  VCB: "#00703C", // Vietcombank: xanh lá
  BID: "#00796B", // BIDV: xanh ngọc
  CTG: "#0067AC", // VietinBank: xanh dương
  TCB: "#E31837", // Techcombank: đỏ
  VPB: "#00A651", // VPBank: xanh lá tươi
  MBB: "#1E3A9E", // MB: xanh dương đậm
  ACB: "#2155A3", // ACB: xanh dương
  HDB: "#ED1C24", // HDBank: đỏ
  STB: "#0072BC", // Sacombank: xanh dương
  SHB: "#F7941D", // SHB: cam
  LPB: "#F26F21", // LPBank: cam
  VIB: "#005BAA", // VIB: xanh dương (kèm cam)
  TPB: "#6A2C8E", // TPBank: tím
  EIB: "#00529B", // Eximbank: xanh dương
  MSB: "#E2231A", // MSB: đỏ
  OCB: "#008C44", // OCB: xanh lá
};
