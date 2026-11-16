import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import HeroBullCharge from "../components/HeroBullCharge";

// Introduction page ("Giới thiệu"): the Bull Stock message, what the site does
// for an investor, how the signal tool works, opening an account at KAFI, and
// who is behind it. Dark moss surface throughout; the only motion is the
// decorative price board behind the hero, a one-time rise-in of the title, and a
// neon bull charging out of the dark on the right of the hero (HeroBullCharge).

const SYMBOLS = [
  "ACB", "BID", "BSR", "CTG", "FPT", "GAS", "GVR", "HDB", "HPG", "LPB", "MBB", "MCH", "MSN", "MWG",
  "PLX", "SAB", "SHB", "SSI", "STB", "TCB", "TPB", "VCB", "VHM", "VIB", "VIC", "VJC", "VNM", "VPB",
];

// Deterministic pseudo-random numbers so the decorative board is identical on
// every render (no hydration or re-render flicker).
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

type Cell = { text: string; cls: string; flash?: { kind: "fu" | "fd"; delay: number; dur: number } };

function buildBoard(): Cell[][] {
  const r = rng(7);
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  const fmt = (v: number) => v.toFixed(2);
  const vol = () => (Math.floor(r() * 900) + 1) * 100;
  return SYMBOLS.map((sym) => {
    const ref = Math.round((15 + r() * 115) * 20) / 20;
    const col = (v: number) => (v > ref ? "u" : v < ref ? "d" : "r");
    const steps = [-0.3, -0.2, -0.1, -0.05, 0, 0.05, 0.1, 0.2, 0.3];
    const prices = Array.from({ length: 7 }, () => Math.round((ref + pick(steps)) * 20) / 20);
    const row: Cell[] = [
      { text: sym, cls: pick(["u", "d", "r"]) },
      { text: fmt(ref * 1.07), cls: "c" },
      { text: fmt(ref * 0.93), cls: "f" },
      { text: fmt(ref), cls: "r" },
    ];
    prices.forEach((p, i) => {
      const k = i === 3 ? " k" : "";
      row.push({ text: fmt(p), cls: col(p) + k });
      row.push({ text: vol().toLocaleString("en-US"), cls: col(p) + k });
      if (i === 3) {
        const ch = p - ref;
        row.push({ text: (ch >= 0 ? "+" : "") + ch.toFixed(2), cls: col(p) });
        row.push({ text: (ch >= 0 ? "+" : "") + ((ch / ref) * 100).toFixed(2) + "%", cls: col(p) });
      }
    });
    row.push({ text: ((Math.floor(r() * 150) + 1) * 100000).toLocaleString("en-US"), cls: "r" });
    return row.map((c) =>
      r() < 0.28 ? { ...c, flash: { kind: r() < 0.5 ? "fu" : "fd", delay: r() * 6, dur: 2.4 + r() * 3.1 } } : c
    );
  });
}

const BOARD = buildBoard();

