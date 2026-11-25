import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Quote } from "../types";
import { fetchSectorWaves, type SectorWaves, type TradeJournal, type TrendBuyResult } from "../api/client";
import { BANKS } from "../data/bankSector";
import { PROFIT } from "../data/bankValuation";
import { useSecSector } from "../data/securities";
import { useReSector } from "../data/realestate";
import { InsightCard, dmy, pct, useMarketTrend } from "./SonMaiHome";

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

const STAGE_LABEL: Record<1 | 2 | 3 | 4, string> = { 1: "Tích lũy", 2: "Tăng", 3: "Phân phối", 4: "Giảm" };
const STATE_LABEL: Record<1 | 2 | 3, string> = { 1: "Tích cực", 2: "Quan sát", 3: "Thận trọng" };

function Pillar({ step, title, lead, insight, to, cta, children }: { step: number; title: string; lead: string; insight: ReactNode; to: string; cta: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="grid gap-x-10 gap-y-5 border-t border-[var(--sm-line)] py-10 lg:grid-cols-12">
      <div className="lg:col-span-4">
        <p className="text-[0.85rem] font-semibold text-[var(--sm-gold2)]">Bước {step}</p>
        <h2 className="mt-1 text-[clamp(1.7rem,2.6vw,2.2rem)] leading-tight text-[var(--sm-egg)]">{title}</h2>
        <p className="mt-2 text-[1rem] leading-relaxed text-[var(--sm-egg2)]">{lead}</p>
        <div className="mt-4 rounded-md border-l-0 bg-[rgba(201,162,74,0.10)] px-4 py-3 text-[0.95rem] leading-relaxed text-[var(--sm-egg)]">
          <span className="mb-1 block text-[0.78rem] font-semibold text-[var(--sm-gold2)]">Insight hôm nay</span>
          {insight}
        </div>
        <Link to={to} className="sm-btn mt-5">
          {cta}
        </Link>
      </div>
      <div className="grid min-w-0 grid-cols-2 content-start gap-2.5 sm:gap-4 lg:col-span-8">{children}</div>
    </section>
  );
}

