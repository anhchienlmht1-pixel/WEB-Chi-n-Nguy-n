// "Chỉ kết luận khi đóng phiên": the chart's Mua/Bán markers and every
// signal summary are computed from daily bars of sessions that have already
// CLOSED, never from today's bar while it is still forming (its close/high/
// low keep moving, so a marker read off it could appear and vanish within
// one session). The live candle is still drawn — it just carries no signal.
//
// The Vietnamese cash session ends at 15:00 (ICT, UTC+7, no DST). Mirrored
// from server/src/signals/sessionClose.ts (the two builds share no code) —
// keep the two in sync.

const ICT_OFFSET_MS = 7 * 60 * 60 * 1000;
const SESSION_OPEN_MINUTES = 9 * 60;
const SESSION_CLOSE_MINUTES = 15 * 60;

// Shifted so the UTC getters read as Vietnam wall-clock time.
function ict(now: Date): Date {
  return new Date(now.getTime() + ICT_OFFSET_MS);
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isWeekend(d: Date): boolean {
  const dow = d.getUTCDay();
  return dow === 0 || dow === 6;
}

function startOfIctDay(t: Date): Date {
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()));
}

/** YYYY-MM-DD (Vietnam date) of the most recent session that has closed. */
export function lastClosedSessionDate(now: Date = new Date()): string {
  const t = ict(now);
  const minutes = t.getUTCHours() * 60 + t.getUTCMinutes();
  const day = startOfIctDay(t);
  if (!isWeekend(day) && minutes >= SESSION_CLOSE_MINUTES) return ymd(day);
  do {
    day.setUTCDate(day.getUTCDate() - 1);
  } while (isWeekend(day));
  return ymd(day);
}

/** True while a weekday session is running (09:00–15:00 ICT) — the window in
 * which today's bar is still forming and no new conclusion is issued. */
export function isMarketInSession(now: Date = new Date()): boolean {
  const t = ict(now);
  if (isWeekend(startOfIctDay(t))) return false;
  const minutes = t.getUTCHours() * 60 + t.getUTCMinutes();
  return minutes >= SESSION_OPEN_MINUTES && minutes < SESSION_CLOSE_MINUTES;
}

/** The Vietnam trading date a bar belongs to (bare date, or an ISO instant
 * converted to ICT). Null when the time can't be parsed. */
export function barDateICT(time: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(time)) return time;
  const ms = new Date(time).getTime();
  if (Number.isNaN(ms)) return null;
  return ymd(ict(new Date(ms)));
}

/** Drops every bar from a session that hasn't closed yet (today's, before
 * 15:00). Bars whose date can't be read are kept rather than silently lost. */
export function dropUnclosedBars<T extends { time: string }>(points: T[], now: Date = new Date()): T[] {
  const closed = lastClosedSessionDate(now);
  return points.filter((p) => {
    const d = barDateICT(p.time);
    return d === null || d <= closed;
  });
}

/** "2026-10-23" -> "23/10" for labels such as "Chốt phiên 23/10". */
export function formatSessionDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return m && d ? `${d}/${m}` : iso;
}
