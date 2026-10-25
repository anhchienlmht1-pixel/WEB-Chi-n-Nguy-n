import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";

// Decorative candles for the bottom of each feature tile — [wick top, wick
// bottom, body top, body height] in a 290×90 box. Pure ornament (aria-hidden),
// not market data.
const CANDLES: number[][][] = [
  [[50,86,58,20],[44,80,52,18],[40,78,48,22],[54,88,60,16],[36,74,42,24],[30,66,36,20],[38,72,44,18],[26,62,32,22],[20,58,26,20],[30,64,36,16],[14,52,20,22],[22,56,28,18],[8,46,14,22],[16,50,22,16]],
  [[30,66,36,20],[22,60,28,22],[34,70,40,18],[18,56,24,22],[26,62,32,18],[40,76,46,20],[32,68,38,18],[46,82,52,20],[38,74,44,18],[52,86,58,16],[44,80,50,18],[56,88,62,16],[48,84,54,18],[60,90,66,14]],
  [[62,88,68,14],[58,86,64,14],[54,84,60,16],[50,80,56,14],[52,82,58,14],[44,76,50,16],[38,70,44,16],[34,64,40,14],[28,60,34,16],[22,54,28,16],[16,48,22,16],[12,42,18,14],[6,38,12,16],[2,32,8,14]],
  [[40,74,46,18],[34,70,40,20],[44,78,50,18],[30,66,36,20],[22,58,28,20],[32,66,38,18],[24,60,30,20],[16,52,22,20],[26,60,32,18],[18,54,24,20],[10,46,16,20],[20,54,26,18],[12,48,18,20],[4,40,10,20]],
];

function Candles({ data }: { data: number[][] }) {
  return (
    <svg
      width="100%"
      height="90"
      viewBox="0 0 290 90"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 opacity-30"
    >
      <g stroke="#2fb39a" fill="#2fb39a" strokeWidth="1.5">
        {data.map(([w1, w2, ry, rh], i) => (
          <g key={i}>
            <line x1={12 + i * 20} y1={w1} x2={12 + i * 20} y2={w2} />
            <rect x={7 + i * 20} y={ry} width="10" height={rh} />
          </g>
        ))}
      </g>
    </svg>
  );
}

const ICON = {
  width: 28,
  height: 28,
  viewBox: "0 0 28 28",
  fill: "none",
  stroke: "#ffffff",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

interface Feature {
  icon: ReactNode;
  title: string;
  desc: string;
  linkLabel: string;
  to: string;
}

const FEATURES: Feature[] = [
  {
    icon: (
      <svg {...ICON}>
        <circle cx="14" cy="14" r="11" />
        <circle cx="14" cy="14" r="5.5" />
        <path d="M14 14 L23 6" />
      </svg>
    ),
    title: "Quét toàn thị trường",
    desc: "Tự động rà soát hơn 70 mã trên nến ngày đã đóng cửa theo hệ thống Trend Following.",
    linkLabel: "Xem tín hiệu",
    to: "#tin-hieu",
  },
  {
    icon: (
      <svg {...ICON}>
        <circle cx="14" cy="14" r="11" />
        <path d="M14 8 V14 L18.5 16.5" />
      </svg>
    ),
    title: "Chốt sau mỗi phiên",
    desc: "Tín hiệu Mua/Bán và nhật ký giao dịch chỉ kết luận sau 15:00, không nhảy số trong phiên.",
    linkLabel: "Xem nhật ký",
    to: "#nhat-ky",
  },
  {
    icon: (
      <svg {...ICON}>
        <path d="M3 22 L10 13 L15 17.5 L24 6" />
        <path d="M18 6 H24 V12" />
      </svg>
    ),
    title: "Điểm vào rõ ràng",
    desc: "Ngày vào tín hiệu, thời gian nắm giữ và lãi/lỗ hiện tại của từng mã.",
    linkLabel: "Xem danh sách",
    to: "#tin-hieu",
  },
  {
    icon: (
      <svg {...ICON}>
        <path d="M14 3 L23 6.5 V13.5 C23 19 19.5 22.5 14 25 C8.5 22.5 5 19 5 13.5 V6.5 Z" />
        <path d="M10 14 L13 17 L18.5 11" />
      </svg>
    ),
    title: "Mở tài khoản miễn phí",
    desc: "Không phí duy trì, được hỗ trợ trực tiếp bởi chuyên viên tư vấn.",
    linkLabel: "Xem hướng dẫn",
    to: "/huong-dan-mo-tai-khoan",
  },
];

const SMALL_CAPS = "text-xs font-semibold uppercase tracking-[0.14em]";

const TAGLINE = ["Tín hiệu rõ ràng.", "Kỷ luật là lợi thế.", "Quyết định là của bạn."];

// Start delay / duration (ms) of an intro animation — read by .hero-* in
// index.css. The whole intro is a one-time ~3s sequence (see .ux-profile.md).
const motion = (delayMs: number, durMs?: number) =>
  ({ "--delay": `${delayMs}ms`, ...(durMs ? { "--dur": `${durMs}ms` } : {}) }) as CSSProperties;

// Decorative rising candles + trend line along the bottom of the hero. Seeded,
// so it's the same every visit; pure ornament (aria-hidden), not market data.
const BAND_N = 28;
const BAND_W = 100; // viewBox units; height 40
const BAND_H = 40;
const bandY = (v: number) => BAND_H - v * 38;
const bandX = (i: number) => 3 + ((i + 0.5) * 94) / BAND_N;

const BAND = (() => {
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const candles = [];
  for (let i = 0; i < BAND_N; i++) {
    const base = 0.12 + 0.68 * (i / (BAND_N - 1));
    const c = Math.min(0.86, Math.max(0.08, base + (rnd() - 0.5) * 0.18));
    const up = rnd() > 0.22;
    const body = 0.06 + rnd() * 0.09;
    const o = up ? c - body : c + body * 0.8;
    const hi = Math.min(1, Math.max(o, c) + 0.03 + rnd() * 0.07);
    const lo = Math.max(0.02, Math.min(o, c) - 0.03 - rnd() * 0.07);
    candles.push({ o, c, hi, lo, up });
  }
  // Line through a 5-point moving average of the candle tops, so it reads as a
  // trend rather than tracing every candle.
  const tops = candles.map((k) => Math.max(k.o, k.c));
  const pts = tops.map((_, i) => {
    const from = Math.max(0, i - 2);
    const to = Math.min(tops.length - 1, i + 2);
    let sum = 0;
    for (let j = from; j <= to; j++) sum += tops[j];
    return [bandX(i), bandY(Math.min(1, sum / (to - from + 1) + 0.1))] as const;
  });
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    const mx = (px + cx) / 2;
    d += ` C ${mx} ${py}, ${mx} ${cy}, ${cx} ${cy}`;
  }
  const last = pts[pts.length - 1];
  return { candles, d, end: { left: last[0], bottom: ((BAND_H - last[1]) / BAND_H) * 100 } };
})();

