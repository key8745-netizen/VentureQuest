import test from 'node:test';
import assert from 'node:assert/strict';

import {
  QUESTION_FLOW,
  isAnswerValid,
  createProfile,
} from '../src/models/onboarding.js';

test('question flow asks one thing at a time in a sensible order', () => {
  assert.deepEqual(
    QUESTION_FLOW.map((question) => question.id),
    [
      'idea',
      'employment',
      'monthlyFixedCost',
      'unitPrice',
      'unitCost',
      'weeklyHours',
      'targetMonthlyIncome',
    ],
  );

  for (const question of QUESTION_FLOW) {
    assert.ok(question.question.length > 0);
    assert.ok(['text', 'choice', 'number'].includes(question.type));
    if (question.type === 'choice') {
      assert.ok(question.options.length >= 2);
    }
  }
});

test('validates answers per question type', () => {
  const idea = QUESTION_FLOW.find((question) => question.id === 'idea');
  assert.equal(isAnswerValid(idea, '便當店'), true);
  assert.equal(isAnswerValid(idea, '   '), false);

  const employment = QUESTION_FLOW.find(
    (question) => question.id === 'employment',
  );
  assert.equal(isAnswerValid(employment, 'employed'), true);
  assert.equal(isAnswerValid(employment, 'astronaut'), false);

  const cost = QUESTION_FLOW.find(
    (question) => question.id === 'monthlyFixedCost',
  );
  assert.equal(isAnswerValid(cost, 30000), true);
  assert.equal(isAnswerValid(cost, 0), true);
  assert.equal(isAnswerValid(cost, -1), false);
  assert.equal(isAnswerValid(cost, Number.NaN), false);
});

test('createProfile marks explorers and keeps schema domain-agnostic', () => {
  const profile = createProfile({
    idea: '便當店',
    employment: 'employed',
    monthlyFixedCost: 30000,
    unitPrice: 100,
    unitCost: 55,
    weeklyHours: 8,
    targetMonthlyIncome: 30000,
  });

  assert.equal(profile.idea, '便當店');
  assert.equal(profile.exploring, false);
  assert.equal(profile.unitPrice, 100);

  const explorer = createProfile({ employment: 'employed' });
  assert.equal(explorer.exploring, true);
  assert.equal(explorer.idea, '');
  // Numbers fall back to safe defaults instead of NaN.
  assert.ok(Number.isFinite(explorer.monthlyFixedCost));
  assert.ok(Number.isFinite(explorer.weeklyHours));

  // The stored keys stay generic — no industry words in the schema.
  assert.deepEqual(
    Object.keys(profile).sort(),
    [
      'createdAt',
      'employment',
      'exploring',
      'idea',
      'monthlyFixedCost',
      'targetMonthlyIncome',
      'unitCost',
      'unitPrice',
      'weeklyHours',
    ],
  );
});
