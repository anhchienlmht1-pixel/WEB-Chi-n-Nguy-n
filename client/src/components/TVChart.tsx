import { useEffect, useRef } from "react";
import { useTheme } from "../hooks/useTheme";

interface Props {
  symbol: string;
  exchange: string;
}

// Official TradingView Advanced Chart embed. Data is fetched by the widget
// itself in the visitor's browser directly from TradingView — no backend or
// API key involved. Docs: tradingview.com/widget-docs/widgets/charts/advanced-chart/
export default function TVChart({ symbol, exchange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const tvSymbol = `${exchange === "HNX" ? "HNX" : "HOSE"}:${symbol.toUpperCase()}`;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "";
    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    widget.style.height = "100%";
    widget.style.width = "100%";
    container.appendChild(widget);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: "D",
      timezone: "Asia/Ho_Chi_Minh",
      theme,
      style: "1",
      locale: "vi_VN",
      allow_symbol_change: false,
      hide_side_toolbar: false,
      support_host: "https://www.tradingview.com",
    });
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [tvSymbol, theme]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container h-[500px] w-full"
      style={{ height: 500 }}
    />
  );
}
