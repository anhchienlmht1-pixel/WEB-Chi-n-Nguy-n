// "Lãi suất tiết kiệm và cho vay" — NHNN only publishes these as monthly
// PDF/Word reports ("Diễn biến lãi suất...") on sbv.gov.vn, with no open
// data feed to poll automatically (see providers/stockStrength.ts /
// moneyFlowSheet.ts for the Google-Sheet pattern used elsewhere on this
// site when a live feed DOES exist — there is none here). So this is a
// small, manually-curated list of verified points, each tied to the exact
// date/report it came from, rather than a continuous monthly series.
//
// Both rates are "lãi suất bình quân của các giao dịch phát sinh mới"
// (average rate on newly-originated transactions) — NOT the reference
// chart's "6-12 tháng" term-bucket figure, which NHNN only ever reports as
// a range (e.g. "6.1-7.6%"), not a single average, so it can't be plotted
// as one comparable line. Add a new entry here (with its source) whenever
// a new month's report is verified — there is no way to backfill a month
// that wasn't captured when it was current.
export interface InterestRatePoint {
  date: string; // YYYY-MM-DD, the date NHNN's figure is "tính đến"
  depositRatePct: number | null;
  lendingRatePct: number | null;
  source: string;
}

export const INTEREST_RATE_HISTORY: InterestRatePoint[] = [
  {
    date: "2025-06-10",
    depositRatePct: null,
    lendingRatePct: 6.3,
    source: "NHNN — lãi suất cho vay bình quân phát sinh mới, tính đến 10/6/2025",
  },
  {
    date: "2025-07-20",
    depositRatePct: 4.18,
    lendingRatePct: 6.53,
    source: "NHNN — lãi suất bình quân phát sinh mới, tính đến 20/7/2025",
  },
  {
    date: "2026-04-20",
    depositRatePct: 6.01,
    lendingRatePct: 8.38,
    source: "NHNN — lãi suất bình quân phát sinh mới, tính đến 20/4/2026",
  },
  {
    date: "2026-09-20",
    depositRatePct: 6.38,
    lendingRatePct: null,
    source: "NHNN — lãi suất tiền gửi bình quân phát sinh mới, tính đến 20/9/2026",
  },
];
