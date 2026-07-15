"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "@/lib/theme";

/**
 * Embeds TradingView's official "Advanced Real-Time Chart" widget. The
 * widget loads directly from tradingview.com in the visitor's browser, so
 * unlike a server-side fetch it isn't subject to VNDirect/TCBS bot
 * protection, and it updates live on its own.
 */
export function TradingViewChart({ tvSymbol }: { tvSymbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '<div class="tradingview-widget-container__widget"></div>';

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.text = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: "D",
      timezone: "Asia/Ho_Chi_Minh",
      theme,
      style: "1",
      locale: "vi_VN",
      backgroundColor: theme === "dark" ? "rgba(10, 13, 12, 1)" : "rgba(255, 255, 255, 1)",
      gridColor: theme === "dark" ? "rgba(31, 37, 35, 0.4)" : "rgba(230, 230, 230, 0.6)",
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: false,
      support_host: "https://www.tradingview.com",
    });
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [tvSymbol, theme]);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-2 shadow-sm shadow-neutral-900/[0.02] dark:border-neutral-800 dark:bg-neutral-900/60 dark:shadow-lg dark:shadow-black/20">
      <div className="tradingview-widget-container h-[480px] w-full" ref={containerRef} />
    </div>
  );
}
