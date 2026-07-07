import test from 'node:test';
import assert from 'node:assert/strict';

import {
  pickModelForStage,
  buildStagePrompt,
  buildQuestionPrompt,
  buildGoalPrompt,
  parseAdvisorReply,
  canAskToday,
  recordCall,
  capHistory,
  buildMessages,
  DAILY_CALL_LIMIT,
  HISTORY_KEEP_LIMIT,
  HISTORY_SEND_LIMIT,
} from '../src/models/advisor.js';

const profile = {
  idea: '便當店',
  exploring: false,
  employment: 'employed',
  monthlyFixedCost: 30000,
  unitPrice: 100,
  unitCost: 55,
  weeklyHours: 8,
  targetMonthlyIncome: 30000,
};

const stage = {
  id: 'explore',
  label: '探索驗證',
  subtitle: '還在上班:確認有人願意付錢',
  goals: [{ id: 'explore-g1', label: '能用一句話說出:誰付錢、買什麼' }],
  tasks: [{ id: 'explore-1', label: 'x', minutes: 10 }],
};

test('picks a cheaper model for early stages and stronger ones later', () => {
  assert.equal(pickModelForStage('explore'), 'claude-haiku-4-5');
  assert.equal(pickModelForStage('prepare'), 'claude-haiku-4-5');
  assert.equal(pickModelForStage('operate'), 'claude-sonnet-5');
  assert.equal(pickModelForStage('grow'), 'claude-sonnet-5');
  assert.equal(pickModelForStage('scale'), 'claude-opus-4-8');
  // Unknown stages fall back to the cheapest model.
  assert.equal(pickModelForStage('nope'), 'claude-haiku-4-5');
});

test('stage prompt carries the user context and the JSON contract', () => {
  const prompt = buildStagePrompt({ profile, stage });
  assert.ok(prompt.includes('便當店'));
  assert.ok(prompt.includes('探索驗證'));
  assert.ok(prompt.includes('30000'));
  assert.ok(prompt.includes('"tasks"'));
});

test('question prompt includes the wizard question and the answer contract', () => {
  const prompt = buildQuestionPrompt({
    question: '賣一個收多少錢?',
    hint: '一份餐、一小時服務',
    type: 'number',
    answers: { idea: '便當店' },
  });
  assert.ok(prompt.includes('賣一個收多少錢'));
  assert.ok(prompt.includes('便當店'));
  assert.ok(prompt.includes('"answer"'), 'must ask for a fill-in answer');
  assert.ok(prompt.includes('數字'), 'number questions ask for a numeric answer');
  assert.ok(!prompt.includes('"tasks"'));
});

test('parses a suggested answer and rejects junk values', () => {
  const numeric = parseAdvisorReply(JSON.stringify({ reply: 'ok', answer: 35000 }));
  assert.equal(numeric.answer, 35000);

  const text = parseAdvisorReply(JSON.stringify({ reply: 'ok', answer: '  賣給上班族的健康便當  ' }));
  assert.equal(text.answer, '賣給上班族的健康便當');

  const negative = parseAdvisorReply(JSON.stringify({ reply: 'ok', answer: -5 }));
  assert.equal(negative.answer, null);

  const junk = parseAdvisorReply(JSON.stringify({ reply: 'ok', answer: { nested: true } }));
  assert.equal(junk.answer, null);

  const none = parseAdvisorReply(JSON.stringify({ reply: 'ok' }));
  assert.equal(none.answer, null);
});

test('goal prompt carries the goal, its parent path and the steps contract', () => {
  const prompt = buildGoalPrompt({
    profile,
    stage,
    goal: { id: 'bd-x', label: '取得中餐丙級證照' },
    pathLabels: ['開店要具備的技能'],
  });
  assert.ok(prompt.includes('取得中餐丙級證照'));
  assert.ok(prompt.includes('開店要具備的技能'));
  assert.ok(prompt.includes('便當店'));
  assert.ok(prompt.includes('"steps"'));
});