function HeroBand() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[clamp(70px,8.5vw,130px)]"
    >
      <svg
        className="absolute inset-0 h-full w-full opacity-30"
        viewBox={`0 0 ${BAND_W} ${BAND_H}`}
        preserveAspectRatio="none"
      >
        {BAND.candles.map((k, i) => {
          const x = bandX(i);
          const col = k.up ? "#2a8c7d" : "#94a1a0";
          const top = bandY(Math.max(k.o, k.c));
          const bot = bandY(Math.min(k.o, k.c));
          return (
            <g key={i} className="hero-candle" style={motion(100 + i * 40, 500)}>
              <line
                x1={x}
                x2={x}
                y1={bandY(k.hi)}
                y2={bandY(k.lo)}
                stroke={col}
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
              />
              <rect x={x - 0.65} y={top} width={1.3} height={Math.max(0.6, bot - top)} fill={col} />
            </g>
          );
        })}
      </svg>
      {/* The trend line is revealed left to right by an animated clip-path. */}
      <div className="hero-line absolute inset-0" style={motion(500, 1900)}>
        <svg
          className="h-full w-full"
          viewBox={`0 0 ${BAND_W} ${BAND_H}`}
          preserveAspectRatio="none"
          overflow="visible"
        >
          <path
            d={BAND.d}
            fill="none"
            stroke="#2fb39a"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      <span
        className="hero-fade absolute h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-[#2fb39a]"
        style={{ left: `${BAND.end.left}%`, bottom: `${BAND.end.bottom}%`, ...motion(2400, 400) }}
      />
    </div>
  );
}

