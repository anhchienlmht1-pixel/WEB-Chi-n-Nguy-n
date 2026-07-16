"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "@/lib/theme";

/**
 * Embeds TradingView's "Symbol Overview" widget for a single symbol — an
 * alternative to the Advanced Chart widget, which Vietnamese exchange data
 * (HOSE/HNX/UPCOM) isn't licensed for ("Mã giao dịch này chỉ có trên
 * TradingView"). Same JSON-in-<script>-tag embed method as the old Market
 * Overview widget (this widget has no constructor-API alternative), with
 * the container fully torn down and rebuilt on symbol change rather than
 * relying on the script re-parsing in place.
 */
export function TradingViewSymbolOverview({ tvSymbol, height = 480 }: { tvSymbol: string; height?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '<div class="tradingview-widget-container__widget"></div>';

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js";
    script.type = "text/javascript";
    script.async = true;
    script.text = JSON.stringify({
      symbols: [[tvSymbol, `${tvSymbol}|1D`]],
      chartOnly: false,
      width: "100%",
      height,
      locale: "vi_VN",
      colorTheme: theme,
      isTransparent: true,
      autosize: false,
      showVolume: true,
      showMA: false,
      hideDateRanges: false,
      hideMarketStatus: false,
      hideSymbolLogo: false,
      scalePosition: "right",
      scaleMode: "Normal",
      support_host: "https://www.tradingview.com",
    });
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [tvSymbol, height, theme]);

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white p-2 shadow-sm shadow-neutral-900/[0.02] dark:border-neutral-800 dark:bg-neutral-900/60 dark:shadow-lg dark:shadow-black/20">
      <div
        key={tvSymbol}
        className="tradingview-widget-container w-full"
        style={{ height }}
        ref={containerRef}
      />
    </div>
  );
}