test('parses steps suggestions and caps them at five', () => {
  const parsed = parseAdvisorReply(
    JSON.stringify({
      reply: '拆成這幾步',
      steps: [
        { label: '查簡章' },
        { label: '報名課程' },
        { label: '練習術科' },
        { label: '考筆試' },
        { label: '考術科' },
        { label: '第六步該被丟掉' },
      ],
    }),
  );
  assert.equal(parsed.steps.length, 5);
  assert.equal(parsed.steps[0].label, '查簡章');
});

test('parses a well-formed advisor reply and clamps suggestions', () => {
  const parsed = parseAdvisorReply(
    JSON.stringify({
      reply: '先做這些',
      tasks: [
        { label: '查 3 間店的價格', minutes: 15 },
        { label: '太長的任務', minutes: 90 },
        { label: '太短的任務', minutes: 1 },
        { label: '第四個應該被丟掉', minutes: 10 },
      ],
      goals: [{ label: '拿到 1 筆訂單' }, { label: 'b' }, { label: '第三個被丟掉' }],
    }),
  );

  assert.equal(parsed.reply, '先做這些');
  assert.equal(parsed.tasks.length, 3);
  assert.equal(parsed.tasks[1].minutes, 30, 'minutes clamp down to 30');
  assert.equal(parsed.tasks[2].minutes, 5, 'minutes clamp up to 5');
  assert.equal(parsed.goals.length, 2);
});

test('falls back to plain text when the reply is not JSON', () => {
  const parsed = parseAdvisorReply('直接給你一段建議,不是 JSON');
  assert.equal(parsed.reply, '直接給你一段建議,不是 JSON');
  assert.deepEqual(parsed.tasks, []);
  assert.deepEqual(parsed.goals, []);
  assert.deepEqual(parsed.steps, []);
});

test('strips markdown fences before parsing', () => {
  const parsed = parseAdvisorReply('```json\n{"reply":"ok"}\n```');
  assert.equal(parsed.reply, 'ok');
});

test('daily guardrail blocks calls past the limit and resets next day', () => {
  let usage = { date: '2026-07-07', count: 0 };
  assert.equal(canAskToday(usage, '2026-07-07'), true);

  for (let i = 0; i < DAILY_CALL_LIMIT; i += 1) {
    usage = recordCall(usage, '2026-07-07');
  }
  assert.equal(usage.count, DAILY_CALL_LIMIT);
  assert.equal(canAskToday(usage, '2026-07-07'), false);

  // New day resets the counter.
  assert.equal(canAskToday(usage, '2026-07-08'), true);
  usage = recordCall(usage, '2026-07-08');
  assert.equal(usage.count, 1);
});

test('capHistory keeps only the most recent turns', () => {
  const turns = Array.from({ length: HISTORY_KEEP_LIMIT + 4 }, (_, i) => ({
    question: `q${i}`,
  }));
  const capped = capHistory(turns);
  assert.equal(capped.length, HISTORY_KEEP_LIMIT);
  assert.equal(capped[0].question, 'q4', 'oldest turns are dropped first');

  // Short histories come back unchanged (same reference is fine).
  const short = [{ question: 'only' }];
  assert.deepEqual(capHistory(short), short);
});

test('buildMessages skips mock turns, limits context and ends with the question', () => {
  const history = [
    { question: 'mock-q', rawReply: undefined, mock: true, reply: 'x' },
    ...Array.from({ length: HISTORY_SEND_LIMIT + 3 }, (_, i) => ({
      question: `q${i}`,
      rawReply: `a${i}`,
    })),
  ];
  const messages = buildMessages(history, '新問題');

  // send-limit turns * 2 roles + the new question
  assert.equal(messages.length, HISTORY_SEND_LIMIT * 2 + 1);
  assert.equal(messages[0].role, 'user');
  assert.equal(messages[0].content, 'q3', 'only the most recent turns are sent');
  assert.equal(messages.at(-1).role, 'user');
  assert.equal(messages.at(-1).content, '新問題');
  assert.ok(!messages.some((m) => m.content === 'mock-q'), 'mock turns are excluded');
});
