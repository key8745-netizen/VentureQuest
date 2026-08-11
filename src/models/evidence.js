// Evidence — the only part of the journey the user cannot self-declare.
//
// Every other completion in this app is a checkbox the user ticks
// themselves, which means a 50-day streak and a moving progress bar can
// coexist with zero revenue. These rules do the opposite: they read the
// numbers the user actually reported in the weekly review and complete
// the goals that those numbers prove.
//
// Two properties matter:
//   - Conservative. Only claims what the numbers unambiguously show.
//     Units sold is not the same as distinct paying customers, so no
//     rule pretends otherwise.
//   - A one-way ratchet. Callers persist what was earned; the review
//     history is capped at 12 weeks, and receiving your first payment
//     must not un-happen when that week scrolls out of the window.

import { calculateSurvivalLine } from './financialGuardrails.js';

/** Weeks of reviews summed for the break-even rule (~1 month). */
export const BREAK_EVEN_WINDOW_WEEKS = 4;

/**
 * Reality checks against stage goals. Each returns a reason string when
 * the numbers prove the goal, or null when they do not.
 */
const RULES = [
  {
    goalId: 'explore-g4',
    label: '收到第 1 筆真實付款',
    check({ reviews }) {
      const first = reviews.find((review) => review.units > 0);
      if (!first) return null;
      return `${first.week} 回報賣出 ${first.units} 個`;
    },
  },
  {
    goalId: 'operate-g3',
    label: '單月達到損益平衡',
    // The most recent four recorded weeks. They are distinct weeks
    // (upsertReview dedupes) but not necessarily consecutive ones — a
    // user who skips a review gets a slightly generous window, which
    // is the right way to be wrong for a motivation tool.
    check({ reviews, financial }) {
      const survival = calculateSurvivalLine(financial);
      if (!survival.viable) return null;

      const window = reviews.slice(-BREAK_EVEN_WINDOW_WEEKS);
      if (window.length < BREAK_EVEN_WINDOW_WEEKS) return null;

      const total = window.reduce((sum, review) => sum + review.units, 0);
      if (total < survival.unitsToSurvive) return null;
      return `最近 ${BREAK_EVEN_WINDOW_WEEKS} 週合計賣出 ${total} 個，達到生死線的每月 ${survival.unitsToSurvive} 個`;
    },
  },
];

/**
 * Goals the user's reported numbers currently prove, as
 * [{ goalId, label, reason }] in stage order.
 */
export function deriveEvidence({ reviews = [], financial }) {
  const sorted = [...reviews].sort((a, b) => a.week.localeCompare(b.week));

  return RULES.flatMap((rule) => {
    const reason = rule.check({ reviews: sorted, financial });
    return reason ? [{ goalId: rule.goalId, label: rule.label, reason }] : [];
  });
}

/**
 * Unions newly proven goals into the already-earned set. Earned goals
 * are never taken back — this is what keeps the ratchet one-way when
 * the review history rolls over.
 */
export function accrueEvidence({ earnedGoalIds = [], reviews, financial }) {
  const earned = new Set(earnedGoalIds);
  let changed = false;

  for (const { goalId } of deriveEvidence({ reviews, financial })) {
    if (!earned.has(goalId)) {
      earned.add(goalId);
      changed = true;
    }
  }

  // Same array back when nothing was added, so callers can skip a
  // pointless state write.
  return changed ? [...earned] : earnedGoalIds;
}