function PriceBoard() {
  const rows = [...BOARD, ...BOARD];
  return (
    <div aria-hidden="true" className="pb-wrap">
      <table className="pb">
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((c, j) => (
                <td
                  key={j}
                  className={`${c.cls}${c.flash ? " " + c.flash.kind : ""}`}
                  style={{
                    textAlign: j === 0 ? "left" : undefined,
                    ...(c.flash ? { animationDelay: `${c.flash.delay.toFixed(2)}s`, animationDuration: `${c.flash.dur.toFixed(2)}s` } : {}),
                  }}
                >
                  {c.text}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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
      stroke="#b9cba9"
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

const LINE = "border-b border-[rgba(185,203,169,0.14)] py-2.5 text-base leading-normal text-[#d5dfcc]";
const BTN_ORANGE =
  "fx-btn inline-flex min-h-12 items-center justify-center rounded-lg bg-orange-600 px-6 text-base font-bold text-[#1b1f1a] transition-colors duration-200 hover:bg-orange-500";
const BTN_GHOST =
  "fx-btn fx-btn-ghost inline-flex min-h-12 items-center justify-center rounded-lg border border-[rgba(213,223,204,0.35)] bg-[rgba(255,255,255,0.05)] px-5 text-base font-bold text-[#fff] transition-colors duration-200 hover:bg-[rgba(255,255,255,0.1)]";

export default function About() {
  return (
    <div className="theme-dark text-[#d5dfcc]">
      {/* 1. Message — over the scrolling price board */}
      <section className="relative overflow-hidden bg-[#0b110d]">
        <PriceBoard />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(11,17,13,0.96) 0%, rgba(11,17,13,0.88) 40%, rgba(11,17,13,0.55) 100%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-48"
          style={{ background: "linear-gradient(180deg, rgba(11,17,13,0) 0%, #0b110d 100%)" }}
        />
        {/* Neon bull: rises from the bottom-left corner and charges up to the right (wide screens) */}
        <HeroBullCharge className="pointer-events-auto absolute bottom-0 left-0 hidden aspect-square h-full lg:block" />
        <div className="gutter-x pointer-events-none relative z-[1] mx-auto max-w-[1280px] pb-20 pt-16 sm:pt-20">
          <div className="pointer-events-auto max-w-[560px]">
            <p className="mb-4 text-lg font-bold text-[#b9cba9]">Theo xu hướng, cắt lỗ có kỷ luật.</p>
            <h1 className="leading-none text-[#fff]!">
              <span className="dt-rise block pt-[0.12em] text-[clamp(4rem,11vw,7.75rem)] font-bold leading-[1.2] tracking-[-0.02em]">
                ĐẦU TƯ
              </span>
              <span className="dt-rise dt-rise-2 mt-2 flex flex-wrap items-baseline gap-x-3.5">
                <span className="text-[1.75rem] font-normal text-[#c9d5bf]">là chuyện</span>
                <span className="text-[clamp(2.4rem,5vw,3.25rem)] font-bold tracking-[-0.01em] text-[#fff]">CẢ ĐỜI</span>
              </span>
              <span className="dt-rise dt-rise-3 mt-2 flex flex-wrap items-baseline gap-x-3.5">
                <span className="text-[1.75rem] font-normal text-[#8fa882]">không phải</span>
                <span className="dt-out text-[clamp(2.4rem,5vw,3.25rem)] font-bold tracking-[-0.01em]">HÔM NAY</span>
              </span>
            </h1>

            <ul className="mt-8 border-t border-[rgba(213,223,204,0.16)]">
              {[
                "Không yêu cổ phiếu.",
                "Phân tích kỹ thuật, phân tích cơ bản, mọi góc nhìn đều chỉ là tham khảo.",
                "Chỉ nhìn vào giá và khối lượng.",
              ].map((t, i) => (
                <li
                  key={t}
                  className="grid grid-cols-[30px_1fr] items-baseline border-b border-[rgba(213,223,204,0.16)] py-3.5"
                >
                  <span aria-hidden="true" className="mt-[11px] block h-0.5 w-3.5 bg-[#7c9a6a]" />
                  <span className={`text-[1.0625rem] font-medium leading-snug ${i === 2 ? "text-[#fff]" : "text-[#e7ece2]"}`}>
                    {t}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/huong-dan-mo-tai-khoan" className={BTN_ORANGE}>
                Mở tài khoản
              </Link>
              <Link to={{ pathname: "/", hash: "#tin-hieu" }} className={BTN_GHOST}>
                Xem tín hiệu phiên gần nhất →
              </Link>
            </div>
            <p className="mt-7 text-sm text-[#a9b8a0]">
              <span className="font-bold text-[#fff]">Nguyễn Anh Chiến</span> · Chuyên viên tư vấn đầu tư, Chứng khoán
              KAFI
            </p>
          </div>
        </div>
      </section>

      {/* 2. What Bull Stock does + how the tool works + opening an account */}
      <section className="bg-[#0b110d]">
        <div className="gutter-x mx-auto max-w-[1280px] pb-20 pt-6">
          <h2 className="text-[2.1rem] font-bold uppercase leading-tight tracking-[0.01em]">
            Bull Stock giúp gì cho nhà đầu tư
          </h2>
          <div className="mt-7 flex flex-wrap border-y border-[rgba(185,203,169,0.18)]">
            {FEATURES.map((f) => {
              const body = (
                <>
                  <Icon name={f.icon} />
                  <h3 className="mt-3.5 text-xl font-bold text-[#fff]">{f.title}</h3>
                  <p className="mt-1.5 text-base leading-normal text-[#b8c4ae]">{f.text}</p>
                </>
              );
              const cls = "fx-feature min-w-0 flex-[1_1_220px] border-l border-[rgba(185,203,169,0.18)] px-6 pb-6 pt-6";
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
              <h3 className="text-[1.6rem] font-bold text-[#fff]">Công cụ tín hiệu lệnh hoạt động thế nào</h3>
              <p className="mt-2.5 text-[1.0625rem] leading-relaxed text-[#d5dfcc]">
                Mỗi ngày sau 15:00, hệ thống tự lọc ra những mã đang đi lên rõ ràng. Anh chị không cần ngồi dò hàng trăm
                mã.
              </p>
              <ul className="mt-4 border-t border-[rgba(185,203,169,0.14)]">
                <li className={LINE}>
                  <b className="text-[#fff]">Chỉ chọn mã đang lên đều,</b> không chọn mã chỉ nhích lên một hôm.
                </li>
                <li className={LINE}>
                  <b className="text-[#fff]">Chỉ chọn khi đà đủ mạnh,</b> bỏ qua mã đi ngang lình xình.
                </li>
                <li className={LINE}>
                  <b className="text-[#fff]">Xu hướng gãy thì mã tự rời danh sách,</b> nhắc anh chị cân nhắc thoát, không
                  ôm hàng.
                </li>
              </ul>
              <p className="mt-3.5 text-sm leading-normal text-[#8fa882]">
                Dựa trên đường trung bình giá, độ mạnh xu hướng và Supertrend, tính trên giá đóng cửa. Chỉ để tham khảo,
                quyết định mua bán là của nhà đầu tư.
              </p>
              <p className="mt-4">
                <Link
                  to={{ pathname: "/", hash: "#tin-hieu" }}
                  className="inline-flex min-h-11 items-center border-b border-[#7c9a6a] text-[1.0625rem] font-bold text-[#fff]"
                >
                  Xem tín hiệu phiên gần nhất
                </Link>
              </p>
            </div>

            <div className="fx-card min-w-0 flex-[1_1_380px] rounded-lg border border-[rgba(185,203,169,0.22)] bg-[#121a11] p-7">
              <div className="flex items-center gap-3.5">
                <img src="/kafi-logo.png" alt="Logo KAFI" className="block h-11! w-11 rounded-[10px]" />
                <h3 className="text-[1.4rem] font-bold text-[#fff]">Mở tài khoản tại KAFI</h3>
              </div>
              <ul className="mt-4 border-t border-[rgba(185,203,169,0.14)]">
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
      <section className="border-t border-[rgba(185,203,169,0.12)] bg-[#121a11]">
        <div className="gutter-x mx-auto max-w-[1280px] py-16">
          <h2 className="text-[2.1rem] font-bold">Nguyễn Anh Chiến</h2>
          <p className="mt-1.5 text-lg text-[#b9cba9]">Chuyên viên tư vấn đầu tư, CTCP Chứng khoán KAFI</p>
          <p className="mt-4 max-w-2xl text-[1.0625rem] leading-relaxed text-[#d5dfcc]">
            Đầu tư theo xu hướng, đặt quản trị rủi ro lên hàng đầu: đi theo con sóng lớn, sai thì cắt sớm.
          </p>
          <div className="mt-6 max-w-2xl border-t border-[rgba(185,203,169,0.14)]">
            <div className="fx-row flex flex-wrap gap-x-6 gap-y-1 border-b border-[rgba(185,203,169,0.14)] py-3 pl-3 transition-colors duration-200 hover:bg-[rgba(127,214,168,0.05)]">
              <span className="flex-[0_0_200px] text-[0.95rem] text-[#8fa882]">Điện thoại, Zalo</span>
              <a href="tel:0886284212" className="flex-[1_1_200px] text-[1.0625rem] font-bold text-[#fff]">
                0886.284.212
              </a>
            </div>
            <div className="fx-row flex flex-wrap gap-x-6 gap-y-1 border-b border-[rgba(185,203,169,0.14)] py-3 pl-3 transition-colors duration-200 hover:bg-[rgba(127,214,168,0.05)]">
              <span className="flex-[0_0_200px] text-[0.95rem] text-[#8fa882]">YouTube</span>
              <a
                href="https://www.youtube.com/@chiennguyen.taichinh"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-[1_1_200px] text-base text-[#d5dfcc] hover:text-[#fff] hover:underline"
              >
                Chiến Nguyễn Tài Chính
              </a>
            </div>
            <div className="fx-row flex flex-wrap gap-x-6 gap-y-1 border-b border-[rgba(185,203,169,0.14)] py-3 pl-3 transition-colors duration-200 hover:bg-[rgba(127,214,168,0.05)]">
              <span className="flex-[0_0_200px] text-[0.95rem] text-[#8fa882]">Facebook</span>
              <a
                href="https://www.facebook.com/chiennguyen.taichinh/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-[1_1_200px] text-base text-[#d5dfcc] hover:text-[#fff] hover:underline"
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
