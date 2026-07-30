import { Quote } from "../providers/types.js";
import { SECTOR_MAP } from "../data/sectorMap.js";

export interface DigestHighlight {
  label: string;
  value: string;
  tone: "up" | "down" | "neutral";
}

export interface DigestStockRef {
  symbol: string;
  name: string;
  exchange: string;
  price: number;
  changePercent: number;
  volume: number;
}

export type DigestTopic = "spotlight" | "sector" | "liquidity" | "breadth";

export interface DigestHeroStat {
  value: string;
  label: string;
  tone: "up" | "down" | "neutral";
}

export interface DigestMarketPulse {
  advancers: number;
  decliners: number;
  unchanged: number;
  total: number;
  avgChange: number;
  median: number;
}

export interface FundamentalMetric {
  periodLabel: string;
  value: number;
  unit: string;
  qoqGrowthPercent: number | null;
  yoyGrowthPercent: number | null;
}

export interface CompanySnapshot {
  symbol: string;
  name: string;
  exchange: string;
  sector: string | null;
  businessModel: string | null;
  charterCapitalText: string | null;
  listingDate: string | null;
  valuation: { pe: number | null; pb: number | null; roe: number | null };
  revenue: FundamentalMetric | null;
  profit: FundamentalMetric | null;
}

export type TrendStance = "MUA" | "DUNG_NGOAI";

export interface TrendAction {
  symbol: string;
  stance: TrendStance;
  stanceLabel: string;
  signalSince: string | null;
  reasoning: string;
}

