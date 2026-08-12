import test from 'node:test';
import assert from 'node:assert/strict';

import {
  localLoanReview,
  buildLoanReviewPrompt,
  MAX_CRITIQUES,
} from '../src/models/loanReview.js';

const profile = {
  idea: '便當店',
  employment: 'employed',
  weeklyHours: 8,
  targetMonthlyIncome: 30000,
};
const healthy = {
  businessFixedCost: 1200,
  livingCost: 30000,
  unitPrice: 500,
  unitCost: 200,
};

const review = (over = {}) =>
  localLoanReview({
    profile,
    financial: healthy,
    weeklyReviews: [],
    completedGoalIds: [],
    ...over,
  });

const fourWeeks = (units, hours = 6) =>
  ['2026-W27', '2026-W28', '2026-W29', '2026-W30'].map((week, i) => ({
    week,
    hours,
    units: units[i],
  }));

test('returns at most three critiques, each paired with its question', () => {
  const cases = [
    {},
    { financial: { ...healthy, unitPrice: 150, unitCost: 200 } },
    { weeklyReviews: fourWeeks([5, 6, 4, 7]), completedGoalIds: ['explore-g1'] },
    { weeklyReviews: fourWeeks([0, 0, 0, 0], 25) },
  ];

  for (const over of cases) {
    const result = review(over);
    const count = result.critiqueIds.length;
    assert.ok(count >= 1 && count <= MAX_CRITIQUES, `bad count: ${count}`);
    for (let i = 1; i <= count; i += 1) {
      assert.ok(result.reply.includes(`${i}. `), `missing critique ${i}`);
    }
    assert.equal(
      (result.reply.match(/他會問你：/g) ?? []).length,
      count,
      'every critique needs the question a lender would actually ask',
    );
  }
});

test('a losing unit economy is the first thing raised', () => {
  const result = review({ financial: { ...healthy, unitPrice: 150, unitCost: 200 } });

  assert.equal(result.critiqueIds[0], 'B');
  assert.match(result.reply, /倒賠 50 元/, 'quotes the real number, not a generic worry');
});

test('no revenue yet is challenged as an unsupported projection', () => {
  const result = review({ weeklyReviews: fourWeeks([0, 0, 0, 0]) });

  assert.ok(result.critiqueIds.includes('C'));
  assert.match(result.reply, /真的付過錢的人/);
});

test('a healthy business is not given invented problems', () => {
  const result = review({
    weeklyReviews: fourWeeks([30, 28, 32, 30]),
    completedGoalIds: ['explore-g1'],
  });

  // B, C, D, A, E, F all score well, so only the capital gap remains.
  assert.deepEqual(result.critiqueIds, ['capital']);
  assert.match(result.reply, /一次性投入/);
});

test('the capital gap is declared as missing data, not asserted as a fault', () => {
  const result = review({
    weeklyReviews: fourWeeks([30, 28, 32, 30]),
    completedGoalIds: ['explore-g1'],
  });

  assert.match(
    result.reply,
    /這個 app 只追蹤每月固定支出/,
    'must say the app cannot know this rather than implying the user failed',
  );
});

test('output obeys the same adopt-button contract as every other reply', () => {
  for (const over of [{}, { weeklyReviews: fourWeeks([0, 0, 0, 1]) }]) {
    const result = review(over);
    assert.ok(result.tasks.length <= 3);
    assert.ok(result.goals.length === 0);
    for (const task of result.tasks) {
      assert.ok(task.minutes >= 5 && task.minutes <= 30, task.label);
    }
    assert.equal(result.mock, true, 'never counts against the API budget');
  }
});

test('the prompt puts the model on the other side of the table', () => {
  const prompt = buildLoanReviewPrompt({ dossier: '【使用者完整狀態】…' });

  assert.match(prompt, /你現在不是顧問/);
  assert.match(prompt, /審查專員/);
  assert.match(prompt, /不要硬找碴/, 'a good plan must not be attacked for the sake of it');
  assert.match(prompt, /湊數等於捏造/, 'padding to three is fabrication');
  assert.match(prompt, /不知道就不要編/, 'scheme rules change and cannot be verified here');
  assert.match(prompt, /「營收預估過於樂觀」是廢話/, 'critiques must cite numbers');
  assert.ok(prompt.includes('【使用者完整狀態】'), 'the dossier is embedded');
});
