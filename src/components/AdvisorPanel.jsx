import React, { useState } from 'react';
import AdvisorChat from './AdvisorChat.jsx';
import {
  pickModelForStage,
  buildStagePrompt,
  DAILY_CALL_LIMIT,
} from '../models/advisor.js';

const MODEL_LABELS = {
  'claude-haiku-4-5': 'Haiku(最省)',
  'claude-sonnet-5': 'Sonnet(一般)',
  'claude-opus-4-8': 'Opus(最強)',
};

export default function AdvisorPanel({
  apiKey,
  onApiKeyChange,
  profile,
  activeStage,
  usage,
  onUsageChange,
  onAdoptTask,
  onAdoptGoal,
}) {
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [keyDraft, setKeyDraft] = useState('');

  if (!activeStage) {
    return (
      <section className="card">
        <h2>AI 創業顧問</h2>
        <p className="muted">所有階段都完成了,顧問先下班。</p>
      </section>
    );
  }

  const model = pickModelForStage(activeStage.id);
  const systemPrompt = buildStagePrompt({ profile, stage: activeStage });

  return (
    <section className="card">
      <h2>AI 創業顧問</h2>
      <p className="muted">
        依你的階段自動選模型:目前是「{activeStage.label}」→ {MODEL_LABELS[model] ?? model}。
        每天最多 {DAILY_CALL_LIMIT} 次。
        {apiKey ? `(今天已用 ${usage?.date === new Date().toISOString().slice(0, 10) ? usage.count : 0} 次)` : ''}
      </p>

      {apiKey ? (
        <p className="muted">
          API key 已設定(只存在你的瀏覽器,不會隨 Export 匯出)。
          <button type="button" className="mini" onClick={() => onApiKeyChange('')}>
            清除 key
          </button>
        </p>
      ) : showKeyForm ? (
        <div className="advisor-key-form">
          <input
            type="password"
            placeholder="sk-ant-…"
            value={keyDraft}
            onChange={(event) => setKeyDraft(event.target.value)}
          />
          <button
            type="button"
            onClick={() => {
              onApiKeyChange(keyDraft.trim());
              setKeyDraft('');
              setShowKeyForm(false);
            }}
            disabled={!keyDraft.trim()}
          >
            儲存
          </button>
          <p className="muted">
            key 只存在你這台裝置的瀏覽器,直接連 Anthropic,不經過任何伺服器。
          </p>
        </div>
      ) : (
        <p className="muted">
          還沒設定 API key,回覆會是示範用的假資料。
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
        usage={usage}
        onUsageChange={onUsageChange}
        onAdoptTask={(task) => onAdoptTask(activeStage.id, task)}
        onAdoptGoal={(goal) => onAdoptGoal(activeStage.id, goal)}
        placeholder={`關於「${activeStage.label}」階段,想問什麼?`}
      />
    </section>
  );
}
