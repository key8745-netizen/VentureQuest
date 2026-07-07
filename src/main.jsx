import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import FinancialPanel from './components/FinancialPanel.jsx';
import QuestTracker from './components/QuestTracker.jsx';
import OrgTreePreview from './components/OrgTreePreview.jsx';
import OnboardingWizard from './components/OnboardingWizard.jsx';
import AdvisorPanel from './components/AdvisorPanel.jsx';
import { createStarterOrgTree } from './models/orgTree.js';
import { buildStagePlan, getActiveStage } from './models/stagePlanner.js';
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
    advisorUsage: { date: '', count: 0 },
    advisorHistories: {},
    orgTree: createStarterOrgTree(),
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return { ...defaultState(), ...JSON.parse(raw) };
  } catch {
    return defaultState();
  }
}

function App() {
  const [state, setState] = useState(loadState);
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

  return (
    <div className="app">
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
        {state.profile ? (
          <>
            <QuestTracker
              mode={state.mode}
              profile={state.profile}
              customizations={state.customizations}
              breakdowns={state.breakdowns}
              availableMinutes={state.availableMinutes}
              completedGoalIds={state.completedGoalIds}
              completedTaskIds={state.completedTaskIds}
              onAvailableMinutesChange={(availableMinutes) => patch({ availableMinutes })}
              onCompletedGoalIdsChange={(completedGoalIds) => patch({ completedGoalIds })}
              onCompletedTaskIdsChange={(completedTaskIds) => patch({ completedTaskIds })}
              onAddBreakdown={addBreakdownItems}
              apiKey={apiKey}
              usage={state.advisorUsage}
              onUsageChange={(advisorUsage) => patch({ advisorUsage })}
              advisorHistories={state.advisorHistories}
              onAdvisorHistoryChange={setAdvisorHistory}
            />
            <AdvisorPanel
              apiKey={apiKey}
              onApiKeyChange={setApiKey}
              profile={state.profile}
              activeStage={getActiveStage({
                plan: buildStagePlan({
                  profile: state.profile,
                  customizations: state.customizations,
                }),
                completedGoalIds: state.completedGoalIds,
                breakdowns: state.breakdowns,
              })}
              usage={state.advisorUsage}
              onUsageChange={(advisorUsage) => patch({ advisorUsage })}
              onAdoptTask={(stageId, task) => addCustomization(stageId, 'tasks', task)}
              onAdoptGoal={(stageId, goal) => addCustomization(stageId, 'goals', goal)}
              advisorHistories={state.advisorHistories}
              onAdvisorHistoryChange={setAdvisorHistory}
            />
            <FinancialPanel
              mode={state.mode}
              financial={state.financial}
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
            onComplete={handleOnboardingComplete}
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

createRoot(document.getElementById('root')).render(<App />);
