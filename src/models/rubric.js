// Rubric — the six things that decide whether a side business is on
// track, scored from the user's own data wherever possible.
//
// Why this exists: the advisor prompt used to say little more than "be
// specific, under 200 characters". Two users in the same situation
// could get answers of wildly different quality, because there was no
// standard to answer against. A rubric plus worked calibration cases
// is what makes a model's judgement repeatable.
//
// The part that matters most: four of the six criteria are *computed*,
// not guessed. Whether one sale makes money, whether anyone has ever
// actually paid, whether the pace is sustainable, whether the user is
// recording anything at all — the app already knows. Handing the model
// those verdicts (with the numbers behind them) stops it inventing its
// own, and means the local rule advisor and the LLM are reading from
// the same page.

import { calculateMoneyLines } from './financialGuardrails.js';
import { isGoalComplete } from './stagePlanner.js';

export const LEVELS = { HIGH: '高', MID: '中', LOW: '低', UNKNOWN: '未知' };

export const RUBRIC = [
  { id: 'A', name: '需求明確', asks: '知不知道誰付錢、買什麼', source: 'self' },
  { id: 'B', name: '單位經濟', asks: '賣一個到底是不是賺的', source: 'computed' },
  { id: 'C', name: '付費驗證', asks: '有沒有人真的掏過錢', source: 'computed' },
  { id: 'D', name: '客源重複性', asks: '客人來得了一次，來不來第二次', source: 'computed' },
  { id: 'E', name: '節奏可持續', asks: '這個投入量撐不撐得過三個月', source: 'computed' },
  { id: 'F', name: '數字誠實度', asks: '有沒有在記真實數字', source: 'computed' },
];

const RECENT_WEEKS = 4;
const HIGH_HOURS_PER_WEEK = 15;
// Below this share of the price, one mistake or one refund wipes out
// several sales — technically profitable, practically fragile.
const THIN_MARGIN_RATIO = 0.2;

/**
 * Scores all six criteria. Every entry carries the evidence it was
 * scored from, so the reason can be shown to the user and quoted to
 * the model instead of asserted.
 */
export function assessRubric({
  profile,
  financial,
  weeklyReviews = [],
  completedGoalIds = [],
  breakdowns = {},
}) {
  const sorted = [...weeklyReviews].sort((a, b) => a.week.localeCompare(b.week));
  const recent = sorted.slice(-RECENT_WEEKS);
  const soldWeeks = recent.filter((review) => review.units > 0).length;
  const totalUnits = sorted.reduce((sum, review) => sum + review.units, 0);
  const avgHours =
    recent.length > 0
      ? recent.reduce((sum, review) => sum + review.hours, 0) / recent.length
      : 0;

  const lines = calculateMoneyLines({
    ...financial,
    employment: profile?.employment,
    targetMonthlyIncome: profile?.targetMonthlyIncome,
  });

  return [
    scoreDemand({ profile, completedGoalIds, breakdowns }),
    scoreUnitEconomics({ financial, lines }),
    scorePaidProof({ totalUnits, sorted }),
    scoreRepeatability({ soldWeeks, recent }),
    scorePace({ avgHours, recent }),
    scoreHonesty({ sorted }),
  ];
}

function entry(id, level, basis) {
  const meta = RUBRIC.find((item) => item.id === id);
  return { id, name: meta.name, asks: meta.asks, level, basis };
}

// The one criterion the app cannot verify: it is a checkbox the user
// ticked, so it is scored conservatively and labelled as self-reported.
function scoreDemand({ profile, completedGoalIds, breakdowns }) {
  const stated = isGoalComplete({
    goalId: 'explore-g1',
    completedGoalIds,
    breakdowns,
  });
  if (stated) {
    return entry('A', LEVELS.HIGH, '使用者自評已能用一句話說出誰付錢、買什麼');
  }
  if (profile?.idea) {
    return entry(
      'A',
      LEVELS.MID,
      `已有方向「${profile.idea}」,但還沒完成「能用一句話說出誰付錢、買什麼」`,
    );
  }
  return entry('A', LEVELS.LOW, '還在探索方向,尚未指定要做什麼');
}

function scoreUnitEconomics({ financial, lines }) {
  if (!lines.viable) {
    return entry(
      'B',
      LEVELS.LOW,
      `售價 ${financial.unitPrice} 減成本 ${financial.unitCost},每賣一個${
        lines.unitMargin === 0 ? '不賺不賠' : `倒賠 ${Math.abs(lines.unitMargin)} 元`
      }`,
    );
  }
  const ratio = financial.unitPrice > 0 ? lines.unitMargin / financial.unitPrice : 0;
  if (ratio < THIN_MARGIN_RATIO) {
    return entry(
      'B',
      LEVELS.MID,
      `每個賺 ${lines.unitMargin} 元,只佔售價 ${Math.round(ratio * 100)}%,毛利偏薄`,
    );
  }
  return entry('B', LEVELS.HIGH, `每賣一個實拿 ${lines.unitMargin} 元`);
}

