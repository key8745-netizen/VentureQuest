// Goal planner — decomposes one long-term target into the four
// VentureQuest milestones, each made of tasks small enough to finish
// in a single after-work session (5–30 minutes).

const MILESTONE_TEMPLATES = [
  {
    id: 'spark',
    label: 'Spark',
    tasks: [
      { id: 'spark-1', label: '用一句話寫下：誰會付錢給你、付錢買什麼', minutes: 10 },
      { id: 'spark-2', label: '列出你每個月的固定成本（房租、訂閱、工具）', minutes: 15 },
      { id: 'spark-3', label: '幫你要賣的東西取一個單位名稱（一份、一次、一小時）', minutes: 5 },
    ],
  },
  {
    id: 'runway',
    label: 'Runway',
    tasks: [
      { id: 'runway-1', label: '訂出一個單位售價，並寫下一個單位的變動成本', minutes: 15 },
      { id: 'runway-2', label: '算出你的生死線：每月至少要賣幾個單位', minutes: 10 },
      { id: 'runway-3', label: '寫下你下班後每週真的拿得出來的小時數', minutes: 5 },
    ],
  },
  {
    id: 'architect',
    label: 'Architect',
    tasks: [
      { id: 'architect-1', label: '把交付一個單位的步驟寫成 5 步以內的清單', minutes: 20 },
      { id: 'architect-2', label: '挑一個步驟，寫下如何讓別人照做也能完成', minutes: 20 },
      { id: 'architect-3', label: '找出一個可以先不做的步驟，劃掉它', minutes: 10 },
    ],
  },
  {
    id: 'nexus',
    label: 'Nexus',
    tasks: [
      { id: 'nexus-1', label: '寫下第二個 operating unit 會長什麼樣子', minutes: 15 },
      { id: 'nexus-2', label: '訂一個每週 30 分鐘的檢查儀式（看數字、調任務）', minutes: 10 },
      { id: 'nexus-3', label: '寫下你自己何時可以退到管理層、只看數字', minutes: 15 },
    ],
  },
];

export function buildQuestPlan({ targetLabel }) {
  return {
    targetLabel,
    milestones: MILESTONE_TEMPLATES.map((milestone) => ({
      ...milestone,
      tasks: milestone.tasks.map((task) => ({ ...task })),
    })),
  };
}

function isMilestoneComplete(milestone, completedTaskIds) {
  return milestone.tasks.every((task) => completedTaskIds.includes(task.id));
}

/** The first milestone that still has unfinished tasks. */
export function getActiveMilestone({ plan, completedTaskIds }) {
  return (
    plan.milestones.find(
      (milestone) => !isMilestoneComplete(milestone, completedTaskIds),
    ) ?? null
  );
}

/**
 * Tasks from the active milestone that are not done yet and fit inside
 * the minutes the user actually has today. The UI shows only the first
 * one — one small win per day beats a backlog.
 */
export function getTodayMicroTasks({ plan, completedTaskIds, availableMinutes }) {
  const active = getActiveMilestone({ plan, completedTaskIds });
  if (!active) return [];

  return active.tasks.filter(
    (task) =>
      !completedTaskIds.includes(task.id) && task.minutes <= availableMinutes,
  );
}

/** Returns a new array with the task toggled; never mutates the input. */
export function toggleTask(completedTaskIds, taskId) {
  if (completedTaskIds.includes(taskId)) {
    return completedTaskIds.filter((id) => id !== taskId);
  }
  return [...completedTaskIds, taskId];
}

export function calculateQuestProgress({ plan, completedTaskIds }) {
  const allTasks = plan.milestones.flatMap((milestone) => milestone.tasks);
  const completedCount = allTasks.filter((task) =>
    completedTaskIds.includes(task.id),
  ).length;

  return {
    completedCount,
    totalCount: allTasks.length,
    percent:
      allTasks.length === 0
        ? 0
        : Math.round((completedCount / allTasks.length) * 100),
  };
}
