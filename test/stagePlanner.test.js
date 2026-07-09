import test from 'node:test';
import assert from 'node:assert/strict';

import {
  removeBreakdownItem,
  getUncelebratedStage,
  pickRotatingTask,
  buildStagePlan,
  getActiveStage,
  getTodayMicroTasks,
  toggleId,
  calculatePlanProgress,
  isGoalComplete,
} from '../src/models/stagePlanner.js';

const profile = {
  idea: '便當店',
  exploring: false,
  employment: 'employed',
  monthlyFixedCost: 30000,
  unitPrice: 100,
  unitCost: 55,
  weeklyHours: 8,
  targetMonthlyIncome: 30000,
};

test('builds the five venture stages with goals and micro tasks', () => {
  const plan = buildStagePlan({ profile });

  assert.deepEqual(
    plan.stages.map((stage) => stage.id),
    ['explore', 'prepare', 'operate', 'grow', 'scale'],
  );
  assert.ok(plan.targetLabel.includes('便當店'));

  for (const stage of plan.stages) {
    assert.ok(stage.label.length > 0);
    assert.ok(stage.goals.length >= 3, `${stage.id} needs measurable goals`);
    assert.ok(stage.tasks.length >= 3, `${stage.id} needs micro tasks`);
    for (const task of stage.tasks) {
      assert.ok(
        task.minutes >= 5 && task.minutes <= 30,
        `task ${task.id} must fit an after-work session`,
      );
    }
  }
});

test('uses a generic target label when the user is still exploring', () => {
  const plan = buildStagePlan({
    profile: { ...profile, idea: '', exploring: true },
  });
  assert.ok(plan.targetLabel.length > 0);
  assert.ok(!plan.targetLabel.includes('便當'));
});

test('merges advisor customizations into the matching stage', () => {
  const customizations = {
    explore: {
      tasks: [{ id: 'custom-t1', label: '查 3 間店的價格', minutes: 15 }],
      goals: [{ id: 'custom-g1', label: '拿到 1 筆預購訂單' }],
    },
  };
  const plan = buildStagePlan({ profile, customizations });

  const explore = plan.stages[0];
  assert.ok(explore.tasks.some((task) => task.id === 'custom-t1'));
  assert.ok(explore.goals.some((goal) => goal.id === 'custom-g1'));

  // Other stages are untouched.
  const prepare = plan.stages[1];
  assert.ok(!prepare.tasks.some((task) => task.id.startsWith('custom-')));

  // Custom goals count toward stage completion.
  const goalIds = explore.goals.map((goal) => goal.id);
  let completedGoalIds = [];
  for (const goalId of goalIds) {
    completedGoalIds = toggleId(completedGoalIds, goalId);
  }
  assert.equal(getActiveStage({ plan, completedGoalIds }).id, 'prepare');
});

test('a goal with a breakdown completes only through its sub-items', () => {
  const breakdowns = {
    'explore-g1': [
      { id: 'bd-1', label: '查考試簡章' },
      { id: 'bd-2', label: '報名課程' },
    ],
    // Sub-items can be broken down again (recursive).
    'bd-2': [{ id: 'bd-2-1', label: '比較 3 家課程價格' }],
  };

  // Checking the parent directly does nothing once it has children.
  assert.equal(
    isGoalComplete({ goalId: 'explore-g1', completedGoalIds: ['explore-g1'], breakdowns }),
    false,
  );

  // Leaf checks bubble up through every level.
  assert.equal(
    isGoalComplete({
      goalId: 'explore-g1',
      completedGoalIds: ['bd-1', 'bd-2-1'],
      breakdowns,
    }),
    true,
  );

  // Missing a nested leaf keeps the whole chain incomplete.
  assert.equal(
    isGoalComplete({ goalId: 'explore-g1', completedGoalIds: ['bd-1', 'bd-2'], breakdowns }),
    false,
  );
});