export interface DailyDigest {
  date: string; // YYYY-MM-DD
  provider: string;
  topic: DigestTopic;
  topicLabel: string;
  title: string;
  hookLines: [string, string];
  paragraphs: string[];
  highlights: DigestHighlight[];
  heroStat: DigestHeroStat;
  marketPulse: DigestMarketPulse;
  relatedStocks: DigestStockRef[];
  /** Symbol the "company"/"action" sections below are about, if any — set
   * synchronously here, then server/src/digest/enrich.ts fetches the actual
   * fundamentals/valuation/trend-signal data for it and fills those in. */
  primarySymbol: string | null;
  company: CompanySnapshot | null;
  action: TrendAction | null;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function shortDate(d: Date): string {
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function pct(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function pctAbs(n: number): string {
  return `${Math.abs(n).toFixed(2)}%`;
}

function tone(n: number): "up" | "down" | "neutral" {
  if (n > 0) return "up";
  if (n < 0) return "down";
  return "neutral";
}

function formatVolume(volume: number): string {
  if (volume >= 1_000_000_000) return `${(volume / 1_000_000_000).toFixed(2)}B`;
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(2)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(1)}K`;
  return String(volume);
}

function vndMagnitude(value: number): string {
  if (value >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(2)} nghìn tỷ đ`;
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ đ`;
  return `${Math.round(value).toLocaleString("vi-VN")} đ`;
}

function vndValue(price: number, volume: number): string {
  return vndMagnitude(price * volume);
}

function toRef(q: Quote): DigestStockRef {
  return {
    symbol: q.symbol,
    name: q.name,
    exchange: q.exchange,
    price: q.price,
    changePercent: q.changePercent,
    volume: q.volume,
  };
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

interface PulseCtx {
  advancers: number;
  decliners: number;
  unchanged: number;
  total: number;
  avgChange: number;
  marketMedian: number;
}

// Opens every article the same way the reference style does: zoom out to
// the whole market (breadth + median-vs-average) before narrowing into
// whatever the day's single topic is — median vs. average is the tell for
// "is this move broad, or a handful of big-cap names carrying the index."
function pulseParagraph(ctx: PulseCtx): string {
  const { advancers, decliners, unchanged, total, avgChange, marketMedian } = ctx;
  const gap = avgChange - marketMedian;
  const skewNote =
    Math.abs(gap) >= 0.3
      ? ` — chênh ${pctAbs(gap)} so với trung vị, cho thấy mức chung bị chi phối bởi một nhóm mã vốn hóa lớn hơn là lan tỏa đều`
      : "";
  return `Phiên hôm nay tôi theo dõi ${total} mã: ${advancers} mã tăng, ${decliners} mã giảm, ${unchanged} mã đứng giá. Bình quân toàn thị trường ${pct(
    avgChange
  )} nhưng cổ phiếu trung vị chỉ ${pct(marketMedian)}${skewNote}.`;
}

function marketMood(advancers: number, decliners: number): "tăng điểm" | "giảm điểm" | "giằng co" {
  if (advancers > decliners) return "tăng điểm";
  if (decliners > advancers) return "giảm điểm";
  return "giằng co";
}

type ArticleBody = Pick<
  DailyDigest,
  "title" | "hookLines" | "paragraphs" | "highlights" | "heroStat" | "relatedStocks" | "primarySymbol"
>;

interface SectorAgg {
  sector: string;
  avg: number;
  symbols: Quote[];
}

interface Candidate {
  key: DigestTopic;
  label: string;
  score: number;
  build: () => ArticleBody;
}

function buildSpotlightArticle(spotlight: Quote, all: Quote[], pulseCtx: PulseCtx): () => ArticleBody {
  return () => {
    const direction = spotlight.changePercent >= 0 ? "tăng" : "giảm";
    const mood = marketMood(pulseCtx.advancers, pulseCtx.decliners);
    const contrarian =
      (spotlight.changePercent > 0 && pulseCtx.decliners > pulseCtx.advancers) ||
      (spotlight.changePercent < 0 && pulseCtx.advancers > pulseCtx.decliners);

    const volumes = all.map((q) => q.volume || 0);
    const volMedian = median(volumes);
    const liquidCount = all.filter((q) => (q.volume || 0) >= volMedian).length;

    const others = all
      .filter((q) => q.symbol !== spotlight.symbol && Math.sign(q.changePercent) === Math.sign(spotlight.changePercent))
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
      .slice(0, 4);
    const sector = SECTOR_MAP[spotlight.symbol];

    const paragraphs = [
      pulseParagraph(pulseCtx),
      `Tôi lọc ${liquidCount} mã có khối lượng trên trung vị để loại nhiễu từ các mã kém thanh khoản, và ${spotlight.symbol} (${spotlight.name}) là mã biến động mạnh nhất trong nhóm đó — ${direction} ${pctAbs(
        spotlight.changePercent
      )} lên ${spotlight.price.toLocaleString("vi-VN")} đ, khối lượng ${formatVolume(spotlight.volume)} (~${vndValue(
        spotlight.price,
        spotlight.volume
      )}).`,
    ];
    if (sector) paragraphs.push(`${spotlight.symbol} thuộc nhóm ngành ${sector}.`);
    if (others.length > 0) {
      paragraphs.push(
        `Cùng chiều ${direction} còn có ${others
          .map((q) => `${q.symbol} (${pct(q.changePercent)})`)
          .join(", ")} — dòng tiền phiên nay không chỉ dồn vào một mã riêng lẻ.`
      );
    }
    paragraphs.push(
      contrarian
        ? `Điều tôi để ý là ${spotlight.symbol} đi ngược thị trường: thị trường ${mood} nhưng mã này lại ${direction} mạnh — tôi sẽ theo dõi thêm 1-2 phiên tới để phân biệt đây là tín hiệu riêng lẻ hay đầu mối của một xu hướng rộng hơn.`
        : `${spotlight.symbol} đang đi cùng chiều với xu hướng ${mood} chung của thị trường — mức độ bền vững của đà này là điều tôi sẽ tiếp tục quan sát.`
    );

    const title = contrarian
      ? `${spotlight.symbol} ngược dòng, ${direction} ${pctAbs(spotlight.changePercent)} giữa lúc thị trường ${mood}`
      : `${spotlight.symbol} dẫn đầu đà ${direction === "tăng" ? "tăng" : "giảm"} thị trường, ${pctAbs(
          spotlight.changePercent
        )} trong phiên`;

    return {
      title,
      hookLines: [
        `${spotlight.symbol} ${direction} ${pctAbs(spotlight.changePercent)}.`,
        contrarian ? "Ngược dòng thị trường." : "Dẫn đầu thị trường.",
      ],
      paragraphs,
      heroStat: { value: pct(spotlight.changePercent), label: `${spotlight.symbol} hôm nay`, tone: tone(spotlight.changePercent) },
      highlights: [
        { label: "Mã tâm điểm", value: spotlight.symbol, tone: tone(spotlight.changePercent) },
        { label: "Biến động", value: pct(spotlight.changePercent), tone: tone(spotlight.changePercent) },
        { label: "Giá đóng cửa", value: `${spotlight.price.toLocaleString("vi-VN")} đ`, tone: "neutral" },
        { label: "Khối lượng", value: formatVolume(spotlight.volume), tone: "neutral" },
      ],
      relatedStocks: [spotlight, ...others].map(toRef),
      primarySymbol: spotlight.symbol,
    };
  };
}

function buildSectorArticle(top: SectorAgg, pulseCtx: PulseCtx): () => ArticleBody {
  return () => {
    const ranked = [...top.symbols].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
    const leaders = ranked.slice(0, 5);
    const primary = leaders[0];
    const vsMarket = top.avg - pulseCtx.avgChange;
    const contrarian = Math.sign(top.avg) !== 0 && Math.sign(top.avg) !== Math.sign(pulseCtx.avgChange);
    const mood = marketMood(pulseCtx.advancers, pulseCtx.decliners);

    const paragraphs = [
      pulseParagraph(pulseCtx),
      `Tôi gộp toàn bộ danh sách theo nhóm ngành và thấy ${top.sector} nổi lên rõ nhất, bình quân ${pct(
        top.avg
      )} trên ${top.symbols.length} mã — lệch ${pctAbs(vsMarket)} so với bình quân chung của thị trường.`,
      `Dẫn dắt nhóm này là ${leaders.map((q) => `${q.symbol} (${pct(q.changePercent)})`).join(", ")}.`,
      contrarian
        ? `Đáng chú ý là ${top.sector} đi ngược xu hướng ${mood} chung của thị trường — dòng tiền có vẻ đang luân chuyển riêng vào (hoặc rút khỏi) nhóm này thay vì đi theo mặt bằng chung.`
        : `Mức lệch này đủ lớn để tôi xem đây là dòng tiền có chủ đích vào nhóm ${top.sector}, không đơn thuần là biến động đồng pha với thị trường.`,
    ];

    return {
      title: contrarian
        ? `Ngành ${top.sector} ngược dòng, bình quân ${pct(top.avg)} giữa lúc thị trường ${mood}`
        : `Dòng tiền ${top.avg >= 0 ? "đổ vào" : "rút khỏi"} ngành ${top.sector}, bình quân ${pct(top.avg)}`,
      hookLines: [`Ngành ${top.sector} ${top.avg >= 0 ? "tăng" : "giảm"} ${pctAbs(top.avg)}.`, contrarian ? "Ngược dòng thị trường." : "Dẫn sóng thị trường."],
      paragraphs,
      heroStat: { value: pct(top.avg), label: `Ngành ${top.sector}`, tone: tone(top.avg) },
      highlights: [
        { label: "Nhóm ngành", value: top.sector, tone: "neutral" },
        { label: "Bình quân ngành", value: pct(top.avg), tone: tone(top.avg) },
        { label: "Bình quân thị trường", value: pct(pulseCtx.avgChange), tone: tone(pulseCtx.avgChange) },
        { label: "Số mã trong nhóm", value: String(top.symbols.length), tone: "neutral" },
      ],
      relatedStocks: leaders.map(toRef),
      primarySymbol: primary?.symbol ?? null,
    };
  };
}

function buildLiquidityArticle(top: Quote, all: Quote[], pulseCtx: PulseCtx): () => ArticleBody {
  return () => {
    const byValueDesc = [...all]
      .filter((q) => q.symbol !== top.symbol)
      .sort((a, b) => b.price * b.volume - a.price * a.volume)
      .slice(0, 4);
    const flat = Math.abs(top.changePercent) < 1;

    const paragraphs = [
      pulseParagraph(pulseCtx),
      `Tôi so giá trị giao dịch của toàn bộ ${all.length} mã và ${top.symbol} (${top.name}) vượt trội hẳn phần còn lại, ước tính khoảng ${vndValue(
        top.price,
        top.volume
      )} (${formatVolume(top.volume)} cổ phiếu).`,
      flat
        ? `Điều đáng chú ý là giá ${top.symbol} gần như đứng yên (${pct(
            top.changePercent
          )}) dù thanh khoản đột biến — dòng tiền lớn vào/ra mà giá chưa phản ứng thường là giai đoạn tích lũy hoặc phân phối, tôi sẽ theo dõi thêm để phân biệt hai khả năng này.`
        : `Giá ${top.symbol} ${top.changePercent >= 0 ? "tăng" : "giảm"} ${pctAbs(
            top.changePercent
          )} cùng lúc thanh khoản đột biến — thanh khoản đi cùng biến động giá là tín hiệu đáng tin hơn thanh khoản đơn thuần.`,
      byValueDesc.length > 0
        ? `Cùng nhóm giao dịch sôi động nhất còn có ${byValueDesc.map((q) => q.symbol).join(", ")}.`
        : `Thanh khoản phiên nay khá tập trung, không lan tỏa rộng.`,
    ];

    return {
      title: flat
        ? `${top.symbol} hút dòng tiền lớn nhất thị trường dù giá gần như đứng yên`
        : `${top.symbol} dẫn đầu thanh khoản, giá trị giao dịch vượt trội toàn thị trường`,
      hookLines: [`${top.symbol} hút ${vndValue(top.price, top.volume)}.`, flat ? "Giá gần như đứng yên." : `Giá ${pct(top.changePercent)}.`],
      paragraphs,
      heroStat: { value: vndValue(top.price, top.volume), label: `Giá trị GD ${top.symbol}`, tone: tone(top.changePercent) },
      highlights: [
        { label: "Mã thanh khoản cao nhất", value: top.symbol, tone: "neutral" },
        { label: "Giá trị giao dịch", value: vndValue(top.price, top.volume), tone: "neutral" },
        { label: "Khối lượng", value: formatVolume(top.volume), tone: "neutral" },
        { label: "Biến động giá", value: pct(top.changePercent), tone: tone(top.changePercent) },
      ],
      relatedStocks: [top, ...byValueDesc].map(toRef),
      primarySymbol: top.symbol,
    };
  };
}

function buildBreadthArticle(pulseCtx: PulseCtx, byMoveDesc: Quote[]): () => ArticleBody {
  return () => {
    const { advancers, decliners, unchanged, total } = pulseCtx;
    const mood = marketMood(advancers, decliners);
    const topGainer = byMoveDesc.find((q) => q.changePercent > 0);
    const topLoser = [...byMoveDesc].reverse().find((q) => q.changePercent < 0) ?? byMoveDesc.find((q) => q.changePercent < 0);

    const paragraphs = [
      pulseParagraph(pulseCtx),
      `Không có mã hay nhóm ngành nào đủ nổi bật để tách riêng thành chủ đề hôm nay — nhìn toàn cảnh, thị trường ${mood} trên diện khá rộng.`,
    ];
    if (topGainer) paragraphs.push(`Mã tăng mạnh nhất là ${topGainer.symbol} (${pct(topGainer.changePercent)}).`);
    if (topLoser) paragraphs.push(`Ở chiều ngược lại, ${topLoser.symbol} giảm sâu nhất với ${pct(topLoser.changePercent)}.`);
    paragraphs.push(`Trong một phiên chưa có chủ đề rõ ràng, tôi ưu tiên đứng ngoài quan sát hơn là giải ngân mới.`);

    const primary = topGainer ?? topLoser ?? null;

    return {
      title: `Thị trường ${mood} phiên hôm nay, ${advancers} mã tăng / ${decliners} mã giảm`,
      hookLines: [`${advancers}/${total} mã tăng, ${decliners}/${total} mã giảm.`, `Thị trường ${mood}.`],
      paragraphs,
      heroStat: {
        value: `${advancers}/${total}`,
        label: "Mã tăng giá",
        tone: advancers > decliners ? "up" : decliners > advancers ? "down" : "neutral",
      },
      highlights: [
        { label: "Mã tăng giá", value: String(advancers), tone: "up" },
        { label: "Mã giảm giá", value: String(decliners), tone: "down" },
        { label: "Mã đứng giá", value: String(unchanged), tone: "neutral" },
        { label: "Bình quân thị trường", value: pct(pulseCtx.avgChange), tone: tone(pulseCtx.avgChange) },
      ],
      relatedStocks: [topGainer, topLoser].filter((q): q is Quote => Boolean(q)).map(toRef),
      primarySymbol: primary?.symbol ?? null,
    };
  };
}

/**
 * Analyzes today's market-overview quotes and deterministically picks ONE
 * topic to write about (spotlight mover / leading sector / liquidity spike /
 * overall breadth), mirroring how a market desk would decide what's actually
 * worth a daily note instead of always defaulting to a generic recap.
 * `company`/`action` are left null here — server/src/digest/enrich.ts fills
 * them in with an async fetch for whichever symbol this picks as primary.
 */
export function buildDailyDigest(quotes: Quote[], providerId: string, now: Date = new Date()): DailyDigest {
  const valid = quotes.filter((q) => Number.isFinite(q.changePercent) && Number.isFinite(q.price));
  const advancers = valid.filter((q) => q.changePercent > 0);
  const decliners = valid.filter((q) => q.changePercent < 0);
  const unchanged = valid.filter((q) => q.changePercent === 0);
  const avgChange = valid.length > 0 ? valid.reduce((s, q) => s + q.changePercent, 0) / valid.length : 0;
  const marketMedian = median(valid.map((q) => q.changePercent));
  const byMoveDesc = [...valid].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));

  const pulseCtx: PulseCtx = {
    advancers: advancers.length,
    decliners: decliners.length,
    unchanged: unchanged.length,
    total: valid.length,
    avgChange,
    marketMedian,
  };

  const volMedian = median(valid.map((q) => q.volume || 0));
  const liquidMovers = byMoveDesc.filter((q) => (q.volume || 0) >= volMedian);
  const spotlight = liquidMovers[0] ?? byMoveDesc[0];

  const sectorAgg = new Map<string, { symbols: Quote[]; sum: number }>();
  for (const q of valid) {
    const sector = SECTOR_MAP[q.symbol];
    if (!sector) continue;
    const entry = sectorAgg.get(sector) ?? { symbols: [], sum: 0 };
    entry.symbols.push(q);
    entry.sum += q.changePercent;
    sectorAgg.set(sector, entry);
  }
  const sectorRanked: SectorAgg[] = [...sectorAgg.entries()]
    .filter(([, s]) => s.symbols.length >= 3)
    .map(([sector, s]) => ({ sector, avg: s.sum / s.symbols.length, symbols: s.symbols }))
    .sort((a, b) => Math.abs(b.avg) - Math.abs(a.avg));
  const topSector = sectorRanked[0];

  const values = valid.map((q) => q.price * (q.volume || 0));
  const valueMedian = median(values);
  const byValueDesc = [...valid].sort((a, b) => b.price * b.volume - a.price * a.volume);
  const topValue = byValueDesc[0];

  const candidates: Candidate[] = [];

  if (spotlight && Math.abs(spotlight.changePercent) >= 4) {
    candidates.push({
      key: "spotlight",
      label: "Cổ phiếu tâm điểm",
      score: Math.abs(spotlight.changePercent),
      build: buildSpotlightArticle(spotlight, valid, pulseCtx),
    });
  }
  if (topSector && Math.abs(topSector.avg) >= 1.2) {
    candidates.push({
      key: "sector",
      label: "Ngành dẫn dắt",
      score: Math.abs(topSector.avg) * 1.5,
      build: buildSectorArticle(topSector, pulseCtx),
    });
  }
  if (topValue && valueMedian > 0 && topValue.price * topValue.volume >= valueMedian * 6) {
    candidates.push({
      key: "liquidity",
      label: "Thanh khoản đột biến",
      score: (topValue.price * topValue.volume) / (valueMedian || 1),
      build: buildLiquidityArticle(topValue, valid, pulseCtx),
    });
  }
  // Always-available fallback so there is exactly one topic every day, even
  // on a quiet session where nothing clears the thresholds above.
  candidates.push({
    key: "breadth",
    label: "Toàn cảnh thị trường",
    score: 0,
    build: buildBreadthArticle(pulseCtx, byMoveDesc),
  });

  candidates.sort((a, b) => b.score - a.score);
  const chosen = candidates[0];
  const article = chosen.build();

  return {
    date: isoDate(now),
    provider: providerId,
    topic: chosen.key,
    topicLabel: chosen.label,
    title: `Nhịp đập ${shortDate(now)}: ${article.title}`,
    hookLines: article.hookLines,
    paragraphs: article.paragraphs,
    highlights: article.highlights,
    heroStat: article.heroStat,
    relatedStocks: article.relatedStocks,
    marketPulse: {
      advancers: pulseCtx.advancers,
      decliners: pulseCtx.decliners,
      unchanged: pulseCtx.unchanged,
      total: pulseCtx.total,
      avgChange: pulseCtx.avgChange,
      median: pulseCtx.marketMedian,
    },
    primarySymbol: article.primarySymbol,
    company: null,
    action: null,
  };
}
