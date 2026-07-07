import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateSurvivalLine,
  calculateTargetLine,
  suggestAfterWorkPace,
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
