import { ShieldCheck, Phone } from "lucide-react";

// Account-opening guide: the how-to video, then two cards — what you get, and
// who to ask. The Zalo button is the one orange element on the page.
export default function AccountOpeningGuide() {
  return (
    <div className="gutter-x mx-auto flex max-w-[1040px] flex-col gap-10 py-14">
      <div className="flex flex-col gap-3">
        <p className="text-sm font-bold uppercase tracking-[0.08em] text-emerald-700">Hướng dẫn</p>
        <h1 className="text-balance text-[clamp(1.75rem,3.2vw,2.25rem)] font-bold leading-tight">
          Mở tài khoản chứng khoán
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-slate-900">
          Xem video hướng dẫn chi tiết cách mở tài khoản giao dịch chứng khoán.
        </p>
      </div>

      {/* Video */}
      <div className="aspect-video overflow-hidden rounded-md bg-emerald-700">
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
        <div className="flex min-w-0 flex-[1_1_22rem] flex-col gap-3 rounded-md bg-emerald-50 p-7">
          <ShieldCheck className="h-7 w-7 text-emerald-700" strokeWidth={1.75} aria-hidden="true" />
          <h2 className="text-2xl font-bold leading-snug">Mở tài khoản miễn phí</h2>
          <p className="text-lg leading-relaxed text-slate-900">
            Không phí duy trì, được hỗ trợ trực tiếp bởi chuyên viên tư vấn.
          </p>
        </div>

        <div className="flex min-w-0 flex-[1_1_22rem] flex-col gap-1.5 rounded-md border border-slate-200 p-7">
          <h2 className="mb-1.5 text-2xl font-bold leading-snug">Cần người hỗ trợ?</h2>
          <p className="text-lg font-bold leading-snug text-slate-900">Nguyễn Anh Chiến</p>
          <p className="text-base leading-normal text-slate-600">Chuyên viên tư vấn đầu tư — CTCP Chứng khoán KAFI</p>
          <a
            href="tel:0886284212"
            className="inline-flex min-h-11 items-center gap-2 text-lg font-bold text-emerald-700 hover:underline"
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
