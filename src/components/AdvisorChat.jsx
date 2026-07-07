import React, { useState } from 'react';
import {
  askAdvisor,
  canAskToday,
  recordCall,
  todayKey,
  DAILY_CALL_LIMIT,
} from '../models/advisor.js';

/**
 * One chat box for the advisor. Used both in the wizard (plain Q&A)
 * and on the dashboard (with adopt buttons for suggested tasks/goals).
 */
export default function AdvisorChat({
  apiKey,
  model,
  systemPrompt,
  usage,
  onUsageChange,
  onAdoptTask,
  onAdoptGoal,
  onAdoptSteps,
  mockReply,
  placeholder,
}) {
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [adopted, setAdopted] = useState([]);

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
        history: history.filter((turn) => !turn.mock),
        question,
        ...(mockReply ? { mockReply } : {}),
      });
      setHistory((prev) => [...prev, { question, ...result }]);
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

  const adopt = (kind, item, key) => {
    if (kind === 'task') onAdoptTask(item);
    else onAdoptGoal(item);
    setAdopted((prev) => [...prev, key]);
  };

  return (
    <div className="advisor-chat">
      {history.map((turn, turnIndex) => (
        <div key={turnIndex} className="advisor-turn">
          <p className="advisor-question">{turn.question}</p>
          <p className="advisor-reply">{turn.reply}</p>
          {turn.steps?.length > 0 && onAdoptSteps && (
            <div className="advisor-steps">
              <ul className="advisor-suggestions">
                {turn.steps.map((step, i) => (
                  <li key={`${turnIndex}-s${i}`}>
                    <span>{i + 1}. {step.label}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="mini"
                disabled={adopted.includes(`${turnIndex}-steps`)}
                onClick={() => {
                  onAdoptSteps(turn.steps);
                  setAdopted((prev) => [...prev, `${turnIndex}-steps`]);
                }}
              >
                {adopted.includes(`${turnIndex}-steps`)
                  ? '已加入為子項目'
                  : `把這 ${turn.steps.length} 步加入為子項目`}
              </button>
            </div>
          )}
          {(turn.tasks?.length > 0 || turn.goals?.length > 0) && (
            <ul className="advisor-suggestions">
              {turn.tasks?.map((task, i) => {
                const key = `${turnIndex}-t${i}`;
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
                        disabled={adopted.includes(key)}
                        onClick={() => adopt('task', task, key)}
                      >
                        {adopted.includes(key) ? '已加入' : '加入'}
                      </button>
                    )}
                  </li>
                );
              })}
              {turn.goals?.map((goal, i) => {
                const key = `${turnIndex}-g${i}`;
                return (
                  <li key={key}>
                    <span>過關條件:{goal.label}</span>
                    {onAdoptGoal && (
                      <button
                        type="button"
                        className="mini"
                        disabled={adopted.includes(key)}
                        onClick={() => adopt('goal', goal, key)}
                      >
                        {adopted.includes(key) ? '已加入' : '加入'}
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
