import { useState } from "react";

const GUIDE_STEPS = [
  {
    step: 1,
    title: "Truy cập trang web KAFI",
    description: "Vào website https://kafi.vn và tìm nút 'Mở Tài Khoản'",
    icon: "🌐",
  },
  {
    step: 2,
    title: "Điền thông tin cá nhân",
    description: "Cung cấp tên, số điện thoại, email và các thông tin cần thiết khác",
    icon: "📋",
  },
  {
    step: 3,
    title: "Xác minh danh tính",
    description: "Upload ảnh CMND/Passport và ảnh chân dung để xác minh danh tính",
    icon: "🆔",
  },
  {
    step: 4,
    title: "Cấp quyền giao dịch",
    description: "Chọn loại tài khoản và cấp quyền giao dịch chứng khoán",
    icon: "✅",
  },
  {
    step: 5,
    title: "Nộp tiền vào tài khoản",
    description: "Chuyển tiền từ tài khoản ngân hàng của bạn vào tài khoản KAFI",
    icon: "💳",
  },
  {
    step: 6,
    title: "Bắt đầu giao dịch",
    description: "Sau khi tiền vào, bạn có thể bắt đầu giao dịch chứng khoán ngay",
    icon: "📈",
  },
];

export default function AccountOpeningGuide() {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-12 text-center">
        <div className="mb-3 text-lg font-semibold text-emerald-600 dark:text-emerald-400">
          📱 HƯỚNG DẪN MỞ TÀI KHOẢN
        </div>
        <h1 className="mb-4 text-4xl font-bold text-slate-900 dark:text-slate-100">
          Mở Tài Khoản Giao Dịch Chứng Khoán
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Quy trình đơn giản, nhanh chóng, chỉ cần 6 bước để bắt đầu giao dịch
        </p>
      </div>

      {/* Steps */}
      <div className="mb-12 space-y-4">
        {GUIDE_STEPS.map((step) => (
          <div
            key={step.step}
            onClick={() => setExpandedStep(expandedStep === step.step ? null : step.step)}
            className="overflow-hidden rounded-lg border border-slate-200 bg-white transition-all dark:border-slate-800 dark:bg-slate-900/40 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-600"
          >
            <div className="flex items-center gap-4 p-6">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-3xl">
                {step.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                    Bước {step.step}
                  </span>
                </div>
                <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100">
                  {step.title}
                </h3>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  {step.description}
                </p>
              </div>
              <div className="shrink-0 text-2xl text-slate-400">
                {expandedStep === step.step ? "▼" : "▶"}
              </div>
            </div>
            {expandedStep === step.step && (
              <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/50">
                <div className="space-y-3 text-slate-600 dark:text-slate-400">
                  {step.step === 1 && (
                    <>
                      <p>• Truy cập website chính thức: <strong>https://kafi.vn</strong></p>
                      <p>• Tìm và nhấp vào nút "Mở Tài Khoản" ở trang chủ</p>
                      <p>• Chọn loại tài khoản phù hợp với nhu cầu của bạn</p>
                    </>
                  )}
                  {step.step === 2 && (
                    <>
                      <p>• Họ và tên: Ghi đúng tên trên CMND/Passport</p>
                      <p>• Số điện thoại: Số điện thoại di động đang sử dụng</p>
                      <p>• Email: Email hoạt động để nhận thông báo từ sàn</p>
                      <p>• Địa chỉ: Địa chỉ hiện tại</p>
                      <p>• Nghề nghiệp: Lựa chọn nghề nghiệp của bạn</p>
                    </>
                  )}
                  {step.step === 3 && (
                    <>
                      <p>• Chuẩn bị ảnh CMND/Passport (mặt trước và sau)</p>
                      <p>• Chụp ảnh chân dung rõ mặt, ánh sáng tốt</p>
                      <p>• Upload các tệp theo định dạng JPG hoặc PNG</p>
                      <p>• Đảm bảo tất cả thông tin đều rõ ràng và dễ đọc</p>
                    </>
                  )}
                  {step.step === 4 && (
                    <>
                      <p>• Loại tài khoản: Chọn "Tài Khoản Nhà Đầu Tư Cá Nhân"</p>
                      <p>• Cấp quyền giao dịch: Chọn cấp quyền phù hợp</p>
                      <p>• Loại vốn: Nộp tiền mặt (tiền Việt)</p>
                      <p>• Xác nhận và chờ phê duyệt từ sàn</p>
                    </>
                  )}
                  {step.step === 5 && (
                    <>
                      <p>• Thông qua chuyển khoản ngân hàng (nên dùng cách này)</p>
                      <p>• KAFI sẽ cung cấp số tài khoản để bạn chuyển tiền</p>
                      <p>• Thực hiện chuyển tiền theo hướng dẫn chi tiết</p>
                      <p>• Tiền sẽ được cộng vào tài khoản trong 1-2 giờ</p>
                    </>
                  )}
                  {step.step === 6 && (
                    <>
                      <p>• Đăng nhập vào tài khoản KAFI của bạn</p>
                      <p>• Truy cập phần "Đặt Lệnh" để giao dịch</p>
                      <p>• Tìm hiểu về các loại lệnh: Lệnh Thị Trường, Lệnh Giới Hạn</p>
                      <p>• Bắt đầu với các giao dịch nhỏ để tìm hiểu</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Contact Section */}
      <div className="mb-12 rounded-lg border border-emerald-200 bg-emerald-50 p-8 dark:border-emerald-900/30 dark:bg-emerald-950/20">
        <h2 className="mb-6 text-2xl font-bold text-slate-900 dark:text-slate-100">
          ❓ Câu Hỏi Thường Gặp
        </h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100">
              Mất bao lâu để mở tài khoản?
            </h3>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Quá trình mở tài khoản thường mất 1-2 ngày làm việc. Nếu bạn hoàn thành mọi bước đầy đủ,
              tài khoản có thể được phê duyệt ngay trong cùng ngày.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100">
              Cần bao nhiêu tiền để bắt đầu?
            </h3>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              KAFI không yêu cầu số tiền tối thiểu bắt buộc, nhưng để giao dịch hiệu quả,
              nên nộp ít nhất 1-2 triệu đồng.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100">
              Có phí gì khi mở tài khoản?
            </h3>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Mở tài khoản KAFI hoàn toàn miễn phí. Bạn chỉ phải trả tiền khi giao dịch
              (lệ phí giao dịch, lãi vay margin nếu sử dụng).
            </p>
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100">
              Làm sao nếu gặp vấn đề trong quá trình mở tài khoản?
            </h3>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Bạn có thể liên hệ với nhóm hỗ trợ của KAFI qua điện thoại hoặc email.
              Họ sẽ hỗ trợ bạn từng bước trong quá trình mở tài khoản.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 p-8 text-center text-white">
        <h2 className="mb-3 text-2xl font-bold">Sẵn Sàng Mở Tài Khoản?</h2>
        <p className="mb-6 text-lg">
          Mở tài khoản ngay hôm nay và bắt đầu hành trình giao dịch chứng khoán của bạn
        </p>
        <a
          href="https://kafi.vn"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-bold text-emerald-600 transition-all hover:bg-emerald-50"
        >
          🚀 Mở Tài Khoản Ngay
        </a>
      </div>

      {/* Video Guide */}
      <div className="mt-12 rounded-lg border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900/40">
        <h2 className="mb-4 text-2xl font-bold text-slate-900 dark:text-slate-100">
          📹 Hướng Dẫn Video Chi Tiết
        </h2>
        <p className="mb-4 text-slate-600 dark:text-slate-400">
          Xem video hướng dẫn chi tiết từng bước mở tài khoản chứng khoán:
        </p>
        <div className="aspect-video overflow-hidden rounded-lg bg-slate-900">
          <iframe
            width="100%"
            height="100%"
            src="https://www.youtube.com/embed/CyUYSWOAavw"
            title="Hướng dẫn mở tài khoản chứng khoán"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}