test('stage unlock and progress respect breakdowns', () => {
  const plan = buildStagePlan({ profile });
  const exploreGoals = plan.stages[0].goals;
  const breakdowns = {
    [exploreGoals[0].id]: [
      { id: 'bd-a', label: 'a' },
      { id: 'bd-b', label: 'b' },
    ],
  };

  // Check every explore goal except the broken-down one, plus one of
  // its two sub-items: stage must stay active.
  let completedGoalIds = exploreGoals.slice(1).map((goal) => goal.id);
  completedGoalIds = toggleId(completedGoalIds, 'bd-a');
  assert.equal(
    getActiveStage({ plan, completedGoalIds, breakdowns }).id,
    'explore',
  );
  const partial = calculatePlanProgress({ plan, completedGoalIds, breakdowns });
  assert.equal(partial.completedCount, exploreGoals.length - 1);

  completedGoalIds = toggleId(completedGoalIds, 'bd-b');
  assert.equal(
    getActiveStage({ plan, completedGoalIds, breakdowns }).id,
    'prepare',
    'finishing the last sub-item must unlock the next stage',
  );
});

test('a stage completes only when all its goals are checked', () => {
  const plan = buildStagePlan({ profile });
  const exploreGoalIds = plan.stages[0].goals.map((goal) => goal.id);

  let completedGoalIds = [];
  assert.equal(getActiveStage({ plan, completedGoalIds }).id, 'explore');

  // Checking all but one goal keeps the stage active.
  for (const goalId of exploreGoalIds.slice(0, -1)) {
    completedGoalIds = toggleId(completedGoalIds, goalId);
  }
  assert.equal(getActiveStage({ plan, completedGoalIds }).id, 'explore');

  completedGoalIds = toggleId(completedGoalIds, exploreGoalIds.at(-1));
  assert.equal(
    getActiveStage({ plan, completedGoalIds }).id,
    'prepare',
    'finishing every explore goal must unlock the prepare stage',
  );
});

test('today micro tasks come from the active stage and fit the minutes', () => {
  const plan = buildStagePlan({ profile });
  const tasks = getTodayMicroTasks({
    plan,
    completedGoalIds: [],
    completedTaskIds: [],
    availableMinutes: 10,
  });

  assert.ok(tasks.length > 0);
  const exploreTaskIds = new Set(plan.stages[0].tasks.map((task) => task.id));
  for (const task of tasks) {
    assert.ok(task.minutes <= 10);
    assert.ok(exploreTaskIds.has(task.id), 'tasks must come from the active stage');
  }

  const none = getTodayMicroTasks({
    plan,
    completedGoalIds: [],
    completedTaskIds: [],
    availableMinutes: 3,
  });
  assert.equal(none.length, 0);
});

test('plan progress counts goals, and toggleId never mutates its input', () => {
  const plan = buildStagePlan({ profile });
  const firstGoalId = plan.stages[0].goals[0].id;
  const totalGoals = plan.stages.reduce(
    (sum, stage) => sum + stage.goals.length,
    0,
  );

  const completedGoalIds = toggleId([], firstGoalId);
  const progress = calculatePlanProgress({ plan, completedGoalIds });
  assert.equal(progress.completedCount, 1);
  assert.equal(progress.totalCount, totalGoals);
  assert.equal(progress.percent, Math.round((1 / totalGoals) * 100));

  const reverted = toggleId(completedGoalIds, firstGoalId);
  assert.ok(!reverted.includes(firstGoalId));
  assert.ok(completedGoalIds.includes(firstGoalId), 'input must not be mutated');
});

