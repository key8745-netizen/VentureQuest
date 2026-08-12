import test from 'node:test';
import assert from 'node:assert/strict';

import { localAdvice, readSignals } from '../src/models/localAdvisor.js';
import { localGoalGuide, LOCAL_GOAL_GUIDE } from '../src/models/localGoalGuide.js';
import { localQuestionHelp } from '../src/models/localQuestionHelp.js';
import { QUESTION_FLOW } from '../src/models/onboarding.js';
import { buildStagePlan } from '../src/models/stagePlanner.js';

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

const advise = (over = {}) =>
  localAdvice({
    profile,
    financial: healthy,
    weeklyReviews: [],
    taskLog: {},
    today: '2026-08-11',
    ...over,
  });

test('a losing unit economy outranks every other diagnosis', () => {
  const result = advise({
    financial: { ...healthy, unitPrice: 150, unitCost: 200 },
    weeklyReviews: [{ week: '2026-W30', hours: 20, units: 0 }],
  });

  assert.equal(result.ruleId, 'unit-margin');
  assert.match(result.reply, /倒賠 50 元/);
  assert.ok(result.tasks.length > 0);
  assert.ok(result.goals.length > 0);
});

test('hours logged with nothing sold names the real problem', () => {
  const result = advise({
    weeklyReviews: [
      { week: '2026-W29', hours: 6, units: 0 },
      { week: '2026-W30', hours: 7, units: 0 },
    ],
  });

  assert.equal(result.ruleId, 'never-sold-much-effort');
  assert.match(result.reply, /13 小時/, 'cites the hours the user actually logged');
  assert.match(result.reply, /開口/);
});

test('with no reviews at all it asks for data instead of guessing', () => {
  const result = advise();
  assert.equal(result.ruleId, 'never-sold-no-data');
  assert.ok(result.tasks.some((task) => task.label.includes('每週回顧')));
});

test('a profitable week is told how far it is from quitting', () => {
  const result = advise({
    weeklyReviews: [{ week: '2026-W30', hours: 8, units: 10 }],
  });

  assert.equal(result.ruleId, 'profitable-climbing');
  // 10 units/week → 43/month → 43/104 ≈ 41%
  assert.match(result.reply, /41%/);
  assert.match(result.reply, /月淨/);
});

test('a week under the business overhead reports the gap, not a verdict', () => {
  const result = advise({
    financial: { ...healthy, businessFixedCost: 9000 },
    weeklyReviews: [{ week: '2026-W30', hours: 4, units: 2 }],
  });

  assert.equal(result.ruleId, 'below-business-breakeven');
  assert.match(result.reply, /9000 元/);
  assert.ok(!/失敗|落後/.test(result.reply), 'never scolds');
});

test('selling before but nothing this week is treated as a channel problem', () => {
  const result = advise({
    weeklyReviews: [
      { week: '2026-W29', hours: 6, units: 5 },
      { week: '2026-W30', hours: 6, units: 0 },
    ],
  });

  assert.equal(result.ruleId, 'stalled');
  assert.match(result.reply, /累計賣過 5 個/);
});

test('overwork is appended as a note without replacing the diagnosis', () => {
  const result = advise({
    weeklyReviews: [{ week: '2026-W30', hours: 25, units: 10 }],
  });

  assert.equal(result.ruleId, 'profitable-climbing');
  assert.match(result.reply, /平均每週投入 25 小時/);
});

test('local replies never enter the LLM context or the call budget', () => {
  const result = advise();
  assert.equal(result.mock, true, 'mock:true keeps it out of buildMessages');
  assert.equal(result.local, true);
});

test('advice always fits the adopt-button contract', () => {
  const cases = [
    {},
    { financial: { ...healthy, unitPrice: 100, unitCost: 100 } },
    { weeklyReviews: [{ week: '2026-W30', hours: 6, units: 0 }] },
    { weeklyReviews: [{ week: '2026-W30', hours: 6, units: 40 }] },
    { profile: { ...profile, employment: 'left' }, weeklyReviews: [{ week: '2026-W30', hours: 6, units: 2 }] },
  ];

  for (const over of cases) {
    const result = advise(over);
    assert.ok(result.reply.length > 20, 'a reply always says something');
    assert.ok(result.tasks.length <= 3);
    assert.ok(result.goals.length <= 2);
    for (const task of result.tasks) {
      assert.ok(task.minutes >= 5 && task.minutes <= 30, task.label);
    }
  }
});

