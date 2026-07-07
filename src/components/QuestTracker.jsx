import React from 'react';
import {
  buildQuestPlan,
  getActiveMilestone,
  getTodayMicroTasks,
  toggleTask,
  calculateQuestProgress,
} from '../models/goalPlanner.js';
import { getCopy } from '../models/terminology.js';

export default function QuestTracker({
  mode,
  targetLabel,
  availableMinutes,
  completedTaskIds,
  onTargetLabelChange,
  onAvailableMinutesChange,
  onCompletedTaskIdsChange,
}) {
  const plan = buildQuestPlan({ targetLabel });
  const progress = calculateQuestProgress({ plan, completedTaskIds });
  const activeMilestone = getActiveMilestone({ plan, completedTaskIds });
  const todayTasks = getTodayMicroTasks({ plan, completedTaskIds, availableMinutes });
  // One small win per day beats a backlog: show a single task.
  const todayTask = todayTasks[0] ?? null;

  return (
    <section className="card">
      <h2>{getCopy('questProgress', mode)}</h2>

      <div className="field-grid">
        <label className="field">
          <span>長期目標</span>
          <input
            type="text"
            value={targetLabel}
            onChange={(event) => onTargetLabelChange(event.target.value)}
          />
        </label>
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
        {progress.completedCount} / {progress.totalCount}（{progress.percent}%）
        {activeMilestone
          ? ` — 目前階段：${activeMilestone.label}`
          : ' — 全部完成 🎉'}
      </p>

      <ol className="milestones">
        {plan.milestones.map((milestone) => (
          <li
            key={milestone.id}
            className={milestone.id === activeMilestone?.id ? 'milestone-active' : ''}
          >
            {milestone.label}
          </li>
        ))}
      </ol>

      <h3>{getCopy('todayMicroTask', mode)}</h3>
      {todayTask ? (
        <label className="micro-task">
          <input
            type="checkbox"
            checked={completedTaskIds.includes(todayTask.id)}
            onChange={() =>
              onCompletedTaskIdsChange(toggleTask(completedTaskIds, todayTask.id))
            }
          />
          <span>
            {todayTask.label}
            <em>（約 {todayTask.minutes} 分鐘）</em>
          </span>
        </label>
      ) : (
        <p className="muted">
          {activeMilestone ? getCopy('noTaskFitsToday', mode) : '所有任務都完成了。'}
        </p>
      )}
    </section>
  );
}
