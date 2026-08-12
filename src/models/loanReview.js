// Loan review — the adversarial pass.
//
// Every other advisor surface in this app is on the user's side. That is
// the right default, but it has a blind spot: an advisor helping you
// move forward does not volunteer the questions a lender will open with.
// This one deliberately switches sides — three weaknesses, and for each,
// the question you will actually be asked.
//
// The point is not the loan. Most users here will never apply for one.
// The point is that "what would a stranger with money at risk ask?" is
// the cheapest way to find out which parts of a plan are still wishes.
//
// Adapted from a Japanese tool that role-plays a 日本政策金融公庫 loan
// examiner. The Taiwanese equivalents are 青年創業及啟動金貸款 and
// 微型創業鳳凰貸款; the critiques below stay about the applicant's own
// numbers rather than any scheme's published criteria, which change and
// which this app has no way to verify.

import { assessRubric, LEVELS } from './rubric.js';

/**
 * Critiques a lender could actually make, keyed to the rubric criterion
 * that produces them. Ordered by how badly each one sinks an
 * application — same precedence the rubric uses.
 */
const CRITIQUES = [
  {
    id: 'B',
    when: (level) => level === LEVELS.LOW,
    critique: ({ basis }) =>
      `你的單位經濟是負的（${basis}）。審查員看到這裡通常就停了——` +
      '一個賣越多賠越多的模型，借越多錢只是虧得越快。',
    question: '每賣一個到底賺多少？如果現在是負的，你打算調價還是砍成本，調完之後客人還會買嗎？',
    task: { label: '重算一次單位成本與售價，寫下調整後每個賺多少', minutes: 15 },
  },
  {
    id: 'C',
    when: (level) => level === LEVELS.LOW,
    critique: ({ basis }) =>
      `你還沒有任何一筆實際收入（${basis}），但計畫書上會寫一個預估月營收。` +
      '沒有實績支撐的預估，在審查員眼裡跟願望沒有差別。',
    question: '你憑什麼相信有人會用這個價格買？講一個真的付過錢的人，不是說「有興趣」的人。',
    task: { label: '想辦法拿到第 1 筆真實付款，金額多小都算', minutes: 30 },
  },
  {
    id: 'D',
    when: (level) => level === LEVELS.LOW || level === LEVELS.UNKNOWN,
    critique: ({ basis }) =>
      `你說不出客人會固定從哪裡來（${basis}）。` +
      '賣掉幾個和有一條穩定的來客管道，是兩件完全不同的事，後者才撐得起還款計畫。',
    question: '下個月的客人具體從哪來？講一條你已經走過、而且可以重複走的路，不是「做社群」這種答案。',
    task: { label: '寫下最近成交的客人各自從哪來，圈出可以重複的那一條', minutes: 15 },
  },
  {
    id: 'A',
    when: (level) => level !== LEVELS.HIGH,
    critique: ({ basis }) =>
      `你的目標客群還不夠具體（${basis}）。「大家」不是客群，審查員會直接問你要去哪裡找到他們。`,
    question: '你的客人是誰？具體到你說得出要去哪裡找到十個這樣的人。',
    task: { label: '寫下 5 個真實存在、符合你客群設定的人名或單位', minutes: 15 },
  },
  {
    id: 'E',
    when: (level) => level === LEVELS.LOW,
    critique: ({ basis }) =>
      `你的投入節奏撐不久（${basis}）。審查員在意的不是你這個月多拚，` +
      '是還款期間你還在不在——燒完就停的計畫，還款計畫也會跟著停。',
    question: '這個投入量你打算維持多久？累的那個月誰來頂？',
    task: { label: '寫下每週最低可維持的投入時數，以及做不到時要先砍掉什麼', minutes: 15 },
  },
  {
    id: 'F',
    when: (level) => level === LEVELS.LOW || level === LEVELS.MID,
    critique: ({ basis }) =>
      `你手上的營運紀錄還太少（${basis}）。沒有紀錄，你講的每個數字都只能靠嘴巴保證。`,
    question: '拿得出過去三個月的實際收入和支出嗎？拿不出來的話，你的預估是怎麼算的？',
    task: { label: '把每週回顧補齊，至少累積 4 週真實數字', minutes: 10 },
  },
];

