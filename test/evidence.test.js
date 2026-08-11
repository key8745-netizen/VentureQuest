import test from 'node:test';
import assert from 'node:assert/strict';

import { deriveEvidence, accrueEvidence } from '../src/models/evidence.js';

// margin 300 → survival line is 100 units per month
// An already-quit user, so living costs count toward survival and the
// month's break-even line stays at 100 units.
const financial = { businessFixedCost: 30000, livingCost: 0, unitPrice: 500, unitCost: 200 };

test('no reported sales proves nothing', () => {
  assert.deepEqual(deriveEvidence({ reviews: [], financial }), []);
  assert.deepEqual(
    deriveEvidence({
      reviews: [{ week: '2026-W28', hours: 6, units: 0 }],
      financial,
    }),
    [],
  );
});

test('a single unit sold proves the first real payment', () => {
  const evidence = deriveEvidence({
    reviews: [
      { week: '2026-W28', hours: 6, units: 0 },
      { week: '2026-W29', hours: 5, units: 2 },
    ],
    financial,
  });

  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].goalId, 'explore-g4');
  assert.match(evidence[0].reason, /2026-W29/);
  assert.match(evidence[0].reason, /2 個/);
});

test('the first-payment reason cites the earliest week, not the latest', () => {
  const evidence = deriveEvidence({
    reviews: [
      { week: '2026-W30', hours: 5, units: 9 },
      { week: '2026-W29', hours: 5, units: 1 },
    ],
    financial,
  });

  assert.match(evidence[0].reason, /2026-W29/);
});

test('four weeks clearing the survival line proves break-even', () => {
  const reviews = ['2026-W27', '2026-W28', '2026-W29', '2026-W30'].map((week) => ({
    week,
    hours: 10,
    units: 25,
  }));

  const goalIds = deriveEvidence({ reviews, financial }).map((e) => e.goalId);
  assert.ok(goalIds.includes('operate-g3'));
});

test('break-even needs a full window and enough units', () => {
  const short = ['2026-W28', '2026-W29', '2026-W30'].map((week) => ({
    week,
    hours: 10,
    units: 40,
  }));
  assert.ok(
    !deriveEvidence({ reviews: short, financial })
      .map((e) => e.goalId)
      .includes('operate-g3'),
    'three weeks is not a month',
  );

  const weak = ['2026-W27', '2026-W28', '2026-W29', '2026-W30'].map((week) => ({
    week,
    hours: 10,
    units: 24,
  }));
  assert.ok(
    !deriveEvidence({ reviews: weak, financial })
      .map((e) => e.goalId)
      .includes('operate-g3'),
    '96 units is short of the 100-unit survival line',
  );
});

test('an unviable unit economy can never prove break-even', () => {
  const reviews = ['2026-W27', '2026-W28', '2026-W29', '2026-W30'].map((week) => ({
    week,
    hours: 10,
    units: 500,
  }));

  const goalIds = deriveEvidence({
    reviews,
    financial: { businessFixedCost: 30000, livingCost: 0, unitPrice: 100, unitCost: 100 },
  }).map((e) => e.goalId);

  assert.ok(!goalIds.includes('operate-g3'));
});

test('accrued evidence is a one-way ratchet when history rolls over', () => {
  const earned = accrueEvidence({
    earnedGoalIds: [],
    reviews: [{ week: '2026-W29', hours: 5, units: 3 }],
    financial,
  });
  assert.deepEqual(earned, ['explore-g4']);

  // The week carrying the first sale has scrolled out of the capped
  // history and later weeks sold nothing — the goal must survive.
  const later = accrueEvidence({
    earnedGoalIds: earned,
    reviews: [{ week: '2026-W45', hours: 5, units: 0 }],
    financial,
  });
  assert.deepEqual(later, ['explore-g4']);
});

test('accrueEvidence returns the same array when nothing is new', () => {
  const earned = ['explore-g4'];
  const next = accrueEvidence({
    earnedGoalIds: earned,
    reviews: [{ week: '2026-W29', hours: 5, units: 3 }],
    financial,
  });

  assert.equal(next, earned, 'no new evidence should not churn state');
});
