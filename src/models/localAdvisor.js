// Local advisor — the coach that works with no API key.
//
// Every AI affordance in this app used to fall back to a hard-coded
// "(示範回覆) set an API key" string, which meant the default
// experience — the one most users will ever see, since most will not
// go and get a key — was a static checklist with four dead buttons.
//
// An LLM is not what makes advice feel personal; *the user's own
// numbers* are. Those we already have. These rules read the same
// dossier data the LLM would see and say something specific and true
// about this user's situation: that they are losing money on every
// sale, that they have logged twelve hours and asked nobody for
// money, that their business now covers its own costs.
//
// Output matches parseAdvisorReply's shape ({ reply, tasks, goals,
// steps }) so it flows through the existing adopt buttons unchanged,
// and carries mock: true so it is never replayed as LLM context.

import { calculateMoneyLines, describeWeeklyProgress } from './financialGuardrails.js';
import { computeStreak, localDayKey } from './momentum.js';
import { matchAntiPattern } from './antiPatterns.js';

const empty = { tasks: [], goals: [], steps: [] };

/** Plain facts about where the user actually is, read from their data. */
export function readSignals({
  profile,
  financial,
  weeklyReviews = [],
  taskLog = {},
  today = localDayKey(),
}) {
  const lines = calculateMoneyLines({
    ...financial,
    employment: profile?.employment,
    targetMonthlyIncome: profile?.targetMonthlyIncome,
  });

  const sorted = [...weeklyReviews].sort((a, b) => a.week.localeCompare(b.week));
  const recent = sorted.slice(-4);
  const latest = sorted.at(-1) ?? null;

  const totalUnits = sorted.reduce((sum, review) => sum + review.units, 0);
  const totalHours = sorted.reduce((sum, review) => sum + review.hours, 0);
  const recentHours = recent.reduce((sum, review) => sum + review.hours, 0);

  const { streak } = computeStreak(taskLog, today);

  return {
    lines,
    weeksLogged: sorted.length,
    everSold: totalUnits > 0,
    totalUnits,
    totalHours,
    latest,
    avgRecentHours: recent.length > 0 ? recentHours / recent.length : 0,
    streak,
    tasksDone: Object.values(taskLog).reduce((sum, n) => sum + n, 0),
    weekly: latest
      ? describeWeeklyProgress({ units: latest.units, lines })
      : null,
  };
}

/**
 * The primary diagnosis, most urgent first. Each rule owns one
 * situation and speaks only when that situation is the user's.
 */
