import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Quote } from "../types";
import type { TradeJournal, TrendBuyResult } from "../api/client";
import { BANKS } from "../data/bankSector";
import { PROFIT } from "../data/bankValuation";
import { useSecSector } from "../data/securities";
import { useReSector } from "../data/realestate";
import { InsightCard, dmy, pct, useMarketTrend } from "./SonMaiHome";
import CompanyLogo from "./CompanyLogo";

// Các khối dùng chung cho trang Giới thiệu và trang Tín hiệu: tiêu đề mục,
// lưới sản phẩm (kèm số liệu sống), phương pháp 3 bước, chuyên viên và mở tài khoản.

const num = (n: number, d = 0) => n.toLocaleString("vi-VN", { minimumFractionDigits: d, maximumFractionDigits: d });
const tone = (n: number) => (n > 0 ? "up" : n < 0 ? "down" : "");

export function SectionHead({ title, lead, id, right }: { title: string; lead?: string; id?: string; right?: ReactNode }) {
  return (
    <div id={id} className="mb-6 flex scroll-mt-28 flex-wrap items-end justify-between gap-x-8 gap-y-3">
      <div className="max-w-[44rem]">
        <h2 className="text-[clamp(1.6rem,2.6vw,2.1rem)] leading-tight text-[var(--sm-egg)]">{title}</h2>
        {lead && <p className="mt-2 text-[1.02rem] leading-relaxed text-[var(--sm-egg2)]">{lead}</p>}
      </div>
      {right}
    </div>
  );
}

/* ---------------------------------------------------------- Bull Stock có gì */

export function ProductGrid({ quotes, scan, journal }: { quotes?: Quote[]; scan?: TrendBuyResult | null; journal?: TradeJournal | null }) {
  const { trend, trendCls, trendSub } = useMarketTrend();
  const { data: sec } = useSecSector();
  const vni = quotes?.find((q) => q.symbol === "VNINDEX");

  const pbt = BANKS.map((b) => PROFIT[b.bank]).filter(Boolean);
  const pbtNow = pbt.reduce((a, p) => a + p!.pbt, 0);
  const pbtPrev = pbt.reduce((a, p) => a + p!.pbtPrev, 0);
  const pbtYoy = pbtPrev ? (pbtNow / pbtPrev - 1) * 100 : 0;
  const upBanks = pbt.filter((p) => p!.pbt > p!.pbtPrev).length;

  const secPbt = sec?.scale.reduce((a, r) => a + (r.pbt ?? 0), 0) ?? 0;
  const secPrev = sec?.scale.reduce((a, r) => a + (r.pbtPrev ?? 0), 0) ?? 0;
  const secYoy = secPrev ? (secPbt / secPrev - 1) * 100 : 0;
  const secMargin = sec?.scale.reduce((a, r) => a + (r.margin ?? 0), 0) ?? 0;

  const { data: re } = useReSector();
  const reSafe = re ? re.rows.filter((r) => (r.score ?? -9) >= 2).length : 0;
  const rePre = re ? re.rows.reduce((a, r) => a + (r.v.prepaid ?? 0), 0) : 0;
  const rePrev = re ? re.rows.reduce((a, r) => a + (r.v.prepaidPrev ?? 0), 0) : 0;
  const reYoy = rePrev ? (rePre / rePrev - 1) * 100 : 0;

  const t = journal?.closed ?? [];
  const wins = t.filter((x) => x.returnPercent > 0).length;
  const sample = scan?.items[0]?.symbol ?? "HPG";

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3">
      <InsightCard
        to="/tin-hieu"
        label="Tín hiệu xu hướng & nhật ký lệnh"
        value={t.length ? `${num((wins / t.length) * 100)}% lệnh thắng` : "—"}
        sub={t.length ? `${wins}/${t.length} lệnh đã đóng${scan ? ` · ${scan.items.length} mã đang giữ` : ""}` : "Đang tải…"}
        foot={journal ? `Công khai lãi lỗ từ ${dmy(journal.startDate)}` : "Xem tín hiệu"}
      />
      <InsightCard
        to="/stock/VNINDEX"
        label="Xu hướng thị trường"
        value={trend}
        cls={trendCls}
        sub={vni?.advances != null && vni.declines != null ? `${trendSub} · ${vni.advances} mã tăng, ${vni.declines} mã giảm` : trendSub}
        foot="VN-Index theo SMA20, SMA50"
      />
      <InsightCard
        to="/nganh-ngan-hang"
        label="Ngành ngân hàng Q3/2026"
        value={`LNTT ${pct(pbtYoy)}`}
        cls={tone(pbtYoy)}
        sub={`${num(pbtNow / 1000, 1)} nghìn tỷ · ${upBanks}/${pbt.length} ngân hàng tăng lợi nhuận`}
        foot="16 ngân hàng: chỉ số, định giá, quy mô"
      />
      <InsightCard
        to="/nganh-chung-khoan"
        label={`Ngành chứng khoán ${sec ? sec.period.replace(" ", "/") : ""}`}
        value={sec ? `LNTT ${pct(secYoy)}` : "—"}
        cls={sec ? tone(secYoy) : ""}
        sub={sec ? `${num(secPbt / 1000, 1)} nghìn tỷ · dư nợ margin ${num(secMargin / 1000, 0)} nghìn tỷ` : "Đang tải…"}
        foot={`${sec?.rows.length ?? 18} CTCK: chỉ số, định giá P/B, thị phần`}
      />
      <InsightCard
        to={`/stock/${sample}`}
        label="Dữ liệu doanh nghiệp"
        value="Theo từng quý"
        sub="Giá, biểu đồ nến, khối ngoại, doanh thu, lợi nhuận, P/E, P/B của từng mã"
        foot={`Xem ví dụ: ${sample}`}
      />
      <InsightCard
        to="/nganh-bat-dong-san"
        label={`Ngành bất động sản ${re ? re.period.replace(" ", "/") : ""}`}
        value={re ? `${reSafe}/${re.rows.length} CĐT an toàn` : "—"}
        sub={re ? `Người mua trả trước ${num(rePre / 1000, 0)} nghìn tỷ, ${pct(reYoy)} so với cùng kỳ` : "Đang tải…"}
        foot="Sức khỏe tài chính, tồn kho, dự án bàn giao"
      />
    </div>
  );
}

