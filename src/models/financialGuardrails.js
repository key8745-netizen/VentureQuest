// Financial guardrails — unit economics only, no industry vocabulary.
// Every question is: does one more unit sold move you toward survival?
//
// Costs are split in two, and the split matters more than the maths.
// A business's own fixed costs (subscriptions, tools, rent on a space)
// must be earned back by the business. Personal living costs (your
// rent, food, loans) must be earned back too — but only once nobody
// else is paying them. While the user still has a day job, their
// salary covers living costs, so folding those into the break-even
// line invents a deficit that does not exist and reports it as a
// deadline. That is how a tool meant to say "you are still alive"
// ends up telling someone who sold three things that they missed
// quota by 135.
//
// So there are two lines, and which one leads depends on employment:
//   survival    — the business itself stops losing money
//   replacement — the business could pay for your life (you may quit)

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

/** A month is ~4.33 weeks. Shared so every weekly↔monthly hop agrees. */
export const WEEKS_PER_MONTH = 4.33;

/**
 * Which costs the business has to earn back, given who is paying for
 * the user's life right now. Only someone who has left their job needs
 * the business to cover living costs to survive; for everyone else
 * that is the *replacement* line — the number that says "you could
 * quit", not the number that says "you are failing".
 */
export function resolveFixedCosts({ businessFixedCost, livingCost, employment }) {
  const business = Math.max(0, businessFixedCost ?? 0);
  const living = Math.max(0, livingCost ?? 0);
  const salaryCoversLiving = employment !== 'left';

  return {
    survivalFixedCost: business + (salaryCoversLiving ? 0 : living),
    replacementFixedCost: business + living,
    salaryCoversLiving,
  };
}

/**
 * Every headline number on one object, so the panel and the weekly
 * review can never disagree about what the user is aiming at.
 *
 * `leadingLine` says which one to put in the big type: someone still
 * employed is working toward replacement, someone who has left is
 * watching survival.
 */
export function calculateMoneyLines({
  businessFixedCost,
  livingCost,
  unitPrice,
  unitCost,
  employment,
  targetMonthlyIncome,
}) {
  const { survivalFixedCost, replacementFixedCost, salaryCoversLiving } =
    resolveFixedCosts({ businessFixedCost, livingCost, employment });

  const survival = calculateSurvivalLine({
    monthlyFixedCost: survivalFixedCost,
    unitPrice,
    unitCost,
  });

  if (!survival.viable) {
    return {
      viable: false,
      unitMargin: survival.unitMargin,
      salaryCoversLiving,
      leadingLine: 'none',
    };
  }

  const income = Math.max(0, targetMonthlyIncome ?? 0);

  return {
    viable: true,
    unitMargin: survival.unitMargin,
    salaryCoversLiving,
    leadingLine: salaryCoversLiving ? 'replacement' : 'survival',
    survivalUnits: survival.unitsToSurvive,
    survivalFixedCost,
    replacementUnits: Math.ceil(replacementFixedCost / survival.unitMargin),
    replacementFixedCost,
    targetUnits: Math.ceil((replacementFixedCost + income) / survival.unitMargin),
  };
}

/**
 * How one week's real numbers read against those lines. Deliberately
 * phrased as distance travelled rather than quota missed: it reports
 * whether the business itself made money this week, and what fraction
 * of the replacement line the current pace covers.
 */
export function describeWeeklyProgress({ units, lines }) {
  if (!lines.viable) {
    return { viable: false };
  }

  const sold = Math.max(0, units ?? 0);
  const monthlyPace = Math.round(sold * WEEKS_PER_MONTH);
  const monthlyContribution = monthlyPace * lines.unitMargin;

  return {
    viable: true,
    weeklyContribution: sold * lines.unitMargin,
    monthlyPace,
    // Does the business pay for itself at this pace? Never mixes in
    // living costs while a salary is covering them.
    businessProfitable: monthlyContribution >= lines.survivalFixedCost,
    monthlyNet: monthlyContribution - lines.survivalFixedCost,
    replacementUnits: lines.replacementUnits,
    replacementPercent:
      lines.replacementUnits > 0
        ? Math.round((monthlyPace / lines.replacementUnits) * 100)
        : 100,
    unitsToReplacementPace: Math.max(0, lines.replacementUnits - monthlyPace),
  };
}

/**
 * Is this week's workload one the user can keep up? Only the hours
 * matter: a side business dies of an unsustainable pace long before it
 * dies of selling too little.
 *
 * (This replaced a "recommended weekly units" calculation that was
 * derived from units *already sold* — telling someone who sold ten to
 * aim for seven — and which no screen ever displayed.)
 */
export function assessWorkload({ weeklyHours }) {
  if (!(weeklyHours > 0)) {
    return { valid: false, risk: 'invalid-input' };
  }
  return {
    valid: true,
    risk: weeklyHours > HIGH_SPARE_HOURS_PER_WEEK ? 'burnout-risk' : 'sustainable',
  };
}

/**
 * The daily budget implied by the hours the user said they have. This
 * is what makes that wizard question matter: it seeds the "minutes
 * available today" filter instead of everyone starting at the same
 * hard-coded 20.
 *
 * Clamped to the range micro tasks are written for, and scaled down by
 * SPARE_TIME_BUFFER because the day job comes first and a plan that
 * eats every spare minute collapses in week two.
 */
export function suggestDailyMinutes(weeklyHours) {
  if (!(weeklyHours > 0)) return DEFAULT_DAILY_MINUTES;
  const perDay = (weeklyHours * 60 * SPARE_TIME_BUFFER) / 7;
  return Math.min(30, Math.max(5, Math.round(perDay)));
}

export const DEFAULT_DAILY_MINUTES = 20;
