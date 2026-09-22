import { Globe, Video, MessageCircle, Users, Phone } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 py-8 dark:border-slate-800 dark:bg-slate-900/30">
      <div className="mx-auto max-w-[1400px] px-4">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
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
              <a
                href="tel:0886284212"
                className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
              >
                <Phone className="h-3.5 w-3.5" strokeWidth={1.75} />
                0886.284.212
              </a>
            </div>
          </div>

          {/* Community */}
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100">Theo dõi</h4>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href="https://www.facebook.com/chiennguyen.taichinh/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors duration-300 hover:border-blue-400 hover:text-blue-600 dark:border-slate-700 dark:text-slate-300 dark:hover:text-blue-400"
              >
                <Globe className="h-4 w-4" strokeWidth={1.75} />
                Facebook
              </a>
              <a
                href="https://www.youtube.com/@chiennguyen.taichinh"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors duration-300 hover:border-red-400 hover:text-red-600 dark:border-slate-700 dark:text-slate-300 dark:hover:text-red-400"
              >
                <Video className="h-4 w-4" strokeWidth={1.75} />
                YouTube
              </a>
              <a
                href="https://zalo.me/0886284212"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors duration-300 hover:border-emerald-400 hover:text-emerald-600 dark:border-slate-700 dark:text-slate-300 dark:hover:text-emerald-400"
              >
                <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
                Zalo
              </a>
              <a
                href="https://zalo.me/g/n1hcdesbqhdutsecnxzg"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors duration-300 hover:border-emerald-400 hover:text-emerald-600 dark:border-slate-700 dark:text-slate-300 dark:hover:text-emerald-400"
              >
                <Users className="h-4 w-4" strokeWidth={1.75} />
                Nhóm Zalo
              </a>
            </div>
          </div>

          {/* Disclaimer */}
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100">Lưu ý</h4>
            <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Các tín hiệu và dữ liệu được cung cấp chỉ mang tính chất minh họa, không phải lời khuyên đầu tư. Quý khách
              vui lòng tham khảo ý kiến chuyên viên trước khi quyết định đầu tư.
            </p>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <p>© 2024 - 2025. Nền tảng phân tích thị trường chứng khoán Việt Nam</p>
        </div>
      </div>
    </footer>
  );
}
