import React from 'react';
import {
  buildStagePlan,
  getActiveStage,
  getTodayMicroTasks,
  toggleId,
  calculatePlanProgress,
} from '../models/stagePlanner.js';
import { getCopy } from '../models/terminology.js';

export default function QuestTracker({
  mode,
  profile,
  customizations,
  availableMinutes,
  completedGoalIds,
  completedTaskIds,
  onAvailableMinutesChange,
  onCompletedGoalIdsChange,
  onCompletedTaskIdsChange,
}) {
  const plan = buildStagePlan({ profile, customizations });
  const progress = calculatePlanProgress({ plan, completedGoalIds });
  const activeStage = getActiveStage({ plan, completedGoalIds });
  const todayTasks = getTodayMicroTasks({
    plan,
    completedGoalIds,
    completedTaskIds,
    availableMinutes,
  });
  // One small win per day beats a backlog: show a single task.
  const todayTask = todayTasks[0] ?? null;

  return (
    <section className="card">
      <h2>{getCopy('questProgress', mode)}</h2>
      <p className="target-label">{plan.targetLabel}</p>

      <div className="field-grid">
        <label className="field">
          <span>今天可用分鐘數</span>
          <input
            type="number"
            min="0"
            value={availableMinutes}
            onChange={(event) => onAvailableMinutesChange(Number(event.target.value))}
          />
        </label>
      </div>

      <div className="progress-track" role="progressbar" aria-valuenow={progress.percent}>
        <div className="progress-fill" style={{ width: `${progress.percent}%` }} />
      </div>
      <p className="progress-label">
        目標達成 {progress.completedCount} / {progress.totalCount}（{progress.percent}%）
        {activeStage ? ` — 目前：${activeStage.label}` : ' — 全部完成 🎉'}
      </p>

      <h3>{getCopy('todayMicroTask', mode)}</h3>
      {todayTask ? (
        <label className="micro-task">
          <input
            type="checkbox"
            checked={completedTaskIds.includes(todayTask.id)}
            onChange={() =>
              onCompletedTaskIdsChange(toggleId(completedTaskIds, todayTask.id))
            }
          />
          <span>
            {todayTask.label}
            <em>（約 {todayTask.minutes} 分鐘）</em>
          </span>
        </label>
      ) : (
        <p className="muted">
          {activeStage ? getCopy('noTaskFitsToday', mode) : '所有階段都完成了。'}
        </p>
      )}

      <h3>{getCopy('stageMap', mode)}</h3>
      <ol className="stages">
        {plan.stages.map((stage, index) => {
          const isActive = stage.id === activeStage?.id;
          const done = stage.goals.every((goal) =>
            completedGoalIds.includes(goal.id),
          );
          return (
            <li
              key={stage.id}
              className={isActive ? 'stage-active' : done ? 'stage-done' : ''}
            >
              <div className="stage-head">
                <strong>
                  {index + 1}. {stage.label}
                  {done && ' ✓'}
                </strong>
                <span className="muted">{stage.subtitle}</span>
              </div>
              {isActive && (
                <ul className="stage-goals">
                  {stage.goals.map((goal) => (
                    <li key={goal.id}>
                      <label className="goal-item">
                        <input
                          type="checkbox"
                          checked={completedGoalIds.includes(goal.id)}
                          onChange={() =>
                            onCompletedGoalIdsChange(
                              toggleId(completedGoalIds, goal.id),
                            )
                          }
                        />
                        <span>{goal.label}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
      <p className="muted">
        {getCopy('stageGoals', mode)}
      </p>
    </section>
  );
}
