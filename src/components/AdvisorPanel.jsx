import React, { useState } from 'react';
import AdvisorChat from './AdvisorChat.jsx';
import { getCopy } from '../models/terminology.js';
import {
  pickModelForStage,
  buildStagePrompt,
  detectProvider,
  sanitizeApiKey,
  DAILY_CALL_LIMIT,
} from '../models/advisor.js';

const MODEL_LABELS = {
  'claude-haiku-4-5': 'Claude Haiku(最省)',
  'claude-sonnet-5': 'Claude Sonnet(一般)',
  'claude-opus-4-8': 'Claude Opus(最強)',
  'gemini-2.5-flash-lite': 'Gemini Flash-Lite(最省)',
  'gemini-2.5-flash': 'Gemini Flash(一般)',
  'gemini-2.5-pro': 'Gemini Pro(最強)',
};

export default function AdvisorPanel({
  mode,
  apiKey,
  onApiKeyChange,
  profile,
  financial,
  activeStage,
  completedGoalIds,
  breakdowns,
  usage,
  onUsageChange,
  onAdoptTask,
  onAdoptGoal,
  advisorHistories,
  onAdvisorHistoryChange,
}) {
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [keyDraft, setKeyDraft] = useState('');

  if (!activeStage) {
    return (
      <section className="card">
        <h2>{getCopy('advisorTitle', mode)}</h2>
        <p className="muted">所有階段都完成了,顧問先下班。</p>
      </section>
    );
  }

  const model = pickModelForStage(activeStage.id, apiKey);
  const provider = detectProvider(apiKey);
  const keyLooksKnown =
    !apiKey || apiKey.startsWith('sk-ant') || apiKey.startsWith('AIza');
  const systemPrompt = buildStagePrompt({
    profile,
    stage: activeStage,
    financial,
    completedGoalIds,
    breakdowns,
  });

  return (
    <section className="card">
      <h2>{getCopy('advisorTitle', mode)}</h2>
      <p className="muted">
        依你的階段自動選模型:目前是「{activeStage.label}」→ {MODEL_LABELS[model] ?? model}。
        每天最多 {DAILY_CALL_LIMIT} 次。
        {apiKey ? `(今天已用 ${usage?.date === new Date().toISOString().slice(0, 10) ? usage.count : 0} 次)` : ''}
      </p>

      {apiKey ? (
        <p className="muted">
          API key 已設定,偵測為 {provider === 'gemini' ? 'Google Gemini' : 'Anthropic'}(只存在你的瀏覽器,不會隨 Export 匯出)。
          {!keyLooksKnown && (
            <strong>
              {' '}注意:這個 key 不像 Anthropic(sk-ant- 開頭)也不像 Gemini(AIza 開頭),可能貼錯了。
            </strong>
          )}
          <button type="button" className="mini" onClick={() => onApiKeyChange('')}>
            清除 key
          </button>
        </p>
      ) : showKeyForm ? (
        <div className="advisor-key-form">
          <input
            type="password"
            placeholder="sk-ant-… 或 AIza…"
            value={keyDraft}
            onChange={(event) => setKeyDraft(event.target.value)}
          />
          <button
            type="button"
            onClick={() => {
              onApiKeyChange(sanitizeApiKey(keyDraft));
              setKeyDraft('');
              setShowKeyForm(false);
            }}
            disabled={!keyDraft.trim()}
          >
            儲存
          </button>
          <p className="muted">
            支援 Anthropic key(sk-ant-… 開頭)或 Google Gemini key(AIza 開頭,到
            aistudio.google.com 免費申請,有免費額度)。key 只存在你這台裝置的瀏覽器,直連官方 API,不經過任何伺服器。
          </p>
        </div>
      ) : (
        <p className="muted">
          還沒設定 API key,回覆會是示範用的假資料。(支援 Anthropic 或免費的 Gemini key)
          <button type="button" className="mini" onClick={() => setShowKeyForm(true)}>
            設定 API key
          </button>
        </p>
      )}

      <AdvisorChat
        key={activeStage.id}
        apiKey={apiKey}
        model={model}
        systemPrompt={systemPrompt}
        history={advisorHistories[`stage:${activeStage.id}`] ?? []}
        onHistoryChange={(turns) =>
          onAdvisorHistoryChange(`stage:${activeStage.id}`, turns)
        }
        usage={usage}
        onUsageChange={onUsageChange}
        onAdoptTask={(task) => onAdoptTask(activeStage.id, task)}
        onAdoptGoal={(goal) => onAdoptGoal(activeStage.id, goal)}
        placeholder={`關於「${activeStage.label}」階段,想問什麼?`}
      />
    </section>
  );
}
