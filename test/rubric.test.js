import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assessRubric,
  describeRubric,
  weakestLinks,
  RUBRIC,
  RUBRIC_INSTRUCTIONS,
  LEVELS,
} from '../src/models/rubric.js';

const profile = {
  idea: '便當店',
  employment: 'employed',
  weeklyHours: 8,
  targetMonthlyIncome: 30000,
};
const financial = {
  businessFixedCost: 1200,
  livingCost: 30000,
  unitPrice: 500,
  unitCost: 200,
};

const score = (over = {}) =>
  assessRubric({ profile, financial, weeklyReviews: [], completedGoalIds: [], ...over });

const get = (assessment, id) => assessment.find((item) => item.id === id);

test('scores all six criteria, in order, with evidence attached', () => {
  const assessment = score();

  assert.deepEqual(
    assessment.map((item) => item.id),
    RUBRIC.map((item) => item.id),
  );
  for (const item of assessment) {
    assert.ok(item.name.length > 0);
    assert.ok(item.basis.length > 0, `${item.id} must say what it scored from`);
    assert.ok(Object.values(LEVELS).includes(item.level));
  }
});

test('a losing unit economy scores B low and quotes the numbers', () => {
  const b = get(score({ financial: { ...financial, unitPrice: 150, unitCost: 200 } }), 'B');

  assert.equal(b.level, LEVELS.LOW);
  assert.match(b.basis, /倒賠 50 元/);
});

test('a technically-profitable but thin margin is not scored high', () => {
  const b = get(score({ financial: { ...financial, unitPrice: 500, unitCost: 450 } }), 'B');

  assert.equal(b.level, LEVELS.MID, '50 on 500 is 10% — one refund eats several sales');
  assert.match(b.basis, /10%/);
});

test('C is proof of payment, not self-assessment', () => {
  const none = get(score({ weeklyReviews: [{ week: '2026-W30', hours: 6, units: 0 }] }), 'C');
  assert.equal(none.level, LEVELS.LOW);

  const paid = get(
    score({
      weeklyReviews: [
        { week: '2026-W30', hours: 6, units: 0 },
        { week: '2026-W31', hours: 6, units: 4 },
      ],
    }),
    'C',
  );
  assert.equal(paid.level, LEVELS.HIGH);
  assert.match(paid.basis, /2026-W31/, 'cites the week the money first arrived');
  assert.match(paid.basis, /累計賣出 4 個/);
});

test('D separates a one-off sale from a repeatable channel', () => {
  const weeks = (units) =>
    units.map((n, i) => ({ week: `2026-W2${i + 5}`, hours: 5, units: n }));

  assert.equal(get(score({ weeklyReviews: weeks([0, 0, 0, 0]) }), 'D').level, LEVELS.LOW);
  assert.equal(get(score({ weeklyReviews: weeks([0, 0, 0, 5]) }), 'D').level, LEVELS.MID);
  assert.equal(get(score({ weeklyReviews: weeks([3, 0, 4, 5]) }), 'D').level, LEVELS.HIGH);
  assert.equal(get(score(), 'D').level, LEVELS.UNKNOWN);
});

test('E flags an unsustainable pace even when sales look good', () => {
  const e = get(score({ weeklyReviews: [{ week: '2026-W30', hours: 25, units: 40 }] }), 'E');

  assert.equal(e.level, LEVELS.LOW);
  assert.match(e.basis, /25 小時/);
});

test('F scores whether the user is recording anything at all', () => {
  assert.equal(get(score(), 'F').level, LEVELS.LOW);
  assert.equal(
    get(score({ weeklyReviews: [{ week: '2026-W30', hours: 5, units: 1 }] }), 'F').level,
    LEVELS.MID,
  );
  const four = ['2026-W27', '2026-W28', '2026-W29', '2026-W30'].map((week) => ({
    week,
    hours: 5,
    units: 1,
  }));
  assert.equal(get(score({ weeklyReviews: four }), 'F').level, LEVELS.HIGH);
});

test('A is marked as self-reported rather than proven', () => {
  const ticked = get(score({ completedGoalIds: ['explore-g1'] }), 'A');
  assert.equal(ticked.level, LEVELS.HIGH);
  assert.match(ticked.basis, /自評/, 'must not present a checkbox as evidence');

  const exploring = get(score({ profile: { ...profile, idea: '' } }), 'A');
  assert.equal(exploring.level, LEVELS.LOW);
});

test('weakestLinks surfaces exactly what advice should aim at', () => {
  const assessment = score({
    financial: { ...financial, unitPrice: 150, unitCost: 200 },
    weeklyReviews: [{ week: '2026-W30', hours: 6, units: 0 }],
  });

  const weak = weakestLinks(assessment).map((item) => item.id);
  assert.ok(weak.includes('B'), 'losing money per sale');
  assert.ok(weak.includes('C'), 'nobody has paid');
  assert.ok(!weak.includes('E'), 'six hours a week is a fine pace');
});

test('describeRubric renders one quotable line per criterion', () => {
  const text = describeRubric(score());
  const lines = text.split('\n');

  assert.equal(lines.length, RUBRIC.length);
  assert.match(lines[0], /^A 需求明確:/);
  for (const line of lines) {
    assert.match(line, /[（(]/, 'every line carries its basis');
  }
});

test('the prompt instructions state the tie-break order and calibrations', () => {
  assert.match(RUBRIC_INSTRUCTIONS, /B > C > D > A > E > F/);
  assert.match(RUBRIC_INSTRUCTIONS, /校準案例/);
  assert.match(
    RUBRIC_INSTRUCTIONS,
    /不要推翻/,
    'computed criteria must not be re-litigated by the model',
  );
});

test('the assessment never throws on a brand-new user', () => {
  const assessment = assessRubric({
    profile: { idea: '', employment: 'employed' },
    financial: { businessFixedCost: 0, livingCost: 0, unitPrice: 0, unitCost: 0 },
  });
  assert.equal(assessment.length, RUBRIC.length);
  for (const item of assessment) {
    assert.ok(item.basis.length > 0);
  }
});
