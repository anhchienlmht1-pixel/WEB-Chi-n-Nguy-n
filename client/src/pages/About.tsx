import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import HeroMarketBeast from "../components/HeroMarketBeast";
import HeroSignals from "../components/HeroSignals";
import PriceBoard from "../components/PriceBoardBg";

// Introduction page ("Giới thiệu"): the Bull Stock message, what the site does
// for an investor, how the signal tool works, opening an account at KAFI, and
// who is behind it. Dark moss surface throughout; the only motion is the
// decorative price board behind the hero, a one-time rise-in of the title, and a
// neon bull charging out of the dark on the right of the hero (HeroBullCharge).

const ICONS: Record<string, ReactNode> = {
  signal: (
    <>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </>
  ),
  sector: (
    <>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="5" rx="1.5" />
      <rect x="13" y="10" width="8" height="11" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
    </>
  ),
  result: (
    <>
      <path d="M4 20h16" />
      <path d="M7 16v-4M12 16V8M17 16v-7" />
    </>
  ),
  video: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M10 9l5 3-5 3z" />
    </>
  ),
};

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      style={{ stroke: "var(--ab-accent)" }}
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}

const FEATURES: { icon: keyof typeof ICONS; title: string; text: string; href?: string }[] = [
  { icon: "signal", title: "Tín hiệu lệnh", text: "Danh sách mã đang đi lên, chốt sau 15:00 mỗi phiên." },
  { icon: "sector", title: "Dữ liệu ngành", text: "Ngành nào đang dẫn sóng, ngành nào đang yếu." },
  { icon: "result", title: "Kết quả lệnh công khai", text: "Lệnh thắng, lệnh thua đều ghi lại, không giấu." },
  {
    icon: "video",
    title: "Kênh YouTube",
    text: "Chiến Nguyễn Tài Chính: giải thích cách làm, nói chuyện thị trường.",
    href: "https://www.youtube.com/@chiennguyen.taichinh",
  },
];

const LINE = "border-b border-[var(--ab-line)] py-2.5 text-base leading-normal text-[var(--ab-text)]";
const BTN_ORANGE =
  "fx-btn inline-flex min-h-12 items-center justify-center rounded-lg bg-orange-600 px-6 text-base font-bold text-[#1b1f1a] transition-colors duration-200 hover:bg-orange-500";
const BTN_GHOST =
  "fx-btn fx-btn-ghost inline-flex min-h-12 items-center justify-center rounded-lg border border-[var(--ab-line-strong)] bg-[var(--ab-ghost)] px-5 text-base font-bold text-[var(--ab-strong)] transition-colors duration-200 hover:bg-[var(--ab-ghost-hover)]";

