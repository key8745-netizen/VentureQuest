# VentureQuest Claude Code Handoff

## 0. 一句話定位

VentureQuest（勇闖人生）目前是 **0 成本、純前端、本機暫存的在職創業 prototype**。目標不是先做完整 SaaS，而是驗證：一個還在上班的新手，能否用碎片時間看懂「財務生死線」，並把長期副業目標拆成今天能完成的一個小任務。

## 1. 現階段產品邊界

### 保留

- React single-page MVP。
- `localStorage` 暫存，不做登入。
- 無後端、無資料庫、無 AI API。
- 專業術語 / 街頭白話切換。
- 財務生死線：每月固定成本、單位售價、單位變動成本、最低單量。
- 長期目標拆解：Spark → Runway → Architect → Nexus。
- 今日 micro-task：依照今天可用分鐘數，只顯示一個可以做的小任務。
- Quest progress bar。
- 產業無感 schema：底層只用 `productId`、單位經濟、抽象 operating nodes。
- 最小 Org-Tree：可複製節點、解鎖管理節點。

### 暫時不要做

- 不要加登入。
- 不要加正式資料庫。
- 不要加後端 API。
- 不要加金流。
- 不要加大型狀態管理庫。
- 不要加複雜 graph canvas。
- 不要串 AI API，除非先有 token/cost guardrail。
- 不要把任何產業詞寫進底層 schema，例如 `foodCost`、`menuItem`、`roomNight`。

## 2. 技術狀態

- Framework: React 18 + Vite 5 SPA。
- Module format: ESM。
- Tests: Node built-in test runner。
- Package manager: npm（版本已固定，不用 `latest`）。
- Entry: `src/main.jsx`。
- Styles: `src/styles/app.css`。

### Scripts

```bash
npm install
npm run dev
npm test
npm run build
```

## 3. 環境狀態

先前 Codex container 內 `npm install` 曾因 registry/proxy 權限問題失敗（403）。目前環境已確認：

- `npm config get registry` → 官方 registry。
- `npm install`、`npm test`（11/11 pass）、`npm run build`、`npm run dev` 全部可正常執行。

若在新環境遇到 registry 問題，可嘗試：

```bash
npm config set registry https://registry.npmjs.org/
npm install
```

## 4. 檔案導覽

```text
index.html
package.json
vite.config.js
src/main.jsx
src/components/FinancialPanel.jsx
src/components/QuestTracker.jsx
src/components/OrgTreePreview.jsx
src/models/financialGuardrails.js
src/models/goalPlanner.js
src/models/orgTree.js
src/models/terminology.js
src/styles/app.css
test/financialGuardrails.test.js
test/goalPlanner.test.js
test/orgTree.test.js
test/terminology.test.js
```

### `src/main.jsx`

App shell 與跨區塊狀態：

- `localStorage` 讀寫（key: `venturequest:v1`）。
- 專業 / 白話模式切換。
- `Reset local data` 按鈕（含 confirm）。
- `Export JSON` 按鈕（下載目前 prototype 狀態）。

### `src/components/`

- `FinancialPanel.jsx`：財務生死線輸入與判定。
- `QuestTracker.jsx`：長期目標、今日可用分鐘數、progress bar、單一 micro-task。
- `OrgTreePreview.jsx`：Org-Tree 顯示、複製節點、解鎖管理節點。

### `src/models/financialGuardrails.js`

核心財務邏輯：

- `calculateSurvivalLine({ monthlyFixedCost, unitPrice, unitCost })`
- `suggestAfterWorkPace({ weeklyHours, weeklyUnits })`

設計原則：只看單位經濟，不看產業。

### `src/models/goalPlanner.js`

長期目標拆解與進度：

- `buildQuestPlan({ targetLabel })`
- `getActiveMilestone({ plan, completedTaskIds })`
- `getTodayMicroTasks({ plan, completedTaskIds, availableMinutes })`
- `toggleTask(completedTaskIds, taskId)`
- `calculateQuestProgress({ plan, completedTaskIds })`

### `src/models/orgTree.js`

產業無感組織節點：

- `createStarterOrgTree()`
- `cloneSubtree(tree, sourceNodeId, newNodeId)`
- `unlockManagementNode(tree, node)`

節點命名刻意抽象化，例如：

- `Operating Unit`
- `Value Delivery`
- `Demand Creation`
- `Customer Response`
- `Management Layer`

### `src/models/terminology.js`

專業術語 / 街頭白話切換：

- `modes.PRO`
- `modes.PLAIN`
- `getCopy(key, mode)`

## 5. 測試狀態

目前測試覆蓋（11/11 pass）：

- 財務生死線。
- 虧錢模型拒絕。
- 在職節奏風險判斷。
- 長期目標拆成四階段。
- 今日 micro-task 篩選。
- 完成 Spark 後解鎖 Runway。
- Org-Tree 產業無感節點。
- 子樹複製（含剝除非 schema 欄位）。
- 管理節點解鎖（需至少兩個營運單位）。
- 文案模式切換與 fallback。

執行：

```bash
npm test
```

## 6. 開發守則

1. 不要新增後端、登入、資料庫、金流、AI API。
2. 不要引入大型狀態管理。
3. 不要把任何產業字眼寫進底層 schema，例如 foodCost/menuItem/roomNight。
4. 底層資料只用 domain-agnostic 概念：productId、unitPrice、unitCost、monthlyFixedCost、operating node、milestone、task。
5. 保留專業術語 / 街頭白話切換。
6. 保留 tests-first；每次改模型先補測試。

## 7. Backlog

### 已完成

- [x] `npm install` / `npm run dev` / `npm test` / `npm run build` 全部可執行。
- [x] 依賴版本固定（React 18.3.1、Vite 5.4.11）。
- [x] `src/main.jsx` 拆成 `FinancialPanel` / `QuestTracker` / `OrgTreePreview`。
- [x] `Reset local data` 按鈕。
- [x] `Export JSON` 按鈕。
- [x] 手機版排版（單欄、420px 驗證過）。

### P2

- 加入 mock AI response，但必須 hard-code token budget 與 fallback mock。
- 加入更多 micro-task templates，但仍維持每次只顯示一個。
- 加入 mobile screenshot QA 自動化。

## 8. 核心商業原則

- 先求能動，不求完整。
- 先求使用者看懂，不求架構漂亮。
- 在職者時間比功能重要。
- 任務要小到今天真的能做。
- Schema 必須支援換產業，不支援行業鎖死。
- 任何新功能都要問：是否幫使用者今天往前推 5 到 30 分鐘？
