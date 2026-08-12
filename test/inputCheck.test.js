import test from 'node:test';
import assert from 'node:assert/strict';

import { checkAdvisorQuestion, REASONS } from '../src/models/inputCheck.js';

test('real questions always get through', () => {
  const real = [
    '我不知道怎麼開口報價',
    '這週都沒人下單,下一步該做什麼?',
    '要不要漲價?',
    '我一直卡在找客人',
    '第一版該做到什麼程度',
    'chatbot 這種東西適合我嗎',
    'shipping 成本要怎麼算進去',
    '測試市場需要多久',
    '哈囉,我想問客源的問題',
    '123 個客人算多嗎',
  ];

  for (const question of real) {
    const result = checkAdvisorQuestion(question);
    assert.equal(result.ok, true, `wrongly rejected: ${question}`);
  }
});

test('substrings inside real words are never matched', () => {
  // The exact failure mode this filter exists to avoid: "chatbot"
  // contains "chat", "shipping" contains "pi", "測試市場" contains "測試".
  for (const question of ['chatbot 要怎麼定價', 'shipping 費用怎麼收', '測試市場的方法']) {
    assert.equal(checkAdvisorQuestion(question).ok, true, question);
  }
});

test('too short to be a question', () => {
  for (const junk of ['', '  ', 'a', '嗯', '好喔']) {
    const result = checkAdvisorQuestion(junk);
    assert.equal(result.ok, false, junk);
    assert.equal(result.reason, REASONS.TOO_SHORT);
  }
});

test('placeholder input is caught only when it is the whole input', () => {
  for (const junk of ['test', 'TEST', '測試', 'asdf', '???', '哈哈哈', '隨便', '不知道', 'hello']) {
    const result = checkAdvisorQuestion(junk);
    assert.equal(result.ok, false, junk);
    assert.equal(result.reason, REASONS.PLACEHOLDER);
  }
});

test('digits alone and mashed keys are caught', () => {
  assert.equal(checkAdvisorQuestion('12345').reason, REASONS.DIGITS_ONLY);
  assert.equal(checkAdvisorQuestion('啊啊啊啊啊').reason, REASONS.REPEATED_CHAR);
  assert.equal(checkAdvisorQuestion('aaaaaa').reason, REASONS.REPEATED_CHAR);
});

test('every rejection explains what to type instead', () => {
  for (const junk of ['test', '12345', '啊啊啊啊', 'a']) {
    const result = checkAdvisorQuestion(junk);
    assert.equal(result.ok, false);
    assert.ok(result.message.length > 10, `${junk} needs actionable guidance`);
  }
});

test('null and undefined do not throw', () => {
  assert.equal(checkAdvisorQuestion(null).ok, false);
  assert.equal(checkAdvisorQuestion(undefined).ok, false);
});
