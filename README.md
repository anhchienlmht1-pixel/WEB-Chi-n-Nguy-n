# StockDash — Trang web theo dõi chứng khoán

Ứng dụng theo dõi giá cổ phiếu theo thời gian thực gồm 3 phần:

- **`client/`** — React + TypeScript + Vite + Tailwind CSS, hỗ trợ giao diện sáng/tối; biểu đồ ở trang chi tiết dùng widget chính thức của TradingView (tải trực tiếp trong trình duyệt người xem, không qua backend).
- **`server/`** — Express (TypeScript), dùng khi tự host (VPS, Render, Railway, Docker...).
- **`api/`** — cùng logic đó viết dưới dạng Vercel Serverless Functions, dùng khi deploy trên Vercel (Vercel không chạy Express thường trú được).

Cả hai đều dùng chung code trong `server/src/providers/` — sửa 1 nơi, cả 2 cách deploy đều cập nhật.

## Nguồn dữ liệu (pluggable — cắm bất kỳ API nào)

Ứng dụng chỉ hiển thị **cổ phiếu thị trường Việt Nam** (danh sách ~50 mã HOSE/HNX tiêu biểu trong `server/src/providers/universe.ts`). Backend được thiết kế theo interface `StockProvider` (`server/src/providers/types.ts`), chọn provider qua biến môi trường `DATA_PROVIDER`:

| Provider | Giá trị `DATA_PROVIDER` | Cần xác thực | Ghi chú |
|---|---|---|---|
| TradingView | `tradingview` (mặc định) | Không | Bảng giá lấy từ scanner công khai của TradingView cho thị trường VN (`scanner.tradingview.com/vietnam/scan`) — 1 request cho cả bảng, không cần token. Biểu đồ ở trang chi tiết dùng widget nhúng chính thức của TradingView. |
| FireAnt | `fireant` | Có — `FIREANT_TOKEN` | Dữ liệu thật từ FireAnt (fireant.vn). Cần token Bearer (xem cách lấy bên dưới). |
| VNDirect | `vndirect` | Không | Dữ liệu thật từ VNDirect, không cần token. |
| Dữ liệu giả lập | `mock` | Không | Random-walk quanh giá tham khảo, dùng khi dev offline |
| Yahoo Finance | `yahoo` | Không | Chủ yếu cho mã Mỹ, giữ lại như lựa chọn phụ |
| Alpha Vantage | `alphavantage` | Có — API key | Chủ yếu cho mã Mỹ, lấy key miễn phí tại alphavantage.co |
| Finnhub | `finnhub` | Có — API key | Chủ yếu cho mã Mỹ, lấy key miễn phí tại finnhub.io |

### Cách lấy `FIREANT_TOKEN`

1. Đăng nhập vào **https://fireant.vn** (tài khoản miễn phí).
2. Mở **DevTools** (F12) → tab **Network**.
3. Bấm vào một mã cổ phiếu bất kỳ để trang gọi API. Tìm request tới `restv2.fireant.vn`.
4. Trong request đó, xem mục **Request Headers**, copy giá trị của `Authorization: Bearer <chuỗi_dài>` — chỉ lấy phần `<chuỗi_dài>` (bỏ chữ `Bearer`).
5. Dán chuỗi đó vào biến môi trường `FIREANT_TOKEN` (trong `server/.env` khi chạy local, hoặc trong Vercel → Settings → Environment Variables).

> Token FireAnt là JWT có hạn sử dụng. Khi hết hạn, API sẽ trả lỗi 401/403 và trang báo "FireAnt từ chối token" — chỉ cần lấy token mới theo các bước trên.

Muốn dùng nguồn khác (SSI iBoard, TCBS, Twelve Data, Polygon.io, v.v.) chỉ cần thêm 1 file trong `server/src/providers/` cài đặt interface `StockProvider` rồi đăng ký trong `server/src/providers/index.ts`.

