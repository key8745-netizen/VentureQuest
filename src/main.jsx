import React, { Component, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import FinancialPanel from './components/FinancialPanel.jsx';
import QuestTracker from './components/QuestTracker.jsx';
import OrgTreePreview from './components/OrgTreePreview.jsx';
import OnboardingWizard from './components/OnboardingWizard.jsx';
import AdvisorPanel from './components/AdvisorPanel.jsx';
import WeeklyReview from './components/WeeklyReview.jsx';
import { createStarterOrgTree } from './models/orgTree.js';
import {
  buildStagePlan,
  getActiveStage,
  getUncelebratedStage,
  removeBreakdownItem,
} from './models/stagePlanner.js';
import { capHistory } from './models/advisor.js';
import { modes, getCopy } from './models/terminology.js';
import './styles/app.css';

const STORAGE_KEY = 'venturequest:v1';
// The API key lives under its own key so Export JSON never includes it.
const API_KEY_STORAGE = 'venturequest:apikey:v1';

function defaultState() {
  return {
    mode: modes.PLAIN,
    profile: null,
    financial: { monthlyFixedCost: 30000, unitPrice: 500, unitCost: 200 },
    availableMinutes: 20,
    completedGoalIds: [],
    completedTaskIds: [],
    customizations: {},
    breakdowns: {},
    celebratedStageIds: [],
    weeklyReviews: [],
    advisorUsage: { date: '', count: 0 },
    advisorHistories: {},
    orgTree: createStarterOrgTree(),
  };
}

/**
 * Merges saved state over the defaults, but only accepts values whose
 * shape matches — a corrupted or hand-edited entry falls back to the
 * default for that key instead of crashing the whole app.
 */
function loadState() {
  const defaults = defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return defaults;

    const merged = { ...defaults };
    for (const [key, fallback] of Object.entries(defaults)) {
      const value = parsed[key];
      if (value === undefined) continue;
      if (Array.isArray(fallback) ? Array.isArray(value) : true) {
        merged[key] = value;
      }
    }
    if (parsed.profile === null || typeof parsed.profile === 'object') {
      merged.profile = parsed.profile ?? null;
    }
    return merged;
  } catch {
    return defaults;
  }
}

/** Last line of defense: a render crash offers reset instead of a blank page. */
class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="app">
        <section className="card">
          <h2>出了點狀況</h2>
          <p className="muted">
            畫面渲染失敗，可能是本機資料損壞。你可以重新整理再試，或清除資料重新開始（資料只存在這個瀏覽器）。
          </p>
          <div className="wizard-actions">
            <button type="button" onClick={() => window.location.reload()}>
              重新整理
            </button>
            <button
              type="button"
              className="danger"
              onClick={() => {
                localStorage.removeItem(STORAGE_KEY);
                window.location.reload();
              }}
            >
              清除資料重新開始
            </button>
          </div>
        </section>
      </div>
    );
  }
}

