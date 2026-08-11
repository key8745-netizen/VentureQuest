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
  replacementLine: {
    pro: '薪資取代單量（Replacement Volume）',
    plain: '離職線：每月賣幾個，事業就養得起你',
  },
  businessFixedCost: {
    pro: '事業每月固定成本',
    plain: '事業每個月固定要花的錢',
  },
  livingCost: {
    pro: '個人每月生活費',
    plain: '你自己每個月要花的生活費',
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
    pro: '今日可用時間不足以執行任何項目，請調高可用分鐘數。',
    plain: '還有任務，只是都塞不進今天的分鐘數。把上面的可用分鐘數調高一點就看得到。',
  },
  allTasksDoneToday: {
    pro: '本階段今日項目已全數完成，明日重新開放。',
    plain: '今天的份做完了 ✅ 每天的任務明天會再出現，這一關真正的進度靠下面的過關條件。',
  },
  evidenceUnlocked: {
    pro: '依據實際回報數字，下列過關條件已自動達成：',
    plain: '你回報的真實數字已經達成這些條件（不用自己打勾）：',
  },
  askAi: {
    pro: '諮詢 AI',
    plain: '問 AI',
  },
  todayMinutes: {
    pro: '今日可投入分鐘數',
    plain: '今天可用分鐘數',
  },
  stageGoalsHint: {
    pro: '完成本階段全部條件後自動進入下一階段;無法執行的條件可透過「諮詢 AI」由顧問拆解為子項目。',
    plain: '把這一關的條件都打勾，就會自動進下一關。做不到的就按「問 AI」，顧問會幫你拆成更小的子項目。',
  },
  advisorTitle: {
    pro: 'AI 營運顧問',
    plain: 'AI 創業顧問',
  },
  wizardAskAi: {
    pro: '需要協助?諮詢 AI',
    plain: '不知道怎麼填?問 AI',
  },
  targetLine: {
    pro: '目標收入所需單量',
    plain: '要賺到目標收入,每月要賣幾個',
  },
  weeklyReview: {
    pro: '每週營運回顧',
    plain: '每週回顧:這週跑得怎樣?',
  },
  stageClearTitle: {
    pro: '階段完成',
    plain: '過關啦!',
  },
  stageClearNext: {
    pro: '下一階段',
    plain: '下一關',
  },
  stageClearAllDone: {
    pro: '五個階段全部完成,路線圖已走完。',
    plain: '五關全破!這條路你已經走完了,接下來換你自己寫劇本。',
  },
  stageClearContinue: {
    pro: '繼續',
    plain: '繼續前進',
  },
  stageMap: {
    pro: '五階段營運路線圖',
    plain: '你的闖關地圖',
  },
  stageGoals: {
    pro: '勾選完成本階段全部條件後，自動進入下一階段。',
    plain: '把這一關的條件都打勾，就會自動進下一關。',
  },
  skillTree: {
    pro: '成長路徑總覽（Skill Tree）',
    plain: '技能樹:你離大目標還有幾步',
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