/* ------------------------------------- Dữ liệu → Sóng ngành → Tín hiệu */

// Trang chủ: ba mảng theo thứ tự đọc thị trường. Chỉ có thông điệp, không đưa chỉ số.
// Mỗi mảng một màu nhấn: Dữ liệu xanh navy, Sóng ngành đỏ đô, Tín hiệu xanh rêu.

const ICON: Record<string, ReactNode> = {
  bank: <path d="M3 10h18M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18M12 3l9 5H3l9-5z" />,
  candles: <path d="M7 4v3M7 15v5M17 3v4M17 13v8M5 7h4v8H5zM15 7h4v6h-4z" />,
  house: <path d="M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6" />,
  pulse: <path d="M3 12h4l2-6 4 12 2-6h6" />,
  cycle: <path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4" />,
  grid: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
  list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  signal: <path d="M3 17l5-5 4 4 8-9M15 7h5v5" />,
  book: <path d="M4 5h7v14H4zM13 5h7v14h-7zM6 9h3M6 13h3M15 9h3M15 13h3" />,
};

// Hình minh họa mờ phía sau thẻ Sóng ngành và Tín hiệu: tượng trưng, không phải số liệu thật.
const UP = "#2f8a55";
const DN = "#b3261e";
const ART: Record<string, ReactNode> = {
  pulse: (
    <>
      <rect x="0" y="0" width="46" height="110" fill={UP} opacity="0.35" />
      <rect x="46" y="0" width="38" height="110" fill={DN} opacity="0.3" />
      <rect x="84" y="0" width="70" height="110" fill={UP} opacity="0.35" />
      <rect x="154" y="0" width="46" height="110" fill={DN} opacity="0.3" />
      <path d="M0 80 L14 72 L26 76 L40 58 L52 64 L64 82 L78 74 L92 60 L106 52 L120 40 L134 46 L148 30 L162 44 L176 58 L190 50 L200 62" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="92" cy="60" r="4" fill={UP} />
    </>
  ),
  cycle: (
    <>
      <path d="M4 82 C 30 82, 34 84, 54 80 C 80 74, 84 30, 108 26 C 128 24, 132 28, 150 34 C 170 42, 176 86, 198 90" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <g fontSize="11" fontWeight="700" fill="currentColor" fontFamily="inherit">
        <text x="8" y="102">Tích lũy</text>
        <text x="66" y="62">Tăng</text>
        <text x="100" y="16">Phân phối</text>
        <text x="164" y="104">Giảm</text>
      </g>
    </>
  ),
  heat: (
    <>
      {Array.from({ length: 28 }, (_, i) => {
        const c = i % 7, r = Math.floor(i / 7);
        const o = [0.15, 0.35, 0.6, 0.9, 0.5, 0.25, 0.75][(c * 3 + r * 5) % 7];
        const wave = (c === 4 || c === 5) && r < 3;
        return <rect key={i} x={6 + c * 27} y={6 + r * 26} width="23" height="22" rx="3" fill={UP} opacity={wave ? 0.95 : o} stroke={wave ? "#c9a24a" : "none"} strokeWidth="2" />;
      })}
    </>
  ),
  list: (
    <>
      {[0, 1, 2, 3, 4].map((r) => (
        <g key={r}>
          <rect x="6" y={8 + r * 21} width="34" height="9" rx="3" fill="currentColor" opacity="0.7" />
          <rect x="50" y={8 + r * 21} width="70" height="9" rx="3" fill="currentColor" opacity="0.3" />
          <rect x={r % 3 === 1 ? 162 : 140} y={8 + r * 21} width={r % 3 === 1 ? 32 : 54} height="9" rx="3" fill={r % 3 === 1 ? DN : UP} opacity="0.85" />
        </g>
      ))}
    </>
  ),
  candles: (
    <>
      {[
        [10, 80, 62, 1],
        [30, 70, 58, 0],
        [50, 66, 48, 1],
        [70, 56, 44, 1],
        [90, 50, 40, 0],
        [110, 44, 30, 1],
        [130, 36, 22, 1],
        [150, 30, 18, 0],
        [170, 26, 12, 1],
      ].map(([x, o, c, up]) => (
        <g key={x}>
          <line x1={x + 6} x2={x + 6} y1={Math.min(o, c) - 8} y2={Math.max(o, c) + 8} stroke={up ? UP : DN} strokeWidth="2" />
          <rect x={x} y={Math.min(o, c)} width="12" height={Math.abs(o - c) || 3} rx="1.5" fill={up ? UP : DN} />
        </g>
      ))}
      <path d="M44 104 l10 -14 l10 14 z" fill={UP} />
      <path d="M144 2 l10 14 l10 -14 z" fill={DN} />
    </>
  ),
  book: (
    <>
      {[0, 1, 2, 3].map((r) => (
        <g key={r}>
          <rect x={96 - [70, 50, 84, 36][r]} y={8 + r * 25} width={[70, 50, 84, 36][r]} height="17" rx="3" fill={UP} opacity="0.8" />
          <rect x="104" y={8 + r * 25} width={[40, 78, 56, 90][r]} height="17" rx="3" fill={DN} opacity="0.75" />
        </g>
      ))}
    </>
  ),
};

