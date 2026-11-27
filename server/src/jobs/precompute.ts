// Job tính sẵn chạy trên GitHub Actions (.github/workflows/precompute.yml) mỗi
// ngày giao dịch sau 15:00, ghi kết quả ra PRECOMPUTE_OUT_DIR (workflow đẩy lên nhánh
// precomputed-data) hoặc Vercel Blob (signals/precomputed.ts).
// Máy chủ web chỉ đọc kết quả, không tự quét toàn bộ mã nữa.
//
// Chạy tay: cd server && VERCEL_ENV=production PRECOMPUTE_OUT_DIR=/tmp/pre npx tsx src/jobs/precompute.ts
import { scanBuySignalsWithSession } from "../signals/trendScanner.js";
import { getTradeJournal } from "../signals/tradeJournal.js";
import { getSectorWaves, isComplete } from "../signals/sectorWaves.js";
import { scanMovingAverages } from "../signals/maScanner.js";
import { buildFundInsight } from "../signals/fundInsight.js";
import { lastClosedSessionDate } from "../signals/sessionClose.js";
import { writePrecomputed as writeBlob, type PrecomputeMeta, type PrecomputedName } from "../signals/precomputed.js";

// Không có nơi ghi: chạy thử, chỉ in kết quả (kiểm tra nguồn dữ liệu).
const DRY = !process.env.PRECOMPUTE_OUT_DIR && !process.env.BLOB_READ_WRITE_TOKEN;
const writePrecomputed = (name: PrecomputedName, data: unknown) =>
  DRY ? Promise.resolve(console.log(`  (chạy thử) ${name}: ${JSON.stringify(data).length.toLocaleString()} ký tự`)) : writeBlob(name, data);

const durations: Record<string, number> = {};
const errors: Record<string, string> = {};

async function run(name: PrecomputedName, fn: () => Promise<unknown>): Promise<void> {
  const t = Date.now();
  try {
    const data = await fn();
    await writePrecomputed(name, data);
    console.log(`✓ ${name} (${((Date.now() - t) / 1000).toFixed(1)}s)`);
  } catch (e) {
    errors[name] = e instanceof Error ? e.message : String(e);
    console.error(`✗ ${name}: ${errors[name]}`);
  }
  durations[name] = Date.now() - t;
}

const closed = lastClosedSessionDate();
console.log(`Tính sẵn cho phiên ${closed} (${process.env.VERCEL_ENV ?? "preview"})`);

await run("trend-signals", async () => {
  const r = await scanBuySignalsWithSession();
  if (r.items.length === 0) throw new Error("danh sách rỗng");
  return r;
});
await run("trade-journal", () => getTradeJournal());
await run("sector-waves", async () => {
  // lịch sử dựng dần theo từng lượt; lặp tới khi đủ hoặc quá 40 lượt
  let r = await getSectorWaves(closed);
  for (let i = 0; i < 40 && !(isComplete(r) && r.sessionDate >= closed); i++) r = await getSectorWaves(closed);
  if (!isComplete(r)) throw new Error(`chưa dựng xong ${r.progress.done}/${r.progress.total}`);
  return r;
});
await run("ma-scan", () => scanMovingAverages());
await run("fund-insight", () => buildFundInsight());

const meta: PrecomputeMeta = { generatedAt: new Date().toISOString(), sessionDate: closed, durations, errors };
await writePrecomputed("meta", meta);
console.log(JSON.stringify(meta, null, 2));
if (errors["trend-signals"]) process.exit(1);
