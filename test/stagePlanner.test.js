import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildStagePlan,
  getActiveStage,
  getTodayMicroTasks,
  toggleId,
  calculatePlanProgress,
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
