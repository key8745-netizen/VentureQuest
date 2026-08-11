import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateSurvivalLine,
  calculateTargetLine,
  suggestAfterWorkPace,
  calculateMoneyLines,
  resolveFixedCosts,
  describeWeeklyProgress,
} from '../src/models/financialGuardrails.js';

test('calculates the minimum units needed to stay alive', () => {
  const result = calculateSurvivalLine({
    monthlyFixedCost: 30000,
    unitPrice: 500,
    unitCost: 200,
  });

  assert.equal(result.viable, true);
  assert.equal(result.unitMargin, 300);
  assert.equal(result.unitsToSurvive, 100);
});

test('rejects a business model where every sale loses money', () => {
  const result = calculateSurvivalLine({
    monthlyFixedCost: 30000,
    unitPrice: 100,
    unitCost: 150,
  });

  assert.equal(result.viable, false);
  assert.equal(result.unitsToSurvive, null);
  assert.equal(result.reason, 'unit-margin-not-positive');
});

test('suggests a conservative after-work weekly pace', () => {
  const result = suggestAfterWorkPace({ weeklyHours: 10, weeklyUnits: 10 });

  assert.equal(result.valid, true);
  assert.ok(
    result.recommendedWeeklyUnits < 10,
    'recommended pace must be below the stated target',
  );
  assert.ok(result.recommendedWeeklyUnits >= 1);
  assert.equal(result.risk, 'sustainable');

  const overloaded = suggestAfterWorkPace({ weeklyHours: 25, weeklyUnits: 25 });
  assert.equal(overloaded.risk, 'burnout-risk');
});

test('target line adds the income goal on top of the survival line', () => {
  const base = { monthlyFixedCost: 30000, unitPrice: 100, unitCost: 55 };

  const target = calculateTargetLine({ ...base, targetMonthlyIncome: 30000 });
  assert.equal(target.viable, true);
  // (30000 fixed + 30000 income) / 45 margin = 1334 units
  assert.equal(target.unitsToTarget, Math.ceil(60000 / 45));

  // Zero income goal degenerates to the survival line.
  const zero = calculateTargetLine({ ...base, targetMonthlyIncome: 0 });
  assert.equal(
    zero.unitsToTarget,
    calculateSurvivalLine(base).unitsToSurvive,
  );

  // A losing unit economy stays non-viable.
  const losing = calculateTargetLine({
    monthlyFixedCost: 30000,
    unitPrice: 50,
    unitCost: 60,
    targetMonthlyIncome: 10000,
  });
  assert.equal(losing.viable, false);
  assert.equal(losing.unitsToTarget, null);
});

// The bug this whole split exists to fix: an employed user's salary
// pays their rent, so folding rent into the break-even line invents a
// deficit and then reports it as a missed quota every single week.
const employedCosts = {
  businessFixedCost: 1200,
  livingCost: 30000,
  unitPrice: 500,
  unitCost: 200,
  targetMonthlyIncome: 30000,
};

test('a day job pays the rent, so the survival line only covers the business', () => {
  const lines = calculateMoneyLines({ ...employedCosts, employment: 'employed' });

  assert.equal(lines.viable, true);
  assert.equal(lines.unitMargin, 300);
  assert.equal(lines.survivalUnits, 4, '1200 / 300 — the business alone');
  assert.equal(lines.replacementUnits, 104, '(1200 + 30000) / 300');
  assert.equal(lines.leadingLine, 'replacement');
});

test('after quitting, living costs become survival', () => {
  const lines = calculateMoneyLines({ ...employedCosts, employment: 'left' });

  assert.equal(lines.survivalUnits, 104, 'no salary left to cover the rent');
  assert.equal(lines.replacementUnits, 104);
  assert.equal(lines.leadingLine, 'survival');
});

test('flexible hours still count as having a salary', () => {
  const lines = calculateMoneyLines({ ...employedCosts, employment: 'flexible' });
  assert.equal(lines.survivalUnits, 4);
  assert.equal(lines.leadingLine, 'replacement');
});

