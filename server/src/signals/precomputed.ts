import { head, put } from "@vercel/blob";
import { SHARE_INFLIGHT } from "../utils/runtime.js";

// Kết quả tính sẵn (GitHub Actions chạy server/src/jobs/precompute.ts mỗi ngày
// sau 15:00) lưu ở nhánh `precomputed-data` của chính repo GitHub (đọc qua
// raw.githubusercontent.com, không cần token); Vercel Blob chỉ còn là đường dự phòng. Máy chủ web chỉ đọc file này thay vì tự quét
// toàn bộ mã — mỗi lượt quét tốn nhiều phút CPU, gói Vercel miễn phí chỉ có 4 giờ/tháng.
//
// Có bản tính sẵn còn mới (< FRESH_MS) thì máy chủ KHÔNG tự tính nữa; nếu job
// ngừng chạy quá FRESH_MS, máy chủ tự quay lại cách cũ (tự tính) để web không đứng.

const ENV = process.env.VERCEL_ENV === "production" ? "prod" : "preview";
const PREFIX = `precomputed/${ENV}`;
const FRESH_MS = 30 * 3600_000;
const MEM_MS = 5 * 60_000;

export type PrecomputedName = "meta" | "trend-signals" | "trade-journal" | "sector-waves" | "ma-scan" | "fund-insight";
export interface PrecomputeMeta {
  generatedAt: string;
  sessionDate: string;
  durations: Record<string, number>;
  errors: Record<string, string>;
}

const blobConfigured = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const mem = new Map<string, { at: number; data: Promise<unknown>; done?: boolean; value?: unknown }>();

const GH_RAW = "https://raw.githubusercontent.com/anhchienlmht1-pixel/WEB-Chi-n-Nguy-n/precomputed-data";

async function fetchGithub<T>(name: PrecomputedName): Promise<T | null> {
  try {
    const r = await fetch(`${GH_RAW}/${ENV}/${name}.json?t=${Math.floor(Date.now() / MEM_MS)}`);
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

async function fetchBlob<T>(name: PrecomputedName): Promise<T | null> {
  if (!blobConfigured()) return null;
  try {
    const meta = await head(`${PREFIX}/${name}.json`);
    const r = await fetch(`${meta.url}?t=${Math.floor(Date.now() / MEM_MS)}`);
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

async function fetchStored<T>(name: PrecomputedName): Promise<T | null> {
  return (await fetchGithub<T>(name)) ?? (await fetchBlob<T>(name));
}

export function readPrecomputed<T>(name: PrecomputedName): Promise<T | null> {
  const hit = mem.get(name);
  if (hit && Date.now() - hit.at < MEM_MS) {
    if (hit.done) return Promise.resolve(hit.value as T | null);
    if (SHARE_INFLIGHT) return hit.data as Promise<T | null>;
  }
  const data = fetchStored<T>(name);
  const entry: { at: number; data: Promise<unknown>; done?: boolean; value?: unknown } = { at: Date.now(), data };
  mem.set(name, entry);
  data.then((v) => { entry.done = true; entry.value = v; });
  return data;
}

/** Job ghi kết quả: có PRECOMPUTE_OUT_DIR thì ghi file (workflow đẩy lên nhánh precomputed-data), không thì Vercel Blob. */
export async function writePrecomputed(name: PrecomputedName, data: unknown): Promise<void> {
  const dir = process.env.PRECOMPUTE_OUT_DIR;
  if (dir) {
    const fs = await import("node:fs/promises");
    await fs.mkdir(`${dir}/${ENV}`, { recursive: true });
    await fs.writeFile(`${dir}/${ENV}/${name}.json`, JSON.stringify(data));
    return;
  }
  if (!blobConfigured()) throw new Error("Thiếu PRECOMPUTE_OUT_DIR hoặc BLOB_READ_WRITE_TOKEN");
  await put(`${PREFIX}/${name}.json`, JSON.stringify(data), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

/** Bản tính sẵn còn dùng được: job đã chạy trong 30 giờ qua và không lỗi phần này. */
export async function precomputedFresh(name: PrecomputedName): Promise<boolean> {
  const meta = await readPrecomputed<PrecomputeMeta>("meta");
  if (!meta) return false;
  if (Date.now() - Date.parse(meta.generatedAt) > FRESH_MS) return false;
  return !meta.errors?.[name];
}

/** Đọc bản tính sẵn nếu còn mới, null nếu không có (khi đó máy chủ tự tính như cũ). */
export async function loadPrecomputed<T>(name: PrecomputedName): Promise<T | null> {
  if (!(await precomputedFresh(name))) return null;
  return readPrecomputed<T>(name);
}
