import test from 'node:test';
import assert from 'node:assert/strict';

import { bumpTaskLog, computeStreak } from '../src/models/momentum.js';

test('bumpTaskLog counts up and down without going negative', () => {
  let log = {};
  log = bumpTaskLog(log, '2026-07-08', 1);
  log = bumpTaskLog(log, '2026-07-08', 1);
  assert.equal(log['2026-07-08'], 2);

  log = bumpTaskLog(log, '2026-07-08', -1);
  assert.equal(log['2026-07-08'], 1);

  // Down to zero removes the day entirely; further decrements are safe.
  log = bumpTaskLog(log, '2026-07-08', -1);
  assert.equal(log['2026-07-08'], undefined);
  log = bumpTaskLog(log, '2026-07-08', -1);
  assert.equal(log['2026-07-08'], undefined);
});

test('streak counts consecutive days and includes today when done', () => {
  const log = { '2026-07-06': 1, '2026-07-07': 2, '2026-07-08': 1 };
  assert.deepEqual(computeStreak(log, '2026-07-08'), { streak: 3, doneToday: true });
});

test('an unfinished today falls back to the streak through yesterday', () => {
  const log = { '2026-07-06': 1, '2026-07-07': 1 };
  assert.deepEqual(computeStreak(log, '2026-07-08'), { streak: 2, doneToday: false });
});

test('a gap breaks the streak', () => {
  const log = { '2026-07-04': 1, '2026-07-06': 1 };
  assert.deepEqual(computeStreak(log, '2026-07-07'), { streak: 1, doneToday: false });
  assert.deepEqual(computeStreak({}, '2026-07-07'), { streak: 0, doneToday: false });
});
