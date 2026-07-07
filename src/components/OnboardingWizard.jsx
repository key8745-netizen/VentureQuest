import React, { useState } from 'react';
import {
  QUESTION_FLOW,
  isAnswerValid,
  createProfile,
} from '../models/onboarding.js';
import { buildStagePlan } from '../models/stagePlanner.js';
import {
  calculateSurvivalLine,
  suggestAfterWorkPace,
} from '../models/financialGuardrails.js';

/**
 * Guided interview shown before the dashboard: one question per
 * screen, then a summary that turns the answers into the user's plan.
 */
export default function OnboardingWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  // Number inputs keep raw strings so typing feels natural.
  const [draft, setDraft] = useState('');

  const onSummary = step >= QUESTION_FLOW.length;
  const question = onSummary ? null : QUESTION_FLOW[step];

  const currentValue = () => {
    if (question.type === 'number') {
      return draft.trim() === '' ? Number.NaN : Number(draft);
    }
    if (question.type === 'text') return draft;
    return answers[question.id];
  };

  const goTo = (nextStep) => {
    const target = QUESTION_FLOW[nextStep];
    if (target) {
      const saved = answers[target.id];
      setDraft(saved === undefined ? '' : String(saved));
    }
    setStep(nextStep);
  };

  const saveAndNext = (value) => {
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
    goTo(step + 1);
  };

  const handleNext = () => {
    const value = currentValue();
    if (!isAnswerValid(question, value)) return;
    saveAndNext(question.type === 'text' ? value.trim() : value);
  };

  if (onSummary) {
    const profile = createProfile(answers);
    const plan = buildStagePlan({ profile });
    const survival = calculateSurvivalLine(profile);
    const pace = suggestAfterWorkPace({
      weeklyHours: profile.weeklyHours,
      weeklyUnits: 0,
    });

    return (
      <section className="card wizard">
        <p className="wizard-step">你的計畫已經建好</p>
        <h2>{plan.targetLabel}</h2>

        <ul className="wizard-summary">
          <li>
            {survival.viable
              ? `生死線：每月至少賣 ${survival.unitsToSurvive} 個單位，賣一個留下 ${survival.unitMargin} 元。`
              : '注意：現在的價格賣一個賠一個，第一階段就會帶你調整它。'}
          </li>
          <li>每週可投入 {profile.weeklyHours} 小時。{pace.burnoutRisk ? '這已經偏多，小心過勞。' : '這個節奏可以持續。'}</li>
          <li>你的起點：第 1 階段「{plan.stages[0].label}」——{plan.stages[0].subtitle}。</li>
          <li>每天只會給你一件 5–30 分鐘的小事，完成階段目標就往下一階段。</li>
        </ul>

        <div className="wizard-actions">
          <button type="button" onClick={() => goTo(QUESTION_FLOW.length - 1)}>
            上一步
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => onComplete(profile)}
          >
            開始闖關
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="card wizard">
      <p className="wizard-step">
        第 {step + 1} / {QUESTION_FLOW.length} 題
      </p>
      <h2>{question.question}</h2>
      {question.hint && <p className="muted">{question.hint}</p>}

      {question.type === 'choice' ? (
        <div className="wizard-choices">
          {question.options.map((option) => (
            <button
              key={option.value}
              type="button"
              className="choice"
              onClick={() => saveAndNext(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : (
        <input
          className="wizard-input"
          type={question.type === 'number' ? 'number' : 'text'}
          min={question.type === 'number' ? '0' : undefined}
          value={draft}
          autoFocus
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') handleNext();
          }}
        />
      )}
      {question.unit && <p className="muted">{question.unit}</p>}

      <div className="wizard-actions">
        {step > 0 && (
          <button type="button" onClick={() => goTo(step - 1)}>
            上一步
          </button>
        )}
        {question.allowUnknown && (
          <button type="button" onClick={() => saveAndNext('')}>
            {question.unknownLabel}
          </button>
        )}
        {question.type !== 'choice' && (
          <button
            type="button"
            className="primary"
            disabled={!isAnswerValid(question, currentValue())}
            onClick={handleNext}
          >
            下一步
          </button>
        )}
      </div>
    </section>
  );
}
