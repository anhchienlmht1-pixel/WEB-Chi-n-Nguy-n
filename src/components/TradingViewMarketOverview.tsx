"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "@/lib/theme";
import { TvTab } from "@/lib/types";

/**
 * Embeds TradingView's official "Market Overview" widget — a live,
 * self-updating price list grouped into tabs, loaded client-side directly
 * from tradingview.com. Used for the market index summary and all
 * board/watchlist tables so pricing no longer depends on scraping
 * VNDirect/TCBS from our own server.
 */
export function TradingViewMarketOverview({
  tabs,
  title,
  height = 480,
}: {
  tabs: TvTab[];
  title?: string;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '<div class="tradingview-widget-container__widget"></div>';

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js";
    script.type = "text/javascript";
    script.async = true;
    script.text = JSON.stringify({
      title,
      tabs,
      width: "100%",
      height,
      locale: "vi_VN",
      colorTheme: theme,
      isTransparent: true,
      showFloatingTooltip: true,
      dateRange: "1D",
      support_host: "https://www.tradingview.com",
    });
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [tabs, title, height, theme]);

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white p-2 shadow-sm shadow-neutral-900/[0.02] dark:border-neutral-800 dark:bg-neutral-900/60 dark:shadow-lg dark:shadow-black/20">
      <div className="tradingview-widget-container w-full" style={{ height }} ref={containerRef} />
    </div>
  );
}