function scorePaidProof({ totalUnits, sorted }) {
  if (totalUnits <= 0) {
    return entry(
      'C',
      LEVELS.LOW,
      sorted.length > 0
        ? `已記錄 ${sorted.length} 週,累計賣出 0 個,還沒有人付過錢`
        : '還沒有任何紀錄,無法確認有沒有人付過錢',
    );
  }
  const first = sorted.find((review) => review.units > 0);
  return entry(
    'C',
    LEVELS.HIGH,
    `${first.week} 起有真實付款,累計賣出 ${totalUnits} 個`,
  );
}

function scoreRepeatability({ soldWeeks, recent }) {
  if (recent.length === 0) {
    return entry('D', LEVELS.UNKNOWN, '還沒有每週紀錄,看不出客源是否可重複');
  }
  if (soldWeeks >= 3) {
    return entry('D', LEVELS.HIGH, `最近 ${recent.length} 週有 ${soldWeeks} 週賣出東西`);
  }
  if (soldWeeks >= 1) {
    return entry(
      'D',
      LEVELS.MID,
      `最近 ${recent.length} 週只有 ${soldWeeks} 週賣出東西,還看不出穩定客源`,
    );
  }
  return entry('D', LEVELS.LOW, `最近 ${recent.length} 週都沒賣出任何東西`);
}

function scorePace({ avgHours, recent }) {
  if (recent.length === 0) {
    return entry('E', LEVELS.UNKNOWN, '還沒有投入時數紀錄');
  }
  const rounded = Math.round(avgHours);
  if (avgHours > HIGH_HOURS_PER_WEEK) {
    return entry('E', LEVELS.LOW, `最近平均每週投入 ${rounded} 小時,長跑會撐不住`);
  }
  if (avgHours <= 0) {
    return entry('E', LEVELS.MID, '最近幾週投入 0 小時,事業實際上是停著的');
  }
  return entry('E', LEVELS.HIGH, `最近平均每週投入 ${rounded} 小時,是可持續的節奏`);
}

function scoreHonesty({ sorted }) {
  if (sorted.length === 0) {
    return entry('F', LEVELS.LOW, '一次每週回顧都還沒填,所有判斷都只能靠猜');
  }
  if (sorted.length < RECENT_WEEKS) {
    return entry('F', LEVELS.MID, `已記錄 ${sorted.length} 週,還看不出趨勢`);
  }
  return entry('F', LEVELS.HIGH, `已記錄 ${sorted.length} 週真實數字`);
}

/** The criteria scored 低 — what any advice should be aimed at first. */
export function weakestLinks(assessment) {
  return assessment.filter((item) => item.level === LEVELS.LOW);
}

/** The assessment as prompt/display text, one line per criterion. */
export function describeRubric(assessment) {
  return assessment
    .map((item) => `${item.id} ${item.name}:${item.level}(${item.basis})`)
    .join('\n');
}

/**
 * The standard itself, plus worked examples. Static text — it goes in
 * the prompt so the model scores the way this app scores, and the
 * calibration cases are what stop it drifting between "everything is
 * fine" and "everything is doomed" for similar situations.
 */
export const RUBRIC_INSTRUCTIONS = [
  '【判準】使用者的狀況已依六項評過,每項分高/中/低,評分依據都附在後面。',
  RUBRIC.map((item) => `${item.id} ${item.name}:${item.asks}`).join(';'),
  'B、C、D、E、F 是系統從真實數字算出來的,不要推翻,也不要重算。A 是使用者自評,可以存疑。',
  '',
  '【建議原則】',
  '1. 優先處理評為「低」的項目;有多個「低」時,依 B > C > D > A > E > F 的順序處理——賠錢的生意做越多賠越多,沒人付錢的生意規模化沒有意義。',
  '2. 沒有「低」時才處理「中」。全部是高就講怎麼守住,不要硬找問題。',
  '3. 引用上面的實際數字說話,不要只給通則。',
  '4. 不要責備。使用者落後時,從他現在的位置設計最短路徑,不要叫他重來。',
  '',
  '【校準案例】同樣情況應該給出同樣層級的判斷:',
  '- 投入 13 小時、賣出 0 個、單位毛利為正:問題在 C 付費驗證,不是努力不夠。要他對人開口報價,不要叫他再優化產品。',
  '- 賣過 20 個但最近一週掛零:問題在 D 客源重複性,不是需求不存在。先找回頭客,比找新客省力。',
  '- 售價 150、成本 200:問題在 B,其他全部先停。這種狀況下衝業績只是加速虧損。',
  '- 每週投入 25 小時、數字很漂亮:問題在 E。撐不過三個月的節奏不算節奏,先減量。',
].join('\n');
