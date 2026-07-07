# VentureQuest Claude Code Handoff

## 0. 一句話定位

VentureQuest（勇闖人生）目前是 **0 成本、純前端、本機暫存的在職創業 prototype**。目標不是先做完整 SaaS，而是驗證：一個還在上班的新手，能否用碎片時間看懂「財務生死線」，並把長期副業目標拆成今天能完成的一個小任務。

## 1. 現階段產品邊界

### 保留

- React single-page MVP。
- `localStorage` 暫存，不做登入。
- 無後端、無資料庫。
- 引導式問答（onboarding wizard）：一次一題，答完產生計畫；每題可問 AI。
- 五階段路線圖：探索驗證 → 起飛準備 → 落地營運 → 穩定成長 → 規模擴張。每階段有可勾選的過關條件（goals）＋ 5–30 分鐘 micro-tasks。
- AI 創業顧問：使用者自備 Anthropic API key（存瀏覽器獨立 key，不隨 Export 匯出），依階段分級選模型（explore/prepare → Haiku、operate/grow → Sonnet、scale → Opus）。顧問可建議新任務／過關條件，使用者按「加入」採用。
- 目標遞迴拆解：每個過關條件（含子項目）旁有「問 AI」，顧問解釋怎麼達成並可拆成最多 5 個可勾選子項目（存在 `breakdowns`，可無限層遞迴）。有子項目的目標由子項目全勾自動完成，母項目 checkbox 變唯讀。
- AI 成本防護欄（已寫死在 `advisor.js`）：每日 20 次呼叫上限、單次回覆 1024 tokens、無 key 時 fallback 到寫死的 mock 回覆。
- 專業術語 / 街頭白話切換。
- 財務生死線：每月固定成本、單位售價、單位變動成本、最低單量。
- 今日 micro-task：依照今天可用分鐘數，只顯示一個可以做的小任務。
- 產業無感 schema：底層只用 `productId`、單位經濟、抽象 operating nodes；使用者的產業只存在 `profile.idea` 這個字串。
- 最小 Org-Tree：可複製節點、解鎖管理節點。

### 暫時不要做

- 不要加登入。
- 不要加正式資料庫。
- 不要加後端 API。
- 不要加金流。
- 不要加大型狀態管理庫。
- 不要加複雜 graph canvas。
- 不要移除或放寬 AI 成本防護欄（每日上限、token 上限、mock fallback）。
- 不要把 API key 放進可 Export 的 app state（它存在獨立的 `venturequest:apikey:v1`）。
- 不要把任何產業詞寫進底層 schema，例如 `foodCost`、`menuItem`、`roomNight`。

## 1.5 佈署狀態

- 佈署平台：Netlify（`netlify.toml` 已在 repo 根目錄：Node 22、`npm run build`、發佈 `dist/`）。
- 連接方式：Netlify → Add new site → Import an existing project → 選 `key8745-netizen/VentureQuest`，之後每次 push `main` 自動佈署。
- 沒有其他基礎設施：無網域、無環境變數、無 serverless functions。

## 1.6 給接手模型的任務分級

這個 repo 的架構刻意簡單，大多數後續任務**不需要高階模型**。開新 session 前先看這裡：

**適合 Haiku / 低階模型（機械性、範圍明確）：**

- 改文案、加 `terminology.js` 的詞條（記得 PRO/PLAIN 兩種都要寫）。
- 加更多 micro-task 模板到 `goalPlanner.js` 的 `MILESTONE_TEMPLATES`（每個任務 5–30 分鐘，先補測試）。
- 調 CSS、改配色、微調手機版排版。
- 修 typo、更新文件。

**適合 Sonnet（一般開發）：**

- 新增小功能（例如 import JSON 還原狀態，對應現有的 Export）。
- 重構單一 component、加測試案例。
- 修 bug、處理 build 或依賴問題。

**才需要高階模型（動架構才用）：**

- 引入 AI API（必須先設計 token/cost guardrail）。
- 大改資料 schema 或狀態管理方式。

**所有模型都必須遵守第 6 節的開發守則**，特別是：不加後端、不把產業字眼寫進 schema、tests-first。

## 2. 技術狀態

