// Vietnam macroeconomic indicators from the World Bank's open API — a
// public, no-auth, long-stable REST API (unlike the reverse-engineered KBS
// endpoints elsewhere in this codebase), so this is lower-risk even though
// this sandbox has no route to verify it live either. Data is annual and
// typically lags 1-2 years behind the current date (World Bank publishes on
// its own schedule, not real-time), unlike the rest of this site's data.
export interface MacroPoint {
  year: number;
  value: number;
}

export interface MacroIndicator {
  code: string;
  name: string;
  unit: string;
  latestYear: number;
  latestValue: number;
  series: MacroPoint[]; // ascending by year
}

const INDICATORS: { code: string; name: string; unit: string }[] = [
  { code: "NY.GDP.MKTP.KD.ZG", name: "Tăng trưởng GDP", unit: "%/năm" },
  { code: "FP.CPI.TOTL.ZG", name: "Lạm phát (CPI)", unit: "%/năm" },
  { code: "SL.UEM.TOTL.ZS", name: "Tỷ lệ thất nghiệp", unit: "% lực lượng lao động" },
  { code: "FR.INR.RINR", name: "Lãi suất thực", unit: "%" },
  { code: "PA.NUS.FCRF", name: "Tỷ giá USD/VND (bình quân năm)", unit: "VND/USD" },
];

const HEADERS = {
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
};

async function fetchIndicatorSeries(code: string): Promise<MacroPoint[]> {
  const url = `https://api.worldbank.org/v2/country/VN/indicator/${code}?format=json&per_page=100&date=2000:2026`;
  const res = await fetch(url, { headers: HEADERS });
  const body = await res.text();
  if (!res.ok) {
    throw Object.assign(
      new Error(`World Bank trả lỗi HTTP ${res.status} cho ${code}: ${body.slice(0, 200)}`),
      { status: 502 }
    );
  }

  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    throw Object.assign(new Error(`World Bank trả dữ liệu không phải JSON cho ${code}: ${body.slice(0, 200)}`), {
      status: 502,
    });
  }

  const rows = Array.isArray(data) ? data[1] : null;
  if (!Array.isArray(rows)) {
    throw Object.assign(
      new Error(`World Bank trả cấu trúc dữ liệu không như mong đợi cho ${code}. Raw: ${JSON.stringify(data).slice(0, 300)}`),
      { status: 502 }
    );
  }

  return rows
    // World Bank uses `value: null` for years without data — filter those
    // out BEFORE Number() conversion, since Number(null) is 0 (finite), not
    // NaN, so isFinite() alone would silently turn "no data" into a fake 0.
    .filter((r: any) => r?.value !== null && r?.value !== undefined && r?.date != null)
    .map((r: any) => ({ year: Number(r.date), value: Number(r.value) }))
    .filter((p: MacroPoint) => Number.isFinite(p.year) && Number.isFinite(p.value))
    .sort((a: MacroPoint, b: MacroPoint) => a.year - b.year);
}

export async function fetchMacroIndicators(): Promise<MacroIndicator[]> {
  const results = await Promise.allSettled(INDICATORS.map((ind) => fetchIndicatorSeries(ind.code)));

  const out: MacroIndicator[] = [];
  const errors: string[] = [];

  results.forEach((r, i) => {
    const ind = INDICATORS[i];
    if (r.status === "fulfilled" && r.value.length > 0) {
      const series = r.value;
      const latest = series[series.length - 1];
      out.push({ code: ind.code, name: ind.name, unit: ind.unit, latestYear: latest.year, latestValue: latest.value, series });
    } else {
      errors.push(`${ind.code}: ${r.status === "rejected" ? (r.reason instanceof Error ? r.reason.message : String(r.reason)) : "không có dữ liệu"}`);
    }
  });

  if (out.length === 0) {
    throw Object.assign(
      new Error(`Không lấy được chỉ số vĩ mô nào từ World Bank. Chi tiết: ${errors.join(" | ")}`),
      { status: 502 }
    );
  }

  return out;
}
