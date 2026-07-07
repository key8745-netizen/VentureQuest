// Stage planner — the five-stage venture roadmap, from moonlighting to
// scaling. Each stage has measurable exit goals (check them off to
// unlock the next stage) plus micro tasks small enough for one
// after-work session (5–30 minutes).
//
// Schema stays domain-agnostic: goals and tasks carry only generic
// labels; the user's own idea lives in profile.idea, never in keys.

const STAGE_TEMPLATES = [
  {
    id: 'explore',
    label: '探索驗證',
    subtitle: '還在上班：確認有人願意付錢',
    goals: [
      { id: 'explore-g1', label: '能用一句話說出：誰付錢、買什麼' },
      { id: 'explore-g2', label: '訪談 3 個潛在客戶，確認他們願意付錢' },
      { id: 'explore-g3', label: '算出生死線，而且賣一個是賺的' },
      { id: 'explore-g4', label: '收到第 1 筆真實付款（金額不拘）' },
    ],
    tasks: [
      { id: 'explore-1', label: '用一句話寫下：誰會付錢給你、付錢買什麼', minutes: 10 },
      { id: 'explore-2', label: '列出你每個月的固定成本（房租、訂閱、工具）', minutes: 15 },
      { id: 'explore-3', label: '訂出單位售價和變動成本，算一次生死線', minutes: 15 },
      { id: 'explore-4', label: '列出 5 個最可能付錢的第一批客戶', minutes: 15 },
      { id: 'explore-5', label: '寫下訪談要問的 3 個問題', minutes: 10 },
      { id: 'explore-6', label: '傳訊息約 1 位潛在客戶聊 15 分鐘', minutes: 10 },
      { id: 'explore-7', label: '完成 1 場訪談，記下對方願不願意付錢', minutes: 30 },
      { id: 'explore-8', label: '做一頁最陽春的報價或服務說明', minutes: 30 },
      { id: 'explore-9', label: '向 1 個人開口報價', minutes: 15 },
    ],
  },
  {
    id: 'prepare',
    label: '起飛準備',
    subtitle: '收入變穩：準備安全離開正職',
    goals: [
      { id: 'prepare-g1', label: '副業月收入連續 3 個月達到正職的 30%' },
      { id: 'prepare-g2', label: '存到 6–12 個月的生活費當緩衝' },
      { id: 'prepare-g3', label: '有一個每週都會帶來新客戶的管道' },
      { id: 'prepare-g4', label: '查清楚並完成必要的登記或執照' },
    ],
    tasks: [
      { id: 'prepare-1', label: '算出你的安全離職數字：月生活費 × 12', minutes: 10 },
      { id: 'prepare-2', label: '記錄本月副業收入，和正職的 30% 比一比', minutes: 10 },
      { id: 'prepare-3', label: '盤點目前客戶都是從哪裡來的', minutes: 15 },
      { id: 'prepare-4', label: '挑一個客源管道，訂下每週固定要做的一件事', minutes: 15 },
      { id: 'prepare-5', label: '查你的業種需要什麼登記或執照', minutes: 30 },
      { id: 'prepare-6', label: '寫下離職條件清單：數字到了才走', minutes: 15 },
      { id: 'prepare-7', label: '開一張副業專用的收支記錄表', minutes: 10 },
      { id: 'prepare-8', label: '傳訊息關心 1 位舊客戶，看會不會回購', minutes: 10 },
    ],
  },
  {
    id: 'operate',
    label: '落地營運',
    subtitle: '全力投入：讓事業自己站起來',
    goals: [
      { id: 'operate-g1', label: '累積 10 個以上付費客戶' },
      { id: 'operate-g2', label: '交付流程寫成別人能照做的步驟' },
      { id: 'operate-g3', label: '單月達到損益平衡' },
      { id: 'operate-g4', label: '拿到 3 個書面好評或見證' },
    ],
    tasks: [
      { id: 'operate-1', label: '把交付一次服務的步驟寫成 5 步以內清單', minutes: 20 },
      { id: 'operate-2', label: '挑一步，寫成別人照做也能完成的說明', minutes: 20 },
      { id: 'operate-3', label: '建一張簡單的月損益表：收入、成本、剩下', minutes: 20 },
      { id: 'operate-4', label: '跟 1 位滿意的客戶要一段書面評價', minutes: 10 },
      { id: 'operate-5', label: '檢查本月單量有沒有超過生死線', minutes: 10 },
      { id: 'operate-6', label: '比較 3 個同業的定價，決定要不要調整', minutes: 20 },
    ],
  },
  {
    id: 'grow',
    label: '穩定成長',
    subtitle: '抽身做老闆：不再每件事都自己來',
    goals: [
      { id: 'grow-g1', label: '前 3 大核心流程都有寫下來、交接過 1 次' },
      { id: 'grow-g2', label: '找到第 1 位助理或穩定外包' },
      { id: 'grow-g3', label: '轉介機制帶來至少 1 個新客戶' },
      { id: 'grow-g4', label: '連續一季營收成長' },
    ],
    tasks: [
      { id: 'grow-1', label: '列出你每週重複做的 3 件事', minutes: 10 },
      { id: 'grow-2', label: '挑 1 件，寫成可以交給別人的說明', minutes: 20 },
      { id: 'grow-3', label: '找 1 個可能的助理或外包人選並開口', minutes: 15 },
      { id: 'grow-4', label: '設計一句轉介話術，傳給 3 位老客戶', minutes: 15 },
      { id: 'grow-5', label: '訂下每週 30 分鐘的看數字儀式時間', minutes: 5 },
      { id: 'grow-6', label: '寫下這個月最想丟掉的 1 件雜事', minutes: 5 },
    ],
  },
  {
    id: 'scale',
    label: '規模擴張',
    subtitle: '複製模型：事業不再只靠你一個人',
    goals: [
      { id: 'scale-g1', label: '第二個營運單位開始收錢' },
      { id: 'scale-g2', label: '你休一整週，事業照常運作' },
      { id: 'scale-g3', label: '月營收達到落地營運期的 3 倍' },
    ],
    tasks: [
      { id: 'scale-1', label: '寫下第二個營運單位會長什麼樣子', minutes: 15 },
      { id: 'scale-2', label: '列出你不在的時候，誰負責什麼', minutes: 20 },
      { id: 'scale-3', label: '訂出管理層每週例行檢查清單', minutes: 15 },
      { id: 'scale-4', label: '寫下找夥伴或資金的利與弊', minutes: 30 },
      { id: 'scale-5', label: '寫下明年要達成的 3 個數字目標', minutes: 30 },
    ],
  },
];