// Asked when nothing else fires, and whenever startup capital is in
// play: this app deliberately tracks only recurring costs, so it cannot
// answer this one for the user. Saying so is more honest than skipping it.
const CAPITAL_CRITIQUE = {
  id: 'capital',
  critique: () =>
    '這個 app 只追蹤每月固定支出，沒有記錄你的一次性投入（設備、押金、裝潢）。' +
    '審查員一定會問資金用途和回收期，而這部分目前沒有任何資料。',
  question: '你要借的錢具體花在哪幾項、各多少？照目前的獲利速度，多久回得來？',
  task: { label: '列出所有一次性投入項目與金額，算出大概多久回本', minutes: 20 },
};

// A ceiling, not a quota. A plan that scores well on every criterion
// gets fewer critiques — manufacturing three would be exactly the
// "confident-sounding fabrication" the honesty rules forbid.
export const MAX_CRITIQUES = 3;

/**
 * The review with no API key: three critiques drawn from the user's own
 * scored rubric, each with the question behind it and one action.
 */
export function localLoanReview(context) {
  const assessment = assessRubric(context);
  const byId = Object.fromEntries(assessment.map((item) => [item.id, item]));

  const fired = CRITIQUES.filter((rule) => rule.when(byId[rule.id]?.level)).map(
    (rule) => ({
      id: rule.id,
      critique: rule.critique(byId[rule.id]),
      question: rule.question,
      task: rule.task,
    }),
  );

  // Capital is always worth asking about, but it only takes a slot when
  // the user's own numbers have not already filled all three.
  const picked = [...fired, {
    id: CAPITAL_CRITIQUE.id,
    critique: CAPITAL_CRITIQUE.critique(),
    question: CAPITAL_CRITIQUE.question,
    task: CAPITAL_CRITIQUE.task,
  }].slice(0, MAX_CRITIQUES);

  return {
    reply: [
      '假設你今天拿這份計畫去申請青創貸款，審查員大概會挑這幾點：',
      '',
      ...picked.flatMap((item, index) => [
        `${index + 1}. ${item.critique}`,
        `   他會問你：「${item.question}」`,
        '',
      ]),
      '答得出來，這幾點就不是問題了。答不出來的，先去把答案做出來——',
      '這比把計畫書寫得漂亮有用得多。',
    ].join('\n'),
    tasks: picked.slice(0, 3).map((item) => item.task),
    goals: [],
    steps: [],
    mock: true,
    local: true,
    critiqueIds: picked.map((item) => item.id),
  };
}

/** System prompt for the same review with an API key. */
export function buildLoanReviewPrompt({ dossier }) {
  return [
    '你現在不是顧問。你是台灣某家銀行負責青年創業貸款的審查專員,個性嚴格,看過太多寫得漂亮但做不出來的計畫書。',
    '你的工作是保護放款風險,不是鼓勵申請人。',
    dossier,
    '',
    `請從放款風險的角度,挑出這份計畫最弱的地方,**最多 ${MAX_CRITIQUES} 點**,每一點都要:`,
    '1. 直接指出哪裡不夠具體、哪裡只是願望,並引用上面的真實數字當證據。',
    '2. 附上你會當面問申請人的那一句話——要能逼出具體答案的問題,不是「請補充說明」這種空話。',
    '',
    '規則:',
    '- 只挑真的存在的問題。上面六項評估裡評為「高」的,不要硬找碴——真的只有一點就只講一點,湊數等於捏造。',
    '- 用數字說話。「營收預估過於樂觀」是廢話,「你預估月營收 5 萬,但四週實際賣出 0 個」才是指摘。',
    '- 台灣的青創貸款審查細節每年會變,你不知道就不要編。只針對申請人自己的數字提問。',
    '- 嚴格但不人身攻擊。挑的是計畫,不是人。',
    '- 繁體中文,總長不超過 350 字。',
    '',
    '一律輸出單一合法 JSON 物件,不要 markdown code fence,格式:',
    '{"reply": "三點指摘與各自的問題", "tasks": [{"label": "為了答出這些問題,今天能做的 5-30 分鐘小事", "minutes": 15}]}',
    'tasks 最多 3 項。',
  ].join('\n');
}
