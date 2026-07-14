import test from 'node:test';
import assert from 'node:assert/strict';

import { buildSkillTree } from '../src/models/skillTree.js';
import { buildStagePlan } from '../src/models/stagePlanner.js';

const profile = {
  idea: '便當店',
  employment: 'employed',
  targetMonthlyIncome: 60000,
};

test('marks the first incomplete stage active, earlier done, later locked', () => {
  const plan = buildStagePlan({ profile });
  const completedGoalIds = plan.stages[0].goals.map((goal) => goal.id);

  const tree = buildSkillTree({ plan, completedGoalIds });

  assert.equal(tree.stages[0].status, 'done');
  assert.equal(tree.stages[1].status, 'active');
  assert.equal(tree.stages[2].status, 'locked');
  assert.equal(tree.stages[4].status, 'locked');
  assert.equal(tree.targetReached, false);
});

test('counts done goals per stage', () => {
  const plan = buildStagePlan({ profile });
  const tree = buildSkillTree({
    plan,
    completedGoalIds: [plan.stages[0].goals[0].id],
  });

  assert.equal(tree.stages[0].doneCount, 1);
  assert.equal(tree.stages[0].totalCount, plan.stages[0].goals.length);
});

test('nests breakdown children recursively and derives parent done state', () => {
  const plan = buildStagePlan({ profile });
  const parentId = plan.stages[0].goals[0].id;
  const breakdowns = {
    [parentId]: [
      { id: 'b1', label: '子項一' },
      { id: 'b2', label: '子項二' },
    ],
    b2: [{ id: 'b2a', label: '孫項' }],
  };

  const partial = buildSkillTree({
    plan,
    completedGoalIds: ['b1'],
    breakdowns,
  });
  const parent = partial.stages[0].goals[0];
  assert.equal(parent.children.length, 2);
  assert.equal(parent.children[0].done, true);
  assert.equal(parent.children[1].children[0].label, '孫項');
  assert.equal(parent.done, false);

  const full = buildSkillTree({
    plan,
    completedGoalIds: ['b1', 'b2a'],
    breakdowns,
  });
  assert.equal(full.stages[0].goals[0].done, true);
});

test('reaches the target when every stage is done', () => {
  const plan = buildStagePlan({ profile });
  const completedGoalIds = plan.stages.flatMap((stage) =>
    stage.goals.map((goal) => goal.id),
  );

  const tree = buildSkillTree({ plan, completedGoalIds });

  assert.ok(tree.stages.every((stage) => stage.status === 'done'));
  assert.equal(tree.targetReached, true);
  assert.ok(tree.target.includes('便當店'));
});
