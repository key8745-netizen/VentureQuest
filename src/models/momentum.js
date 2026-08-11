// Momentum — the daily habit loop. Records how many micro tasks were
// completed per day and derives the current streak. Un-checking a task
// decrements the same day, so gaming the counter by toggling is moot.

/**
 * Local-date key (YYYY-MM-DD). Not toISOString(): that is UTC, which
 * would put an early-morning task in Taipei (UTC+8) on yesterday's
 * date — wrong streaks and a daily limit that resets at 08:00.
 */
export function localDayKey(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The inverse of localDayKey: a day key back to a local-midnight Date. */
export function parseDayKey(key) {
  const [year, month, day] = String(key).split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Adds delta to a day's completion count; counts never go negative. */
export function bumpTaskLog(taskLog, date, delta) {
  const next = { ...taskLog };
  const value = (next[date] ?? 0) + delta;
  if (value <= 0) delete next[date];
  else next[date] = value;
  return next;
}

const DAY_MS = 86400000;

/**
 * Consecutive days with at least one completed task, ending today (if
 * already done) or yesterday (so the streak isn't "broken" before the
 * user had a chance to act today).
 */
export function computeStreak(taskLog, today) {
  const todayMs = new Date(`${today}T00:00:00Z`).getTime();
  const doneToday = (taskLog[today] ?? 0) > 0;

  let streak = 0;
  let cursor = doneToday ? todayMs : todayMs - DAY_MS;
  for (;;) {
    const key = new Date(cursor).toISOString().slice(0, 10);
    if ((taskLog[key] ?? 0) > 0) {
      streak += 1;
      cursor -= DAY_MS;
    } else {
      break;
    }
  }
  return { streak, doneToday };
}
