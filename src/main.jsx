import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import FinancialPanel from './components/FinancialPanel.jsx';
import QuestTracker from './components/QuestTracker.jsx';
import OrgTreePreview from './components/OrgTreePreview.jsx';
import { createStarterOrgTree } from './models/orgTree.js';
import { modes, getCopy } from './models/terminology.js';
import './styles/app.css';

const STORAGE_KEY = 'venturequest:v1';

function defaultState() {
  return {
    mode: modes.PLAIN,
    financial: { monthlyFixedCost: 30000, unitPrice: 500, unitCost: 200 },
    targetLabel: '每月副業收入 3 萬',
    availableMinutes: 20,
    completedTaskIds: [],
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
  const importRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const patch = (partial) => setState((prev) => ({ ...prev, ...partial }));

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
        <FinancialPanel
          mode={state.mode}
          financial={state.financial}
          onChange={(financial) => patch({ financial })}
        />
        <QuestTracker
          mode={state.mode}
          targetLabel={state.targetLabel}
          availableMinutes={state.availableMinutes}
          completedTaskIds={state.completedTaskIds}
          onTargetLabelChange={(targetLabel) => patch({ targetLabel })}
          onAvailableMinutesChange={(availableMinutes) => patch({ availableMinutes })}
          onCompletedTaskIdsChange={(completedTaskIds) => patch({ completedTaskIds })}
        />
        <OrgTreePreview
          mode={state.mode}
          tree={state.orgTree}
          onTreeChange={(orgTree) => patch({ orgTree })}
        />
      </main>

      <footer className="app-footer">
        <p>0 成本・純前端・資料只存在你的瀏覽器</p>
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
