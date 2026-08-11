// Onboarding — the guided interview that replaces the blank dashboard.
// One question per screen; answers become a profile that seeds the
// stage plan and the financial panel. Question ids double as profile
// keys and stay domain-agnostic.

export const QUESTION_FLOW = [
  {
    id: 'idea',
    type: 'text',
    question: '你想做什麼副業或事業？',
    hint: '例如：便當店、接案設計、線上課程。一句話就好。',
    allowUnknown: true,
    unknownLabel: '我還不知道，先幫我探索',
  },
  {
    id: 'employment',
    type: 'choice',
    question: '你現在的工作狀態是？',
    options: [
      { value: 'employed', label: '還在上班（全職）' },
      { value: 'flexible', label: '兼職或工時彈性' },
      { value: 'left', label: '已經離開正職' },
    ],
  },
  {
    id: 'businessFixedCost',
    type: 'number',
    question: '這個事業本身，每個月固定要花多少錢？',
    hint: '只算事業的：工具訂閱、網域、店面租金、固定月費。不含你的個人生活費。還沒花錢就填 0。',
    unit: '元／月',
  },
  {
    id: 'livingCost',
    type: 'number',
    question: '你個人每個月的生活費大概多少？',
    hint: '房租、伙食、貸款。還在上班的話這筆由薪水付，我們用它算「什麼時候能安全離職」，不會算進生死線。',
    unit: '元／月',
  },
  {
    id: 'unitPrice',
    type: 'number',
    question: '賣一個收多少錢？',
    hint: '「一個」可以是一份餐、一小時服務、一件商品。還沒定就先猜。',
    unit: '元',
  },
  {
    id: 'unitCost',
    type: 'number',
    question: '每賣一個，要先花掉多少成本？',
    hint: '材料、進貨、抽成……不含前面那些固定支出。',
    unit: '元',
  },
  {
    id: 'weeklyHours',
    type: 'number',
    question: '每週真的擠得出來的時間有幾小時？',
    hint: '誠實一點，寫你累了也做得到的數字。',
    unit: '小時／週',
  },
  {
    id: 'targetMonthlyIncome',
    type: 'number',
    question: '你希望這個事業每個月幫你賺多少？',
    hint: '這會成為你的長期目標。',
    unit: '元／月',
  },
];

export function isAnswerValid(question, value) {
  switch (question.type) {
    case 'text':
      return typeof value === 'string' && value.trim().length > 0;
    case 'choice':
      return question.options.some((option) => option.value === value);
    case 'number':
      return Number.isFinite(value) && value >= 0;
    default:
      return false;
  }
}

const NUMBER_DEFAULTS = {
  businessFixedCost: 0,
  livingCost: 0,
  unitPrice: 0,
  unitCost: 0,
  weeklyHours: 5,
  targetMonthlyIncome: 30000,
};

/** Turns raw wizard answers into a stored profile with safe defaults. */
export function createProfile(answers = {}) {
  const idea = typeof answers.idea === 'string' ? answers.idea.trim() : '';

  const profile = {
    idea,
    exploring: idea.length === 0,
    employment: answers.employment ?? 'employed',
    createdAt: answers.createdAt ?? new Date().toISOString(),
  };

  for (const [key, fallback] of Object.entries(NUMBER_DEFAULTS)) {
    const value = Number(answers[key]);
    profile[key] = Number.isFinite(value) && value >= 0 ? value : fallback;
  }

  return profile;
}
