"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTheme } from "@/lib/theme";

interface TradingViewWidgetCtor {
  new (config: Record<string, unknown>): unknown;
}

declare global {
  interface Window {
    TradingView?: { widget: TradingViewWidgetCtor };
  }
}

const TV_SCRIPT_SRC = "https://s3.tradingview.com/tv.js";
let tvScriptPromise: Promise<void> | null = null;

function loadTradingViewScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.TradingView) return Promise.resolve();
  if (!tvScriptPromise) {
    tvScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = TV_SCRIPT_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Không thể tải thư viện TradingView"));
      document.head.appendChild(script);
    });
  }
  return tvScriptPromise;
}

/**
 * Embeds TradingView's chart using the tv.js library and the
 * `new TradingView.widget({...})` constructor, passing config as a real JS
 * object rather than JSON text inside a <script> tag. The latter approach
 * (TradingView's copy-paste embed snippet) is built for static HTML and is
 * unreliable when the symbol changes dynamically in a React tree — it can
 * silently fall back to the widget's default demo symbol. The constructor
 * API doesn't have that failure mode.
 *
 * Defaults to a 1-minute interval so the chart is visibly live (TradingView
 * streams real-time updates itself once loaded) — the widget's own toolbar
 * still lets the viewer switch to daily/weekly/etc.
 */
export function TradingViewChart({ tvSymbol }: { tvSymbol: string }) {
  const rawId = useId();
  const containerId = `tv-chart-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);

  const { theme } = useTheme();

  useEffect(() => {
    let cancelled = false;

    loadTradingViewScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.TradingView) return;
        setError(false);
        containerRef.current.innerHTML = "";
        new window.TradingView.widget({
          autosize: true,
          symbol: tvSymbol,
          interval: "1",
          timezone: "Asia/Ho_Chi_Minh",
          theme,
          style: "1",
          locale: "vi_VN",
          toolbar_bg: theme === "dark" ? "#0a0d0c" : "#ffffff",
          hide_top_toolbar: false,
          hide_legend: false,
          allow_symbol_change: false,
          container_id: containerId,
        });
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [tvSymbol, theme, containerId]);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-2 shadow-sm shadow-neutral-900/[0.02] dark:border-neutral-800 dark:bg-neutral-900/60 dark:shadow-lg dark:shadow-black/20">
      {error && (
        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
          Không thể tải biểu đồ TradingView cho {tvSymbol}. Vui lòng thử lại sau.
        </div>
      )}
      {/*
        key={tvSymbol} forces React to fully replace this DOM node on
        symbol change rather than reusing it — TradingView's widget has no
        public teardown/destroy API, so clearing innerHTML alone can leave
        stale internal listeners/state behind when switching symbols
        quickly. A fresh node per symbol sidesteps that entirely.
      */}
      <div
        key={tvSymbol}
        id={containerId}
        ref={containerRef}
        className={error ? "hidden" : "h-[560px] w-full"}
      />
    </div>
  );
}