function App() {
  const [state, setState] = useState(loadState);
  const [editingProfile, setEditingProfile] = useState(false);
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem(API_KEY_STORAGE) ?? '',
  );
  const importRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (apiKey) localStorage.setItem(API_KEY_STORAGE, apiKey);
    else localStorage.removeItem(API_KEY_STORAGE);
  }, [apiKey]);

  const patch = (partial) => setState((prev) => ({ ...prev, ...partial }));

  const addCustomization = (stageId, kind, item) => {
    setState((prev) => {
      const existing = prev.customizations[stageId] ?? { goals: [], tasks: [] };
      const id = `custom-${stageId}-${kind}-${Date.now()}`;
      return {
        ...prev,
        customizations: {
          ...prev.customizations,
          [stageId]: {
            ...existing,
            [kind]: [...(existing[kind] ?? []), { ...item, id }],
          },
        },
      };
    });
  };

  // One persisted conversation per context (stage / goal / wizard
  // question), trimmed so localStorage stays small.
  const setAdvisorHistory = (key, turns) => {
    setState((prev) => ({
      ...prev,
      advisorHistories: { ...prev.advisorHistories, [key]: capHistory(turns) },
    }));
  };

  // Attach advisor-suggested sub-items under a goal (or sub-item).
  const addBreakdownItems = (parentId, steps) => {
    setState((prev) => {
      const stamp = Date.now();
      const items = steps.map((step, index) => ({
        id: `bd-${parentId}-${stamp}-${index}`,
        label: step.label,
      }));
      return {
        ...prev,
        breakdowns: {
          ...prev.breakdowns,
          [parentId]: [...(prev.breakdowns[parentId] ?? []), ...items],
        },
      };
    });
  };

  // Remove an AI-added item: a breakdown sub-item, or an adopted
  // custom goal (plus any breakdown subtree hanging off it).
  const handleRemoveItem = (goal, { isCustomGoal, stageId }) => {
    setState((prev) => {
      const breakdowns = removeBreakdownItem(prev.breakdowns, goal.id);
      if (!isCustomGoal) return { ...prev, breakdowns };

      const existing = prev.customizations[stageId];
      if (!existing) return { ...prev, breakdowns };
      return {
        ...prev,
        breakdowns,
        customizations: {
          ...prev.customizations,
          [stageId]: {
            ...existing,
            goals: (existing.goals ?? []).filter((g) => g.id !== goal.id),
          },
        },
      };
    });
  };

  const handleOnboardingComplete = (profile) => {
    patch({
      profile,
      // Seed the financial panel with the wizard answers.
      financial: {
        monthlyFixedCost: profile.monthlyFixedCost,
        unitPrice: profile.unitPrice,
        unitCost: profile.unitCost,
      },
    });
    setEditingProfile(false);
  };

  const handleReset = () => {
    if (!window.confirm('確定要清除所有本機資料，回到初始狀態嗎？')) return;
    localStorage.removeItem(STORAGE_KEY);
    setState(defaultState());
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        setState({ ...defaultState(), ...parsed });
      } catch {
        alert('無法讀取檔案，請確認是合法的 VentureQuest JSON。');
      }
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'venturequest-state.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const plan = state.profile
    ? buildStagePlan({
        profile: state.profile,
        customizations: state.customizations,
      })
    : null;
  const activeStage = plan
    ? getActiveStage({
        plan,
        completedGoalIds: state.completedGoalIds,
        breakdowns: state.breakdowns,
      })
    : null;
  const clearedStage = plan
    ? getUncelebratedStage({
        plan,
        completedGoalIds: state.completedGoalIds,
        breakdowns: state.breakdowns,
        celebratedStageIds: state.celebratedStageIds,
      })
    : null;

  return (
    <div className="app">
      {clearedStage && !editingProfile && (
        <div className="stage-clear-overlay" role="dialog" aria-modal="true">
          <div className="stage-clear card">
            <p className="stage-clear-emoji">🎉</p>
            <h2>
              {getCopy('stageClearTitle', state.mode)}「{clearedStage.label}」
            </h2>
            {activeStage ? (
              <p>
                {getCopy('stageClearNext', state.mode)}:
                <strong>{activeStage.label}</strong> — {activeStage.subtitle}
              </p>
            ) : (
              <p>{getCopy('stageClearAllDone', state.mode)}</p>
            )}
            <button
              type="button"
              className="primary"
              onClick={() =>
                patch({
                  celebratedStageIds: [
                    ...state.celebratedStageIds,
                    clearedStage.id,
                  ],
                })
              }
            >
              {getCopy('stageClearContinue', state.mode)}
            </button>
          </div>
        </div>
      )}
      <header className="app-header">
        <div>
          <h1>VentureQuest 勇闖人生</h1>
          <p className="tagline">{getCopy('appTagline', state.mode)}</p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            onClick={() =>
              patch({ mode: state.mode === modes.PRO ? modes.PLAIN : modes.PRO })
            }
          >
            {state.mode === modes.PRO ? '切換成白話' : '切換成專業'}
          </button>
          {state.profile && (
            <button type="button" onClick={() => setEditingProfile(true)}>
              修改目標
            </button>
          )}
          <button type="button" onClick={handleExport}>
            Export JSON
          </button>
          <button type="button" onClick={() => importRef.current.click()}>
            Import JSON
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleImport}
          />
          <button type="button" className="danger" onClick={handleReset}>
            Reset local data
          </button>
        </div>
      </header>

      <main>
        {state.profile && !editingProfile ? (
          <>
            <QuestTracker
              mode={state.mode}
              profile={state.profile}
              financial={state.financial}
              customizations={state.customizations}
              breakdowns={state.breakdowns}
              availableMinutes={state.availableMinutes}
              completedGoalIds={state.completedGoalIds}
              completedTaskIds={state.completedTaskIds}
              onAvailableMinutesChange={(availableMinutes) => patch({ availableMinutes })}
              onCompletedGoalIdsChange={(completedGoalIds) => patch({ completedGoalIds })}
              onCompletedTaskIdsChange={(completedTaskIds) => patch({ completedTaskIds })}
              onAddBreakdown={addBreakdownItems}
              onRemoveItem={handleRemoveItem}
              onAdoptTask={(stageId, task) => addCustomization(stageId, 'tasks', task)}
              apiKey={apiKey}
              usage={state.advisorUsage}
              onUsageChange={(advisorUsage) => patch({ advisorUsage })}
              advisorHistories={state.advisorHistories}
              onAdvisorHistoryChange={setAdvisorHistory}
            />
            <AdvisorPanel
              mode={state.mode}
              apiKey={apiKey}
              onApiKeyChange={setApiKey}
              profile={state.profile}
              financial={state.financial}
              completedGoalIds={state.completedGoalIds}
              breakdowns={state.breakdowns}
              activeStage={activeStage}
              usage={state.advisorUsage}
              onUsageChange={(advisorUsage) => patch({ advisorUsage })}
              onAdoptTask={(stageId, task) => addCustomization(stageId, 'tasks', task)}
              onAdoptGoal={(stageId, goal) => addCustomization(stageId, 'goals', goal)}
              advisorHistories={state.advisorHistories}
              onAdvisorHistoryChange={setAdvisorHistory}
            />
            <WeeklyReview
              mode={state.mode}
              financial={state.financial}
              reviews={state.weeklyReviews}
              onReviewsChange={(weeklyReviews) => patch({ weeklyReviews })}
            />
            <FinancialPanel
              mode={state.mode}
              financial={state.financial}
              targetMonthlyIncome={state.profile.targetMonthlyIncome}
              onChange={(financial) => patch({ financial })}
            />
            <OrgTreePreview
              mode={state.mode}
              tree={state.orgTree}
              onTreeChange={(orgTree) => patch({ orgTree })}
            />
          </>
        ) : (
          <OnboardingWizard
            mode={state.mode}
            onComplete={handleOnboardingComplete}
            onCancel={editingProfile ? () => setEditingProfile(false) : undefined}
            initialAnswers={editingProfile ? state.profile : undefined}
            apiKey={apiKey}
            usage={state.advisorUsage}
            onUsageChange={(advisorUsage) => patch({ advisorUsage })}
            advisorHistories={state.advisorHistories}
            onAdvisorHistoryChange={setAdvisorHistory}
          />
        )}
      </main>

      <footer className="app-footer">
        <p>0 成本・純前端・資料只存在你的瀏覽器</p>
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>,
);
