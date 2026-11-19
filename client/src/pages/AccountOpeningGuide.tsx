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
    <div className="flex flex-col gap-3 rounded-md border border-slate-200 p-7">
      <span className="text-base text-slate-500">Mã giới thiệu</span>
      <b className="text-[2.4rem] leading-none tracking-[0.06em] text-slate-900 tabular-nums">{REF_CODE}</b>
      <p className="text-base leading-relaxed text-slate-500">
        Nhập mã này khi ứng dụng hỏi mã giới thiệu, để anh Chiến hỗ trợ trực tiếp.
      </p>
      <div className="mt-1 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={copy}
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 px-4 font-bold text-slate-900 transition-colors hover:bg-slate-100"
        >
          {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {copied ? "Đã sao chép" : "Sao chép mã"}
        </button>
        <a
          href={SIGNUP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-md bg-orange-600 px-4 font-bold text-slate-950 transition-colors hover:bg-orange-500"
        >
          Mở trang đăng ký Kafi X
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}

// Account-opening guide: 5 steps + referral code, the how-to video, then two cards — what you get, and
// who to ask. The Zalo button is the one orange element on the page.
export default function AccountOpeningGuide() {
  return (
    <div className="gutter-x mx-auto flex max-w-[1040px] flex-col gap-10 py-14">
      <div className="flex flex-col gap-3">
        <h1 className="text-balance text-[clamp(1.75rem,3.2vw,2.25rem)] font-bold leading-tight">
          Mở tài khoản Kafi X ngay trên điện thoại
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-slate-900">
          Làm theo 5 bước dưới đây. Nếu vướng ở bước nào, nhắn Zalo cho anh Chiến để được hướng dẫn.
        </p>
      </div>

      <div className="grid items-start gap-8 md:grid-cols-[minmax(0,1fr)_340px]">
        <ol className="flex flex-col border-t border-slate-300">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4 border-b border-slate-200 py-5">
              <span className="text-[1.75rem] font-bold leading-none text-brand-700 tabular-nums">{i + 1}</span>
              <div>
                <h2 className="text-lg font-bold leading-snug">{t}</h2>
                <p className="mt-1 text-base leading-relaxed text-slate-500">{d}</p>
              </div>
            </li>
          ))}
        </ol>
        <RefCode />
      </div>

      {/* Video */}
      <div className="aspect-video overflow-hidden rounded-md border border-slate-200 bg-[#0b0f14]">
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

      <div className="flex flex-wrap items-stretch gap-6">
        <div className="flex min-w-0 flex-[1_1_22rem] flex-col gap-3 rounded-md border border-slate-200 p-7">
          <ShieldCheck className="h-7 w-7 text-brand-700" strokeWidth={1.75} aria-hidden="true" />
          <h2 className="text-2xl font-bold leading-snug">Mở tài khoản miễn phí</h2>
          <p className="text-lg leading-relaxed text-slate-900">
            Không phí duy trì, được hỗ trợ trực tiếp bởi chuyên viên tư vấn.
          </p>
        </div>

        <div className="flex min-w-0 flex-[1_1_22rem] flex-col gap-1.5 rounded-md border border-slate-200 p-7">
          <h2 className="mb-1.5 text-2xl font-bold leading-snug">Cần người hỗ trợ?</h2>
          <p className="text-lg font-bold leading-snug text-slate-900">Nguyễn Anh Chiến</p>
          <p className="text-base leading-normal text-slate-500">Chuyên viên tư vấn đầu tư — CTCP Chứng khoán KAFI</p>
          <a
            href="tel:0886284212"
            className="inline-flex min-h-11 items-center gap-2 text-lg font-bold text-brand-700 hover:underline"
          >
            <Phone className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
            0886.284.212
          </a>
          <a
            href="https://zalo.me/0886284212"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 inline-flex min-h-13 items-center justify-center self-start rounded-md bg-orange-600 px-7 text-lg font-bold text-slate-950 transition-colors duration-200 hover:bg-orange-500"
          >
            Tư vấn qua Zalo
          </a>
        </div>
      </div>
    </div>
  );
}