test('readSignals reports what the user actually did', () => {
  const signals = readSignals({
    profile,
    financial: healthy,
    weeklyReviews: [
      { week: '2026-W30', hours: 4, units: 1 },
      { week: '2026-W29', hours: 6, units: 0 },
    ],
    taskLog: { '2026-08-10': 2, '2026-08-11': 1 },
    today: '2026-08-11',
  });

  assert.equal(signals.totalHours, 10);
  assert.equal(signals.totalUnits, 1);
  assert.equal(signals.everSold, true);
  assert.equal(signals.latest.week, '2026-W30', 'sorted by week, not input order');
  assert.equal(signals.streak, 2);
  assert.equal(signals.tasksDone, 3);
});

test('every built-in stage goal has a written breakdown', () => {
  const plan = buildStagePlan({ profile });
  for (const stage of plan.stages) {
    for (const goal of stage.goals) {
      const guide = localGoalGuide(goal.id);
      assert.equal(guide.builtIn, true, `${goal.id} has no local guide`);
      assert.ok(guide.steps.length >= 2, `${goal.id} needs real steps`);
      assert.ok(guide.steps.length <= 5, `${goal.id} exceeds the step clamp`);
    }
  }
});

test('goal guides respect the same clamps as parsed AI replies', () => {
  for (const [goalId, entry] of Object.entries(LOCAL_GOAL_GUIDE)) {
    for (const task of entry.tasks ?? []) {
      assert.ok(task.minutes >= 5 && task.minutes <= 30, goalId);
    }
    assert.ok((entry.tasks ?? []).length <= 3, goalId);
  }
});

test('unknown goals fall back to the generic splitter', () => {
  const guide = localGoalGuide('custom-explore-goals-123');
  assert.equal(guide.builtIn, false);
  assert.ok(guide.steps.length >= 2);
});

test('every wizard question has written help', () => {
  for (const question of QUESTION_FLOW) {
    const help = localQuestionHelp(question.id, {});
    assert.ok(help.reply.length > 20, `${question.id} needs help text`);
  }
});

test('wizard help suggests an answer only when it can derive one', () => {
  const price = localQuestionHelp('unitPrice', { unitCost: 55 });
  assert.equal(price.answer, 110, 'a starting price from the cost the user typed');

  const blind = localQuestionHelp('unitPrice', {});
  assert.equal(blind.answer, null, 'no cost typed yet means no invented number');

  const target = localQuestionHelp('targetMonthlyIncome', { livingCost: 28000 });
  assert.equal(target.answer, 28000);

  const hours = localQuestionHelp('weeklyHours', { employment: 'employed' });
  assert.equal(hours.answer, 5);
  assert.equal(localQuestionHelp('weeklyHours', { employment: 'left' }).answer, null);
});

test('suggested wizard answers pass the wizard validator', () => {
  const answered = { unitCost: 55, livingCost: 28000, employment: 'employed' };
  for (const question of QUESTION_FLOW) {
    const { answer } = localQuestionHelp(question.id, answered);
    if (answer == null) continue;
    assert.ok(
      question.type !== 'number' || (Number.isFinite(answer) && answer >= 0),
      `${question.id} suggested an answer its own field would reject`,
    );
  }
});

test('the belief the user typed is answered before the data diagnosis', () => {
  const result = advise({
    question: '我覺得這個大家都需要,只是還沒開始推',
    weeklyReviews: [{ week: '2026-W30', hours: 6, units: 0 }],
  });

  assert.equal(result.antiPatternId, 'everyone-needs-it');
  assert.match(result.reply, /^先說你提到的那件事/, 'the belief is addressed first');
  assert.match(result.reply, /對象是所有人/);
  // The numbers still get their say.
  assert.equal(result.ruleId, 'never-sold-much-effort');
  assert.match(result.reply, /6 小時/);
});

test('an ordinary question gets the diagnosis with nothing prepended', () => {
  const result = advise({
    question: '我一直卡在找客人,下一步該做什麼?',
    weeklyReviews: [{ week: '2026-W30', hours: 6, units: 0 }],
  });

  assert.equal(result.antiPatternId, null);
  assert.ok(!result.reply.startsWith('先說你提到的那件事'));
});

test('advice still works when no question is supplied at all', () => {
  const result = advise({ weeklyReviews: [{ week: '2026-W30', hours: 6, units: 0 }] });
  assert.equal(result.antiPatternId, null);
  assert.ok(result.reply.length > 20);
});
