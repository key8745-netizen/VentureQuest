// Advisor — the AI consultant layer. Pure helpers (prompt building,
// reply parsing, cost guardrails) are testable in Node; the network
// call runs in the browser with the user's own API key.
//
// Cost guardrails, all hard-coded:
//   - model tier depends on the stage (cheap early, strong late)
//   - one reply is capped at MAX_REPLY_TOKENS
//   - at most DAILY_CALL_LIMIT calls per day
//   - without an API key the app falls back to a canned mock reply

import Anthropic from '@anthropic-ai/sdk';
import {
  isGoalComplete,
  calculatePlanProgress,
  getActiveStage,
} from './stagePlanner.js';
import {
  calculateSurvivalLine,
  calculateTargetLine,
} from './financialGuardrails.js';
import { computeStreak } from './momentum.js';

export const DAILY_CALL_LIMIT = 20;
export const MAX_REPLY_TOKENS = 1024;
// Persisted turns per conversation, and how many of them are re-sent
// as context on each call (token guardrail).
export const HISTORY_KEEP_LIMIT = 10;
export const HISTORY_SEND_LIMIT = 6;

// Two providers, same tiering idea: cheap early, strong late. The
// provider is detected from the key prefix, so users just paste
// whichever key they have (Google AI Studio keys have a free tier).
const STAGE_MODELS = {
  anthropic: {
    explore: 'claude-haiku-4-5',
    prepare: 'claude-haiku-4-5',
    operate: 'claude-sonnet-5',
    grow: 'claude-sonnet-5',
    scale: 'claude-opus-4-8',
    fallback: 'claude-haiku-4-5',
  },
  gemini: {
    explore: 'gemini-2.5-flash-lite',
    prepare: 'gemini-2.5-flash-lite',
    operate: 'gemini-2.5-flash',
    grow: 'gemini-2.5-flash',
    scale: 'gemini-2.5-pro',
    fallback: 'gemini-2.5-flash-lite',
  },
};

/**
 * API keys are plain printable ASCII. Copy-paste often smuggles in
 * zero-width spaces, full-width characters, or surrounding text — which
 * both breaks prefix detection and makes the browser reject the header
 * ("String contains non ISO-8859-1 code point"). Strip everything else.
 */
export function sanitizeApiKey(raw) {
  return String(raw ?? '').replace(/[^\x21-\x7E]/g, '');
}

export function detectProvider(apiKey) {
  return typeof apiKey === 'string' && apiKey.startsWith('AIza')
    ? 'gemini'
    : 'anthropic';
}

export function pickModelForStage(stageId, apiKey) {
  const tiers = STAGE_MODELS[detectProvider(apiKey)];
  return tiers[stageId] ?? tiers.fallback;
}

// financial (optional) carries the live numbers from the financial
// panel — they win over the wizard-time snapshot in the profile.
function describeProfile(profile, financial) {
  const idea = profile.idea || '還在探索方向';
  const fixed = financial?.monthlyFixedCost ?? profile.monthlyFixedCost;
  const price = financial?.unitPrice ?? profile.unitPrice;
  const cost = financial?.unitCost ?? profile.unitCost;
  return [
    `事業方向:「${idea}」。`,
    `每月固定成本 ${fixed} 元、單位售價 ${price} 元、單位變動成本 ${cost} 元。`,
    `每週可投入 ${profile.weeklyHours} 小時,目標月收入 ${profile.targetMonthlyIncome} 元。`,
  ].join('\n');
}

/** One line per goal so the advisor never repeats finished work. */
function describeGoalStatus(stage, completedGoalIds, breakdowns) {
  return stage.goals
    .map((goal) => {
      const children = breakdowns[goal.id] ?? [];
      if (children.length > 0) {
        const doneCount = children.filter((child) =>
          isGoalComplete({ goalId: child.id, completedGoalIds, breakdowns }),
        ).length;
        return `${goal.label}(已拆成 ${children.length} 個子項目,完成 ${doneCount} 個)`;
      }
      const done = isGoalComplete({ goalId: goal.id, completedGoalIds, breakdowns });
      return `${goal.label}(${done ? '已完成' : '未完成'})`;
    })
    .join(';');
}

