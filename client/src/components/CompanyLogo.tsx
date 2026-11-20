import { useState } from "react";
import { useCompanyLogoMap } from "../utils/companyLogos";

// Only ever draws a company's real logo — never a generated stand-in.
//
// Where it comes from, in order:
//  1. CafeF's own logo for the company, via our /api/company-logos/img/:symbol
//     route (server/src/providers/cafefLogos.ts);
//  2. if CafeF has none, the VNDirect / official-website-favicon map from
//     /api/company-logos (loaded only at that point, so the common case never
//     downloads it);
//  3. otherwise nothing.
//
// What "nothing" looks like depends on `fallback`:
//  - "space": an empty slot of the same size, so a column of symbols stays
//             aligned whether or not each row has a logo (lists, tables,
//             dropdowns);
//  - "none":  no slot at all (page headings, where there is no column to line
//             up with).
type LogoFallback = "space" | "none";

interface Props {
  symbol: string;
  size?: number;
  fallback?: LogoFallback;
  /** Khung rộng cho logo ngang (đầu trang): cao `size`, rộng `width`, không viền. */
  width?: number;
}

function Empty({ size, fallback }: { size: number; fallback: LogoFallback }) {
  if (fallback === "none") return null;
  return <span aria-hidden="true" className="inline-block shrink-0" style={{ width: size, height: size }} />;
}

// Decorative: the symbol is always written out right next to the logo, so the
// image carries no alt text of its own (and a failed load shows no broken-image
// text before it is swapped for the fallback).
// Logo luôn đặt trên nền trắng thật (#fff), kể cả ở nền tối, để logo màu
// không bị chìm; bản `width` (đầu trang) không viền, giữ đúng tỷ lệ ảnh.
function LogoImg({ src, size, width, onError }: { src: string; size: number; width?: number; onError: () => void }) {
  return (
    <img
      src={src}
      alt=""
      width={width ?? size}
      height={size}
      decoding="async"
      className={width ? "shrink-0 object-contain" : "shrink-0 rounded border border-[rgba(0,0,0,0.08)] bg-[#ffffff] object-contain p-[2px]"}
      style={{ width: width ?? size, height: size }}
      onError={onError}
    />
  );
}

// Step 2 — its own component so the logo map is only requested once CafeF has
// come up empty.
function MapLogo({ symbol, size, width, fallback, onFail }: Required<Omit<Props, "width">> & { width?: number; onFail: () => void }) {
  const logoMap = useCompanyLogoMap();
  const url = logoMap?.[symbol]?.logoUrl ?? null;
  if (!url) return <Empty size={size} fallback={fallback} />;
  return <LogoImg src={url} size={size} width={width} onError={onFail} />;
}

function Logo({ symbol, size, width, fallback }: Required<Omit<Props, "width">> & { width?: number }) {
  const [stage, setStage] = useState<"cafef" | "map" | "none">("cafef");

  if (stage === "cafef") {
    return (
      <LogoImg src={`/api/company-logos/img/${encodeURIComponent(symbol)}`} size={size} width={width} onError={() => setStage("map")} />
    );
  }
  if (stage === "map") {
    return <MapLogo symbol={symbol} size={size} width={width} fallback={fallback} onFail={() => setStage("none")} />;
  }
  return <Empty size={size} fallback={fallback} />;
}

export default function CompanyLogo({ symbol, size = 26, fallback = "space", width }: Props) {
  const upper = symbol.toUpperCase();
  // key: a different symbol starts over from step 1 instead of inheriting the
  // previous symbol's failure state.
  return <Logo key={upper} symbol={upper} size={size} width={width} fallback={fallback} />;
}
