import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildQuestPlan,
  getActiveMilestone,
  getTodayMicroTasks,
  toggleTask,
  calculateQuestProgress,
} from '../src/models/goalPlanner.js';

test('decouples a long-term target into four VentureQuest milestones', () => {
  const plan = buildQuestPlan({ targetLabel: '每月副業收入 3 萬' });

  assert.equal(plan.targetLabel, '每月副業收入 3 萬');
  assert.deepEqual(
    plan.milestones.map((milestone) => milestone.label),
    ['Spark', 'Runway', 'Architect', 'Nexus'],
  );

  for (const milestone of plan.milestones) {
    assert.ok(milestone.tasks.length > 0);
    for (const task of milestone.tasks) {
      assert.ok(
        task.minutes >= 5 && task.minutes <= 30,
        `task ${task.id} must fit an after-work session`,
      );
    }
  }
});

test('returns only tiny tasks that fit today available minutes', () => {
  const plan = buildQuestPlan({ targetLabel: 'test' });
  const tasks = getTodayMicroTasks({
    plan,
    completedTaskIds: [],
    availableMinutes: 10,
  });

  assert.ok(tasks.length > 0);
  for (const task of tasks) {
    assert.ok(task.minutes <= 10);
  }

  const none = getTodayMicroTasks({
    plan,
    completedTaskIds: [],
    availableMinutes: 3,
  });
  assert.equal(none.length, 0);
});

test('tracks completed task progress and unlocks the next milestone', () => {
  const plan = buildQuestPlan({ targetLabel: 'test' });
  const sparkTaskIds = plan.milestones[0].tasks.map((task) => task.id);

  let completedTaskIds = [];
  assert.equal(
    getActiveMilestone({ plan, completedTaskIds }).id,
    'spark',
  );

  for (const taskId of sparkTaskIds) {
    completedTaskIds = toggleTask(completedTaskIds, taskId);
  }

  assert.equal(
    getActiveMilestone({ plan, completedTaskIds }).id,
    'runway',
    'finishing Spark must unlock Runway',
  );

  const progress = calculateQuestProgress({ plan, completedTaskIds });
  assert.equal(progress.completedCount, sparkTaskIds.length);
  assert.equal(progress.totalCount, 12);
  assert.equal(progress.percent, 25);

  // Toggling a done task un-completes it without mutating the input.
  const reverted = toggleTask(completedTaskIds, sparkTaskIds[0]);
  assert.ok(!reverted.includes(sparkTaskIds[0]));
  assert.ok(completedTaskIds.includes(sparkTaskIds[0]));
});