- Framework: React 18 + Vite 5 SPA。
- Module format: ESM。
- Tests: Node built-in test runner。
- Package manager: npm（版本已固定，不用 `latest`）。
- AI SDK: `@anthropic-ai/sdk`（瀏覽器直連，`dangerouslyAllowBrowser: true`，key 由使用者提供）。
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
netlify.toml
src/main.jsx
src/components/OnboardingWizard.jsx
src/components/QuestTracker.jsx
src/components/AdvisorPanel.jsx
src/components/AdvisorChat.jsx
src/components/FinancialPanel.jsx
src/components/OrgTreePreview.jsx
src/models/onboarding.js
src/models/stagePlanner.js
src/models/advisor.js
src/models/financialGuardrails.js
src/models/orgTree.js
src/models/terminology.js
src/styles/app.css
test/onboarding.test.js
test/stagePlanner.test.js
test/advisor.test.js
test/financialGuardrails.test.js
test/orgTree.test.js
test/terminology.test.js
```

### `src/main.jsx`

App shell 與跨區塊狀態：

- `localStorage` 讀寫（app state key: `venturequest:v1`；API key 獨立存 `venturequest:apikey:v1`）。
- 沒有 `profile` 時顯示 OnboardingWizard，答完才進儀表板。
- `customizations`：使用者採用的顧問建議（per-stage 額外 goals/tasks）。
- `breakdowns`：目標的 AI 拆解子項目（`{ [parentId]: [{id,label}] }`，遞迴）。
- 專業 / 白話模式切換、Reset（含 confirm）、Export / Import JSON。

### `src/components/`

- `OnboardingWizard.jsx`：一次一題的引導問答＋每題「問 AI」＋計畫摘要。
- `QuestTracker.jsx`：五階段地圖、過關條件勾選、progress bar、單一 micro-task。
- `AdvisorPanel.jsx`：API key 管理＋目前階段的顧問對話。
- `AdvisorChat.jsx`：共用聊天元件（精靈與儀表板都用），含「加入」建議按鈕。
- `FinancialPanel.jsx`：財務生死線輸入與判定。
- `OrgTreePreview.jsx`：Org-Tree 顯示、複製節點、解鎖管理節點。

### `src/models/financialGuardrails.js`

核心財務邏輯：

- `calculateSurvivalLine({ monthlyFixedCost, unitPrice, unitCost })`
- `suggestAfterWorkPace({ weeklyHours, weeklyUnits })`

設計原則：只看單位經濟，不看產業。

### `src/models/onboarding.js`

引導問答流程：

- `QUESTION_FLOW`：7 題（idea、employment、固定成本、單價、成本、週時數、目標收入）。
- `isAnswerValid(question, value)`、`createProfile(answers)`。

### `src/models/stagePlanner.js`

五階段路線圖與進度：

- `buildStagePlan({ profile, customizations })`：五階段（explore/prepare/operate/grow/scale），每階段 goals（過關條件）＋ tasks（5–30 分鐘）。
- `isGoalComplete({ goalId, completedGoalIds, breakdowns })`：遞迴判斷,有子項目的目標由子項目決定。
- `getActiveStage({ plan, completedGoalIds, breakdowns })`：goals 全部完成才進下一階段。
- `getTodayMicroTasks({ plan, completedGoalIds, completedTaskIds, availableMinutes, breakdowns })`
- `toggleId(ids, id)`、`calculatePlanProgress({ plan, completedGoalIds, breakdowns })`

### `src/models/advisor.js`

AI 顧問（純函式可測，網路呼叫只在瀏覽器跑）：

- `pickModelForStage(stageId)`：Haiku / Sonnet / Opus 分級。
- `buildStagePrompt` / `buildQuestionPrompt` / `buildGoalPrompt`：系統提示詞（goal 版帶父項目路徑,回覆可含 steps 拆解）。
- `parseAdvisorReply(text)`：解析 JSON 回覆，clamp：最多 3 任務（5–30 分鐘）、2 目標、5 個拆解步驟。
- `canAskToday` / `recordCall` / `DAILY_CALL_LIMIT`：每日呼叫上限。
- `askAdvisor({...})`：真正的 API 呼叫；無 key 回傳寫死 mock。

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

目前測試覆蓋（28/28 pass）：

- 財務生死線、虧錢模型拒絕、在職節奏風險判斷。
- 引導問答：題目順序、答案驗證、profile 產生（含探索分支與 schema 檢查）。
- 五階段路線圖：階段結構、目標全勾才解鎖下一階段、今日 micro-task 篩選、顧問建議合併、進度計算、拆解子項目的遞迴完成與階段解鎖。
- AI 顧問：模型分級、提示詞內容、回覆解析（JSON／純文字／code fence）、建議 clamp、每日上限與跨日重置。
- Org-Tree：產業無感節點、子樹複製、管理節點解鎖。
- 文案模式切換與 fallback。

執行：

```bash
npm test
```

## 6. 開發守則

1. 不要新增後端、登入、資料庫、金流。
2. AI 只透過使用者自備的 API key 瀏覽器直連；成本防護欄（每日上限、token 上限、mock fallback）不可移除。
3. 不要引入大型狀態管理。
4. 不要把任何產業字眼寫進底層 schema，例如 foodCost/menuItem/roomNight。
5. 底層資料只用 domain-agnostic 概念：productId、unitPrice、unitCost、monthlyFixedCost、operating node、stage、goal、task。
6. 保留專業術語 / 街頭白話切換。
7. 保留 tests-first；每次改模型先補測試。

## 7. Backlog

### 已完成

- [x] `npm install` / `npm run dev` / `npm test` / `npm run build` 全部可執行。
- [x] 依賴版本固定（React 18.3.1、Vite 5.4.11、@anthropic-ai/sdk 0.110.0）。
- [x] 元件拆分＋ Reset / Export / Import JSON。
- [x] 手機版排版（單欄、420px 驗證過）。
- [x] 引導式問答取代空白儀表板。
- [x] 五階段路線圖（含可勾選過關條件）。
- [x] AI 顧問（分級模型、寫死防護欄、mock fallback）。
- [x] 過關條件「問 AI」遞迴拆解成子項目。

### P2

- 顧問對話歷史持久化（目前重新整理就清空，只有採用的建議會留下）。
- 讓顧問在精靈階段也能建議答案數值（目前只回文字）。
- 加入更多 micro-task templates，但仍維持每次只顯示一個。
- 加入 mobile screenshot QA 自動化。

## 8. 核心商業原則

- 先求能動，不求完整。
- 先求使用者看懂，不求架構漂亮。
- 在職者時間比功能重要。
- 任務要小到今天真的能做。
- Schema 必須支援換產業，不支援行業鎖死。
- 任何新功能都要問：是否幫使用者今天往前推 5 到 30 分鐘？
