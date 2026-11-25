import { useCallback, useEffect, useRef, useState } from "react";

interface PollingState<T> {
  data: T | null;
  /** Time (ms) of the last successful fetch, for "cập nhật x giây trước". */
  updatedAt: number | null;
  error: string | null;
  loading: boolean;
  /** Manually re-run the fetcher (e.g. a "Thử lại" button on error). */
  refetch: () => void;
}

export function usePolling<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
  intervalMs = 0
): PollingState<T> {
  const [state, setState] = useState<Omit<PollingState<T>, "refetch">>({
    data: null,
    updatedAt: null,
    error: null,
    loading: true,
  });
  const [reloadTick, setReloadTick] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  // What the data was fetched for. When the inputs change (another symbol, say)
  // the old data must go: it belongs to something else, and keeping it on screen
  // until the new request lands — or for good, if that request fails — shows one
  // stock's prices and signals under another stock's name. A manual refetch or a
  // timed refresh keeps the data, so those never blank the screen.
  const depsKey = deps.map(String).join("\u0001");
  const depsKeyRef = useRef(depsKey);

  const refetch = useCallback(() => setReloadTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    const inputsChanged = depsKeyRef.current !== depsKey;
    depsKeyRef.current = depsKey;
    setState((s) => ({
      data: inputsChanged ? null : s.data,
      updatedAt: inputsChanged ? null : s.updatedAt,
      error: null,
      loading: true,
    }));

    async function load() {
      try {
        const data = await fetcherRef.current();
        if (!cancelled) setState({ data, updatedAt: Date.now(), error: null, loading: false });
      } catch (err) {
        if (!cancelled) {
          setState((s) => ({
            data: s.data,
            updatedAt: s.updatedAt,
            error: err instanceof Error ? err.message : "Failed to load data",
            loading: false,
          }));
        }
      }
    }

    // Tab ẩn (chuyển tab, thu nhỏ trình duyệt) thì không gọi máy chủ; quay lại
    // tab thì gọi ngay nếu dữ liệu đã cũ hơn một chu kỳ.
    let last = Date.now();
    const tick = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      last = Date.now();
      load();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible" && intervalMs > 0 && Date.now() - last >= intervalMs) tick();
    };
    load();
    const id = intervalMs > 0 ? setInterval(tick, intervalMs) : undefined;
    if (intervalMs > 0) document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      if (id) clearInterval(id);
      if (intervalMs > 0) document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadTick, intervalMs]);

  return { ...state, refetch };
}
