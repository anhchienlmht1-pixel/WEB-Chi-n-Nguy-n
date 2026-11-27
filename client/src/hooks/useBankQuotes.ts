import { usePolling } from "./usePolling";
import { useLivePoll } from "./useMarketClock";
import { fetchQuote } from "../api/client";
import { VALUATION } from "../data/bankValuation";
import type { Quote } from "../types";

const ALL = Object.keys(VALUATION);

// Giá đang khớp của 16 ngân hàng (20 giây/lần trong phiên, 5 phút ngoài phiên).
export function useBankQuotes() {
  const { data, updatedAt } = usePolling(
    async () => {
      const res = await Promise.allSettled(ALL.map((s) => fetchQuote(s)));
      const out: Record<string, Quote> = {};
      res.forEach((r, i) => {
        if (r.status === "fulfilled" && r.value?.price > 0) out[ALL[i]] = r.value;
      });
      return out;
    },
    [],
    useLivePoll(5 * 1000),
  );
  return { quotes: data, updatedAt };
}

/** Giá theo VND (nguồn có thể trả theo nghìn đồng). */
export function priceVnd(q: Quote | undefined): number | null {
  if (!q || !(q.price > 0)) return null;
  return q.price < 1000 ? q.price * 1000 : q.price;
}