const EMPLOYMENT_LABELS = {
  employed: '還在上班(全職)',
  flexible: '兼職/工時彈性',
  left: '已離開正職',
};

/**
 * The user's complete, always-current state file — everything the
 * advisor should read before judging: direction, live unit economics,
 * journey progress, execution momentum, and actual weekly numbers.
 * Prepended to the stage and goal prompts (the diagnosis prompt keeps
 * its own review-focused structure).
 */
export function buildDossier({
  profile,
  financial,
  plan,
  completedGoalIds,
  breakdowns = {},
  taskLog = {},
  weeklyReviews = [],
  today = todayKey(),
}) {
  const survival = calculateSurvivalLine(financial);
  const target = calculateTargetLine({
    ...financial,
    targetMonthlyIncome: profile.targetMonthlyIncome,
  });
  const progress = calculatePlanProgress({ plan, completedGoalIds, breakdowns });
  const active = getActiveStage({ plan, completedGoalIds, breakdowns });
  const doneStages = plan.stages
    .filter(
      (stage) =>
        stage.id !== active?.id &&
        stage.goals.every((goal) =>
          isGoalComplete({ goalId: goal.id, completedGoalIds, breakdowns }),
        ),
    )
    .map((stage) => stage.label);
  const { streak, doneToday } = computeStreak(taskLog, today);
  const totalTasksDone = Object.values(taskLog).reduce((sum, n) => sum + n, 0);
  const recentReviews = weeklyReviews
    .slice(-4)
    .reverse()
    .map(
      (review) =>
        `${review.week}:投入 ${review.hours} 小時、賣出 ${review.units} 個` +
        (review.note ? `,心得:${review.note}` : ''),
    );

  return [
    '【使用者完整狀態】',
    `事業方向:「${profile.idea || '還在探索方向'}」;工作狀態:${EMPLOYMENT_LABELS[profile.employment] ?? profile.employment};每週可投入 ${profile.weeklyHours} 小時;目標月收入 ${profile.targetMonthlyIncome} 元。`,
    `財務:每月固定成本 ${financial.monthlyFixedCost} 元、單位售價 ${financial.unitPrice} 元、單位變動成本 ${financial.unitCost} 元;` +
      (survival.viable
        ? `生死線每月 ${survival.unitsToSurvive} 個、目標線每月 ${target.unitsToTarget} 個。`
        : '目前單位經濟是虧損的(賣一個賠一個),需優先修正。'),
    `旅程:整體過關條件達成 ${progress.completedCount}/${progress.totalCount};已完成階段:${doneStages.length > 0 ? doneStages.join('、') : '尚無'};目前階段:「${active ? active.label : '全部完成'}」。`,
    `執行力:累計完成 ${totalTasksDone} 件每日任務;連續 ${streak} 天${doneToday ? '(今天已完成)' : '(今天還沒完成)'}。`,
    '實際營運(每週回顧,新到舊):',
    recentReviews.length > 0 ? recentReviews.join('\n') : '(還沒有每週回顧紀錄)',
  ].join('\n');
}

/** System prompt for the dashboard stage advisor (may suggest tasks/goals). */
export function buildStagePrompt({
  profile,
  stage,
  financial,
  completedGoalIds = [],
  breakdowns = {},
  dossier,
}) {
  return [
    '你是 VentureQuest 的創業顧問,幫還在上班的新手推進副業。先讀使用者的完整狀態,依據實際數據給建議。',
    dossier ?? describeProfile(profile, financial),
    `使用者目前在第「${stage.label}」階段(${stage.subtitle})。`,
    `這階段的過關條件與目前狀態:${describeGoalStatus(stage, completedGoalIds, breakdowns)}。`,
    '不要重複建議已完成的事,優先幫使用者推進未完成的條件。',
    '',
    '回答規則:',
    '1. 繁體中文,直接務實,回覆不超過 200 字。',
    '2. 針對使用者的產業給具體建議。這是 0 成本純前端 prototype,不要建議做後端、金流、登入。',
    '3. 一律輸出單一合法 JSON 物件,不要 markdown code fence,格式:',
    '{"reply": "你的回覆", "tasks": [{"label": "5-30分鐘的小任務", "minutes": 15}], "goals": [{"label": "可勾選的階段目標"}]}',
    '4. tasks 最多 3 項且每項 5-30 分鐘;goals 最多 2 項;沒有建議就省略該欄位。',
  ].join('\n');
}

