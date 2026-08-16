export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 py-6 dark:border-slate-800 dark:bg-slate-900/30">
      <div className="mx-auto max-w-[1400px] px-4">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Contact Info */}
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100">Liên hệ</h4>
            <div className="mt-3 space-y-2 text-sm">
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  Nguyễn Anh Chiến
                </p>
                <p className="text-slate-600 dark:text-slate-400">Chuyên viên tư vấn đầu tư</p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  CTCP Chứng khoán KAFI
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Điện thoại:</p>
                <a
                  href="tel:0886284212"
                  className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  0886.284.212
                </a>
              </div>
            </div>
          </div>

          {/* Community */}
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100">Cộng đồng</h4>
            <div className="mt-3">
              <a
                href="https://zalo.me/g/n1hcdesbqhdutsecnxzg"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-emerald-500 px-3 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-500/10 dark:border-emerald-400 dark:text-emerald-400"
              >
                📱 Nhóm Zalo
              </a>
            </div>
          </div>

          {/* Disclaimer */}
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100">Lưu ý</h4>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Các tín hiệu và dữ liệu được cung cấp chỉ mang tính chất minh họa, không phải lời khuyên đầu tư. Quý khách
              vui lòng tham khảo ý kiến chuyên viên trước khi quyết định đầu tư.
            </p>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <p>© 2024 - 2025. Nền tảng phân tích thị trường chứng khoán Việt Nam</p>
        </div>
      </div>
    </footer>
  );
}
