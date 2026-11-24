import { useEffect, useMemo, useState } from "react";
import { fetchEntryGate } from "../api/client";
import { makeEntryAllow } from "../utils/signals";

type Allow = (timeSec: number) => boolean;

/**
 * Bộ lọc điểm mua theo sóng ngành cho biểu đồ: chỉ mở vị thế khi thị trường Tích cực
 * và ngành của mã có sóng. `ready` = false khi đang tải (chưa vẽ điểm mua/bán để tránh nhấp nháy);
 * lỗi hoặc server chưa có dữ liệu thì allow = undefined (không lọc).
 */
export function useEntryGate(symbol: string): { allow: Allow | undefined; ready: boolean } {
  const [st, setSt] = useState<{ sym: string; allow: Allow | undefined } | null>(null);
  useEffect(() => {
    let alive = true;
    if (symbol === "VNINDEX") return;
    fetchEntryGate(symbol)
      .then((g) => alive && setSt({ sym: symbol, allow: g ? makeEntryAllow(g) : undefined }))
      .catch(() => alive && setSt({ sym: symbol, allow: undefined }));
    return () => {
      alive = false;
    };
  }, [symbol]);
  const ready = !!st && st.sym === symbol;
  const allow = ready ? st!.allow : undefined;
  return useMemo(() => ({ allow, ready }), [allow, ready]);
}
