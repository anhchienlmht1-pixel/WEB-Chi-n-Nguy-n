# StockDash — Trang web theo dõi chứng khoán

Ứng dụng theo dõi giá cổ phiếu theo thời gian thực gồm 3 phần:

- **`client/`** — React + TypeScript + Vite + Tailwind CSS, hỗ trợ giao diện sáng/tối; biểu đồ ở trang chi tiết dùng widget chính thức của TradingView (tải trực tiếp trong trình duyệt người xem, không qua backend).
- **`server/`** — Express (TypeScript), dùng khi tự host (VPS, Render, Railway, Docker...).
- **`api/`** — cùng logic đó viết dưới dạng Vercel Serverless Functions, dùng khi deploy trên Vercel (Vercel không chạy Express thường trú được).

Cả hai đều dùng chung code trong `server/src/providers/` — sửa 1 nơi, cả 2 cách deploy đều cập nhật.

## Nguồn dữ liệu (pluggable — cắm bất kỳ API nào)

Ứng dụng chỉ hiển thị **cổ phiếu thị trường Việt Nam** (danh sách ~70 mã HOSE/HNX/UPCOM tiêu biểu trong `server/src/providers/universe.ts`). Backend được thiết kế theo interface `StockProvider` (`server/src/providers/types.ts`), chọn provider qua biến môi trường `DATA_PROVIDER`:

| Provider | Giá trị `DATA_PROVIDER` | Cần xác thực | Ghi chú |
|---|---|---|---|
| KB Securities (KBS) | `kbs` (mặc định) | Không | Nguồn dữ liệu mặc định **hiện tại** của thư viện **vnstock** (vnstocks.com) cho `Market.equity.ohlcv()`/`quote()` — xác nhận trực tiếp từ README chính thức của vnstock trên GitHub (không phải VCI như bản cũ). Bảng giá batch 1 request (`POST /stock/iss`), biểu đồ nến OHLCV (`GET /stocks/{symbol}/data_day`). Không cần token. |
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
- Danh sách theo dõi (watchlist) lưu trong `localStorage`, thêm/bớt bằng nút ★ ở bất kỳ đâu — xem dạng **Thẻ** (mặc định: giá, % thay đổi, sparkline giá 3 tháng, nhãn tín hiệu MUA/BÁN, P/E & ROE từ báo cáo chỉ số tài chính) hoặc **Bảng** (gọn hơn cho danh sách dài).
- Heatmap lợi nhuận theo Tháng/Năm cho mỗi mã (trang chi tiết mã).
- `/so-sanh`: so sánh % lợi nhuận tích luỹ theo thời gian giữa nhiều mã (biểu đồ đường), cộng thêm đường "Danh mục (bình quân)" — bình quân đều các mã đã chọn tại những ngày cả nhóm đều có dữ liệu. Bấm vào một mã/danh mục để ẩn/hiện đường đó trên biểu đồ.
- Tin tức liên quan đến từng mã ở trang chi tiết mã (`/stock/:symbol`), từ CafeF (`server/src/news/cafefNews.ts`), 2 nguồn theo thứ tự ưu tiên:
  1. Tab "Tin tức" trên trang dữ liệu riêng của mã đó trên CafeF — `cafef.vn/du-lieu/{sàn}/{mã}-tin-tuc.chn` (đã xác nhận đúng qua ảnh chụp URL thật của người dùng, ví dụ `hose/hpg-tin-tuc.chn`), thử thêm `{mã}.chn` nếu dạng trên không có. Cào các link bài viết trên trang, chỉ giữ lại link có nhắc đến mã (loại bỏ tin "Mới nhất" chung toàn trang không liên quan mã đang xem). Cấu trúc HTML chi tiết của trang này vẫn **chưa xác minh được đầy đủ** (sandbox phát triển chặn mạng ra `cafef.vn`) nên phần cào dữ liệu là suy đoán có kiểm tra chéo bằng bộ lọc, không phải API chính thức.
  2. Nếu cách trên không ra kết quả: lọc theo mã trong RSS công khai của CafeF (thử lần lượt `thi-truong-chung-khoan`, `chung-khoan`, `tai-chinh-ngan-hang`).
