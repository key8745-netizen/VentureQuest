import React, { useState } from 'react';
import {
  buildStagePlan,
  getActiveStage,
  getTodayMicroTasks,
  toggleId,
  calculatePlanProgress,
  isGoalComplete,
} from '../models/stagePlanner.js';
import { getCopy } from '../models/terminology.js';
import AdvisorChat from './AdvisorChat.jsx';
import {
  buildGoalPrompt,
  pickModelForStage,
  MOCK_GOAL_REPLY,
} from '../models/advisor.js';

/**
 * One goal (or sub-item) row: checkbox, its own "ask AI" chat that can
 * break it into sub-items, and the recursive list of those sub-items.
 */
function GoalItem({
  goal,
  pathLabels,
  stage,
  profile,
  breakdowns,
  completedGoalIds,
  openChatId,
  onOpenChat,
  onToggle,
  onAddBreakdown,
  apiKey,
  usage,
  onUsageChange,
}) {
  const children = breakdowns[goal.id] ?? [];
  const hasChildren = children.length > 0;
  const complete = isGoalComplete({ goalId: goal.id, completedGoalIds, breakdowns });
  const chatOpen = openChatId === goal.id;

  return (
    <li>
      <div className="goal-row">
        <label className="goal-item">
          <input
            type="checkbox"
            checked={complete}
            disabled={hasChildren}
            onChange={() => onToggle(goal.id)}
          />
          <span>{goal.label}</span>
        </label>
        <button
          type="button"
          className="mini"
          onClick={() => onOpenChat(chatOpen ? null : goal.id)}
        >
          {chatOpen ? '收起' : '問 AI'}
        </button>
      </div>

      {chatOpen && (
        <AdvisorChat
          key={goal.id}
          apiKey={apiKey}
          model={pickModelForStage(stage.id)}
          systemPrompt={buildGoalPrompt({ profile, stage, goal, pathLabels })}
          usage={usage}
          onUsageChange={onUsageChange}
          onAdoptSteps={(steps) => onAddBreakdown(goal.id, steps)}
          mockReply={MOCK_GOAL_REPLY}
          placeholder="例如:這個目標怎麼達成?我做不到怎麼辦?"
        />
      )}

      {hasChildren && (
        <ul className="goal-children">
          {children.map((child) => (
            <GoalItem
              key={child.id}
              goal={child}
              pathLabels={[...pathLabels, goal.label]}
              stage={stage}
              profile={profile}
              breakdowns={breakdowns}
              completedGoalIds={completedGoalIds}
              openChatId={openChatId}
              onOpenChat={onOpenChat}
              onToggle={onToggle}
              onAddBreakdown={onAddBreakdown}
              apiKey={apiKey}
              usage={usage}
              onUsageChange={onUsageChange}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function QuestTracker({
  mode,
  profile,
  customizations,
  breakdowns,
  availableMinutes,
  completedGoalIds,
  completedTaskIds,
  onAvailableMinutesChange,
  onCompletedGoalIdsChange,
  onCompletedTaskIdsChange,
  onAddBreakdown,
  apiKey,
  usage,
  onUsageChange,
}) {
  const [openChatId, setOpenChatId] = useState(null);

  const plan = buildStagePlan({ profile, customizations });
  const progress = calculatePlanProgress({ plan, completedGoalIds, breakdowns });
  const activeStage = getActiveStage({ plan, completedGoalIds, breakdowns });
  const todayTasks = getTodayMicroTasks({
    plan,
    completedGoalIds,
    completedTaskIds,
    availableMinutes,
    breakdowns,
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
            isGoalComplete({ goalId: goal.id, completedGoalIds, breakdowns }),
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
                    <GoalItem
                      key={goal.id}
                      goal={goal}
                      pathLabels={[]}
                      stage={stage}
                      profile={profile}
                      breakdowns={breakdowns}
                      completedGoalIds={completedGoalIds}
                      openChatId={openChatId}
                      onOpenChat={setOpenChatId}
                      onToggle={(goalId) =>
                        onCompletedGoalIdsChange(toggleId(completedGoalIds, goalId))
                      }
                      onAddBreakdown={onAddBreakdown}
                      apiKey={apiKey}
                      usage={usage}
                      onUsageChange={onUsageChange}
                    />
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
      <p className="muted">
        {getCopy('stageGoals', mode)}
        做不到的條件可以按「問 AI」，顧問會解釋並拆成更小的子項目。
      </p>
    </section>
  );
}