const DIAGNOSES = [
  {
    id: 'unit-margin',
    when: ({ lines }) => !lines.viable,
    say: ({ financial, lines }) => {
      const loss = Math.abs(lines.unitMargin);
      const suggested = Math.ceil((financial.unitCost + 1) * 1.5);
      return {
        reply:
          `賣一個收 ${financial.unitPrice} 元、成本 ${financial.unitCost} 元，` +
          `每賣一個${lines.unitMargin === 0 ? '剛好打平，一毛都沒賺' : `倒賠 ${loss} 元`}。` +
          '這種狀況下賣越多賠越多，衝業績只會加速虧損。' +
          '先修單位經濟，其他事情都可以等。',
        tasks: [
          { label: '重算單位成本，把容易漏掉的加進去（包材、運費、平台抽成、你的車錢）', minutes: 15 },
          { label: `試算把售價拉到 ${suggested} 元，寫下要怎麼跟客人解釋這個價格`, minutes: 15 },
        ],
        goals: [{ label: '調整價格或成本，讓賣一個是賺的' }],
      };
    },
  },
  {
    id: 'never-sold-much-effort',
    when: ({ everSold, totalHours }) => !everSold && totalHours >= 5,
    say: ({ totalHours, weeksLogged }) => ({
      reply:
        `你已經投入 ${totalHours} 小時、記了 ${weeksLogged} 週，但還沒有任何一筆收入。` +
        '這幾乎不是努力不夠，是還沒有對人開口要錢。' +
        '準備到七、八分就去報價，剩下的讓客人告訴你——他們的反應比你再多想一週有用得多。',
      tasks: [
        { label: '挑 1 個最可能買的人，今天直接把價格報給他', minutes: 15 },
        { label: '寫下 3 句話：你賣什麼、多少錢、什麼時候可以拿到', minutes: 10 },
      ],
      goals: [],
    }),
  },
  {
    id: 'never-sold-no-data',
    when: ({ everSold, weeksLogged }) => !everSold && weeksLogged === 0,
    say: () => ({
      reply:
        '還沒有任何一週的紀錄，所以我只能給最通用的一步：先讓自己有東西可以看。' +
        '這週結束時填一次回顧，就算投入 0 小時、賣出 0 個也照樣填——' +
        '有了兩三週的數字，我才能告訴你是卡在沒人要、還是卡在沒開口。',
      tasks: [
        { label: '這週結束時填一次每週回顧，數字是 0 也要填', minutes: 5 },
      ],
      goals: [],
    }),
  },
  {
    id: 'never-sold-early',
    when: ({ everSold }) => !everSold,
    say: () => ({
      reply:
        '目前還沒有收入紀錄，這在最前面很正常。這個階段唯一要驗證的事情只有一件：' +
        '有沒有人願意掏錢。不是有人說「聽起來不錯」，是真的付錢。' +
        '所以現在每一步都應該指向「開口要錢」，而不是繼續把東西做得更完美。',
      tasks: [{ label: '列出 3 個你敢開口報價的人，挑第一個傳訊息', minutes: 15 }],
      goals: [],
    }),
  },
  {
    id: 'stalled',
    when: ({ everSold, latest, weeksLogged }) =>
      everSold && weeksLogged >= 2 && latest?.units === 0,
    say: ({ totalUnits }) => ({
      reply:
        `你累計賣過 ${totalUnits} 個，代表這件事本身是成立的——有人願意付錢。` +
        '但最近一週掛零。停下來通常不是能力問題，是沒有一個「每週固定會帶人進來」的管道，' +
        '所以每一單都得重新想辦法。與其找新客人，先回頭找買過的人最省力。',
      tasks: [
        { label: '傳訊息給 1 位買過的客人，問他要不要再來一次', minutes: 10 },
        { label: '寫下上次成交的客人是從哪來的，這週把同一條路再走一次', minutes: 15 },
      ],
      goals: [],
    }),
  },
  {
    id: 'below-business-breakeven',
    when: ({ everSold, weekly }) => everSold && weekly && !weekly.businessProfitable,
    say: ({ lines, weekly }) => {
      const gap = Math.max(
        1,
        Math.ceil(
          (lines.survivalFixedCost - weekly.monthlyPace * lines.unitMargin) /
            lines.unitMargin,
        ),
      );
      return {
        reply:
          `照這週的速度換算，一個月約 ${weekly.monthlyPace} 個、毛利 ${weekly.monthlyPace * lines.unitMargin} 元，` +
          `還蓋不過事業每月 ${lines.survivalFixedCost} 元的固定支出。` +
          `缺口大概是每月 ${gap} 個。這種時候有兩條路：多賣 ${gap} 個，或是把固定支出砍掉一些——` +
          '前期砍支出通常比衝單量快，而且是你自己就能決定的事。',
        tasks: [
          { label: '列出目前所有事業固定支出，圈出這個月可以先停掉的', minutes: 15 },
          { label: `想一個這週多賣 ${Math.max(1, Math.ceil(gap / 4))} 個的具體做法，寫下來`, minutes: 15 },
        ],
        goals: [],
      };
    },
  },
  {
    id: 'profitable-climbing',
    when: ({ everSold, weekly }) => everSold && weekly?.businessProfitable,
    say: ({ lines, weekly }) => {
      const weeklyGap = Math.ceil(weekly.unitsToReplacementPace / 4.33);
      const done = weekly.unitsToReplacementPace === 0;
      return {
        reply: done
          ? `目前速度已經到達${lines.salaryCoversLiving ? '離職門檻' : '生死線'}（每月 ${lines.replacementUnits} 個）。` +
            '接下來的重點不是再衝量，是讓這個數字在你少花點力氣的情況下也守得住——' +
            '把重複的事寫成流程，比多接一單值錢。'
          : `事業本身已經是賺的（月淨 +${weekly.monthlyNet} 元），這是很多人卡半年到不了的地方。` +
            `目前速度是${lines.salaryCoversLiving ? '離職門檻' : '生死線'}的 ${weekly.replacementPercent}%，` +
            `要追上還差每月 ${weekly.unitsToReplacementPace} 個，換算成每週大約 ${weeklyGap} 個。` +
            '從這裡開始，穩定的來客管道比單次的爆量重要。',
        tasks: done
          ? [{ label: '挑 1 個你每週都在重複做的事，寫成別人能照做的步驟', minutes: 20 }]
          : [
              { label: `寫下這週要從哪裡多找到 ${weeklyGap} 個客人，越具體越好`, minutes: 15 },
              { label: '檢查目前客人都從哪來，把最有效的那條路加倍投入', minutes: 15 },
            ],
        goals: [],
      };
    },
  },
];

/** Secondary notes appended after the main diagnosis, at most one. */
const NOTES = [
  {
    id: 'burnout',
    when: ({ avgRecentHours }) => avgRecentHours > 15,
    say: ({ avgRecentHours }) =>
      `另外提醒一件事：你最近平均每週投入 ${Math.round(avgRecentHours)} 小時。` +
      '在職創業是長跑，撐不過三個月的節奏不算節奏——可持續比衝刺重要。',
  },
  {
    id: 'streak-broken',
    when: ({ streak, tasksDone }) => streak === 0 && tasksDone >= 3,
    say: () =>
      '另外，你的每日任務連續紀錄斷了。不用補回來，今天做一件最小的就重新開始——' +
      '重點從來不是不中斷，是中斷之後多快回來。',
  },
];

/**
 * The main advisor reply when there is no API key: a diagnosis built
 * from this user's own numbers rather than a placeholder.
 */
export function localAdvice(context) {
  const signals = readSignals(context);
  const input = { ...context, ...signals };
  // What the user typed comes first: a data diagnosis that ignores the
  // belief they just stated reads as not having been listened to.
  const challenged = matchAntiPattern(context.question);

  const diagnosis = DIAGNOSES.find((rule) => rule.when(input));
  const base = diagnosis ? diagnosis.say(input) : {
    reply: '目前的數字還看不出明顯問題，繼續照階段目標推進就好。',
    tasks: [],
    goals: [],
  };

  const note = NOTES.find((rule) => rule.when(input));

  const reply = [
    challenged ? `先說你提到的那件事:${challenged.respond}` : null,
    base.reply,
    note ? note.say(input) : null,
  ]
    .filter(Boolean)
    .join('\n\n');

  return {
    ...empty,
    ...base,
    reply,
    mock: true,
    local: true,
    ruleId: diagnosis?.id ?? 'none',
    antiPatternId: challenged?.id ?? null,
  };
}
