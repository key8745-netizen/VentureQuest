import React, { useState } from 'react';
import { getWeekLabel, upsertReview } from '../models/weeklyReview.js';
import {
  calculateSurvivalLine,
  suggestAfterWorkPace,
} from '../models/financialGuardrails.js';
import { getCopy } from '../models/terminology.js';

/**
 * Once-a-week honesty ritual: log the hours actually spent and units
 * actually sold, compared against the weekly slice of the survival
 * line. One entry per ISO week; editing the same week overwrites.
 */
export default function WeeklyReview({ mode, financial, reviews, onReviewsChange }) {
  const week = getWeekLabel();
  const current = reviews.find((review) => review.week === week);

  const [hours, setHours] = useState(current ? String(current.hours) : '');
  const [units, setUnits] = useState(current ? String(current.units) : '');
  const [note, setNote] = useState(current?.note ?? '');

  const survival = calculateSurvivalLine(financial);
  // A month is ~4.33 weeks; round up so the weekly bar stays honest.
  const weeklyNeed = survival.viable
    ? Math.ceil(survival.unitsToSurvive / 4.33)
    : null;

  const handleSave = () => {
    onReviewsChange(
      upsertReview(reviews, {
        week,
        hours: Math.max(0, Number(hours) || 0),
        units: Math.max(0, Number(units) || 0),
        note: note.trim(),
      }),
    );
  };

  const pace = current
    ? suggestAfterWorkPace({ weeklyHours: current.hours, weeklyUnits: current.units })
    : null;
  const past = reviews
    .filter((review) => review.week !== week)
    .slice(-3)
    .reverse();

  return (
    <section className="card">
      <h2>{getCopy('weeklyReview', mode)}</h2>
      <p className="muted">
        本週（{week}）
        {weeklyNeed != null && `。照生死線換算，每週至少要賣約 ${weeklyNeed} 個單位。`}
      </p>

      <div className="field-grid">
        <label className="field">
          <span>本週實際投入小時</span>
          <input
            type="number"
            min="0"
            value={hours}
            onChange={(event) => setHours(event.target.value)}
          />
        </label>
        <label className="field">
          <span>本週賣出單位</span>
          <input
            type="number"
            min="0"
            value={units}
            onChange={(event) => setUnits(event.target.value)}
          />
        </label>
      </div>
      <label className="field">
        <span>一句話心得（可留白）</span>
        <input
          type="text"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>

      <div className="wizard-actions">
        <button type="button" className="primary" onClick={handleSave}>
          {current ? '更新這週' : '記下這週'}
        </button>
      </div>

      {current && (
        <div className="verdict verdict-ok">
          <p>
            本週投入 {current.hours} 小時、賣出 {current.units} 個
            {weeklyNeed != null &&
              (current.units >= weeklyNeed
                ? '，超過生死線的週配額 💪'
                : `，離週配額還差 ${weeklyNeed - current.units} 個`)}
            。
          </p>
          {pace?.risk === 'burnout-risk' && (
            <p>這週投入偏多，小心過勞——可持續比衝刺重要。</p>
          )}
        </div>
      )}

      {past.length > 0 && (
        <ul className="review-history">
          {past.map((review) => (
            <li key={review.week} className="muted">
              {review.week}：{review.hours} 小時／{review.units} 個
              {review.note && ` — ${review.note}`}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
