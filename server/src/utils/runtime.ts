// Trên Cloudflare Workers, một Promise tạo trong request A không thể được
// request B chờ ("This promise was created by a request that has since ended").
// Ở đó tắt việc dùng chung Promise đang chạy giữa các request; chỉ chia sẻ giá trị đã xong.
export const SHARE_INFLIGHT =
  typeof navigator === "undefined" || (navigator as { userAgent?: string }).userAgent !== "Cloudflare-Workers";
