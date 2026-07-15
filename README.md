# Chiến Nguyễn Invest

Web xem giá chứng khoán Việt Nam theo phong cách sstock.vn: tổng quan thị trường, bảng giá, biểu đồ giá và danh mục theo dõi cá nhân. Xây bằng Next.js (App Router) + TypeScript + Tailwind CSS.

## Tính năng

- **Tổng quan thị trường**: VN-Index, HNX-Index, UPCOM-Index kèm biểu đồ mini, danh sách mã tăng/giảm mạnh nhất.
- **Bảng giá**: danh sách cổ phiếu theo sàn (HOSE/HNX/UPCOM), có thể sắp xếp theo giá/%/khối lượng, tô màu theo quy ước riêng của trang (xanh lá = tăng, đỏ = giảm, vàng = giá tham chiếu, tím = giá trần, xanh lam = giá sàn).
- **Chi tiết cổ phiếu**: biểu đồ TradingView thời gian thực (nhúng trực tiếp từ tradingview.com), giá mở/cao/thấp/khối lượng, giá trần/sàn/tham chiếu tính theo biên độ dao động của từng sàn.
- **Tìm kiếm** mã CK / tên công ty.
- **Danh mục theo dõi**: lưu trên trình duyệt (localStorage), không cần đăng nhập.

## Nguồn dữ liệu

- **Bảng giá & bảng chỉ số**: giá được lấy theo thời gian thực từ API công khai của VNDirect (`dchart-api.vndirect.com.vn`), không cần API key. Fetch qua các Route Handler phía server (`src/app/api/*`) để tránh CORS. Danh sách mã cổ phiếu (tên công ty, sàn, ngành) là dữ liệu tĩnh trong `src/lib/symbols.ts`.
- **Biểu đồ giá (trang chi tiết mã)**: dùng widget "Advanced Real-Time Chart" chính thức của TradingView (`TradingViewChart.tsx`), load trực tiếp từ trình duyệt người dùng tới tradingview.com — không qua server, nên không bị ảnh hưởng bởi việc VNDirect/TCBS chặn request tự động (bot protection).

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
    api/                     Route handlers proxy dữ liệu VNDirect
  components/                Header, bảng giá, TradingViewChart, sparkline, ô tìm kiếm...
  lib/
    vndirect.ts               Client gọi API VNDirect (server-only)
    market.ts                 Quy tắc trần/sàn và màu sắc theo sàn
    symbols.ts                Danh sách mã cổ phiếu tĩnh
    watchlist.ts               Hook quản lý danh mục theo dõi (localStorage)
```
