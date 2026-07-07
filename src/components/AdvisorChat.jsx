import React, { useState } from 'react';
import {
  askAdvisor,
  canAskToday,
  recordCall,
  todayKey,
  DAILY_CALL_LIMIT,
} from '../models/advisor.js';

/**
 * One chat box for the advisor. Used in the wizard (plain Q&A), on the
 * dashboard stage advisor, and next to every goal (with breakdowns).
 * The conversation itself lives in app state (persisted per context);
 * adopt flags are stored on each turn so buttons stay disabled after
 * a reload.
 */
export default function AdvisorChat({
  apiKey,
  model,
  systemPrompt,
  history = [],
  onHistoryChange,
  usage,
  onUsageChange,
  onAdoptTask,
  onAdoptGoal,
  onAdoptSteps,
  onAdoptAnswer,
  mockReply,
  placeholder,
}) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    const question = input.trim();
    if (!question || loading) return;

    const today = todayKey();
    if (apiKey && !canAskToday(usage, today)) {
      setError(`今天已經問了 ${DAILY_CALL_LIMIT} 次,明天再來(這是防止 API 花費失控的上限)。`);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await askAdvisor({
        apiKey,
        model,
        systemPrompt,
        history,
        question,
        ...(mockReply ? { mockReply } : {}),
      });
      onHistoryChange([...history, { question, ...result }]);
      setInput('');
      if (apiKey && !result.mock) {
        onUsageChange(recordCall(usage, today));
      }
    } catch (err) {
      if (err?.status === 401) {
        setError('API key 無效,請確認後重新輸入。');
      } else {
        setError(`發生錯誤:${err?.message ?? err}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const isAdopted = (turn, key) => (turn.adopted ?? []).includes(key);

  const adopt = (turnIndex, key, apply) => {
    apply();
    onHistoryChange(
      history.map((turn, index) =>
        index === turnIndex
          ? { ...turn, adopted: [...(turn.adopted ?? []), key] }
          : turn,
      ),
    );
  };

  return (
    <div className="advisor-chat">
      {history.map((turn, turnIndex) => (
        <div key={turnIndex} className="advisor-turn">
          <p className="advisor-question">{turn.question}</p>
          <p className="advisor-reply">{turn.reply}</p>
          {turn.answer != null && onAdoptAnswer && (
            <ul className="advisor-suggestions">
              <li>
                <span>建議答案:{turn.answer}</span>
                <button
                  type="button"
                  className="mini"
                  onClick={() => adopt(turnIndex, 'a', () => onAdoptAnswer(turn.answer))}
                >
                  {isAdopted(turn, 'a') ? '再填一次' : '填入'}
                </button>
              </li>
            </ul>
          )}
          {turn.steps?.length > 0 && onAdoptSteps && (
            <div className="advisor-steps">
              <ul className="advisor-suggestions">
                {turn.steps.map((step, i) => (
                  <li key={`s${i}`}>
                    <span>{i + 1}. {step.label}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="mini"
                disabled={isAdopted(turn, 'steps')}
                onClick={() =>
                  adopt(turnIndex, 'steps', () => onAdoptSteps(turn.steps))
                }
              >
                {isAdopted(turn, 'steps')
                  ? '已加入為子項目'
                  : `把這 ${turn.steps.length} 步加入為子項目`}
              </button>
            </div>
          )}
          {(turn.tasks?.length > 0 || turn.goals?.length > 0) && (
            <ul className="advisor-suggestions">
              {turn.tasks?.map((task, i) => {
                const key = `t${i}`;
                return (
                  <li key={key}>
                    <span>
                      任務:{task.label}
                      <em>(約 {task.minutes} 分鐘)</em>
                    </span>
                    {onAdoptTask && (
                      <button
                        type="button"
                        className="mini"
                        disabled={isAdopted(turn, key)}
                        onClick={() => adopt(turnIndex, key, () => onAdoptTask(task))}
                      >
                        {isAdopted(turn, key) ? '已加入' : '加入'}
                      </button>
                    )}
                  </li>
                );
              })}
              {turn.goals?.map((goal, i) => {
                const key = `g${i}`;
                return (
                  <li key={key}>
                    <span>過關條件:{goal.label}</span>
                    {onAdoptGoal && (
                      <button
                        type="button"
                        className="mini"
                        disabled={isAdopted(turn, key)}
                        onClick={() => adopt(turnIndex, key, () => onAdoptGoal(goal))}
                      >
                        {isAdopted(turn, key) ? '已加入' : '加入'}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ))}

      {error && <p className="advisor-error">{error}</p>}

      <div className="advisor-input-row">
        <input
          type="text"
          value={input}
          placeholder={placeholder ?? '問顧問任何問題…'}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') handleSend();
          }}
        />
        <button type="button" onClick={handleSend} disabled={loading || !input.trim()}>
          {loading ? '思考中…' : '送出'}
        </button>
      </div>
    </div>
  );
}
