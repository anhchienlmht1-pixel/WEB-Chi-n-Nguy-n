import { Link } from "react-router-dom";
import { Phone } from "lucide-react";

const HEAD = "mb-2 text-sm font-bold uppercase tracking-[0.08em] text-white";
const LINK =
  "inline-flex min-h-8 items-center text-base text-quiet-on-band transition-colors duration-200 hover:text-white hover:underline";

const SOCIAL = [
  { label: "Facebook", href: "https://www.facebook.com/chiennguyen.taichinh/" },
  { label: "YouTube", href: "https://www.youtube.com/@chiennguyen.taichinh" },
  { label: "Zalo", href: "https://zalo.me/0886284212" },
  { label: "Nhóm Zalo", href: "https://zalo.me/g/n1hcdesbqhdutsecnxzg" },
];

// Teal band footer; uses the dark logo variant.
export default function Footer() {
  return (
    <footer id="footer" className="scroll-mt-20 bg-band text-white">
      <div className="gutter-x mx-auto max-w-[1600px] pb-7 pt-14">
        <div className="flex flex-wrap justify-between gap-x-16 gap-y-10">
          <div className="max-w-sm flex-1 basis-72">
            <img src="/logo-cstock-dark.svg" alt="C Stock" className="block h-[52px]! w-auto" />
            <p className="mt-5 text-base leading-relaxed text-quiet-on-band">
              Công cụ theo dõi tín hiệu mua bán theo xu hướng cho nhà đầu tư chứng khoán Việt Nam.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-16 gap-y-8">
            <div className="flex min-w-36 flex-col gap-1">
              <h4 className={HEAD}>Khám phá</h4>
              <Link to={{ pathname: "/", hash: "#tin-hieu" }} className={LINK}>
                Tín hiệu mua
              </Link>
              <Link to="/huong-dan-mo-tai-khoan" className={LINK}>
                Hướng dẫn mở tài khoản
              </Link>
            </div>

            <div className="flex min-w-48 flex-col gap-1">
              <h4 className={HEAD}>Liên hệ</h4>
              <p className="text-base font-bold leading-snug text-white">Nguyễn Anh Chiến</p>
              <p className="text-base leading-snug text-quiet-on-band">Chuyên viên tư vấn đầu tư</p>
              <p className="text-base leading-snug text-quiet-on-band">CTCP Chứng khoán KAFI</p>
              <a
                href="tel:0886284212"
                className="inline-flex min-h-10 items-center gap-2 text-base font-bold text-white hover:underline"
              >
                <Phone className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                0886.284.212
              </a>
            </div>

            <div className="flex min-w-36 flex-col gap-1">
              <h4 className={HEAD}>Theo dõi</h4>
              {SOCIAL.map(({ label, href }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" className={LINK}>
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap justify-between gap-x-8 gap-y-3 border-t border-white/25 pt-5 text-sm leading-relaxed text-quiet-on-band">
          <p className="max-w-2xl">
            Các tín hiệu và dữ liệu được cung cấp chỉ mang tính chất minh họa, không phải lời khuyên đầu tư. Quý khách
            vui lòng tham khảo ý kiến chuyên viên trước khi quyết định đầu tư.
          </p>
          <p>© 2024 – 2026 Nền tảng phân tích thị trường chứng khoán Việt Nam</p>
        </div>
      </div>
    </footer>
  );
}
