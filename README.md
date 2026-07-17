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
| KB Securities (KBS) | `kbs` (mặc định) | Không | Nguồn dữ liệu mặc định **hiện tại** của thư viện **vnstock** (vnstocks.com) cho `Market.equity.ohlcv()`/`quote()` — xác nhận trực tiếp từ README chính thức của vnstock trên GitHub (không phải VCI như bản cũ). Cùng nguồn với tính năng Chỉ số tài chính (`server/src/providers/kbsFinancials.ts`). Bảng giá batch 1 request (`POST /stock/iss`), biểu đồ nến OHLCV (`GET /stocks/{symbol}/data_day`). Không cần token. |
| vnstock (VCI/Vietcap) | `vnstock` | Không | Endpoint VCI cũ hơn (`trading.vietcap.com.vn`), giữ lại làm phương án dự phòng — thư viện vnstock hiện đã chuyển nguồn mặc định sang KBS. |
| TradingView | `tradingview` | Không | Scanner công khai của TradingView cho thị trường VN. |
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
DATA_PROVIDER=kbs
WATCHLIST_SYMBOLS=
PORT=4000
```

> Provider `kbs` dùng 2 endpoint KBS mà thư viện vnstock hiện tại gọi (đối chiếu trực tiếp với mã nguồn `vnstock/explorer/kbs/{quote,trading,const}.py` trên GitHub):
> - `POST /iis-server/investment/stock/iss` — bảng giá batch `{"code":"ACB,VCB,..."}` (mã cách nhau bằng dấu phẩy, không phải mảng);
> - `GET /iis-server/investment/stocks/{symbol}/data_day` (hoặc `/index/{symbol}/data_day` cho chỉ số) — dữ liệu nến OHLCV, tham số `sdate`/`edate` định dạng `DD-MM-YYYY`. Giá cổ phiếu KBS trả về nhân 1000 (cùng quy ước với `finance-info`), cần chia lại; giá chỉ số thì không.
>
> Chưa hỗ trợ Top 10 giao dịch riêng cho `kbs` — tự động dùng lại logic xếp hạng từ bảng giá tổng quan (`topTradedOf()` fallback), đã có sẵn cho mọi provider không có `getTopTraded` riêng. Hợp đồng tương lai VN30 (VN30F1M/F2M/F1Q/F2Q) **chưa được hỗ trợ** — KBS yêu cầu quy đổi sang mã KRX theo ngày đáo hạn hiện tại, phần logic này chưa được triển khai.
>
> Môi trường sandbox phát triển phiên bản này chặn mạng ra ngoài nên chưa gọi thử trực tiếp được (chỉ `mock` test được tại chỗ), nhưng cấu trúc request/response lấy nguyên văn từ mã nguồn vnstock nên độ tin cậy cao. Nếu có lỗi, trang hiển thị thông báo cụ thể — đổi tạm `DATA_PROVIDER=mock` trong lúc chờ sửa.

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

- **Top 10 cổ phiếu giao dịch nhiều nhất** với tab chọn sàn: Cả 3 sàn / HOSE / HNX / UPCOM (xếp theo giá trị giao dịch, refresh mỗi 30s).
- Tổng quan thị trường: bảng giá, % thay đổi, khối lượng, tự động refresh mỗi 15s.
- Tìm kiếm mã cổ phiếu (gõ để tìm theo mã hoặc tên công ty).
- Bấm vào mã → trang chi tiết với biểu đồ giá (dữ liệu vnstock/TCBS, chọn khoảng 1W→5Y) + các chỉ số mở/cao/thấp/đóng cửa/khối lượng/vốn hóa.
- Chuyển giao diện **sáng/tối** bằng nút ☀️/🌙 trên thanh menu (lưu lựa chọn vào `localStorage`, biểu đồ đổi theme theo).
- Danh sách theo dõi (watchlist) lưu trong `localStorage`, thêm/bớt bằng nút ★ ở bất kỳ đâu.
- Heatmap lợi nhuận theo Tháng/Năm cho mỗi mã (trang chi tiết mã).
- `/pe-eps`: scatter tương quan P/E và tăng trưởng EPS cho toàn bộ danh sách mã.
- `/so-sanh`: so sánh % hiệu suất giữa nhiều mã trong một khoảng thời gian (biểu đồ cột).
- Tin tức liên quan đến từng mã ở trang chi tiết mã (`/stock/:symbol`), lọc từ RSS công khai của VnExpress (`server/src/news/vnexpressNews.ts`) theo mã xuất hiện trong tiêu đề/mô tả — thử lần lượt vài feed (`kinh-doanh/chung-khoan`, `chung-khoan`, `kinh-doanh`) vì chưa xác minh được slug chính xác hiện tại do sandbox phát triển chặn mạng ra `vnexpress.net`; nếu báo lỗi tải tin tức, thông báo lỗi sẽ liệt kê HTTP status/nội dung thô của từng feed đã thử để chẩn đoán. RSS là feed theo chuyên mục chung (không phải theo từng mã), nên với mã ít được nhắc tới gần đây có thể không có tin nào — đó là bình thường, không phải lỗi.

## Build production

```bash
cd server && npm run build && npm start
cd client && npm run build   # build tĩnh vào client/dist, deploy lên bất kỳ static host nào
```

## Deploy lên Vercel

Repo đã có sẵn `vercel.json` + thư mục `api/` (Serverless Functions) nên chỉ cần:

1. Trong Vercel Dashboard → Project Settings → **General → Root Directory**: để trống / chọn thư mục **gốc của repo** (không phải `client`). Nếu để `client` làm root thì Vercel sẽ không thấy được thư mục `api/`, và bảng giá sẽ không tải được dữ liệu dù trang vẫn hiện ra.
2. Project Settings → **Environment Variables**: mặc định dùng provider `kbs` (KB Securities) — **không cần token hay key gì cả**, deploy là chạy. Tùy chọn:
   - `DATA_PROVIDER` = `kbs` (mặc định) / `vnstock` / `tradingview` / `fireant` / `vndirect` / `mock` / ...
   - ⚠️ Nếu project đã có sẵn biến `DATA_PROVIDER=vnstock` được set thủ công trong Vercel, biến đó sẽ **ghi đè** giá trị mặc định mới trong code — cần xoá biến này (hoặc đổi thành `kbs`) rồi Redeploy để dùng nguồn dữ liệu mới.
   - `WATCHLIST_SYMBOLS` nếu muốn đổi danh sách mã hiển thị ở trang tổng quan
   - `FIREANT_TOKEN` nếu chuyển sang provider `fireant`
3. Project Settings → **Deployment Protection**: nếu bật "Vercel Authentication" hoặc "Password Protection", người ngoài truy cập domain sẽ gặp lỗi 403. Tắt đi (hoặc thêm domain vào danh sách bypass) nếu muốn ai cũng xem được.
4. Redeploy. Vercel sẽ tự nhận `api/*.ts` thành các endpoint `/api/health`, `/api/market/overview`, `/api/market/top`, `/api/quote/:symbol`, `/api/history/:symbol`, `/api/search`, và build `client/` thành site tĩnh theo cấu hình trong `vercel.json`.