- Tín hiệu Mua/Bán trên biểu đồ kỹ thuật — bật bằng nút "Tín hiệu Mua/Bán" trên thanh công cụ. Mua khi SMA20 > SMA50, ADX(14) > 25 và Supertrend(10,3) đang tăng; Bán khi SMA20 < SMA50 hoặc Supertrend đang giảm. Biểu đồ chỉ đánh dấu điểm **chuyển** tín hiệu (để không rối mắt), số lượng "Mua/Bán" hiển thị bên trên tính trên toàn bộ số phiên khớp điều kiện.
- Biểu đồ cột Lợi nhuận sau thuế theo quý/năm ở tab "Kết quả kinh doanh" (trang chi tiết mã) — quý lãi màu xanh, quý lỗ màu đỏ, lấy từ đúng dữ liệu báo cáo KQKD đã có sẵn.
- Biểu đồ đường Xu hướng P/E & ROE theo kỳ ở tab "Chỉ số tài chính" (trang chi tiết mã).
- **Bản tin thị trường** (`/ban-tin`): mỗi ngày tự động chọn **1 chủ đề** để viết dựa trên biến động thật của phiên đó — cổ phiếu tâm điểm (biến động mạnh nhất trong nhóm thanh khoản tốt), ngành dẫn dắt (bình quân ngành lệch rõ so với thị trường), thanh khoản đột biến (giá trị giao dịch vượt trội), hoặc toàn cảnh thị trường (khi không có chủ đề nào nổi bật) — logic chọn chủ đề ở `server/src/digest/marketDigest.ts`. Nội dung được tổng hợp từ `/api/market/overview`, cache theo ngày (`/api/market/daily-digest`) nên cùng 1 bài trong suốt ngày hôm đó.
- Báo cáo tài chính (`server/src/providers/financials.ts`) thử **VNDirect** trước (`finfo-api.vndirect.com.vn`, lịch sử nhiều kỳ hơn), tự động rơi về **KBS** nếu VNDirect lỗi — nhãn "Nguồn: VNDirect / KBS (dự phòng)" hiện ngay trên bảng để biết đang lấy từ đâu. Cấu trúc response thật của VNDirect **chưa xác minh trực tiếp được** (sandbox chặn mạng ra ngoài với mọi nguồn dữ liệu tài chính) — nếu tab báo cáo hiện "Nguồn: KBS (dự phòng)" liên tục nghĩa là VNDirect đang lỗi, gửi ảnh lỗi cụ thể để chỉnh tiếp.

  Nếu báo lỗi tải tin tức, thông báo sẽ liệt kê HTTP status/nội dung thô của từng nguồn đã thử. Nếu không lỗi nhưng không có tin nào, trang sẽ hiện số bài đã kiểm tra + nguồn đã dùng để dễ chẩn đoán xem là "thật sự không có tin" hay "đoán sai cấu trúc".

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

### Lưu lịch sử bài viết "Bản tin" (tuỳ chọn)

Mặc định, bài viết "Bản tin" (`/ban-tin`) chỉ được cache tạm trong bộ nhớ server 6 tiếng — qua ngày mới hoặc khi request chạy trên một serverless instance khác là bài cũ mất, không xem lại được. Để lưu lại lịch sử lâu dài:

1. Vercel Dashboard → project → tab **Storage** → **Create Database** → chọn **Blob** → đặt tên rồi **Connect** vào project. Vercel sẽ tự thêm biến môi trường `BLOB_READ_WRITE_TOKEN` — không cần copy token thủ công.
2. Redeploy. Từ lần chạy tiếp theo, mỗi bài viết mới sẽ tự lưu vào Blob và trang `/ban-tin` sẽ hiện thêm mục "Bài viết trước đó" để đọc lại các ngày cũ.

Không bật bước này thì trang vẫn hoạt động bình thường (chỉ là không lưu lịch sử) — `server/src/digest/digestHistory.ts` tự bỏ qua an toàn khi thiếu `BLOB_READ_WRITE_TOKEN`.
