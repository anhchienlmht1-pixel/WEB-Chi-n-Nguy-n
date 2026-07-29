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

export interface DailyDigest {
  date: string; // YYYY-MM-DD
  provider: string;
  topic: DigestTopic;
  topicLabel: string;
  title: string;
  paragraphs: string[];
  highlights: DigestHighlight[];
  relatedStocks: DigestStockRef[];
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function pct(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function tone(n: number): "up" | "down" | "neutral" {
  if (n > 0) return "up";
  if (n < 0) return "down";
  return "neutral";
}

function vndValue(price: number, volume: number): string {
  const value = price * volume;
  if (value >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(2)} nghìn tỷ đ`;
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ đ`;
  return `${Math.round(value).toLocaleString("vi-VN")} đ`;
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

interface SectorAgg {
  sector: string;
  avg: number;
  symbols: Quote[];
}

type ArticleBody = Pick<DailyDigest, "title" | "paragraphs" | "highlights" | "relatedStocks">;

interface Candidate {
  key: DigestTopic;
  label: string;
  score: number;
  build: () => ArticleBody;
}

function buildSpotlightArticle(spotlight: Quote, all: Quote[]): () => ArticleBody {
  return () => {
    const direction = spotlight.changePercent >= 0 ? "tăng" : "giảm";
    const others = all
      .filter((q) => q.symbol !== spotlight.symbol && Math.sign(q.changePercent) === Math.sign(spotlight.changePercent))
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
      .slice(0, 4);
    const sector = SECTOR_MAP[spotlight.symbol];

    const paragraphs = [
      `${spotlight.symbol} (${spotlight.name}) là tâm điểm phiên hôm nay khi ${direction} ${pct(
        spotlight.changePercent
      ).replace("+", "")} lên ${spotlight.price.toLocaleString("vi-VN")} đ, thanh khoản ${formatVolume(
        spotlight.volume
      )} cổ phiếu (tương đương ${vndValue(spotlight.price, spotlight.volume)}).`,
      sector
        ? `Diễn biến của ${spotlight.symbol} đáng chú ý vì đây là mã có biên độ dịch chuyển mạnh nhất trong nhóm cổ phiếu thanh khoản tốt hôm nay, thuộc nhóm ngành ${sector}.`
        : `Đây là mã có biên độ dịch chuyển mạnh nhất trong nhóm cổ phiếu thanh khoản tốt của phiên hôm nay.`,
    ];
    if (others.length > 0) {
      paragraphs.push(
        `Cùng chiều ${direction} còn có ${others
          .map((q) => `${q.symbol} (${pct(q.changePercent)})`)
          .join(", ")} — cho thấy dòng tiền phiên nay không chỉ tập trung ở một mã riêng lẻ.`
      );
    }
    paragraphs.push(
      `Nhà đầu tư nên theo dõi thêm diễn biến khối lượng và vùng giá của ${spotlight.symbol} trong các phiên tới để đánh giá xu hướng có được duy trì hay chỉ là biến động ngắn hạn.`
    );

    return {
      title: `${spotlight.symbol} ${direction} mạnh ${pct(spotlight.changePercent).replace("+", "")}, dẫn dắt tâm lý thị trường`,
      paragraphs,
      highlights: [
        { label: "Mã tâm điểm", value: spotlight.symbol, tone: tone(spotlight.changePercent) },
        { label: "Biến động", value: pct(spotlight.changePercent), tone: tone(spotlight.changePercent) },
        { label: "Giá đóng cửa", value: `${spotlight.price.toLocaleString("vi-VN")} đ`, tone: "neutral" },
        { label: "Khối lượng", value: formatVolume(spotlight.volume), tone: "neutral" },
      ],
      relatedStocks: [spotlight, ...others].map(toRef),
    };
  };
}

function buildSectorArticle(top: SectorAgg, marketAvg: number): () => ArticleBody {
  return () => {
    const direction = top.avg >= 0 ? "dẫn dắt" : "gây áp lực lên";
    const ranked = [...top.symbols].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
    const leaders = ranked.slice(0, 5);
    const vsMarket = top.avg - marketAvg;

    const paragraphs = [
      `Nhóm ngành ${top.sector} là điểm nhấn của phiên hôm nay khi tăng/giảm bình quân ${pct(
        top.avg
      )}, ${direction} diễn biến chung của thị trường (bình quân toàn thị trường ${pct(marketAvg)}).`,
      `Trong nhóm, ${leaders
        .map((q) => `${q.symbol} (${pct(q.changePercent)})`)
        .join(", ")} là những mã biến động mạnh nhất, chi phối phần lớn mức thay đổi bình quân của cả ngành.`,
      Math.abs(vsMarket) >= 1
        ? `Mức chênh lệch ${pct(vsMarket)} so với bình quân thị trường cho thấy dòng tiền phiên nay có xu hướng luân chuyển rõ rệt vào (hoặc ra khỏi) nhóm ${top.sector}, thay vì lan tỏa đều khắp các nhóm ngành.`
        : `Mức chênh lệch với bình quân thị trường chưa lớn, nên đây nhiều khả năng là biến động đồng pha với xu hướng chung hơn là dòng tiền luân chuyển riêng vào ngành.`,
      `Nhà đầu tư quan tâm nhóm ${top.sector} nên theo dõi thêm thông tin ngành và diễn biến 1-2 phiên tới để xác nhận đây là xu hướng luân chuyển dòng tiền bền vững hay chỉ là biến động ngắn hạn.`,
    ];

    return {
      title: `Dòng tiền ${top.avg >= 0 ? "đổ vào" : "rút khỏi"} nhóm ${top.sector}, bình quân ngành ${pct(top.avg)}`,
      paragraphs,
      highlights: [
        { label: "Nhóm ngành", value: top.sector, tone: "neutral" },
        { label: "Bình quân ngành", value: pct(top.avg), tone: tone(top.avg) },
        { label: "Bình quân thị trường", value: pct(marketAvg), tone: tone(marketAvg) },
        { label: "Số mã trong nhóm", value: String(top.symbols.length), tone: "neutral" },
      ],
      relatedStocks: leaders.map(toRef),
    };
  };
}

function buildLiquidityArticle(top: Quote, all: Quote[]): () => ArticleBody {
  return () => {
    const byValueDesc = [...all]
      .filter((q) => q.symbol !== top.symbol)
      .sort((a, b) => b.price * b.volume - a.price * a.volume)
      .slice(0, 4);

    const paragraphs = [
      `Thanh khoản dồn mạnh vào ${top.symbol} (${top.name}) phiên hôm nay, với giá trị giao dịch ước tính khoảng ${vndValue(
        top.price,
        top.volume
      )} (${formatVolume(top.volume)} cổ phiếu) — vượt trội so với phần còn lại của thị trường.`,
      `Giá ${top.symbol} ${top.changePercent >= 0 ? "tăng" : "giảm"} ${pct(top.changePercent).replace(
        "+",
        ""
      )} trong phiên có thanh khoản đột biến, cho thấy đây là mã đang thu hút sự chú ý đặc biệt của dòng tiền, dù xu hướng giá chưa chắc đã đi cùng chiều với khối lượng.`,
      byValueDesc.length > 0
        ? `Cùng nằm trong nhóm giao dịch sôi động nhất còn có ${byValueDesc
            .map((q) => q.symbol)
            .join(", ")}, phản ánh sự quan tâm không chỉ tập trung ở một mã riêng lẻ.`
        : `Đây là phiên mà thanh khoản tập trung khá rõ vào một số ít mã, thay vì lan tỏa đều thị trường.`,
      `Thanh khoản đột biến thường là tín hiệu đáng chú ý — nhà đầu tư nên đối chiếu thêm với thông tin doanh nghiệp/ngành trước khi ra quyết định.`,
    ];

    return {
      title: `${top.symbol} hút dòng tiền mạnh, giá trị giao dịch vượt trội toàn thị trường`,
      paragraphs,
      highlights: [
        { label: "Mã thanh khoản cao nhất", value: top.symbol, tone: "neutral" },
        { label: "Giá trị giao dịch", value: vndValue(top.price, top.volume), tone: "neutral" },
        { label: "Khối lượng", value: formatVolume(top.volume), tone: "neutral" },
        { label: "Biến động giá", value: pct(top.changePercent), tone: tone(top.changePercent) },
      ],
      relatedStocks: [top, ...byValueDesc].map(toRef),
    };
  };
}

function buildBreadthArticle(
  advancers: Quote[],
  decliners: Quote[],
  unchanged: Quote[],
  avgChange: number,
  byMoveDesc: Quote[]
): () => ArticleBody {
  return () => {
    const total = advancers.length + decliners.length + unchanged.length;
    const skew = advancers.length - decliners.length;
    const mood = skew > 0 ? "tích cực" : skew < 0 ? "thận trọng" : "giằng co";
    const topGainer = byMoveDesc.find((q) => q.changePercent > 0);
    const topLoser = [...byMoveDesc].reverse().find((q) => q.changePercent < 0) ?? byMoveDesc.find((q) => q.changePercent < 0);

    const paragraphs = [
      `Thị trường giao dịch với tâm lý ${mood} trong phiên hôm nay: ${advancers.length}/${total} mã tăng giá, ${decliners.length}/${total} mã giảm và ${unchanged.length} mã đứng giá tham chiếu, mức thay đổi bình quân toàn thị trường đạt ${pct(
        avgChange
      )}.`,
      skew !== 0
        ? `Số mã ${skew > 0 ? "tăng" : "giảm"} áp đảo cho thấy dòng tiền phiên nay nghiêng hẳn về phía ${
            skew > 0 ? "bên mua" : "bên bán"
          }, dù mức độ lan tỏa giữa các nhóm ngành chưa thực sự nổi bật để tạo thành một chủ đề riêng.`
        : `Số mã tăng và giảm khá cân bằng, phản ánh một phiên giằng co, chưa có nhóm ngành hay dòng tiền nào nổi bật hẳn để dẫn dắt xu hướng.`,
    ];
    if (topGainer) {
      paragraphs.push(`Mã tăng mạnh nhất là ${topGainer.symbol} (${pct(topGainer.changePercent)}).`);
    }
    if (topLoser) {
      paragraphs.push(`Ở chiều ngược lại, ${topLoser.symbol} giảm sâu nhất với ${pct(topLoser.changePercent)}.`);
    }
    paragraphs.push(
      `Trong một phiên chưa xuất hiện chủ đề đầu tư rõ ràng, nhà đầu tư nên ưu tiên quan sát thêm diễn biến thanh khoản và các nhóm ngành trụ cột trước khi giải ngân mới.`
    );

    const related = [topGainer, topLoser].filter((q): q is Quote => Boolean(q));

    return {
      title: `Thị trường ${mood === "tích cực" ? "hồi phục nhẹ" : mood === "thận trọng" ? "điều chỉnh nhẹ" : "giằng co"} phiên hôm nay, ${advancers.length} mã tăng / ${decliners.length} mã giảm`,
      paragraphs,
      highlights: [
        { label: "Mã tăng giá", value: String(advancers.length), tone: "up" },
        { label: "Mã giảm giá", value: String(decliners.length), tone: "down" },
        { label: "Mã đứng giá", value: String(unchanged.length), tone: "neutral" },
        { label: "Bình quân thị trường", value: pct(avgChange), tone: tone(avgChange) },
      ],
      relatedStocks: related.map(toRef),
    };
  };
}

function formatVolume(volume: number): string {
  if (volume >= 1_000_000_000) return `${(volume / 1_000_000_000).toFixed(2)}B`;
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(2)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(1)}K`;
  return String(volume);
}

/**
 * Analyzes today's market-overview quotes and deterministically picks ONE
 * topic to write about (spotlight mover / leading sector / liquidity spike /
 * overall breadth), mirroring how a market desk would decide what's actually
 * worth a daily note instead of always defaulting to a generic recap.
 */
export function buildDailyDigest(quotes: Quote[], providerId: string, now: Date = new Date()): DailyDigest {
  const valid = quotes.filter((q) => Number.isFinite(q.changePercent) && Number.isFinite(q.price));
  const advancers = valid.filter((q) => q.changePercent > 0);
  const decliners = valid.filter((q) => q.changePercent < 0);
  const unchanged = valid.filter((q) => q.changePercent === 0);
  const avgChange = valid.length > 0 ? valid.reduce((s, q) => s + q.changePercent, 0) / valid.length : 0;
  const byMoveDesc = [...valid].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));

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
      build: buildSpotlightArticle(spotlight, valid),
    });
  }
  if (topSector && Math.abs(topSector.avg) >= 1.2) {
    candidates.push({
      key: "sector",
      label: "Ngành dẫn dắt",
      score: Math.abs(topSector.avg) * 1.5,
      build: buildSectorArticle(topSector, avgChange),
    });
  }
  if (topValue && valueMedian > 0 && topValue.price * topValue.volume >= valueMedian * 6) {
    candidates.push({
      key: "liquidity",
      label: "Thanh khoản đột biến",
      score: (topValue.price * topValue.volume) / (valueMedian || 1),
      build: buildLiquidityArticle(topValue, valid),
    });
  }
  // Always-available fallback so there is exactly one topic every day, even
  // on a quiet session where nothing clears the thresholds above.
  candidates.push({
    key: "breadth",
    label: "Toàn cảnh thị trường",
    score: 0,
    build: buildBreadthArticle(advancers, decliners, unchanged, avgChange, byMoveDesc),
  });

  candidates.sort((a, b) => b.score - a.score);
  const chosen = candidates[0];
  const article = chosen.build();

  return {
    date: isoDate(now),
    provider: providerId,
    topic: chosen.key,
    topicLabel: chosen.label,
    ...article,
  };
}