test('removeBreakdownItem drops the item and its whole subtree', () => {
  const breakdowns = {
    'g1': [
      { id: 'a', label: 'a' },
      { id: 'b', label: 'b' },
    ],
    'b': [{ id: 'b1', label: 'b1' }],
    'b1': [{ id: 'b1x', label: 'b1x' }],
    'g2': [{ id: 'c', label: 'c' }],
  };

  // Removing a leaf keeps everything else.
  const withoutA = removeBreakdownItem(breakdowns, 'a');
  assert.deepEqual(withoutA['g1'].map((i) => i.id), ['b']);
  assert.ok(withoutA['b'], 'siblings and their subtrees survive');

  // Removing a mid-tree item purges its descendants too.
  const withoutB = removeBreakdownItem(breakdowns, 'b');
  assert.deepEqual(withoutB['g1'].map((i) => i.id), ['a']);
  assert.equal(withoutB['b'], undefined);
  assert.equal(withoutB['b1'], undefined);
  assert.ok(withoutB['g2'], 'unrelated goals untouched');

  // Removing the last child deletes the parent key entirely, so the
  // parent goal becomes manually checkable again.
  const only = { 'g1': [{ id: 'solo', label: 's' }] };
  const emptied = removeBreakdownItem(only, 'solo');
  assert.equal(emptied['g1'], undefined);
  assert.equal(
    isGoalComplete({ goalId: 'g1', completedGoalIds: ['g1'], breakdowns: emptied }),
    true,
    'parent reverts to direct checking',
  );

  // Input is never mutated.
  assert.equal(breakdowns['g1'].length, 2);
});

test('getUncelebratedStage surfaces each cleared stage exactly once', () => {
  const plan = buildStagePlan({ profile });
  const exploreGoalIds = plan.stages[0].goals.map((goal) => goal.id);

  // Nothing cleared yet.
  assert.equal(
    getUncelebratedStage({ plan, completedGoalIds: [], breakdowns: {}, celebratedStageIds: [] }),
    null,
  );

  // Clearing explore surfaces it...
  const cleared = getUncelebratedStage({
    plan,
    completedGoalIds: exploreGoalIds,
    breakdowns: {},
    celebratedStageIds: [],
  });
  assert.equal(cleared.id, 'explore');

  // ...but only until it has been celebrated.
  assert.equal(
    getUncelebratedStage({
      plan,
      completedGoalIds: exploreGoalIds,
      breakdowns: {},
      celebratedStageIds: ['explore'],
    }),
    null,
  );

  // Breakdowns count: a stage cleared through sub-items surfaces too.
  const breakdowns = { [exploreGoalIds[0]]: [{ id: 'sub', label: 's' }] };
  const viaSub = getUncelebratedStage({
    plan,
    completedGoalIds: [...exploreGoalIds.slice(1), 'sub'],
    breakdowns,
    celebratedStageIds: [],
  });
  assert.equal(viaSub.id, 'explore');
});

test('pickRotatingTask cycles through the fitting tasks', () => {
  const tasks = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.equal(pickRotatingTask(tasks, 0).id, 'a');
  assert.equal(pickRotatingTask(tasks, 1).id, 'b');
  assert.equal(pickRotatingTask(tasks, 3).id, 'a', 'rotation wraps around');
  assert.equal(pickRotatingTask([], 5), null);
});

test('a user who already quit gets runway framing instead of quit-prep', () => {
  const leftProfile = { ...profile, employment: 'left' };
  const plan = buildStagePlan({ profile: leftProfile });
  const prepare = plan.stages[1];

  // Same ids — progress survives switching employment via 修改目標.
  assert.deepEqual(
    prepare.goals.map((goal) => goal.id),
    buildStagePlan({ profile }).stages[1].goals.map((goal) => goal.id),
  );

  // No quit-your-job framing anywhere in the stage copy.
  const copy = [
    prepare.subtitle,
    ...prepare.goals.map((goal) => goal.label),
    ...prepare.tasks.map((task) => task.label),
  ].join(' ');
  assert.ok(!copy.includes('離開正職'), copy);
  assert.ok(!copy.includes('離職'), copy);
  assert.ok(copy.includes('跑道'), 'runway framing appears');

  // Explore subtitle also drops the day-job framing.
  assert.ok(!plan.stages[0].subtitle.includes('還在上班'));

  // Employed users keep the original copy.
  const employed = buildStagePlan({ profile });
  assert.ok(employed.stages[1].subtitle.includes('離開正職'));
});