/**
 * System prompt for breaking down one stage goal (or one of its
 * sub-items) the user does not know how to achieve.
 */
export function buildGoalPrompt({
  profile,
  stage,
  goal,
  pathLabels = [],
  financial,
  dossier,
}) {
  const path = pathLabels.length > 0 ? `(它是「${pathLabels.join(' > ')}」的子項目)` : '';
  return [
    '你是 VentureQuest 的創業顧問,幫還在上班的新手推進副業。先讀使用者的完整狀態,依據實際數據給建議。',
    dossier ?? describeProfile(profile, financial),
    `使用者目前在第「${stage.label}」階段(${stage.subtitle})。`,
    `使用者不知道怎麼達成這個目標:「${goal.label}」${path}。`,
    '',
    '回答規則:',
    '1. 繁體中文,直接務實,先用不超過 150 字解釋這個目標是什麼、為什麼重要、大概怎麼達成。',
    '2. 針對使用者的產業給具體內容(例如證照名稱、實際管道)。',
    '3. 如果這個目標可以拆成更小的檢查項目,輸出 steps:每項是一個可以獨立完成、可以打勾的小目標,依順序排列,最多 5 項。',
    '4. 如果達成這個目標需要使用者還沒具備的技能或資格(例如證照),輸出 tasks:每項是 5-30 分鐘、可以每天做的練習或訓練任務,會進入使用者的每日任務清單,最多 3 項。',
    '5. 一律輸出單一合法 JSON 物件,不要 markdown code fence,格式:',
    '{"reply": "你的解釋", "steps": [{"label": "可勾選的子項目"}], "tasks": [{"label": "訓練任務", "minutes": 15}]}',
    '6. 目標已經夠小就省略 steps;不需要訓練就省略 tasks。',
  ].join('\n');
}

/**
 * System prompt for the weekly diagnosis: the navigator role. Sees the
 * stage goal status and the user's actual weekly numbers, and patiently
 * plots a course from wherever they are back toward the stage goal.
 */
export function buildDiagnosisPrompt({
  profile,
  stage,
  financial,
  completedGoalIds = [],
  breakdowns = {},
  weeklyNeed,
  reviews = [],
  dossier,
}) {
  const recent = reviews
    .slice(-4)
    .reverse()
    .map(
      (review) =>
        `${review.week}:投入 ${review.hours} 小時、賣出 ${review.units} 個` +
        (review.note ? `,心得:${review.note}` : ''),
    )
    .join('\n');

  // The dossier already carries profile, goal statuses, and the recent
  // reviews — only the stage focus and weekly quota are added on top.
  const context = dossier
    ? [
        dossier,
        `目前階段:「${stage.label}」(${stage.subtitle})。`,
        weeklyNeed != null ? `照生死線換算,每週至少要賣約 ${weeklyNeed} 個單位。` : '',
      ]
    : [
        describeProfile(profile, financial),
        `目前階段:「${stage.label}」(${stage.subtitle})。`,
        `階段過關條件與狀態:${describeGoalStatus(stage, completedGoalIds, breakdowns)}。`,
        weeklyNeed != null ? `照生死線換算,每週至少要賣約 ${weeklyNeed} 個單位。` : '',
        '最近的每週回顧(新到舊):',
        recent || '(還沒有紀錄)',
      ];

  return [
    '你是 VentureQuest 的創業顧問,任務是「導航」:無論使用者這週表現如何,都要以完成目前階段目標、最終走向大目標為前提,規劃接下來的路。',
    ...context,
    '',
    '回答規則:',
    '1. 繁體中文,不超過 250 字:先診斷這週有沒有偏離階段目標、偏在哪;再給下週 1-2 個最重要的重點。',
    '2. 語氣有耐心、不責備。就算連續落後或走偏,也不要叫使用者重來,而是從現在的位置設計走回階段目標的最短路徑。',
    '3. 需要修正方向時,可建議 tasks(每項 5-30 分鐘,最多 3 項,會進每日任務)或 goals(最多 2 項,會成為可勾選的過關條件)。',
    '4. 一律輸出單一合法 JSON 物件,不要 markdown code fence,格式:',
    '{"reply": "診斷與下週重點", "tasks": [{"label": "...", "minutes": 15}], "goals": [{"label": "..."}]}',
  ]
    .filter(Boolean)
    .join('\n');
}

