import { useState } from "react";
import { ShieldCheck, Phone, Copy, Check, ExternalLink } from "lucide-react";

const REF_CODE = "CHIEN005";
const SIGNUP_URL = "https://open.kafi.vn/x";
// Các bước theo trang đăng ký chính thức của KAFI (open.kafi.vn/x).
const STEPS: [string, string][] = [
  ["Tải ứng dụng Kafi X", "Tìm “Kafi X” trên App Store hoặc Google Play (hoặc quét mã QR trên trang đăng ký của KAFI), tải về và chọn đăng ký mở tài khoản."],
  ["Nhập thông tin cá nhân", "Điền thông tin cá nhân theo các ô trong ứng dụng."],
  ["Tạo thông tin đăng nhập", "Đặt thông tin đăng nhập để dùng cho tài khoản sau này."],
  ["Xác thực eKYC và thông tin định danh", "Xác thực danh tính điện tử (eKYC) theo hướng dẫn trên màn hình."],
  ["Đăng ký dịch vụ và ký hợp đồng", "Chọn dịch vụ cần dùng và ký hợp đồng để hoàn tất."],
];

function RefCode() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(REF_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked: the code is still visible to type by hand */
    }
  };
  return (
    <div className="sm-egg flex flex-col p-8">
      <span className="text-[0.95rem] font-semibold text-[#6b5a2a]">Mã giới thiệu</span>
      <b className="mt-2 font-display text-[3rem] leading-[1.1] tracking-[0.04em] text-[var(--sm-ink)]">{REF_CODE}</b>
      <p className="mt-1 text-[0.95rem] leading-relaxed text-[#55604f]">
        Nhập mã này khi ứng dụng hỏi mã giới thiệu, để anh Chiến hỗ trợ trực tiếp.
      </p>
      <hr className="my-6 border-0 border-t border-[var(--sm-gold)]" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <a href="https://zalo.me/0886284212" target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--sm-ink)] hover:underline">
          Zalo 0886.284.212
        </a>
        <button
          type="button"
          onClick={copy}
          className="inline-flex min-h-9 items-center gap-2 rounded-[2px] border border-[#7a6a3e] px-4 text-[0.9rem] font-semibold text-[#4a3f20] transition-colors hover:bg-[rgba(122,106,62,0.1)]"
        >
          {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {copied ? "Đã sao chép" : "Sao chép mã"}
        </button>
      </div>
    </div>
  );
}

// Account-opening guide: 5 steps + referral code, the how-to video, then two cards — what you get, and
// who to ask. The Zalo button is the one orange element on the page.
export default function AccountOpeningGuide() {
  return (
    <div className="gutter-x mx-auto max-w-[1920px] pt-12 pb-20 lg:pt-16">
      <p className="text-[0.92rem] text-[var(--sm-mut)]">Hướng dẫn</p>
      <h1 className="mt-4 max-w-[52rem] font-display text-[clamp(2.2rem,4.4vw,3.1rem)] leading-[1.15] text-[var(--sm-egg)]">
        Mở tài khoản Kafi X ngay trên điện thoại.
      </h1>
      <p className="mt-4 max-w-[40rem] text-[1.15rem] leading-relaxed text-[var(--sm-egg2)]">
        Làm theo 5 bước dưới đây. Nếu vướng ở bước nào, nhắn Zalo cho anh Chiến để được hướng dẫn.
      </p>

      <div className="mt-12 grid items-start gap-x-6 gap-y-10 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7">
          <ol className="border-t border-[var(--sm-gold)]">
            {STEPS.map(([t, d], i) => (
              <li key={t} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-5 border-b border-[var(--sm-line)] py-6 last:border-b-0">
                <span className="font-display text-[2.4rem] leading-none text-[var(--sm-gold2)] tabular-nums">{i + 1}</span>
                <div>
                  <h2 className="text-[1.2rem] leading-snug text-[var(--sm-egg)]" style={{ fontFamily: "var(--font-sans)", fontWeight: 600 }}>
                    {t}
                  </h2>
                  <p className="mt-2 text-[0.98rem] leading-relaxed text-[var(--sm-mut)]">{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <aside className="flex min-w-0 flex-col gap-4 lg:col-span-4 lg:col-start-9">
          <RefCode />
          <a href={SIGNUP_URL} target="_blank" rel="noopener noreferrer" className="sm-btn sm-btn-p w-full">
            Mở trang đăng ký Kafi X
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
          <div className="mt-2 aspect-video overflow-hidden rounded-md border border-[var(--sm-line)] bg-[#0b0f0a]">
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
          <div className="flex items-start gap-3 rounded-md border border-[var(--sm-line)] bg-[var(--sm-panel)] p-5">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--sm-gold2)]" strokeWidth={1.75} aria-hidden="true" />
            <div>
              <p className="font-semibold text-[var(--sm-egg)]">Mở tài khoản miễn phí</p>
              <p className="mt-1 text-[0.92rem] text-[var(--sm-mut)]">Không phí duy trì, được hỗ trợ trực tiếp bởi Nguyễn Anh Chiến, chuyên viên tư vấn đầu tư, CTCP Chứng khoán KAFI.</p>
              <a href="tel:0886284212" className="mt-2 inline-flex min-h-10 items-center gap-2 font-semibold text-[var(--sm-gold2)] hover:underline">
                <Phone className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                0886.284.212
              </a>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
