# StockDash — Trang web theo dõi chứng khoán

Ứng dụng theo dõi giá cổ phiếu theo thời gian thực gồm 2 phần:

- **`client/`** — React + TypeScript + Vite + Tailwind CSS, biểu đồ dùng `lightweight-charts`.
- **`server/`** — Express (TypeScript) đóng vai trò proxy dữ liệu, tránh lỗi CORS và giấu API key khỏi trình duyệt.

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
