// Momentum — the daily habit loop. Records how many micro tasks were
// completed per day and derives the current streak. Un-checking a task
// decrements the same day, so gaming the counter by toggling is moot.

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