/** System prompt for the wizard question helper (reply + fill-in answer). */
export function buildQuestionPrompt({ question, hint, type, answers }) {
  const known = Object.entries(answers ?? {})
    .filter(([, value]) => value !== '' && value !== undefined)
    .map(([key, value]) => `${key}: ${value}`)
    .join('、');
  const answerRule =
    type === 'number'
      ? 'answer 必須是純數字(不要單位、不要千分位),是你建議直接填入這一題的值。'
      : 'answer 是一句可以直接填入這一題的話,不超過 40 字。';

  return [
    '你是 VentureQuest 的創業顧問,正在幫一位還在上班的新手回答建立計畫時的問題。',
    `目前的問題:「${question}」${hint ? `(提示:${hint})` : ''}`,
    known ? `使用者已回答:${known}。` : '使用者還沒回答其他問題。',
    '',
    '回答規則:',
    '1. 繁體中文,直接務實,幫使用者想清楚怎麼填這一題,不超過 150 字。',
    '2. 一律輸出單一合法 JSON 物件,不要 markdown code fence,格式:',
    '{"reply": "你的回覆", "answer": 建議填入的答案}',
    `3. ${answerRule}`,
    '4. 資訊不足、沒把握時省略 answer,先在 reply 裡反問使用者。',
  ].join('\n');
}

/**
 * Parses the advisor reply. Accepts either the JSON contract or plain
 * text; clamps task minutes to 5-30 and limits suggestion counts so a
 * misbehaving reply cannot flood the plan.
 */
export function parseAdvisorReply(text) {
  const fallback = { reply: text.trim(), tasks: [], goals: [], steps: [], answer: null };
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return fallback;
  }
  if (typeof parsed !== 'object' || parsed === null || typeof parsed.reply !== 'string') {
    return fallback;
  }

  const tasks = (Array.isArray(parsed.tasks) ? parsed.tasks : [])
    .filter((task) => task && typeof task.label === 'string')
    .slice(0, 3)
    .map((task) => ({
      label: task.label,
      minutes: Math.min(30, Math.max(5, Number(task.minutes) || 15)),
    }));

  const goals = (Array.isArray(parsed.goals) ? parsed.goals : [])
    .filter((goal) => goal && typeof goal.label === 'string')
    .slice(0, 2)
    .map((goal) => ({ label: goal.label }));

  const steps = (Array.isArray(parsed.steps) ? parsed.steps : [])
    .filter((step) => step && typeof step.label === 'string')
    .slice(0, 5)
    .map((step) => ({ label: step.label }));

  let answer = null;
  if (
    typeof parsed.answer === 'number' &&
    Number.isFinite(parsed.answer) &&
    parsed.answer >= 0
  ) {
    answer = parsed.answer;
  } else if (typeof parsed.answer === 'string' && parsed.answer.trim()) {
    answer = parsed.answer.trim().slice(0, 80);
  }

  return { reply: parsed.reply, tasks, goals, steps, answer };
}

/** usage: { date: 'YYYY-MM-DD', count: number } */
export function canAskToday(usage, today) {
  if (!usage || usage.date !== today) return true;
  return usage.count < DAILY_CALL_LIMIT;
}

export function recordCall(usage, today) {
  if (!usage || usage.date !== today) {
    return { date: today, count: 1 };
  }
  return { date: today, count: usage.count + 1 };
}

/** Trims a stored conversation to the most recent turns. */
export function capHistory(turns, maxTurns = HISTORY_KEEP_LIMIT) {
  return turns.length <= maxTurns ? turns : turns.slice(-maxTurns);
}

/**
 * Builds the messages array for one call: the most recent real turns
 * (mock turns carry no API context) followed by the new question.
 */
