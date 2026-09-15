import { useCallback, useEffect, useRef, useState } from "react";

interface PollingState<T> {
  data: T | null;
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
    error: null,
    loading: true,
  });
  const [reloadTick, setReloadTick] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refetch = useCallback(() => setReloadTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    async function load() {
      try {
        const data = await fetcherRef.current();
        if (!cancelled) setState({ data, error: null, loading: false });
      } catch (err) {
        if (!cancelled) {
          setState((s) => ({
            data: s.data,
            error: err instanceof Error ? err.message : "Failed to load data",
            loading: false,
          }));
        }
      }
    }

    load();
    const id = intervalMs > 0 ? setInterval(load, intervalMs) : undefined;
    return () => {
      cancelled = true;
      if (id) clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadTick]);

  return { ...state, refetch };
}
