// Runs `fn` over `items` with at most `limit` in flight at once — used to
// fetch per-symbol financial reports for the whole universe without firing
// 60+ simultaneous requests at the (unofficial, rate-limit-unknown) KBS API.
export async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<void>
): Promise<void> {
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}
