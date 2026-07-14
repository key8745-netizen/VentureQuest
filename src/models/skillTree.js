// Skill tree — the game-style map from "the you of today" to the big
// target. Pure derivation over the existing plan / completions /
// breakdowns; it introduces no new state of its own.

import { isGoalComplete } from './stagePlanner.js';

function buildGoalNode({ goalId, label, completedGoalIds, breakdowns }) {
  const children = (breakdowns[goalId] ?? []).map((child) =>
    buildGoalNode({
      goalId: child.id,
      label: child.label,
      completedGoalIds,
      breakdowns,
    }),
  );
  return {
    id: goalId,
    label,
    done: isGoalComplete({ goalId, completedGoalIds, breakdowns }),
    children,
  };
}

/**
 * Returns the journey as a tree: every stage is a node on the spine
 * with status 'done' | 'active' | 'locked' (same "first incomplete
 * stage is active" rule as getActiveStage), and its exit goals hang
 * off it as branches — recursively including AI breakdowns, each
 * marked done/todo. `target` is the summit label; `targetReached`
 * flips when the whole spine is done.
 */
export function buildSkillTree({ plan, completedGoalIds, breakdowns = {} }) {
  let activeSeen = false;

  const stages = plan.stages.map((stage) => {
    const goals = stage.goals.map((goal) =>
      buildGoalNode({
        goalId: goal.id,
        label: goal.label,
        completedGoalIds,
        breakdowns,
      }),
    );
    const doneCount = goals.filter((goal) => goal.done).length;
    const complete = goals.every((goal) => goal.done);

    let status;
    if (complete) {
      status = 'done';
    } else if (!activeSeen) {
      status = 'active';
      activeSeen = true;
    } else {
      status = 'locked';
    }

    return {
      id: stage.id,
      label: stage.label,
      subtitle: stage.subtitle,
      status,
      doneCount,
      totalCount: goals.length,
      goals,
    };
  });

  return {
    stages,
    target: plan.targetLabel,
    targetReached: stages.every((stage) => stage.status === 'done'),
  };
}
