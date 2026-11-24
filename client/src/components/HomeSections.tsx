import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Quote } from "../types";
import type { TradeJournal, TrendBuyResult } from "../api/client";
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

/* ------------------------------------------------------------ Phương pháp */

const STEPS: { title: string; text: string }[] = [
  {
    title: "Lọc mã sau mỗi phiên",
    text: "Sau 15:00, hệ thống quét toàn thị trường trên giá đóng cửa, chỉ giữ lại mã đang đi lên rõ ràng: SMA20 trên SMA50, ADX trên 25 và Supertrend báo tăng.",
  },
  {
    title: "Chỉ mua khi có sóng ngành",
    text: "Mã đủ điều kiện chỉ được mở lệnh mới khi trạng thái thị trường là Tích cực và ngành của mã đang có sóng (từ 50% mã trong ngành đạt Trend Template). Không đủ thì chưa mua; mã đang giữ vẫn theo điểm bán.",
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
      <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