/** Trang chủ: ba mảng của Bull Stock theo thứ tự đọc thị trường — dữ liệu doanh nghiệp, sóng ngành, tín hiệu. */
export function HomePillars({ scan, journal }: { scan?: TrendBuyResult | null; journal?: TradeJournal | null }) {
  const { data: sec } = useSecSector();
  const { data: re } = useReSector();
  const [waves, setWaves] = useState<SectorWaves | null>(null);
  useEffect(() => {
    let alive = true;
    fetchSectorWaves()
      .then((w) => alive && setWaves(w))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // 1. Dữ liệu
  const pbt = BANKS.map((b) => PROFIT[b.bank]).filter(Boolean);
  const pbtNow = pbt.reduce((a, p) => a + p!.pbt, 0);
  const pbtPrev = pbt.reduce((a, p) => a + p!.pbtPrev, 0);
  const pbtYoy = pbtPrev ? (pbtNow / pbtPrev - 1) * 100 : 0;
  const upBanks = pbt.filter((p) => p!.pbt > p!.pbtPrev).length;
  const secPbt = sec?.scale.reduce((a, r) => a + (r.pbt ?? 0), 0) ?? 0;
  const secPrev = sec?.scale.reduce((a, r) => a + (r.pbtPrev ?? 0), 0) ?? 0;
  const secYoy = secPrev ? (secPbt / secPrev - 1) * 100 : 0;
  const secMargin = sec?.scale.reduce((a, r) => a + (r.margin ?? 0), 0) ?? 0;
  const reSafe = re ? re.rows.filter((r) => (r.score ?? -9) >= 2).length : 0;
  const rePre = re ? re.rows.reduce((a, r) => a + (r.v.prepaid ?? 0), 0) : 0;
  const rePrev = re ? re.rows.reduce((a, r) => a + (r.v.prepaidPrev ?? 0), 0) : 0;
  const reYoy = rePrev ? (rePre / rePrev - 1) * 100 : 0;
  const sample = scan?.items[0]?.symbol ?? "HPG";

  // 2. Sóng ngành
  const now = waves?.market?.now;
  const L = waves ? waves.weeks.length - 1 : -1;
  const hot = waves ? waves.sectors.filter((x) => (x.pct[L] ?? -1) >= waves.threshold) : [];
  const best = waves ? [...waves.sectors].sort((a, b) => (b.pct[L] ?? -1) - (a.pct[L] ?? -1))[0] : undefined;
  const stage = waves ? waves.vnindex.stage[L] : null;
  const breadth = waves ? waves.breadth[L] : null;

  // 3. Tín hiệu
  const closed = journal?.closed ?? [];
  const wins = closed.filter((x) => x.returnPercent > 0).length;
  const avgRet = closed.length ? closed.reduce((a, x) => a + x.returnPercent, 0) / closed.length : 0;
  const held = scan?.items.length ?? 0;
  const fresh = scan ? scan.items.filter((i) => i.buyDate.slice(0, 10) === scan.sessionDate.slice(0, 10)).length : 0;
  const winHeld = scan ? scan.items.filter((i) => i.signalReturnPercent > 0).length : 0;

  return (
    <div>
      <Pillar
        step={1}
        title="Dữ liệu"
        lead="Báo cáo tài chính từng quý của ngành ngân hàng, chứng khoán, bất động sản và từng doanh nghiệp, đọc thẳng từ số liệu gốc."
        insight={
          <>
            Q3/2026: lợi nhuận trước thuế ngân hàng <b className={tone(pbtYoy)}>{pct(pbtYoy)}</b> ({upBanks}/{pbt.length} ngân hàng tăng)
            {sec && (
              <>
                , chứng khoán <b className={tone(secYoy)}>{pct(secYoy)}</b>
              </>
            )}
            {re && (
              <>
                ; {reSafe}/{re.rows.length} chủ đầu tư bất động sản đạt chuẩn an toàn tài chính
              </>
            )}
            .
          </>
        }
        to="/nganh-ngan-hang"
        cta="Xem dữ liệu ngành"
      >
        <InsightCard to="/nganh-ngan-hang" label="Ngành ngân hàng Q3/2026" value={`LNTT ${pct(pbtYoy)}`} cls={tone(pbtYoy)} sub={`${num(pbtNow / 1000, 1)} nghìn tỷ · ${upBanks}/${pbt.length} ngân hàng tăng`} foot="16 ngân hàng: chỉ số, định giá, quy mô" />
        <InsightCard
          to="/nganh-chung-khoan"
          label={`Ngành chứng khoán ${sec ? sec.period.replace(" ", "/") : ""}`}
          value={sec ? `LNTT ${pct(secYoy)}` : "—"}
          cls={sec ? tone(secYoy) : ""}
          sub={sec ? `${num(secPbt / 1000, 1)} nghìn tỷ · margin ${num(secMargin / 1000, 0)} nghìn tỷ` : "Đang tải…"}
          foot={`${sec?.rows.length ?? 18} CTCK: chỉ số, định giá P/B, thị phần`}
        />
        <InsightCard
          to="/nganh-bat-dong-san"
          label={`Ngành bất động sản ${re ? re.period.replace(" ", "/") : ""}`}
          value={re ? `${reSafe}/${re.rows.length} CĐT an toàn` : "—"}
          sub={re ? `Người mua trả trước ${pct(reYoy)} so với cùng kỳ` : "Đang tải…"}
          foot="Sức khỏe tài chính, tồn kho, dự án bàn giao"
        />
        <InsightCard to={`/stock/${sample}`} label="Dữ liệu doanh nghiệp" value="Theo từng quý" sub="Giá, nến, sổ lệnh, khối ngoại, doanh thu, lợi nhuận, P/E, P/B" foot={`Xem ví dụ: ${sample}`} />
      </Pillar>

      <Pillar
        step={2}
        title="Sóng ngành"
        lead="Dòng tiền đang ở ngành nào, và thị trường có đang thuận cho việc mua mới hay không."
        insight={
          !waves || !now ? (
            "Đang tính sóng ngành…"
          ) : (
            <>
              Nhịp thị trường <b className={now.state === 1 ? "up" : now.state === 3 ? "down" : ""}>{STATE_LABEL[now.state]}</b>
              {stage ? (
                <>
                  , VN-Index ở giai đoạn <b>{STAGE_LABEL[stage]}</b>
                </>
              ) : null}
              . {hot.length ? (
                <>
                  <b className="up">{hot.length}</b> ngành có sóng: {hot.map((x) => x.sector).join(", ")}.
                </>
              ) : (
                <>
                  <b className="down">Chưa ngành nào có sóng</b>
                  {best && best.pct[L] != null ? `; mạnh nhất là ${best.sector} (${num(best.pct[L]!)}% mã đạt Trend Template).` : "."}
                </>
              )}
            </>
          )
        }
        to="/song-nganh"
        cta="Xem sóng ngành"
      >
        <InsightCard
          to="/song-nganh"
          label="Nhịp thị trường"
          value={now ? STATE_LABEL[now.state] : "—"}
          cls={now ? (now.state === 1 ? "up" : now.state === 3 ? "down" : "") : ""}
          sub={now ? `${now.dist} ngày phân phối · thanh khoản ${now.liq == null ? "—" : `${num(now.liq)}%`} bình thường` : "Đang tải…"}
          foot="Chỉ số cân bằng gần 200 mã"
        />
        <InsightCard to="/song-nganh" label="Chu kỳ VN-Index" value={stage ? STAGE_LABEL[stage] : "—"} cls={stage === 2 ? "up" : stage === 4 ? "down" : ""} sub="Theo độ dốc MA150 (Weinstein)" foot="Giai đoạn Tích lũy, Tăng, Phân phối, Giảm" />
        <InsightCard
          to="/song-nganh"
          label="Ngành có sóng"
          value={waves ? `${hot.length}/${waves.sectors.length}` : "—"}
          cls={waves ? (hot.length ? "up" : "down") : ""}
          sub={breadth != null ? `${num(breadth, 1)}% toàn thị trường đạt Trend Template` : "Đang tải…"}
          foot={`Ngành có sóng: từ ${waves?.threshold ?? 50}% mã đạt Trend Template`}
        />
        <InsightCard
          to="/song-nganh"
          label="Ngành mạnh nhất"
          value={best ? best.sector : "—"}
          sub={best && best.pct[L] != null ? `${num(best.pct[L]!)}% mã đạt · ${best.leaders.slice(0, 3).join(", ") || "—"}` : "Đang tải…"}
          foot="Bản đồ nhiệt 19 ngành"
        />
      </Pillar>

      <Pillar
        step={3}
        title="Tín hiệu"
        lead="Hệ thống lọc mã đang đi lên sau mỗi phiên, vào lệnh từng phần và công khai mọi lệnh kèm lãi lỗ thật."
        insight={
          !scan && !journal ? (
            "Đang tải tín hiệu…"
          ) : (
            <>
              Đang giữ <b>{held}</b> mã ({winHeld} mã đang lãi)
              {fresh ? (
                <>
                  , <b className="up">{fresh}</b> mã mua mới phiên gần nhất
                </>
              ) : null}
              . {closed.length ? (
                <>
                  Đã đóng {closed.length} lệnh từ {journal ? dmy(journal.startDate) : ""}, thắng <b>{num((wins / closed.length) * 100)}%</b>, lãi/lỗ trung bình <b className={tone(avgRet)}>{pct(avgRet)}</b>.
                </>
              ) : (
                "Chưa có lệnh nào đóng."
              )}
            </>
          )
        }
        to="/tin-hieu"
        cta="Xem tín hiệu hôm nay"
      >
        <InsightCard to="/tin-hieu" label="Tỷ lệ lệnh thắng" value={closed.length ? `${num((wins / closed.length) * 100)}%` : "—"} sub={`${wins}/${closed.length} lệnh đã đóng`} foot={journal ? `Công khai từ ${dmy(journal.startDate)}` : "Nhật ký lệnh"} />
        <InsightCard to="/tin-hieu" label="Lãi/lỗ trung bình mỗi lệnh" value={closed.length ? pct(avgRet) : "—"} cls={closed.length ? tone(avgRet) : ""} sub="Giá đóng cửa, chưa trừ phí, thuế" foot="Xem nhật ký lệnh" />
        <InsightCard to="/tin-hieu" label="Danh mục đang giữ" value={scan ? `${held} mã` : "—"} sub={scan ? `${winHeld} mã đang lãi · ${fresh} mua mới` : "Đang tải…"} foot={scan ? `Chốt phiên ${dmy(scan.sessionDate)}` : "Danh mục"} />
        <InsightCard to="/tin-hieu" label="Sổ lệnh trực tiếp" value="Bước giá, khớp lệnh" sub="Mua/bán chủ động, khối lượng theo giá của từng mã" foot="Mở trang Tín hiệu" />
      </Pillar>
      <p className="border-t border-[var(--sm-line)] pt-3 text-[0.82rem] text-[var(--sm-mut)]">
        Số liệu mô tả trạng thái đã và đang xảy ra, không dự báo. Kết quả quá khứ không bảo đảm kết quả tương lai; chỉ để tham khảo, không phải khuyến nghị mua bán.
      </p>
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
