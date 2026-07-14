import React, { useState } from 'react';
import { buildSkillTree } from '../models/skillTree.js';
import { getCopy } from '../models/terminology.js';

const STAGE_ICONS = {
  explore: '🌱',
  prepare: '🛫',
  operate: '🏪',
  grow: '📈',
  scale: '🚀',
};

function GoalBranch({ node }) {
  return (
    <li className={node.done ? 'skill-goal-done' : 'skill-goal-todo'}>
      <span className="skill-goal-mark">{node.done ? '✦' : '○'}</span>
      <span className="skill-goal-label">{node.label}</span>
      {node.children.length > 0 && (
        <ul className="skill-goal-children">
          {node.children.map((child) => (
            <GoalBranch key={child.id} node={child} />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * The game-style journey map: a vertical spine from "the you of
 * today" through the five stages up to the big target. Done stages
 * glow, the active stage is highlighted, future stages stay locked.
 * Tapping a stage node expands its goal branches (including every AI
 * breakdown), so the user can always see exactly which checkmarks
 * stand between here and the summit.
 */
export default function SkillTree({ mode, plan, completedGoalIds, breakdowns }) {
  const tree = buildSkillTree({ plan, completedGoalIds, breakdowns });
  const activeStage = tree.stages.find((stage) => stage.status === 'active');
  const [openIds, setOpenIds] = useState(
    activeStage ? [activeStage.id] : [],
  );

  const toggle = (stageId) =>
    setOpenIds((ids) =>
      ids.includes(stageId)
        ? ids.filter((id) => id !== stageId)
        : [...ids, stageId],
    );

  return (
    <section className="card">
      <h2>{getCopy('skillTree', mode)}</h2>
      <div className="skill-tree">
        <div className="skill-node skill-start">
          <span className="skill-icon">🙋</span>
          <div className="skill-node-body">
            <strong>現在的你</strong>
            <span className="muted">起點:一步一步往上點亮</span>
          </div>
        </div>

        {tree.stages.map((stage) => {
          const open = openIds.includes(stage.id);
          return (
            <div key={stage.id} className={`skill-branch skill-${stage.status}`}>
              <button
                type="button"
                className="skill-node skill-node-button"
                onClick={() => toggle(stage.id)}
                aria-expanded={open}
              >
                <span className="skill-icon">
                  {stage.status === 'locked' ? '🔒' : STAGE_ICONS[stage.id] ?? '⭐'}
                </span>
                <div className="skill-node-body">
                  <strong>
                    {stage.label}
                    {stage.status === 'done' && ' ✓'}
                  </strong>
                  <span className="muted">
                    {stage.doneCount}/{stage.totalCount}
                    {stage.status === 'active' && '・目前在這裡'}
                    {stage.status === 'locked' && '・完成上一關解鎖'}
                  </span>
                </div>
                <span className="skill-caret">{open ? '▾' : '▸'}</span>
              </button>
              {open && (
                <ul className="skill-goals">
                  {stage.goals.map((goal) => (
                    <GoalBranch key={goal.id} node={goal} />
                  ))}
                </ul>
              )}
            </div>
          );
        })}

        <div
          className={`skill-node skill-target ${
            tree.targetReached ? 'skill-target-reached' : ''
          }`}
        >
          <span className="skill-icon">🏆</span>
          <div className="skill-node-body">
            <strong>{tree.target}</strong>
            <span className="muted">
              {tree.targetReached
                ? '五關全破,你走到了!'
                : '把上面的節點全部點亮,就到這裡'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
