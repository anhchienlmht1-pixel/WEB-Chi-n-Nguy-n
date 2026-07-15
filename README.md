# Chiến Nguyễn Invest

Web xem giá chứng khoán Việt Nam theo phong cách sstock.vn: tổng quan thị trường, bảng giá, biểu đồ giá và danh mục theo dõi cá nhân. Xây bằng Next.js (App Router) + TypeScript + Tailwind CSS.

## Tính năng

- **Tổng quan thị trường**: VN-Index, HNX-Index, UPCOM-Index thời gian thực.
- **Bảng giá**: cổ phiếu theo sàn (HOSE/HNX/UPCOM), giá/%/khối lượng cập nhật trực tiếp.
- **Chi tiết cổ phiếu**: biểu đồ nến TradingView thời gian thực, thông tin cơ bản công ty; giá mở/cao/thấp/khối lượng/trần/sàn/tham chiếu (tính theo biên độ dao động của từng sàn) lấy từ VNDirect.
- **Tìm kiếm** mã CK / tên công ty.
- **Danh mục theo dõi**: lưu trên trình duyệt (localStorage), không cần đăng nhập. Thêm/bớt mã bằng biểu tượng ngôi sao ở trang chi tiết mã.
- **Giao diện Sáng/Tối**: nút chuyển đổi ở header, lưu lựa chọn trên trình duyệt, không nháy màn hình khi tải lại trang.

## Nguồn dữ liệu

- **Chỉ số thị trường, bảng giá, danh mục theo dõi**: dùng widget "Market Overview" chính thức của TradingView (`TradingViewMarketOverview.tsx`), load trực tiếp từ trình duyệt người dùng tới tradingview.com — không qua server, nên không bị ảnh hưởng bởi việc các nguồn dữ liệu VN (VNDirect/TCBS) chặn request tự động (bot protection). TradingView không có cột Trần/Sàn/Tham chiếu (khái niệm riêng của thị trường VN).
- **Biểu đồ nến & giá chi tiết (trang chi tiết mã)**: biểu đồ dùng widget "Advanced Real-Time Chart" của TradingView (`TradingViewChart.tsx`); các số liệu mở/cao/thấp/khối lượng/trần/sàn/tham chiếu lấy từ API công khai của VNDirect (`dchart-api.vndirect.com.vn`, qua `src/app/api/quotes`), không cần API key.

> Lưu ý: môi trường phát triển dùng để tạo dự án này có chính sách mạng chặn truy cập ra ngoài tới các host bên ngoài (VNDirect, TradingView...), nên không thể kiểm thử trực tiếp các lệnh gọi này tại đây. Khi chạy ở máy của bạn hoặc triển khai lên Vercel/hosting khác, dữ liệu sẽ được tải bình thường. Nếu VNDirect thay đổi cấu trúc phản hồi API, cần cập nhật lại `src/lib/vndirect.ts`.

## Bắt đầu

```bash
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000).

## Cấu trúc chính

```
src/
  app/
    page.tsx                 Trang tổng quan
    bang-gia/                Bảng giá
    co-phieu/[symbol]/       Chi tiết cổ phiếu
    danh-muc/                Danh mục theo dõi
    api/quotes/               Route handler proxy giá chi tiết từ VNDirect
  components/                Header, ThemeToggle, TradingViewMarketOverview,
                              TradingViewChart, StockDetail, ô tìm kiếm...
  lib/
    vndirect.ts               Client gọi API VNDirect (server-only)
    market.ts                 Quy tắc trần/sàn và màu sắc theo sàn
    symbols.ts                Danh sách mã cổ phiếu tĩnh + helper tab TradingView
    watchlist.ts               Hook quản lý danh mục theo dõi (localStorage)
    theme.tsx                  ThemeProvider + hook đổi giao diện Sáng/Tối
```
