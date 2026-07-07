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

export const DAILY_CALL_LIMIT = 20;
export const MAX_REPLY_TOKENS = 1024;

const STAGE_MODELS = {
  explore: 'claude-haiku-4-5',
  prepare: 'claude-haiku-4-5',
  operate: 'claude-sonnet-5',
  grow: 'claude-sonnet-5',
  scale: 'claude-opus-4-8',
};

const CHEAPEST_MODEL = 'claude-haiku-4-5';

export function pickModelForStage(stageId) {
  return STAGE_MODELS[stageId] ?? CHEAPEST_MODEL;
}

function describeProfile(profile) {
  const idea = profile.idea || '還在探索方向';
  return [
    `事業方向:「${idea}」。`,
    `每月固定成本 ${profile.monthlyFixedCost} 元、單位售價 ${profile.unitPrice} 元、單位變動成本 ${profile.unitCost} 元。`,
    `每週可投入 ${profile.weeklyHours} 小時,目標月收入 ${profile.targetMonthlyIncome} 元。`,
  ].join('\n');
}

/** System prompt for the dashboard stage advisor (may suggest tasks/goals). */
export function buildStagePrompt({ profile, stage }) {
  return [
    '你是 VentureQuest 的創業顧問,幫還在上班的新手推進副業。',
    describeProfile(profile),
    `使用者目前在第「${stage.label}」階段(${stage.subtitle})。`,
    `這階段的過關條件:${stage.goals.map((goal) => goal.label).join(';')}。`,
    '',
    '回答規則:',
    '1. 繁體中文,直接務實,回覆不超過 200 字。',
    '2. 針對使用者的產業給具體建議。這是 0 成本純前端 prototype,不要建議做後端、金流、登入。',
    '3. 一律輸出單一合法 JSON 物件,不要 markdown code fence,格式:',
    '{"reply": "你的回覆", "tasks": [{"label": "5-30分鐘的小任務", "minutes": 15}], "goals": [{"label": "可勾選的階段目標"}]}',
    '4. tasks 最多 3 項且每項 5-30 分鐘;goals 最多 2 項;沒有建議就省略該欄位。',
  ].join('\n');
}

/** System prompt for the wizard question helper (plain reply only). */
export function buildQuestionPrompt({ question, hint, answers }) {
  const known = Object.entries(answers ?? {})
    .filter(([, value]) => value !== '' && value !== undefined)
    .map(([key, value]) => `${key}: ${value}`)
    .join('、');

  return [
    '你是 VentureQuest 的創業顧問,正在幫一位還在上班的新手回答建立計畫時的問題。',
    `目前的問題:「${question}」${hint ? `(提示:${hint})` : ''}`,
    known ? `使用者已回答:${known}。` : '使用者還沒回答其他問題。',
    '',
    '用繁體中文直接回答,幫助使用者想清楚怎麼填這一題,不超過 150 字。',
    '直接輸出純文字,不要 JSON、不要 markdown。',
  ].join('\n');
}

/**
 * Parses the advisor reply. Accepts either the JSON contract or plain
 * text; clamps task minutes to 5-30 and limits suggestion counts so a
 * misbehaving reply cannot flood the plan.
 */
export function parseAdvisorReply(text) {
  const fallback = { reply: text.trim(), tasks: [], goals: [] };
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

  return { reply: parsed.reply, tasks, goals };
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

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

const MOCK_REPLY = {
  reply:
    '(示範回覆)還沒設定 API key,所以這是寫死的範例。加入你自己的 Anthropic API key 後,顧問會根據你的產業給具體建議。下面是一個示範任務,你可以按「加入」試試整個流程。',
  tasks: [{ label: '(示範)花 15 分鐘查 3 個競爭對手的價格', minutes: 15 }],
  goals: [],
};

/**
 * Sends one question to the advisor. Returns { reply, tasks, goals }.
 * Without an API key, returns the hard-coded mock so the UX still works.
 */
export async function askAdvisor({ apiKey, model, systemPrompt, history, question }) {
  if (!apiKey) {
    return { ...MOCK_REPLY, mock: true };
  }

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const messages = [
    ...history.flatMap((turn) => [
      { role: 'user', content: turn.question },
      { role: 'assistant', content: turn.rawReply },
    ]),
    { role: 'user', content: question },
  ];

  const response = await client.messages.create({
    model,
    max_tokens: MAX_REPLY_TOKENS,
    system: systemPrompt,
    messages,
  });

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');

  return { ...parseAdvisorReply(text), rawReply: text };
}
