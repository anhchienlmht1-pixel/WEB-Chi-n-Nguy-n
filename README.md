# StockDash — Trang web theo dõi chứng khoán

Ứng dụng theo dõi giá cổ phiếu theo thời gian thực gồm 3 phần:

- **`client/`** — React + TypeScript + Vite + Tailwind CSS, biểu đồ dùng `lightweight-charts`.
- **`server/`** — Express (TypeScript), dùng khi tự host (VPS, Render, Railway, Docker...).
- **`api/`** — cùng logic đó viết dưới dạng Vercel Serverless Functions, dùng khi deploy trên Vercel (Vercel không chạy Express thường trú được).

Cả hai đều dùng chung code trong `server/src/providers/` — sửa 1 nơi, cả 2 cách deploy đều cập nhật.

## Nguồn dữ liệu (pluggable — cắm bất kỳ API nào)

Backend được thiết kế theo interface `StockProvider` (`server/src/providers/types.ts`), chọn provider qua biến môi trường `DATA_PROVIDER`:

| Provider | Giá trị `DATA_PROVIDER` | Cần API key | Ghi chú |
|---|---|---|---|
| Dữ liệu giả lập | `mock` (mặc định) | Không | Random-walk quanh giá thật để demo/dev không cần mạng |
| Yahoo Finance | `yahoo` | Không | Endpoint không chính thức, có thể đổi bất kỳ lúc nào |
| Alpha Vantage | `alphavantage` | Có | Lấy key miễn phí tại alphavantage.co |
| Finnhub | `finnhub` | Có | Lấy key miễn phí tại finnhub.io |

Muốn dùng nguồn khác (Twelve Data, Polygon.io, SSI/VNDirect, v.v.) chỉ cần thêm 1 file trong `server/src/providers/` cài đặt interface `StockProvider` rồi đăng ký trong `server/src/providers/index.ts`.

Copy `server/.env.example` thành `server/.env` rồi chỉnh:

```
DATA_PROVIDER=mock
ALPHAVANTAGE_API_KEY=
FINNHUB_API_KEY=
WATCHLIST_SYMBOLS=AAPL,MSFT,GOOGL,AMZN,TSLA,NVDA,META,NFLX
PORT=4000
```

> Lưu ý: môi trường sandbox dùng để phát triển phiên bản này chặn hầu hết kết nối ra ngoài, nên chỉ `mock` được kiểm thử trực tiếp tại đây. Code cho `yahoo`/`alphavantage`/`finnhub` đã viết đầy đủ theo API thật của từng bên nhưng cần chạy ở môi trường có internet để xác nhận lại trước khi dùng production.

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
- Trang chi tiết mã: giá hiện tại, biểu đồ theo khoảng thời gian (1D/1W/1M/3M/6M/1Y/5Y), các chỉ số mở/cao/thấp/đóng cửa/khối lượng/vốn hóa.
- Danh sách theo dõi (watchlist) lưu trong `localStorage`, thêm/bớt bằng nút ★ ở bất kỳ đâu.

## Build production

```bash
cd server && npm run build && npm start
cd client && npm run build   # build tĩnh vào client/dist, deploy lên bất kỳ static host nào
```

## Deploy lên Vercel

Repo đã có sẵn `vercel.json` + thư mục `api/` (Serverless Functions) nên chỉ cần:

1. Trong Vercel Dashboard → Project Settings → **General → Root Directory**: để trống / chọn thư mục **gốc của repo** (không phải `client`). Nếu để `client` làm root thì Vercel sẽ không thấy được thư mục `api/`, và bảng giá sẽ không tải được dữ liệu dù trang vẫn hiện ra.
2. Project Settings → **Environment Variables**: thêm (tùy chọn, mặc định đã chạy được với `mock`):
   - `DATA_PROVIDER` = `mock` / `yahoo` / `alphavantage` / `finnhub`
   - `ALPHAVANTAGE_API_KEY`, `FINNHUB_API_KEY` nếu dùng provider tương ứng
   - `WATCHLIST_SYMBOLS` nếu muốn đổi danh sách mã hiển thị ở trang tổng quan cho `yahoo`/`alphavantage`/`finnhub`
3. Project Settings → **Deployment Protection**: nếu bật "Vercel Authentication" hoặc "Password Protection", người ngoài truy cập domain sẽ gặp lỗi 403. Tắt đi (hoặc thêm domain vào danh sách bypass) nếu muốn ai cũng xem được.
4. Redeploy. Vercel sẽ tự nhận `api/*.ts` thành các endpoint `/api/health`, `/api/market/overview`, `/api/quote/:symbol`, `/api/history/:symbol`, `/api/search`, và build `client/` thành site tĩnh theo cấu hình trong `vercel.json`.
