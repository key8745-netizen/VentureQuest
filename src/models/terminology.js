// Terminology — the same concepts in professional wording or street
// plain language. Keys are domain-agnostic; only the copy changes.

export const modes = {
  PRO: 'pro',
  PLAIN: 'plain',
};

const COPY = {
  appTagline: {
    pro: '在職創業的財務生死線與目標拆解',
    plain: '還在上班也能搞副業：先看會不會死，再做今天那一小步',
  },
  survivalLine: {
    pro: '損益兩平單量（Break-even Volume）',
    plain: '生死線：每月至少要賣幾個才不會賠',
  },
  monthlyFixedCost: {
    pro: '每月固定成本',
    plain: '就算一個都沒賣，每個月照樣要繳的錢',
  },
  unitPrice: {
    pro: '單位售價',
    plain: '賣一個收多少',
  },
  unitCost: {
    pro: '單位變動成本',
    plain: '每賣一個要先花掉多少',
  },
  unitMargin: {
    pro: '單位邊際貢獻（Unit Margin）',
    plain: '賣一個真正留在口袋的錢',
  },
  notViable: {
    pro: '此商業模式的單位經濟不成立：每筆銷售皆為負貢獻。',
    plain: '賣越多賠越多，這樣做下去會死，先改價格或成本。',
  },
  questProgress: {
    pro: '長期目標進度',
    plain: '你的闖關進度',
  },
  todayMicroTask: {
    pro: '今日執行項目',
    plain: '今天只要做完這一件小事',
  },
  noTaskFitsToday: {
    pro: '今日可用時間不足以執行任何項目，請調整可用分鐘數。',
    plain: '今天時間太少塞不下任務，休息也是策略，明天再來。',
  },
  stageMap: {
    pro: '五階段營運路線圖',
    plain: '你的闖關地圖',
  },
  stageGoals: {
    pro: '勾選完成本階段全部條件後，自動進入下一階段。',
    plain: '把這一關的條件都打勾，就會自動進下一關。',
  },
  orgTree: {
    pro: '營運節點結構（Org-Tree）',
    plain: '你的小事業長什麼樣子',
  },
  managementLocked: {
    pro: '管理層節點尚未解鎖：需至少兩個營運單位。',
    plain: '先把第二個攤子開起來，才輪得到你當老闆。',
  },
};

/**
 * Returns copy for a key in the given mode. Unknown modes fall back to
 * professional wording; unknown keys return the key itself so missing
 * copy is visible instead of blank.
 */
export function getCopy(key, mode) {
  const entry = COPY[key];
  if (!entry) return key;

  const resolvedMode = mode === modes.PLAIN ? modes.PLAIN : modes.PRO;
  return entry[resolvedMode];
}
