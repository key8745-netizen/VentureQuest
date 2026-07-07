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
  mode,
  goal,
  pathLabels,
  stage,
  profile,
  financial,
  breakdowns,
  completedGoalIds,
  openChatId,
  onOpenChat,
  onToggle,
  onAddBreakdown,
  onRemoveItem,
  apiKey,
  usage,
  onUsageChange,
  advisorHistories,
  onAdvisorHistoryChange,
}) {
  const children = breakdowns[goal.id] ?? [];
  const hasChildren = children.length > 0;
  const complete = isGoalComplete({ goalId: goal.id, completedGoalIds, breakdowns });
  const chatOpen = openChatId === goal.id;
  // Only AI-added items are removable: breakdown sub-items (depth > 0)
  // and adopted custom goals. Built-in stage goals stay.
  const isBreakdownItem = pathLabels.length > 0;
  const isCustomGoal = pathLabels.length === 0 && goal.id.startsWith('custom-');
  const removable = isBreakdownItem || isCustomGoal;

  const handleRemove = () => {
    if (
      hasChildren &&
      !window.confirm('這個項目底下還有子項目,會一起移除。確定嗎?')
    ) {
      return;
    }
    onRemoveItem(goal, { isCustomGoal, stageId: stage.id });
  };

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
        <span className="goal-actions">
          <button
            type="button"
            className="mini"
            onClick={() => onOpenChat(chatOpen ? null : goal.id)}
          >
            {chatOpen ? '收起' : getCopy('askAi', mode)}
          </button>
          {removable && (
            <button
              type="button"
              className="mini danger"
              aria-label="移除這個項目"
              onClick={handleRemove}
            >
              ✕
            </button>
          )}
        </span>
      </div>

      {chatOpen && (
        <AdvisorChat
          key={goal.id}
          apiKey={apiKey}
          model={pickModelForStage(stage.id)}
          systemPrompt={buildGoalPrompt({ profile, stage, goal, pathLabels, financial })}
          history={advisorHistories[`goal:${goal.id}`] ?? []}
          onHistoryChange={(turns) => onAdvisorHistoryChange(`goal:${goal.id}`, turns)}
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
              mode={mode}
              goal={child}
              pathLabels={[...pathLabels, goal.label]}
              stage={stage}
              profile={profile}
              financial={financial}
              breakdowns={breakdowns}
              completedGoalIds={completedGoalIds}
              openChatId={openChatId}
              onOpenChat={onOpenChat}
              onToggle={onToggle}
              onAddBreakdown={onAddBreakdown}
              onRemoveItem={onRemoveItem}
              apiKey={apiKey}
              usage={usage}
              onUsageChange={onUsageChange}
              advisorHistories={advisorHistories}
              onAdvisorHistoryChange={onAdvisorHistoryChange}
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
  financial,
  customizations,
  breakdowns,
  availableMinutes,
  completedGoalIds,
  completedTaskIds,
  onAvailableMinutesChange,
  onCompletedGoalIdsChange,
  onCompletedTaskIdsChange,
  onAddBreakdown,
  onRemoveItem,
  apiKey,
  usage,
  onUsageChange,
  advisorHistories,
  onAdvisorHistoryChange,
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
          <span>{getCopy('todayMinutes', mode)}</span>
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
                      mode={mode}
                      goal={goal}
                      pathLabels={[]}
                      stage={stage}
                      profile={profile}
                      financial={financial}
                      breakdowns={breakdowns}
                      completedGoalIds={completedGoalIds}
                      openChatId={openChatId}
                      onOpenChat={setOpenChatId}
                      onToggle={(goalId) =>
                        onCompletedGoalIdsChange(toggleId(completedGoalIds, goalId))
                      }
                      onAddBreakdown={onAddBreakdown}
                      onRemoveItem={onRemoveItem}
                      apiKey={apiKey}
                      usage={usage}
                      onUsageChange={onUsageChange}
                      advisorHistories={advisorHistories}
                      onAdvisorHistoryChange={onAdvisorHistoryChange}
                    />
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
      <p className="muted">{getCopy('stageGoalsHint', mode)}</p>
    </section>
  );
}
