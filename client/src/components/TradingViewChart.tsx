import { useEffect, useRef, useState } from "react";
import { useTheme } from "../hooks/useTheme";

const WIDGET_SRC = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";

// How long to wait for the widget's iframe before giving up on checking it.
const CHECK_EVERY_MS = 300;
const CHECK_FOR_MS = 15_000;

// Symbol the widget actually loaded, read from its iframe's URL (the config is
// carried in the hash as JSON). null when it can't be read.
function shownSymbol(frame: HTMLIFrameElement): string | null {
  try {
    return decodeURIComponent(frame.src).match(/"symbol":"([^"]+)"/)?.[1] ?? null;
  } catch {
    return null;
  }
}

// TradingView's free "Advanced Chart" widget for one Vietnamese listing.
// `tvSymbol` is already in "EXCHANGE:TICKER" form (see utils/tradingViewSymbol)
// and symbol-change is switched off in the widget, so the chart can only ever
// show the symbol this site asked for — Vietnamese stocks only.
//
// Two things learned the hard way:
//  - With `autosize: true` the widget resets its container to 100% height of an
//    auto-height parent, which collapses to the iframe's default 150px (measured
//    in Chrome: 150px even with a 480px inline height). So the size is given in
//    pixels instead (`autosize: false`) — measured 480px.
//  - When the widget can't find its symbol it silently falls back to NASDAQ:AAPL.
//    After it loads we read the symbol back from the iframe, and if it isn't the
//    one we asked for the chart is hidden and `onUnavailable` is called, so a
//    foreign stock is never shown under a Vietnamese ticker.
//
// The widget is an iframe it builds itself from a script tag carrying a JSON
// config. Mount it with `key={tvSymbol}` so every symbol gets a fresh container.
export default function TradingViewChart({
  tvSymbol,
  height = 500,
  onUnavailable,
}: {
  tvSymbol: string;
  height?: number;
  onUnavailable?: (tvSymbol: string) => void;
}) {
  const { theme } = useTheme();
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [mismatch, setMismatch] = useState(false);
  // Latest callback without re-running the widget effect when it changes.
  const unavailableRef = useRef(onUnavailable);
  useEffect(() => {
    unavailableRef.current = onUnavailable;
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    setFailed(false);
    setMismatch(false);

    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    widget.style.height = `${height}px`;
    widget.style.width = "100%";

    const script = document.createElement("script");
    script.src = WIDGET_SRC;
    script.async = true;
    script.type = "text/javascript";
    script.onerror = () => setFailed(true);
    script.text = JSON.stringify({
      autosize: false,
      width: "100%",
      height,
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

    // Check what the widget really loaded.
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const frame = host.querySelector("iframe");
      if (!frame) {
        if (Date.now() - startedAt > CHECK_FOR_MS) window.clearInterval(timer);
        return;
      }
      window.clearInterval(timer);
      const shown = shownSymbol(frame);
      if (shown && shown.toUpperCase() !== tvSymbol.toUpperCase()) {
        setMismatch(true);
        host.replaceChildren();
        unavailableRef.current?.(tvSymbol);
      }
    }, CHECK_EVERY_MS);

    return () => {
      window.clearInterval(timer);
      host.replaceChildren();
    };
  }, [tvSymbol, theme, height]);

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <div
        ref={hostRef}
        className="tradingview-widget-container"
        style={{ height, width: "100%" }}
        data-tv-symbol={tvSymbol}
      />
      {(failed || mismatch) && (
        <p role="alert" className="px-4 py-3 text-base text-slate-600">
          {failed
            ? 'Không tải được biểu đồ TradingView (có thể trình duyệt đang chặn). Chuyển sang tab "Tín hiệu Mua/Bán" để xem biểu đồ của hệ thống.'
            : 'TradingView chưa có mã này nên biểu đồ bị ẩn. Hãy xem ở tab "Tín hiệu Mua/Bán".'}
        </p>
      )}
      <p className="border-t border-slate-200 px-4 py-2 text-sm text-slate-600">
        Biểu đồ:{" "}
        <a
          href={`https://www.tradingview.com/symbols/${tvSymbol.replace(":", "-")}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-emerald-700 underline underline-offset-2"
        >
          {tvSymbol} trên TradingView
        </a>
      </p>
    </div>
  );
}
