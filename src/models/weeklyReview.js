// Weekly review — a tiny ritual: once a week, write down the hours
// you actually put in and the units you actually sold, so the plan
// stays honest. One entry per ISO week, bounded history.

export const REVIEW_KEEP_LIMIT = 12;

/** ISO week label like '2026-W28'. */
export function getWeekLabel(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Replaces the same-week entry and keeps only the most recent weeks. */
export function upsertReview(reviews, entry) {
  const rest = reviews.filter((review) => review.week !== entry.week);
  return [...rest, entry].slice(-REVIEW_KEEP_LIMIT);
}
