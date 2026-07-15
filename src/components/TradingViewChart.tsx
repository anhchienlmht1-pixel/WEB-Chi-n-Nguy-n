"use client";

import { useEffect, useRef } from "react";

/**
 * Embeds TradingView's official "Advanced Real-Time Chart" widget. The
 * widget loads directly from tradingview.com in the visitor's browser, so
 * unlike a server-side fetch it isn't subject to VNDirect/TCBS bot
 * protection, and it updates live on its own.
 */
export function TradingViewChart({ tvSymbol }: { tvSymbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

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
      theme: "dark",
      style: "1",
      locale: "vi_VN",
      backgroundColor: "rgba(10, 13, 12, 1)",
      gridColor: "rgba(31, 37, 35, 0.4)",
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: false,
      support_host: "https://www.tradingview.com",
    });
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [tvSymbol]);

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-2 shadow-lg shadow-black/20">
      <div className="tradingview-widget-container h-[480px] w-full" ref={containerRef} />
    </div>
  );
}