// Homepage hero, editorial style: a giant "STOCK" wordmark with the bull
// standing in front of it, a CTA row, then a black strip of four features.
export default function HomeHero() {
  // One size drives the stage height, the wordmark and the bull.
  const stage = { "--fs": "clamp(52px, 18.8vw, 272px)" } as CSSProperties;

  return (
    <>
      <section className="gutter-x relative isolate pb-[clamp(96px,11vw,170px)] pt-12" style={stage}>
        <HeroBand />
        <div className="mx-auto max-w-[1800px]">
          <div className="relative z-[3] max-w-[300px]">
            <p className="text-xs font-semibold uppercase leading-[1.9] tracking-[0.16em]">
              {TAGLINE.map((line, i) => (
                <span key={line} className="hero-up block" style={motion(1500 + i * 110, 600)}>
                  {line}
                </span>
              ))}
            </p>
            <div className="hero-rule mt-3.5 h-0.5 w-[30px] bg-ink" style={motion(2000, 500)} />
          </div>

          {/* The stage shakes a few pixels when the bull lands (~1.8s). */}
          <div className="hero-shake relative mt-3" style={{ height: "calc(var(--fs) * 1.7)", ...motion(1750, 450) }}>
            <h1
              className="absolute inset-x-0 bottom-0 z-0 m-0 whitespace-nowrap text-center editorial text-ink"
              style={{
                fontStretch: "125%",
                fontSize: "var(--fs)",
                lineHeight: 0.8,
                letterSpacing: "-0.02em",
              }}
            >
              <span className="sr-only">C STOCK</span>
              {/* One masked span per letter so they rise in turn, then a teal
                  pass runs through them; hidden from screen readers (the
                  sr-only text above carries the name). */}
              {"STOCK".split("").map((ch, i) => (
                <span key={i} aria-hidden="true" className="hero-mask">
                  <span className="hero-letter inline-block" style={motion(150 + i * 90, 850)}>
                    <span className="hero-scan inline-block" style={motion(2300 + i * 130, 520)}>
                      {ch}
                    </span>
                  </span>
                </span>
              ))}
            </h1>
            {/* Halo + bull charge in together as one layer. */}
            <div className="hero-charge absolute inset-0 z-[1]" style={motion(950, 1000)}>
              {/* Soft halo so the bull reads against the letters behind it. */}
              <div
                aria-hidden="true"
                className="absolute bottom-0 z-[1] opacity-75"
                style={{
                  left: "62%",
                  transform: "translateX(-50%)",
                  width: "calc(var(--fs) * 1.5)",
                  height: "60%",
                  background: "radial-gradient(closest-side, var(--paper), transparent)",
                }}
              />
              <img
                src="/hero-bull.png"
                alt="Con bò đang lao tới trước những cây nến tăng"
                width={640}
                height={672}
                className="absolute z-[2] block w-auto max-w-none"
                // Inline: the unlayered `img { height: auto }` in index.css would
                // beat a utility class here.
                style={{ left: "62%", bottom: "-2%", transform: "translateX(-50%)", height: "100%" }}
              />
            </div>
          </div>

          <div className="relative z-[3] mt-9 flex flex-wrap items-center justify-between gap-x-6 gap-y-5">
            <div
              className={`hero-fade flex flex-wrap items-center gap-x-7 gap-y-5 ${SMALL_CAPS}`}
              style={motion(1500, 500)}
            >
              <Link
                to="/huong-dan-mo-tai-khoan"
                className="bg-ink px-7 py-[17px] text-paper transition-opacity hover:opacity-80"
              >
                Mở tài khoản
              </Link>
              <a
                href="#tin-hieu"
                className="inline-flex items-center gap-2.5 border-b border-ink pb-[5px] transition-opacity hover:opacity-70"
              >
                Xem tín hiệu hôm nay
                <svg width="9" height="10" viewBox="0 0 9 10" aria-hidden="true">
                  <path d="M1 1 L8 5 L1 9 Z" fill="currentColor" />
                </svg>
              </a>
            </div>
            <div className="hero-fade text-right" style={motion(1700, 500)}>
              <p className={`${SMALL_CAPS} leading-[1.8] tracking-[0.16em]`}>Trend Following</p>
              <div className="ml-auto mt-2.5 h-0.5 w-[30px] bg-ink" />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-band text-white">
        <div className="gutter-x mx-auto max-w-[1800px]">
          {/* gap-px over a tinted background draws the hairlines between tiles
              at every column count. */}
          <div className="grid grid-cols-1 gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon, title, desc, linkLabel, to }, i) => {
              const linkClass =
                "text-[11px] font-semibold uppercase tracking-[0.14em] transition-opacity hover:opacity-70";
              return (
                <div key={title} className="relative overflow-hidden bg-band px-7 pb-28 pt-10">
                  {icon}
                  <h3 className="mb-2.5 mt-[18px] font-sans text-xs font-bold uppercase tracking-[0.14em]">{title}</h3>
                  <p className="mb-4 max-w-60 text-[13px] leading-[1.65] text-quiet-on-band">{desc}</p>
                  {to.startsWith("/") ? (
                    <Link to={to} className={linkClass}>
                      {linkLabel} →
                    </Link>
                  ) : (
                    <a href={to} className={linkClass}>
                      {linkLabel} →
                    </a>
                  )}
                  <Candles data={CANDLES[i]} />
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
