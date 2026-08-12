import test from 'node:test';
import assert from 'node:assert/strict';

import {
  matchAntiPattern,
  ANTI_PATTERNS,
  ANTI_PATTERN_INSTRUCTIONS,
} from '../src/models/antiPatterns.js';

test('every anti-pattern carries a belief, triggers and a reply', () => {
  const ids = new Set();
  for (const pattern of ANTI_PATTERNS) {
    assert.ok(pattern.belief.length > 0, pattern.id);
    assert.ok(pattern.phrases.length > 0, pattern.id);
    assert.ok(pattern.respond.length > 30, `${pattern.id} needs a real answer`);
    assert.ok(!ids.has(pattern.id), `duplicate id ${pattern.id}`);
    ids.add(pattern.id);
    // Single characters would fire on almost anything.
    for (const phrase of pattern.phrases) {
      assert.ok(phrase.length >= 3, `${pattern.id}: "${phrase}" is too short to be safe`);
    }
  }
});

test('each belief is recognised from how someone would actually type it', () => {
  const cases = [
    ['我覺得這個大家都需要啊', 'everyone-needs-it'],
    ['市面上還沒有人做這個', 'no-competition'],
    ['我想等我做好一點再賣', 'not-ready-yet'],
    ['朋友都說很棒,所以我想開始了', 'friends-said-good'],
    ['是不是應該先免費衝人數?', 'free-first'],
    ['我想賣便宜一點搶客人', 'compete-on-price'],
    ['最近太忙,等我有時間再開始', 'no-time-yet'],
  ];

  for (const [input, expected] of cases) {
    const match = matchAntiPattern(input);
    assert.ok(match, `no match for: ${input}`);
    assert.equal(match.id, expected, input);
  }
});

test('ordinary questions are never challenged', () => {
  const fine = [
    '我一直卡在找客人',
    '要不要漲價?',
    '這週都沒人下單,下一步該做什麼?',
    '第一版該做到什麼程度',
    '怎麼跟客人開口報價',
    '我的成本要怎麼算比較準',
    '有時間的話該先做哪件事',
    '需要準備什麼證照嗎',
    '客人問我為什麼比別人貴,我該怎麼說',
    '免費體驗一次會不會比較容易成交?',
  ];

  for (const question of fine) {
    assert.equal(
      matchAntiPattern(question),
      null,
      `wrongly challenged a reasonable question: ${question}`,
    );
  }
});

test('only the first match fires, so advice never becomes a lecture', () => {
  const match = matchAntiPattern('大家都需要,而且沒有競爭者,我想先免費做大');
  assert.equal(match.id, 'everyone-needs-it');
});

test('empty and non-string input is safe', () => {
  assert.equal(matchAntiPattern(''), null);
  assert.equal(matchAntiPattern(null), null);
  assert.equal(matchAntiPattern(undefined), null);
  assert.equal(matchAntiPattern(12345), null);
});

test('the prompt version lists every belief with its answer', () => {
  for (const pattern of ANTI_PATTERNS) {
    assert.ok(
      ANTI_PATTERN_INSTRUCTIONS.includes(pattern.belief),
      `${pattern.id} missing from the prompt text`,
    );
  }
  assert.match(ANTI_PATTERN_INSTRUCTIONS, /不要說教/);
});
