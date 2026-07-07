import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getWeekLabel,
  upsertReview,
  REVIEW_KEEP_LIMIT,
} from '../src/models/weeklyReview.js';

test('week labels follow ISO weeks', () => {
  assert.equal(getWeekLabel(new Date('2026-01-01T12:00:00')), '2026-W01');
  // Monday before New Year still belongs to 2026-W01.
  assert.equal(getWeekLabel(new Date('2025-12-29T12:00:00')), '2026-W01');
  assert.equal(getWeekLabel(new Date('2026-07-07T12:00:00')), '2026-W28');
});

test('upsertReview replaces the same week and caps the history', () => {
  let reviews = [];
  reviews = upsertReview(reviews, { week: '2026-W01', hours: 5, units: 3, note: '' });
  reviews = upsertReview(reviews, { week: '2026-W01', hours: 8, units: 4, note: '改' });
  assert.equal(reviews.length, 1);
  assert.equal(reviews[0].hours, 8);

  for (let i = 2; i <= REVIEW_KEEP_LIMIT + 3; i += 1) {
    reviews = upsertReview(reviews, {
      week: `2026-W${String(i).padStart(2, '0')}`,
      hours: i,
      units: i,
      note: '',
    });
  }
  assert.equal(reviews.length, REVIEW_KEEP_LIMIT);
  assert.equal(reviews[0].week, '2026-W04', 'oldest weeks drop off');
});