const PILLARS: {
  title: string;
  accent: string;
  tint: string;
  message: string;
  to: string;
  cta: string;
  items: { title: string; text: string; to: string; icon: string; logos?: string[]; art?: string }[];
}[] = [
  {
    title: "Dữ liệu",
    accent: "#1f3a5f",
    tint: "rgba(31,58,95,0.07)",
    message: "Nắm bắt kết quả kinh doanh, lợi nhuận, sức khỏe tài chính và định giá của từng doanh nghiệp, đọc thẳng từ báo cáo tài chính mỗi quý.",
    to: "/nganh-ngan-hang",
    cta: "Xem dữ liệu ngành",
    items: [
      { title: "Ngân hàng", icon: "bank", logos: ["VCB", "BID", "CTG", "TCB", "MBB", "ACB"], text: "Tăng trưởng tín dụng và huy động, NIM, nợ xấu, CASA, lợi nhuận và định giá của từng ngân hàng.", to: "/nganh-ngan-hang" },
      { title: "Chứng khoán", icon: "candles", logos: ["SSI", "VND", "HCM", "VCI", "VIX", "SHS"], text: "Doanh thu từng mảng, dư nợ cho vay ký quỹ, thị phần môi giới và định giá của các công ty chứng khoán.", to: "/nganh-chung-khoan" },
      { title: "Bất động sản", icon: "house", logos: ["VHM", "NVL", "KDH", "NLG", "DXG", "PDR"], text: "Người mua trả trước, hàng tồn kho, nợ vay và dự án bàn giao để đánh giá sức khỏe chủ đầu tư.", to: "/nganh-bat-dong-san" },
    ],
  },
  {
    title: "Sóng ngành",
    accent: "#8b1e2d",
    tint: "rgba(139,30,45,0.06)",
    message: "Biết dòng tiền đang chảy vào ngành nào và thị trường có thuận lợi để mua mới hay không. Đi theo con sóng thay vì chèo ngược dòng.",
    to: "/song-nganh",
    cta: "Xem sóng ngành",
    items: [
      { title: "Nhịp thị trường", icon: "pulse", art: "pulse", text: "Thời điểm thị trường đang tích cực, cần quan sát hay nên thận trọng, đo trên cổ phiếu trung bình.", to: "/song-nganh" },
      { title: "Chu kỳ VN-Index", icon: "cycle", art: "cycle", text: "Thị trường đang ở pha tích lũy, tăng, phân phối hay giảm của chu kỳ lớn.", to: "/song-nganh" },
      { title: "Bản đồ 19 ngành", icon: "grid", art: "heat", text: "Ngành nào đang có sóng, ngành nào đang hình thành, nhìn ngược lại từ năm 2000.", to: "/song-nganh" },
    ],
  },
  {
    title: "Tín hiệu",
    accent: "#3e5a32",
    tint: "rgba(62,90,50,0.08)",
    message: "Hệ thống lọc mã đang đi lên sau mỗi phiên, vào lệnh từng phần, thoát khi xu hướng gãy, và công khai mọi lệnh dù lãi hay lỗ.",
    to: "/tin-hieu",
    cta: "Xem tín hiệu hôm nay",
    items: [
      { title: "Danh mục và nhật ký", icon: "list", art: "list", text: "Mã đang giữ, mã mua mới và toàn bộ lệnh đã đóng, ghi lại từ ngày bắt đầu, không sửa về sau.", to: "/tin-hieu" },
      { title: "Biểu đồ có điểm mua bán", icon: "signal", art: "candles", text: "Mỗi mã kèm điểm mua từng phần và điểm đóng lệnh của hệ thống ngay trên biểu đồ nến.", to: "/tin-hieu" },
      { title: "Sổ lệnh trực tiếp", icon: "book", art: "book", text: "Bước giá, khớp lệnh, mua bán chủ động và khối lượng theo giá của từng mã trong phiên.", to: "/tin-hieu" },
    ],
  },
];