/**
 * customizations: advisor-suggested extras the user adopted, keyed by
 * stage id — { [stageId]: { goals: [...], tasks: [...] } }.
 */
export function buildStagePlan({ profile, customizations = {} }) {
  const income = profile.targetMonthlyIncome;
  const incomePart = Number.isFinite(income) && income > 0 ? `每月 ${income}` : '';

  const targetLabel = profile.exploring || !profile.idea
    ? ['找到值得投入的方向', incomePart].filter(Boolean).join('，')
    : [profile.idea, incomePart].filter(Boolean).join('：');

  return {
    targetLabel,
    stages: STAGE_TEMPLATES.map((stage) => {
      const extra = customizations[stage.id] ?? {};
      return {
        ...stage,
        goals: [
          ...stage.goals.map((goal) => ({ ...goal })),
          ...(extra.goals ?? []).map((goal) => ({ ...goal })),
        ],
        tasks: [
          ...stage.tasks.map((task) => ({ ...task })),
          ...(extra.tasks ?? []).map((task) => ({ ...task })),
        ],
      };
    }),
  };
}

/**
 * breakdowns: AI-suggested sub-items per goal (recursive), keyed by the
 * parent id — { [goalOrItemId]: [{ id, label }, ...] }.
 *
 * A goal with sub-items completes only when every sub-item completes
 * (checking the parent directly stops counting); leaves are checked by
 * the user. This is what lets the advisor break a goal the user cannot
 * do yet ("取得中餐丙級證照") into steps they can.
 */
export function isGoalComplete({ goalId, completedGoalIds, breakdowns = {} }) {
  const children = breakdowns[goalId];
  if (!children || children.length === 0) {
    return completedGoalIds.includes(goalId);
  }
  return children.every((child) =>
    isGoalComplete({ goalId: child.id, completedGoalIds, breakdowns }),
  );
}

function isStageComplete(stage, completedGoalIds, breakdowns) {
  return stage.goals.every((goal) =>
    isGoalComplete({ goalId: goal.id, completedGoalIds, breakdowns }),
  );
}

/** The first stage whose exit goals are not all complete yet. */
export function getActiveStage({ plan, completedGoalIds, breakdowns = {} }) {
  return (
    plan.stages.find(
      (stage) => !isStageComplete(stage, completedGoalIds, breakdowns),
    ) ?? null
  );
}

/**
 * Micro tasks from the active stage that are not done and fit inside
 * the minutes the user has today. The UI shows only the first one —
 * one small win per day beats a backlog.
 */
export function getTodayMicroTasks({
  plan,
  completedGoalIds,
  completedTaskIds,
  availableMinutes,
  breakdowns = {},
}) {
  const active = getActiveStage({ plan, completedGoalIds, breakdowns });
  if (!active) return [];

  return active.tasks.filter(
    (task) =>
      !completedTaskIds.includes(task.id) && task.minutes <= availableMinutes,
  );
}

/**
 * Removes one breakdown item and its entire subtree. Parents whose
 * child list becomes empty lose their key, so they revert to being
 * directly checkable. Never mutates the input.
 */
export function removeBreakdownItem(breakdowns, itemId) {
  const purge = new Set();
  const stack = [itemId];
  while (stack.length > 0) {
    const id = stack.pop();
    purge.add(id);
    for (const child of breakdowns[id] ?? []) stack.push(child.id);
  }

  const next = {};
  for (const [parentId, children] of Object.entries(breakdowns)) {
    if (purge.has(parentId)) continue;
    const kept = children.filter((child) => !purge.has(child.id));
    if (kept.length > 0) next[parentId] = kept;
  }
  return next;
}

/** Returns a new array with the id toggled; never mutates the input. */
export function toggleId(ids, id) {
  if (ids.includes(id)) {
    return ids.filter((existing) => existing !== id);
  }
  return [...ids, id];
}

/**
 * The first fully-cleared stage the user has not been congratulated
 * for yet — drives the one-time stage-clear banner.
 */
export function getUncelebratedStage({
  plan,
  completedGoalIds,
  breakdowns = {},
  celebratedStageIds = [],
}) {
  return (
    plan.stages.find(
      (stage) =>
        !celebratedStageIds.includes(stage.id) &&
        isStageComplete(stage, completedGoalIds, breakdowns),
    ) ?? null
  );
}

/** Overall progress counts stage goals — they are the real milestones. */
export function calculatePlanProgress({ plan, completedGoalIds, breakdowns = {} }) {
  const allGoals = plan.stages.flatMap((stage) => stage.goals);
  const completedCount = allGoals.filter((goal) =>
    isGoalComplete({ goalId: goal.id, completedGoalIds, breakdowns }),
  ).length;

  return {
    completedCount,
    totalCount: allGoals.length,
    percent:
      allGoals.length === 0
        ? 0
        : Math.round((completedCount / allGoals.length) * 100),
  };
}
