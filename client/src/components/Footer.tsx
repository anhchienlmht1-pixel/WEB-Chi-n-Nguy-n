import { Link } from "react-router-dom";
import { Phone } from "lucide-react";

const HEAD = "mb-4 text-[11px] font-bold uppercase tracking-[0.14em]";
const LINK = "text-quiet-on-band transition-colors duration-200 hover:text-white";

const SOCIAL = [
  { label: "Facebook", href: "https://www.facebook.com/chiennguyen.taichinh/" },
  { label: "YouTube", href: "https://www.youtube.com/@chiennguyen.taichinh" },
  { label: "Zalo", href: "https://zalo.me/0886284212" },
  { label: "Nhóm Zalo", href: "https://zalo.me/g/n1hcdesbqhdutsecnxzg" },
];

// Editorial footer: always a black band (both themes), so it uses the dark
// logo variant.
export default function Footer() {
  return (
    <footer id="footer" className="scroll-mt-20 bg-band text-white">
      <div className="gutter-x mx-auto max-w-[1800px] pb-7 pt-14">
        <div className="flex flex-wrap justify-between gap-x-16 gap-y-10">
          <div className="max-w-sm flex-1 basis-72">
            <img src="/logo-cstock-dark.svg" alt="C Stock" className="block h-[52px]! w-auto" />
            <p className="mt-5 text-[13px] leading-[1.7] text-quiet-on-band">
              Công cụ theo dõi tín hiệu mua bán theo xu hướng cho nhà đầu tư chứng khoán Việt Nam.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-16 gap-y-8">
            <div>
              <h4 className={HEAD}>Khám phá</h4>
              <div className="flex flex-col gap-2.5 text-xs">
                <Link to={{ pathname: "/", hash: "#tin-hieu" }} className={LINK}>
                  Tín hiệu mua
                </Link>
                <Link to="/huong-dan-mo-tai-khoan" className={LINK}>
                  Hướng dẫn mở tài khoản
                </Link>
              </div>
            </div>

            <div>
              <h4 className={HEAD}>Liên hệ</h4>
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-white">Nguyễn Anh Chiến</p>
                <p className="text-quiet-on-band">Chuyên viên tư vấn đầu tư</p>
                <p className="text-quiet-on-band">CTCP Chứng khoán KAFI</p>
                <a
                  href="tel:0886284212"
                  className="mt-2.5 inline-flex items-center gap-1.5 font-semibold text-orange-400 transition-colors hover:text-orange-300"
                >
                  <Phone className="h-3.5 w-3.5" strokeWidth={1.75} />
                  0886.284.212
                </a>
              </div>
            </div>

            <div>
              <h4 className={HEAD}>Theo dõi</h4>
              <div className="flex flex-col gap-2.5 text-xs">
                {SOCIAL.map(({ label, href }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" className={LINK}>
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-11 flex flex-wrap justify-between gap-x-8 gap-y-3 border-t border-white/10 pt-5 text-[11px] leading-[1.7] text-quiet-on-band">
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
