import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateSurvivalLine,
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
