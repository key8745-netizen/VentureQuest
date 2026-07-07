// Financial guardrails — unit economics only, no industry vocabulary.
// Every question is: does one more unit sold move you toward survival?

// Plan only part of the stated spare time: the day job comes first,
// and a plan that eats every free hour collapses in week two.
const SPARE_TIME_BUFFER = 0.7;
const HIGH_SPARE_HOURS_PER_WEEK = 15;

/**
 * The survival line: how many units per month must be sold so the
 * unit margins cover the monthly fixed cost.
 */
export function calculateSurvivalLine({ monthlyFixedCost, unitPrice, unitCost }) {
  const unitMargin = unitPrice - unitCost;

  if (unitMargin <= 0) {
    return {
      viable: false,
      unitMargin,
      unitsToSurvive: null,
      reason: 'unit-margin-not-positive',
    };
  }

  return {
    viable: true,
    unitMargin,
    unitsToSurvive: Math.ceil(monthlyFixedCost / unitMargin),
  };
}

/**
 * Units per month needed to hit the income target on top of covering
 * the fixed costs — the survival line's ambitious sibling.
 */
export function calculateTargetLine({
  monthlyFixedCost,
  unitPrice,
  unitCost,
  targetMonthlyIncome,
}) {
  const survival = calculateSurvivalLine({ monthlyFixedCost, unitPrice, unitCost });
  if (!survival.viable) {
    return { viable: false, unitsToTarget: null };
  }
  const income = Math.max(0, targetMonthlyIncome ?? 0);
  return {
    viable: true,
    unitsToTarget: Math.ceil((monthlyFixedCost + income) / survival.unitMargin),
  };
}

/**
 * A conservative weekly pace for someone still employed full-time.
 * Takes the pace the user *wants* (weeklyUnits within weeklyHours of
 * spare time) and scales it down so there is slack left over.
 */
export function suggestAfterWorkPace({ weeklyHours, weeklyUnits }) {
  if (!(weeklyHours > 0) || !(weeklyUnits > 0)) {
    return { valid: false, recommendedWeeklyUnits: 0, risk: 'invalid-input' };
  }

  const recommendedWeeklyUnits = Math.max(
    1,
    Math.floor(weeklyUnits * SPARE_TIME_BUFFER),
  );

  const risk =
    weeklyHours > HIGH_SPARE_HOURS_PER_WEEK ? 'burnout-risk' : 'sustainable';

  return {
    valid: true,
    recommendedWeeklyUnits,
    hoursPerUnit: weeklyHours / weeklyUnits,
    risk,
  };
}