Copy `server/.env.example` thành `server/.env` rồi chỉnh:

```
DATA_PROVIDER=tradingview
WATCHLIST_SYMBOLS=
PORT=4000
```

> Lưu ý: môi trường sandbox dùng để phát triển phiên bản này chặn toàn bộ kết nối mạng ra ngoài, nên các provider dữ liệu thật (`tradingview`/`fireant`/`vndirect`/...) **chưa được gọi thử với dữ liệu thật ở đây** — chỉ `mock` được kiểm thử trực tiếp. Provider `tradingview` dùng scanner endpoint công khai (không tài liệu chính thức) mà chính trang markets của TradingView sử dụng; riêng **biểu đồ ở trang chi tiết là widget nhúng chính thức của TradingView**, chạy hoàn toàn phía trình duyệt nên không phụ thuộc backend. Sau khi deploy lên Vercel, nếu bảng giá lỗi, trang sẽ hiển thị thông báo lỗi cụ thể — đổi tạm `DATA_PROVIDER=vndirect` hoặc `mock` nếu cần trong lúc chờ sửa.

## Chạy local

```bash
# Terminal 1 — API server
cd server
npm install
cp .env.example .env
npm run dev        # http://localhost:4000

# Terminal 2 — Frontend
cd client
npm install
npm run dev         # http://localhost:5173 (proxy /api -> :4000)
```

## Tính năng

- Tổng quan thị trường: bảng giá, % thay đổi, khối lượng, tự động refresh mỗi 15s.
- Tìm kiếm mã cổ phiếu (gõ để tìm theo mã hoặc tên công ty).
- Bấm vào mã → trang chi tiết với biểu đồ nến TradingView đầy đủ (chọn khung thời gian, chỉ báo kỹ thuật ngay trên widget) + các chỉ số mở/cao/thấp/đóng cửa/khối lượng/vốn hóa.
- Chuyển giao diện **sáng/tối** bằng nút ☀️/🌙 trên thanh menu (lưu lựa chọn vào `localStorage`, biểu đồ TradingView đổi theme theo).
- Danh sách theo dõi (watchlist) lưu trong `localStorage`, thêm/bớt bằng nút ★ ở bất kỳ đâu.

## Build production

```bash
cd server && npm run build && npm start
cd client && npm run build   # build tĩnh vào client/dist, deploy lên bất kỳ static host nào
```

## Deploy lên Vercel

Repo đã có sẵn `vercel.json` + thư mục `api/` (Serverless Functions) nên chỉ cần:

1. Trong Vercel Dashboard → Project Settings → **General → Root Directory**: để trống / chọn thư mục **gốc của repo** (không phải `client`). Nếu để `client` làm root thì Vercel sẽ không thấy được thư mục `api/`, và bảng giá sẽ không tải được dữ liệu dù trang vẫn hiện ra.
2. Project Settings → **Environment Variables**: mặc định dùng provider `tradingview` — **không cần token hay key gì cả**, deploy là chạy. Tùy chọn:
   - `DATA_PROVIDER` = `tradingview` (mặc định) / `fireant` / `vndirect` / `mock` / ...
   - `WATCHLIST_SYMBOLS` nếu muốn đổi danh sách mã hiển thị ở trang tổng quan
   - `FIREANT_TOKEN` nếu chuyển sang provider `fireant`
3. Project Settings → **Deployment Protection**: nếu bật "Vercel Authentication" hoặc "Password Protection", người ngoài truy cập domain sẽ gặp lỗi 403. Tắt đi (hoặc thêm domain vào danh sách bypass) nếu muốn ai cũng xem được.
4. Redeploy. Vercel sẽ tự nhận `api/*.ts` thành các endpoint `/api/health`, `/api/market/overview`, `/api/quote/:symbol`, `/api/history/:symbol`, `/api/search`, và build `client/` thành site tĩnh theo cấu hình trong `vercel.json`.
