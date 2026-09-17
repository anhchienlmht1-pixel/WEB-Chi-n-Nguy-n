import { useEffect, useRef } from "react";

function toTvSymbol(symbol: string, exchange?: string): string {
  const sym = symbol.toUpperCase();
  if (sym === "VNINDEX") return "HOSE:VNINDEX";
  const ex = exchange === "HNX" ? "HNX" : exchange === "UPCOM" ? "UPCOM" : "HOSE";
  return `${ex}:${sym}`;
}

export default function TradingViewChart({
  symbol,
  exchange,
  height = 420,
}: {
  symbol: string;
  exchange?: string;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = "";

    const isDark = document.documentElement.classList.contains("dark");

    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container";
    wrapper.style.cssText = "height:100%;width:100%";

    const widgetEl = document.createElement("div");
    widgetEl.className = "tradingview-widget-container__widget";
    widgetEl.style.cssText = "height:100%;width:100%";
    wrapper.appendChild(widgetEl);

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.textContent = JSON.stringify({
      autosize: true,
      symbol: toTvSymbol(symbol, exchange),
      interval: "D",
      timezone: "Asia/Ho_Chi_Minh",
      theme: isDark ? "dark" : "light",
      style: "1",
      locale: "vi_VN",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: true,
      calendar: false,
      support_host: "https://www.tradingview.com",
    });
    wrapper.appendChild(script);

    container.appendChild(wrapper);

    return () => {
      container.innerHTML = "";
    };
  }, [symbol, exchange]);

  return <div ref={containerRef} style={{ height, width: "100%" }} />;
}