test('the target line sits above replacement, never below it', () => {
  for (const employment of ['employed', 'left']) {
    const lines = calculateMoneyLines({ ...employedCosts, employment });
    assert.ok(
      lines.targetUnits >= lines.replacementUnits,
      `${employment}: earning a target on top cannot need fewer units`,
    );
  }
});

test('a losing unit economy reports unviable whatever the employment', () => {
  for (const employment of ['employed', 'left']) {
    const lines = calculateMoneyLines({
      ...employedCosts,
      unitPrice: 200,
      unitCost: 200,
      employment,
    });
    assert.equal(lines.viable, false);
    assert.equal(lines.leadingLine, 'none');
  }
});

test('resolveFixedCosts never lets negative inputs shrink the lines', () => {
  const resolved = resolveFixedCosts({
    businessFixedCost: -5000,
    livingCost: -1,
    employment: 'left',
  });
  assert.equal(resolved.survivalFixedCost, 0);
  assert.equal(resolved.replacementFixedCost, 0);
});

test('a small week reads as real progress, not a missed quota', () => {
  const lines = calculateMoneyLines({ ...employedCosts, employment: 'employed' });
  const week = describeWeeklyProgress({ units: 3, lines });

  assert.equal(week.weeklyContribution, 900);
  assert.equal(week.monthlyPace, 13, '3 × 4.33 weeks');
  assert.equal(
    week.businessProfitable,
    true,
    '13 × 300 = 3900 clears the 1200 business overhead',
  );
  assert.equal(week.monthlyNet, 2700);
  assert.equal(week.replacementPercent, 13, 'progress toward quitting, not failure');
  assert.equal(week.unitsToReplacementPace, 91);
});

test('selling nothing is honest without being punitive', () => {
  const lines = calculateMoneyLines({ ...employedCosts, employment: 'employed' });
  const week = describeWeeklyProgress({ units: 0, lines });

  assert.equal(week.monthlyPace, 0);
  assert.equal(week.businessProfitable, false);
  assert.equal(week.replacementPercent, 0);
  assert.equal(week.unitsToReplacementPace, lines.replacementUnits);
});

test('weekly progress reports unviable rather than dividing by a bad margin', () => {
  const lines = calculateMoneyLines({
    ...employedCosts,
    unitPrice: 100,
    unitCost: 100,
    employment: 'employed',
  });
  assert.equal(describeWeeklyProgress({ units: 5, lines }).viable, false);
});

// Regression: the wizard summary fed a profile straight into the money
// maths. When the cost fields were renamed, the old key silently read
// undefined and the summary rendered "每月至少賣 NaN 個單位".
test('a profile built by the wizard never produces NaN lines', async () => {
  const { createProfile, QUESTION_FLOW } = await import('../src/models/onboarding.js');

  const profiles = [
    createProfile({ employment: 'employed' }),
    createProfile({
      idea: '便當店',
      employment: 'left',
      businessFixedCost: 1200,
      livingCost: 30000,
      unitPrice: 500,
      unitCost: 200,
      weeklyHours: 8,
      targetMonthlyIncome: 30000,
    }),
  ];

  for (const profile of profiles) {
    const lines = calculateMoneyLines({
      ...profile,
      employment: profile.employment,
      targetMonthlyIncome: profile.targetMonthlyIncome,
    });
    for (const [key, value] of Object.entries(lines)) {
      assert.ok(
        typeof value !== 'number' || Number.isFinite(value),
        `${key} must not be NaN — it renders straight into the summary`,
      );
    }
  }

  // Every number the wizard collects must be a field the maths reads.
  const numberIds = QUESTION_FLOW.filter((q) => q.type === 'number').map((q) => q.id);
  for (const id of ['businessFixedCost', 'livingCost', 'unitPrice', 'unitCost']) {
    assert.ok(numberIds.includes(id), `${id} must be asked by the wizard`);
  }
});
