import { useEffect, useRef, useState } from "react";
import { useTheme } from "../hooks/useTheme";

const WIDGET_SRC = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";

// TradingView's free "Advanced Chart" widget for one Vietnamese listing.
// `tvSymbol` is already in "EXCHANGE:TICKER" form (see utils/tradingViewSymbol)
// and symbol-change is switched off in the widget, so the chart can only ever
// show the symbol this site asked for — Vietnamese stocks only.
//
// The widget is an iframe it builds itself from a script tag carrying a JSON
// config, so it is rebuilt whenever the symbol or the site theme changes.
export default function TradingViewChart({ tvSymbol, height = 440 }: { tvSymbol: string; height?: number }) {
  const { theme } = useTheme();
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    setFailed(false);

    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    widget.style.height = "100%";
    widget.style.width = "100%";

    const script = document.createElement("script");
    script.src = WIDGET_SRC;
    script.async = true;
    script.type = "text/javascript";
    script.onerror = () => setFailed(true);
    script.text = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: "D",
      timezone: "Asia/Ho_Chi_Minh",
      theme,
      style: "1", // candlesticks
      locale: "vi_VN",
      allow_symbol_change: false,
      withdateranges: true,
      hide_side_toolbar: false,
      save_image: true,
      calendar: false,
      support_host: "https://www.tradingview.com",
    });

    host.replaceChildren(widget, script);
    return () => host.replaceChildren();
  }, [tvSymbol, theme]);

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
      <div
        ref={hostRef}
        className="tradingview-widget-container"
        style={{ height, width: "100%" }}
        data-tv-symbol={tvSymbol}
      />
      {failed && (
        <p role="alert" className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
          Không tải được biểu đồ TradingView (có thể trình duyệt đang chặn). Chuyển sang tab "Tín hiệu" để xem biểu đồ của
          hệ thống.
        </p>
      )}
      <p className="border-t border-slate-200 px-3 py-1.5 text-[11px] text-slate-400 dark:border-slate-800 dark:text-slate-500">
        Biểu đồ:{" "}
        <a
          href={`https://www.tradingview.com/symbols/${tvSymbol.replace(":", "-")}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          {tvSymbol} trên TradingView
        </a>
      </p>
    </div>
  );
}