export function buildMessages(history, question, limit = HISTORY_SEND_LIMIT) {
  const recent = history
    .filter((turn) => !turn.mock && typeof turn.rawReply === 'string')
    .slice(-limit);
  return [
    ...recent.flatMap((turn) => [
      { role: 'user', content: turn.question },
      { role: 'assistant', content: turn.rawReply },
    ]),
    { role: 'user', content: question },
  ];
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

const MOCK_REPLY = {
  reply:
    '(示範回覆)還沒設定 API key,所以這是寫死的範例。加入你自己的 Anthropic API key 後,顧問會根據你的產業給具體建議。下面是一個示範任務,你可以按「加入」試試整個流程。',
  tasks: [{ label: '(示範)花 15 分鐘查 3 個競爭對手的價格', minutes: 15 }],
  goals: [],
  steps: [],
};

export const MOCK_GOAL_REPLY = {
  reply:
    '(示範回覆)還沒設定 API key。設定後,顧問會解釋這個目標怎麼達成,拆成你能做到的子項目,需要練功的還會給你每日訓練任務。下面是示範。',
  tasks: [{ label: '(示範)每天花 15 分鐘練習這個目標需要的技能', minutes: 15 }],
  goals: [],
  steps: [
    { label: '(示範)查清楚這個目標需要什麼條件' },
    { label: '(示範)把第一個條件排進這週的行程' },
  ],
};

/** Turns SDK/API errors into plain-language messages for the chat UI. */
export function describeAdvisorError(error) {
  const status = error?.status;
  const message = String(error?.message ?? error ?? '');

  if (message.includes('credit balance is too low')) {
    return 'Anthropic 帳戶餘額不足:API 用量和 Claude 訂閱是分開計費的。到 console.anthropic.com 的 Plans & Billing 儲值(最低 5 美元)後就能用。或者改貼 Google AI Studio 的 Gemini key(AIza 開頭,有免費額度)。';
  }
  if (message.includes('ISO-8859-1')) {
    return 'API key 夾帶了看不見的特殊字元(通常是複製時混入)。請按「清除 key」後,回到官方頁面重新複製貼上。';
  }
  if (status === 401 || message.includes('API key not valid')) {
    return 'API key 無效,請確認後重新輸入。';
  }
  if (status === 429) {
    return '請求太頻繁或今日免費額度用完(429),休息一下或明天再試。';
  }
  if (status === 529 || (typeof status === 'number' && status >= 500)) {
    return 'Anthropic 服務暫時忙碌,稍後再試。';
  }
  return `發生錯誤:${message}`;
}

export const MOCK_DIAGNOSIS_REPLY = {
  reply:
    '(示範回覆)還沒設定 API key。設定後,顧問會根據你這週的實際數字診斷有沒有走偏,並耐心規劃下週怎麼走回階段目標。下面是示範建議。',
  tasks: [{ label: '(示範)挑一個賣最好的品項,下週主打它', minutes: 15 }],
  goals: [],
  steps: [],
};

/** Request body for Gemini's generateContent (roles: assistant → model). */
export function buildGeminiPayload(systemPrompt, messages) {
  return {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: messages.map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    })),
    generationConfig: { maxOutputTokens: MAX_REPLY_TOKENS },
  };
}

async function askGemini({ apiKey, model, systemPrompt, messages }) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildGeminiPayload(systemPrompt, messages)),
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error?.message ?? `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return (data.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? '')
    .join('');
}

/**
 * Sends one question to the advisor. Returns { reply, tasks, goals, steps }.
 * Without an API key, returns the hard-coded mock so the UX still works.
 */
export async function askAdvisor({
  apiKey,
  model,
  systemPrompt,
  history,
  question,
  mockReply = MOCK_REPLY,
}) {
  if (!apiKey) {
    return { ...mockReply, mock: true };
  }

  const messages = buildMessages(history, question);

  let text;
  if (detectProvider(apiKey) === 'gemini') {
    text = await askGemini({ apiKey, model, systemPrompt, messages });
  } else {
    const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
    const response = await client.messages.create({
      model,
      max_tokens: MAX_REPLY_TOKENS,
      system: systemPrompt,
      messages,
    });
    text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');
  }

  return { ...parseAdvisorReply(text), rawReply: text };
}