export function HomePillars() {
  return (
    <div className="flex flex-col gap-5">
      {PILLARS.map((p, i) => (
        <section
          key={p.title}
          aria-label={p.title}
          className="grid gap-x-10 gap-y-6 rounded-2xl px-5 py-8 sm:px-8 lg:grid-cols-12 lg:py-10"
          style={{ background: p.tint }}
        >
          <div className="lg:col-span-4">
            <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[0.8rem] font-semibold text-white" style={{ background: p.accent }}>
              Bước {i + 1}
            </span>
            <h2 className="pl-accent mt-3 text-[clamp(1.8rem,2.8vw,2.4rem)] leading-tight" style={{ color: p.accent }}>
              {p.title}
            </h2>
            <p className="mt-3 text-[1.08rem] leading-relaxed text-[var(--sm-egg2)]">{p.message}</p>
            <Link
              to={p.to}
              className="mt-6 inline-flex min-h-11 items-center rounded-[10px] px-5 font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.12)] transition-[transform,box-shadow,filter] hover:-translate-y-px hover:shadow-[0_8px_20px_-8px_rgba(0,0,0,0.35)] hover:brightness-110"
              style={{ background: p.accent }}
            >
              {p.cta}
            </Link>
          </div>
          <div className="grid min-w-0 content-start gap-3 sm:grid-cols-3 sm:gap-4 lg:col-span-8">
            {p.items.map((it) => (
              <Link
                key={it.title}
                to={it.to}
                className={`group relative flex min-w-0 flex-col overflow-hidden rounded-md border border-[var(--sm-line)] bg-[var(--sm-panel)] p-5 ${it.logos || it.art ? "min-h-[270px]" : ""}`}
              >
                <i className="absolute inset-x-0 top-0 h-[3px]" style={{ background: p.accent }} aria-hidden="true" />
                {it.art && (
                  // hình minh họa tượng trưng, mờ phía sau nội dung
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 200 110"
                    className="pointer-events-none absolute right-3 bottom-3 h-[96px] w-[176px] opacity-[0.16] transition-opacity duration-300 group-hover:opacity-[0.32]"
                    style={{ color: p.accent }}
                  >
                    {ART[it.art]}
                  </svg>
                )}
                {it.logos && (
                  // logo các doanh nghiệp tiêu biểu, mờ phía sau nội dung
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute right-2 bottom-3 grid rotate-[-6deg] grid-cols-3 gap-x-5 gap-y-3 opacity-[0.16] grayscale transition-[opacity,filter] duration-300 group-hover:opacity-[0.28] group-hover:grayscale-[0.4]"
                  >
                    {it.logos.map((sym) => (
                      <CompanyLogo key={sym} symbol={sym} size={34} width={70} fallback="space" />
                    ))}
                  </span>
                )}
                <span className="pl-accent relative inline-flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: p.tint.replace(/0\.0\d\)/, "0.16)"), color: p.accent }}>
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {ICON[it.icon]}
                  </svg>
                </span>
                <b className="relative mt-4 font-display text-[1.3rem] leading-tight text-[var(--sm-egg)]">{it.title}</b>
                <span className="relative mt-2 text-[0.95rem] leading-relaxed text-[var(--sm-egg2)]">{it.text}</span>
                <span className="pl-accent relative mt-auto inline-flex items-center gap-1 pt-4 text-[0.88rem] font-semibold" style={{ color: p.accent }}>
                  Xem chi tiết
                  <svg viewBox="0 0 20 20" width="14" height="14" className="transition-transform group-hover:translate-x-0.5" aria-hidden="true">
                    <path d="M7 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ Phương pháp */

const STEPS: { title: string; text: string }[] = [
  {
    title: "Lọc mã sau mỗi phiên",
    text: "Sau 15:00, hệ thống quét toàn thị trường trên giá đóng cửa, chỉ giữ lại mã đang đi lên rõ ràng: SMA20 trên SMA50, ADX trên 25 và Supertrend báo tăng.",
  },
  {
    title: "Vào lệnh từng phần",
    text: "Mã đủ điều kiện được ghi Mua theo từng phần 1/3, không dồn hết vốn một lần. Mỗi lệnh ghi lại ngày và giá đóng cửa vào lệnh.",
  },
  {
    title: "Thoát khi xu hướng gãy",
    text: "Khi điều kiện không còn, mã rời danh sách và lệnh được đóng ở giá đóng cửa, lãi hay lỗ đều ghi vào nhật ký công khai.",
  },
];

export function MethodSteps() {
  return (
    <>
      <ol className="grid gap-4 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-4 rounded-md border border-[var(--sm-line)] bg-[var(--sm-panel)] p-5">
            <span className="font-display text-[2.2rem] leading-none text-[var(--sm-gold)]" aria-hidden="true">
              {i + 1}
            </span>
            <div>
              <h3 className="text-[1.12rem] leading-snug text-[var(--sm-egg)]">{s.title}</h3>
              <p className="mt-1.5 text-[0.95rem] leading-relaxed text-[var(--sm-egg2)]">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[0.85rem] text-[var(--sm-mut)]">
        Danh sách không đổi trong phiên. Giá đóng cửa, chưa trừ phí, thuế. Kết quả quá khứ không bảo đảm kết quả tương lai; chỉ để tham khảo, không phải khuyến nghị mua
        bán.
      </p>
    </>
  );
}

/* --------------------------------------------- Chuyên viên + mở tài khoản */

const ROW = "flex flex-wrap items-baseline gap-x-6 gap-y-0.5 border-b border-[var(--sm-line2)] py-2.5";

export function AdvisorAndAccount() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
      <div className="rounded-md border border-[var(--sm-line)] bg-[var(--sm-panel)] p-6 sm:p-7">
        <p className="text-[0.85rem] text-[var(--sm-mut)]">Người phụ trách</p>
        <h3 className="mt-1 text-[1.6rem] leading-tight text-[var(--sm-egg)]">Nguyễn Anh Chiến</h3>
        <p className="mt-1 text-[1rem] text-[var(--sm-gold2)]">Chuyên viên tư vấn đầu tư, CTCP Chứng khoán KAFI</p>
        <p className="mt-3 max-w-xl text-[1rem] leading-relaxed text-[var(--sm-egg2)]">
          Đầu tư theo xu hướng, đặt quản trị rủi ro lên hàng đầu: đi theo con sóng lớn, sai thì cắt sớm.
        </p>
        <div className="mt-4 border-t border-[var(--sm-line2)] text-[0.98rem]">
          <div className={ROW}>
            <span className="w-36 text-[var(--sm-mut)]">Điện thoại, Zalo</span>
            <a href="tel:0886284212" className="font-bold text-[var(--sm-egg)] hover:underline">
              0886.284.212
            </a>
          </div>
          <div className={ROW}>
            <span className="w-36 text-[var(--sm-mut)]">YouTube</span>
            <a href="https://www.youtube.com/@chiennguyen.taichinh" target="_blank" rel="noopener noreferrer" className="text-[var(--sm-egg)] hover:underline">
              Chiến Nguyễn Tài Chính
            </a>
          </div>
          <div className={ROW}>
            <span className="w-36 text-[var(--sm-mut)]">Facebook</span>
            <a href="https://www.facebook.com/chiennguyen.taichinh/" target="_blank" rel="noopener noreferrer" className="text-[var(--sm-egg)] hover:underline">
              chiennguyen.taichinh
            </a>
          </div>
        </div>
      </div>

      <div className="flex flex-col rounded-md border border-[rgba(201,162,74,0.45)] bg-[var(--sm-panel)] p-6 sm:p-7">
        <div className="flex items-center gap-3">
          <img src="/kafi-logo.png" alt="Logo KAFI" className="block h-11! w-11 rounded-[10px]" />
          <h3 className="text-[1.4rem] leading-tight text-[var(--sm-egg)]">Mở tài khoản tại KAFI</h3>
        </div>
        <ul className="mt-4 border-t border-[var(--sm-line2)] text-[0.98rem] text-[var(--sm-egg2)]">
          <li className="border-b border-[var(--sm-line2)] py-2.5">Mở miễn phí trên điện thoại, qua app KAFI X.</li>
          <li className="border-b border-[var(--sm-line2)] py-2.5">Không phí duy trì tài khoản.</li>
          <li className="border-b border-[var(--sm-line2)] py-2.5">
            Nhập mã giới thiệu <b className="text-[var(--sm-egg)]">CHIEN005</b> để được hỗ trợ trực tiếp.
          </li>
        </ul>
        <div className="mt-auto flex flex-wrap gap-3 pt-5">
          <Link to="/huong-dan-mo-tai-khoan" className="sm-btn sm-btn-p">
            Xem hướng dẫn mở tài khoản
          </Link>
          <a href="https://zalo.me/0886284212" target="_blank" rel="noopener noreferrer" className="sm-btn">
            Nhắn Zalo
          </a>
        </div>
      </div>
    </div>
  );
}
