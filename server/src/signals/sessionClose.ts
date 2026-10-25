// "Chỉ kết luận khi đóng phiên": every Mua/Bán conclusion on this site is
// computed from daily bars of sessions that have already CLOSED, never from
// today's bar while it's still forming (its close/high/low keep moving, so a
// signal read off it can appear and vanish within the same session).
//
// The Vietnamese cash session ends at 15:00 (ICT, UTC+7, no DST). Before
// then — and on weekends — the latest closed session is the previous
// weekday; from 15:00 on a weekday it is that same day. Public holidays need
// no calendar: they simply have no bar, so "bars dated <= last closed
// session" still selects the right data.
//
// Mirrored in client/src/utils/sessionClose.ts (the two builds share no
// code) — keep the two in sync.

const ICT_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Minutes after midnight (ICT) at which a weekday's session counts as closed. */
export const SESSION_CLOSE_MINUTES = 15 * 60;

/** Right after the close the data provider can still be settling the final
 * bar, so the scan is refreshed more often during this many minutes. */
export const SETTLE_WINDOW_MINUTES = 30;

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

/** True for the half hour after a weekday's close, while the final bar may still be settling. */
export function isSettlingWindow(now: Date = new Date()): boolean {
  const t = ict(now);
  if (isWeekend(startOfIctDay(t))) return false;
  const minutes = t.getUTCHours() * 60 + t.getUTCMinutes();
  return minutes >= SESSION_CLOSE_MINUTES && minutes < SESSION_CLOSE_MINUTES + SETTLE_WINDOW_MINUTES;
}

/** The Vietnam trading date a bar belongs to. Providers differ: some send a
 * bare date, others an ISO instant that is local midnight (17:00Z the day
 * before) or UTC midnight — converting an instant to ICT lands on the right
 * date in every case. Null when the time can't be parsed. */
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