export default function About() {
  return (
    <div className="text-[var(--ab-text)]">
      {/* 1. Message — over the scrolling price board */}
      <section className="relative overflow-hidden bg-[var(--ab-bg)]">
        <PriceBoard />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(var(--ab-bg-rgb),0.96) 0%, rgba(var(--ab-bg-rgb),0.88) 40%, rgba(var(--ab-bg-rgb),0.55) 100%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-48"
          style={{ background: "linear-gradient(180deg, rgba(var(--ab-bg-rgb),0) 0%, var(--ab-bg) 100%)" }}
        />
        {/* Market animal on the right (wide screens): bull when VN-Index is up, bear when it is down */}
        <HeroMarketBeast />
        <div className="gutter-x pointer-events-none relative z-[1] mx-auto max-w-[1280px] pb-20 pt-16 sm:pt-20">
          <div className="pointer-events-auto max-w-[580px]">
            <HeroSignals />

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link to="/huong-dan-mo-tai-khoan" className={BTN_ORANGE}>
                Mở tài khoản
              </Link>
              <Link to={{ pathname: "/", hash: "#tin-hieu" }} className={BTN_GHOST}>
                Xem tất cả tín hiệu →
              </Link>
            </div>
            <p className="mt-7 text-sm text-[var(--ab-text2)]">
              <span className="font-bold text-[var(--ab-strong)]">Nguyễn Anh Chiến</span> · Chuyên viên tư vấn đầu tư, Chứng khoán
              KAFI
            </p>
            <p className="mt-2 text-xs leading-normal text-[var(--ab-muted)]">
              Giá đóng cửa, chưa trừ phí, thuế. Kết quả quá khứ không bảo đảm kết quả tương lai; không phải khuyến nghị mua
              bán.
            </p>
          </div>
        </div>
      </section>

      {/* 2. What Bull Stock does + how the tool works + opening an account */}
      <section className="bg-[var(--ab-bg)]">
        <div className="gutter-x mx-auto max-w-[1280px] pb-20 pt-6">
          <h2 className="text-[2.1rem] font-bold uppercase leading-tight tracking-[0.01em]">
            Bull Stock giúp gì cho nhà đầu tư
          </h2>
          <div className="mt-7 flex flex-wrap border-y border-[var(--ab-line)]">
            {FEATURES.map((f) => {
              const body = (
                <>
                  <Icon name={f.icon} />
                  <h3 className="mt-3.5 text-xl font-bold text-[var(--ab-strong)]">{f.title}</h3>
                  <p className="mt-1.5 text-base leading-normal text-[var(--ab-text2)]">{f.text}</p>
                </>
              );
              const cls = "fx-feature min-w-0 flex-[1_1_220px] border-l border-[var(--ab-line)] px-6 pb-6 pt-6";
              return f.href ? (
                <a key={f.title} href={f.href} target="_blank" rel="noopener noreferrer" className={cls}>
                  {body}
                </a>
              ) : (
                <div key={f.title} className={cls}>
                  {body}
                </div>
              );
            })}
          </div>

          <div className="mt-14 flex flex-wrap items-start gap-x-16 gap-y-10">
            <div className="min-w-0 flex-[1_1_440px]">
              <h3 className="text-[1.6rem] font-bold text-[var(--ab-strong)]">Công cụ tín hiệu lệnh hoạt động thế nào</h3>
              <p className="mt-2.5 text-[1.0625rem] leading-relaxed text-[var(--ab-text)]">
                Mỗi ngày sau 15:00, hệ thống tự lọc ra những mã đang đi lên rõ ràng. Anh chị không cần ngồi dò hàng trăm
                mã.
              </p>
              <ul className="mt-4 border-t border-[var(--ab-line)]">
                <li className={LINE}>
                  <b className="text-[var(--ab-strong)]">Chỉ chọn mã đang lên đều,</b> không chọn mã chỉ nhích lên một hôm.
                </li>
                <li className={LINE}>
                  <b className="text-[var(--ab-strong)]">Chỉ chọn khi đà đủ mạnh,</b> bỏ qua mã đi ngang lình xình.
                </li>
                <li className={LINE}>
                  <b className="text-[var(--ab-strong)]">Xu hướng gãy thì mã tự rời danh sách,</b> nhắc anh chị cân nhắc thoát, không
                  ôm hàng.
                </li>
              </ul>
              <p className="mt-3.5 text-sm leading-normal text-[var(--ab-muted)]">
                Dựa trên đường trung bình giá, độ mạnh xu hướng và Supertrend, tính trên giá đóng cửa. Chỉ để tham khảo,
                quyết định mua bán là của nhà đầu tư.
              </p>
              <p className="mt-4">
                <Link
                  to={{ pathname: "/", hash: "#tin-hieu" }}
                  className="inline-flex min-h-11 items-center border-b border-[#7c9a6a] text-[1.0625rem] font-bold text-[var(--ab-strong)]"
                >
                  Xem tín hiệu phiên gần nhất
                </Link>
              </p>
            </div>

            <div className="fx-card min-w-0 flex-[1_1_380px] rounded-lg border border-[var(--ab-line)] bg-[var(--ab-bg2)] p-7">
              <div className="flex items-center gap-3.5">
                <img src="/kafi-logo.png" alt="Logo KAFI" className="block h-11! w-11 rounded-[10px]" />
                <h3 className="text-[1.4rem] font-bold text-[var(--ab-strong)]">Mở tài khoản tại KAFI</h3>
              </div>
              <ul className="mt-4 border-t border-[var(--ab-line)]">
                <li className={LINE}>Mở miễn phí trên điện thoại, qua app KAFI X.</li>
                <li className={LINE}>Không phí duy trì tài khoản.</li>
                <li className={LINE}>Vướng bước nào thì nhắn Zalo cho anh Chiến.</li>
              </ul>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/huong-dan-mo-tai-khoan" className={BTN_ORANGE}>
                  Mở tài khoản
                </Link>
                <a href="https://zalo.me/0886284212" target="_blank" rel="noopener noreferrer" className={BTN_GHOST}>
                  Nhắn Zalo
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Who is behind it */}
      <section className="border-t border-[var(--ab-line)] bg-[var(--ab-bg2)]">
        <div className="gutter-x mx-auto max-w-[1280px] py-16">
          <h2 className="text-[2.1rem] font-bold">Nguyễn Anh Chiến</h2>
          <p className="mt-1.5 text-lg text-[var(--ab-accent)]">Chuyên viên tư vấn đầu tư, CTCP Chứng khoán KAFI</p>
          <p className="mt-4 max-w-2xl text-[1.0625rem] leading-relaxed text-[var(--ab-text)]">
            Đầu tư theo xu hướng, đặt quản trị rủi ro lên hàng đầu: đi theo con sóng lớn, sai thì cắt sớm.
          </p>
          <div className="mt-6 max-w-2xl border-t border-[var(--ab-line)]">
            <div className="fx-row flex flex-wrap gap-x-6 gap-y-1 border-b border-[var(--ab-line)] py-3 pl-3 transition-colors duration-200 hover:bg-[var(--ab-hover)]">
              <span className="flex-[0_0_200px] text-[0.95rem] text-[var(--ab-muted)]">Điện thoại, Zalo</span>
              <a href="tel:0886284212" className="flex-[1_1_200px] text-[1.0625rem] font-bold text-[var(--ab-strong)]">
                0886.284.212
              </a>
            </div>
            <div className="fx-row flex flex-wrap gap-x-6 gap-y-1 border-b border-[var(--ab-line)] py-3 pl-3 transition-colors duration-200 hover:bg-[var(--ab-hover)]">
              <span className="flex-[0_0_200px] text-[0.95rem] text-[var(--ab-muted)]">YouTube</span>
              <a
                href="https://www.youtube.com/@chiennguyen.taichinh"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-[1_1_200px] text-base text-[var(--ab-text)] hover:text-[var(--ab-strong)] hover:underline"
              >
                Chiến Nguyễn Tài Chính
              </a>
            </div>
            <div className="fx-row flex flex-wrap gap-x-6 gap-y-1 border-b border-[var(--ab-line)] py-3 pl-3 transition-colors duration-200 hover:bg-[var(--ab-hover)]">
              <span className="flex-[0_0_200px] text-[0.95rem] text-[var(--ab-muted)]">Facebook</span>
              <a
                href="https://www.facebook.com/chiennguyen.taichinh/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-[1_1_200px] text-base text-[var(--ab-text)] hover:text-[var(--ab-strong)] hover:underline"
              >
                chiennguyen.taichinh
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
