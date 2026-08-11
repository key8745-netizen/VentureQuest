# VentureQuest Claude Code Handoff

## 0. 一句話定位

VentureQuest（勇闖人生）目前是 **0 成本、純前端、本機暫存的在職創業 prototype**。目標不是先做完整 SaaS，而是驗證：一個還在上班的新手，能否用碎片時間看懂「財務生死線」，並把長期副業目標拆成今天能完成的一個小任務。

## 1. 現階段產品邊界

### 保留

- React single-page MVP。
- `localStorage` 暫存，不做登入。
- 無後端、無資料庫。
- 引導式問答（onboarding wizard）：一次一題，答完產生計畫；每題可問 AI，顧問可附「建議答案」讓使用者一鍵填入。之後可用 header 的「修改目標」重開精靈（預填現值、可取消），儲存後進度與拆解全部保留。
- 五階段路線圖：探索驗證 → 起飛準備 → 落地營運 → 穩定成長 → 規模擴張。已離職者（employment=left）自動套用文案變體：第二關改「在跑道燒完前站穩」（生存跑道、止損條件），id 不變所以切換工作狀態不影響進度。每階段有可勾選的過關條件（goals）＋ 5–30 分鐘 micro-tasks。過關瞬間跳一次性慶祝彈窗（記錄在 `celebratedStageIds`，重新整理不重跳）。
- AI 創業顧問：使用者自備 API key（存瀏覽器獨立 key，不隨 Export 匯出），**雙供應商**依 key 前綴自動偵測——Anthropic（sk-ant-）分級 Haiku→Sonnet→Opus；Google Gemini（AIza,AI Studio 有免費額度）分級 Flash-Lite→Flash→Pro。Gemini 走瀏覽器 fetch 直連 generateContent。顧問可建議新任務／過關條件，使用者按「加入」採用。
- 目標遞迴拆解：每個過關條件（含子項目）旁有「問 AI」，顧問解釋怎麼達成、可拆成最多 5 個可勾選子項目，缺技能／資格時還可給最多 3 個 5–30 分鐘的訓練任務（採用後進該階段的每日任務輪替）（存在 `breakdowns`，可無限層遞迴）。有子項目的目標由子項目全勾自動完成，母項目 checkbox 變唯讀。AI 加入的項目（子項目、採用的過關條件）都可用「✕」移除，整個子樹一起清掉；子項目清空後母項目恢復可直接勾選。內建的階段條件不可移除。
- AI 成本防護欄（已寫死在 `advisor.js`）：每日 20 次呼叫上限、單次回覆 1024 tokens。
- **無 key 也要能用**（`localAdvisor.js`／`localGoalGuide.js`／`localQuestionHelp.js`）：以前沒 key 時四個 AI 入口全部回傳「(示範回覆)請設定 API key」,等於預設體驗是一份靜態清單加四顆死按鈕——而多數目標使用者根本不會去申請 key。現在沒 key 時改用規則顧問讀使用者自己的數字給診斷,輸出格式與 `parseAdvisorReply` 相同,所以「加入」按鈕照常運作;帶 `mock: true` 所以不會進 LLM 上下文也不算 API 額度。**加新的 AI 入口時,一定要一起給 `mockReply`**,否則會退回 `advisor.js` 的保底字串。
- 專業術語 / 街頭白話切換。
- 防呆：`loadState` 對每個欄位做型別檢查（壞掉的值退回預設）；全域 ErrorBoundary 提供「清除資料重新開始」而不是白屏。
- 財務生死線／離職線：成本**必須**分成 `businessFixedCost`（事業支出）和 `livingCost`（個人生活費）兩筆。在職者（`employment !== 'left'`）的生活費由薪水支付，**絕對不要併進生死線**——那會憑空捏造一筆赤字，然後每週回報使用者「進度落後」。在職者的主數字是離職線（事業養得起生活費要賣幾個），生死線只算事業支出；已離職者才把生活費併進生死線。`calculateMoneyLines` 一次算出全部並用 `leadingLine` 指出哪個該放大字，財務面板和每週回顧都讀它，不要各算各的。
- 每週回顧的措辭是「走了多遠」不是「配額差多少」：報這週毛利、目前速度換算月單量、事業本身賺不賺錢、以及離職進度的百分比＋進度條。舊版顯示「離週配額還差 N 個」，讓一個賣了 3 個的新手每週被判一次失敗，是實際的流失原因，不要改回去。
- 每週回顧＋顧問導航：每 ISO 週記一筆實際投入時數／賣出單位／心得（`weeklyReviews`，同週覆寫、最多留 12 週），對照生死線週配額並提示過勞風險。記完後可一鍵請顧問「診斷」：`buildDiagnosisPrompt` 餵入階段條件狀態＋最近 4 週實際數字＋週配額，指示顧問耐心、不責備、從現在位置設計走回階段目標的最短路徑，並可建議修正用的任務／條件（可採用）。這是「AI 依實際達成狀況規劃走向」的閉環。
- 今日 micro-task：依照今天可用分鐘數，只顯示一個可以做的小任務；「換一個」可輪替到下一個合適任務（`taskRotation`，持久化），並顯示本階段任務完成度。完成任務會記進 `taskLog`（每日計數），顯示 🔥 連續天數（今天還沒做時以昨天為止計算，取消勾選會扣回）。
- 任務重複週期（`task.repeat`：`once`／`daily`／`weekly`）：一次性任務是設定工作（寫下固定成本），做完就退場；`daily`／`weekly` 是引擎（開口報價、約訪談、看數字），隔天或下週自動回到清單。**這是 app 能不能被長期使用的關鍵**——每階段的過關條件要幾週到幾個月，但一次性任務只有 5–9 個，沒有重複任務的話第一關 9 天就空了，使用者打開只會看到空狀態然後流失。改 `STAGE_TEMPLATES` 時每個階段至少要留 1 個 `daily`（有測試守住）。重複任務的完成紀錄存在 `recurringLog`（`{ [taskId]: { last, count } }`），不進 `completedTaskIds`。
- 空狀態分流：「有任務但塞不進今天分鐘數」和「今天的份做完了」是兩件事，文案不同（`noTaskFitsToday` / `allTasksDoneToday`）。以前兩者都顯示「今天時間太少」，任務用完的人被誤導成調時間，是實際的流失原因，不要合併回去。
- 實績驅動進度（`evidence.js`）：每週回顧的真實數字自動完成對應過關條件（賣出 ≥1 個 → `explore-g4`；最近 4 週合計 ≥ 生死線月單量 → `operate-g3`）。這是全 app 唯一不能自己打勾的進度來源——其他所有完成度都是使用者自評，連續天數和進度條可以在營收 0 元的情況下漂亮地跑。已達成的條件存進 `evidenceGoalIds` 永久保留（單向棘輪：回顧只留 12 週，第一筆付款那週滾出視窗後不能倒退），UI 標示「實績達成」且 checkbox 唯讀。
- 產業無感 schema：底層只用 `productId`、單位經濟、抽象 operating nodes；使用者的產業只存在 `profile.idea` 這個字串。
- 最小 Org-Tree：可複製節點、解鎖管理節點；卡片依目前階段顯示提示（第 5 關「規模擴張」時提示在此開第二據點）。

### 暫時不要做

- 不要加登入。
- 不要加正式資料庫。
- 不要加後端 API。
- 不要加金流。
- 不要加大型狀態管理庫。
- 不要加複雜 graph canvas。
- 不要移除或放寬 AI 成本防護欄（每日上限、token 上限、無 key 時走本機顧問而不是硬要連網）。
- 不要把 API key 放進可 Export 的 app state（它存在獨立的 `venturequest:apikey:v1`）。
- 不要把任何產業詞寫進底層 schema，例如 `foodCost`、`menuItem`、`roomNight`。

## 1.5 佈署狀態

- 佈署平台：Netlify（`netlify.toml` 已在 repo 根目錄：Node 22、`npm run build`、發佈 `dist/`）。
- PWA：`public/manifest.webmanifest`＋圖示（192/512），可「加入主畫面」standalone 開啟。**刻意不加 service worker**——離線快取會造成舊版 bundle 卡住的問題，對頻繁更新的 app 是負資產,不要加。
- 連接方式：Netlify → Add new site → Import an existing project → 選 `key8745-netizen/VentureQuest`，之後每次 push `main` 自動佈署。
- 沒有其他基礎設施：無網域、無環境變數、無 serverless functions。

## 1.6 給接手模型的任務分級

這個 repo 的架構刻意簡單，大多數後續任務**不需要高階模型**。開新 session 前先看這裡：

**適合 Haiku / 低階模型（機械性、範圍明確）：**

- 改文案、加 `terminology.js` 的詞條（記得 PRO/PLAIN 兩種都要寫）。
- 加更多 micro-task 模板到 `stagePlanner.js` 的 `STAGE_TEMPLATES`（每個任務 5–30 分鐘，先補測試）。
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
npm run qa:mobile   # 手機版截圖 QA(見下)
```

### Mobile screenshot QA

`scripts/mobile-qa.mjs` 用 Playwright 在 390×844 視窗走完整流程(精靈、問 AI、拆解、streak、每週回顧＋診斷、dossier、專業模式),截 10 張全頁圖到 `qa-screenshots/`(已 gitignore)。全程 mock 模式,0 成本離線可跑:

```bash
npm run build && npm run preview &
npm install --no-save playwright   # 刻意不進 devDependencies,避免拖累安裝
npm run qa:mobile
# 沙箱/CI 有預裝瀏覽器時:CHROMIUM_PATH=/path/to/chromium npm run qa:mobile
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
src/models/evidence.js
src/models/migrate.js
src/models/momentum.js
src/models/weeklyReview.js
src/models/skillTree.js
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
- `advisorHistories`：每個對話（`stage:*`／`goal:*`／`wizard:*`）的持久化歷史，每個最多留 10 輪；「已加入」旗標存在輪次上，重新整理後按鈕保持鎖定。
- 專業 / 白話模式切換、Reset（含 confirm）、Export / Import JSON。

### `src/components/`

- `OnboardingWizard.jsx`：一次一題的引導問答＋每題「問 AI」＋計畫摘要。
- `QuestTracker.jsx`：五階段地圖、過關條件勾選、progress bar、單一 micro-task。
- `AdvisorPanel.jsx`：API key 管理＋目前階段的顧問對話。
- `WeeklyReview.jsx`：每週回顧表單、毛利與離職進度、實績達成清單、顧問導航。
- `AdvisorChat.jsx`：共用聊天元件（精靈與儀表板都用），含「加入」建議按鈕。
- `FinancialPanel.jsx`：事業支出／生活費／單價／單位成本四格輸入,依 `leadingLine` 決定放大字的是離職線還是生死線。
- `OrgTreePreview.jsx`：Org-Tree 顯示、複製節點、解鎖管理節點。

### `src/models/financialGuardrails.js`

核心財務邏輯：

- `calculateSurvivalLine({ monthlyFixedCost, unitPrice, unitCost })`:純損益兩平原語,不管成本從哪來。
- `calculateTargetLine({ ..., targetMonthlyIncome })`：目標收入所需單量。
- `resolveFixedCosts({ businessFixedCost, livingCost, employment })`:決定哪些成本算進生死線（只有已離職者要把生活費算進去）。
- `calculateMoneyLines({...})`:一次算出 `survivalUnits`／`replacementUnits`／`targetUnits`＋`leadingLine`（`survival`｜`replacement`｜`none`）。**UI 一律讀這個**,不要自己拼生死線,否則面板和週回顧會講出不同數字。
- `describeWeeklyProgress({ units, lines })`:一週實際數字→毛利、月速度、事業是否已自給、離職進度百分比。刻意不回傳「還差幾個配額」。
- `suggestAfterWorkPace({ weeklyHours, weeklyUnits })`
- `WEEKS_PER_MONTH`（4.33）:所有週↔月換算共用,不要再各自寫 4.33。

設計原則：只看單位經濟，不看產業。

### `src/models/onboarding.js`

引導問答流程：

- `QUESTION_FLOW`：8 題（idea、employment、**事業固定成本**、**個人生活費**、單價、成本、週時數、目標收入）。成本拆兩題是刻意的,合併回一題就會重蹈「在職者被算錯生死線」的覆轍。
- `isAnswerValid(question, value)`、`createProfile(answers)`。

### `src/models/stagePlanner.js`

五階段路線圖與進度：

- `buildStagePlan({ profile, customizations })`：五階段（explore/prepare/operate/grow/scale），每階段 goals（過關條件）＋ tasks（5–30 分鐘，帶 `repeat` 週期）。
- `REPEAT`：`once` / `daily` / `weekly`。
- `isTaskChecked({ task, completedTaskIds, recurringLog, today })`：依週期讀正確來源。
- `getAvailableTasks({...})`：本階段還能做的（不看分鐘數）；`getTodayMicroTasks` 是它再過濾分鐘數。兩者分開才能分辨兩種空狀態。
- `recordRecurringTask(recurringLog, taskId, today, done)`：記錄／取消今天（本週）做過。
- `isGoalComplete({ goalId, completedGoalIds, breakdowns })`：遞迴判斷,有子項目的目標由子項目決定。
- `removeBreakdownItem(breakdowns, itemId)`：移除項目與其整個子樹;父項目清空後恢復可直接勾選。
- `getUncelebratedStage({ plan, completedGoalIds, breakdowns, celebratedStageIds })`：驅動一次性過關彈窗。
- `getActiveStage({ plan, completedGoalIds, breakdowns })`：goals 全部完成才進下一階段。
- `getTodayMicroTasks({ plan, completedGoalIds, completedTaskIds, availableMinutes, breakdowns })`
- `toggleId(ids, id)`、`calculatePlanProgress({ plan, completedGoalIds, breakdowns })`

### `src/models/advisor.js`

AI 顧問（純函式可測，網路呼叫只在瀏覽器跑）：

- `detectProvider(apiKey)`／`pickModelForStage(stageId, apiKey)`／`sanitizeApiKey`：依 key 前綴選供應商與分級模型;key 清成可見 ASCII。
- `buildDossier({...})`：使用者完整狀態檔（方向、即時財務＋生死線／目標線、旅程進度、已完成階段、執行力 streak、最近 4 週實際數字），stage／goal／diagnosis 提示詞都優先讀它（diagnosis 有 dossier 時不重複附回顧區塊）;AdvisorPanel 提供「查看顧問看到的完整狀態」透明檢視＋「複製狀態」按鈕（可貼到任何 AI 接續諮詢）。
- `buildGeminiPayload`：Gemini generateContent 請求體（assistant→model 角色映射、token 上限）。
  - 模型 ID `gemini-2.5-flash-lite` / `gemini-2.5-flash` / `gemini-2.5-pro` 已於 2026-07 對官方文件驗證過:三者都存在且免費層可用（每日各約 1000／250／100 次,遠高於我們的 20 次上限）。Gemini 3 系列當時只有 preview ID 且資訊混亂,刻意不採用;下次升級模型前先查 ai.google.dev/gemini-api/docs/models。
- `buildStagePrompt` / `buildQuestionPrompt` / `buildGoalPrompt`：系統提示詞。stage/goal 版吃財務面板的即時數字（蓋過精靈快照），stage 版並附每個過關條件的完成狀態（含拆解進度），明確要求不重複建議已完成的事。
- `parseAdvisorReply(text)`：解析 JSON 回覆，clamp：最多 3 任務（5–30 分鐘）、2 目標、5 個拆解步驟；answer 只接受非負數字或 80 字內字串。
- `canAskToday` / `recordCall` / `DAILY_CALL_LIMIT`：每日呼叫上限。
- `capHistory` / `buildMessages`：每個對話最多存 10 輪；呼叫 API 只帶最近 6 輪真實對話（mock 不算）。
- `buildDiagnosisPrompt({...reviews, weeklyNeed})`：每週導航診斷的提示詞。
- `askAdvisor({...})`：真正的 API 呼叫；無 key 回傳寫死 mock。
- `describeAdvisorError(err)`：把常見 API 錯誤翻成白話（餘額不足、401、429、5xx）。

### `src/models/migrate.js`

舊版 state 的就地遷移（全部資料在使用者瀏覽器裡,沒有後端 backfill,回訪使用者的 state 必須永遠能載入）:

- `migrateCosts(source)`:舊的單一 `monthlyFixedCost` → `livingCost`（舊問法寫的是「房租、貸款」,本質是生活費）,`businessFixedCost` 補 0,並標記 `costsSplitPending` 讓面板跳一次確認提示。低估事業支出是安全的錯誤方向——寧可生死線樂觀,也不要無中生有一筆赤字。
- `migrateState(state)`:對 `financial` 和 `profile` 都跑一次。冪等。
- 在 `loadState` 裡呼叫,新增遷移就加在這裡,不要散在元件。

### `src/models/localAdvisor.js`／`localGoalGuide.js`／`localQuestionHelp.js`

沒有 API key 時的顧問（純規則,0 成本,不連網）:

- `localAdvice({ profile, financial, weeklyReviews, taskLog })`:讀使用者實際數字,依優先序挑一條診斷（單位經濟虧損 > 有投入沒收入 > 沒資料 > 賣過但停滯 > 未達事業損益兩平 > 已獲利爬升）,再視情況附一則提醒（過勞／連續中斷）。回傳 `{ reply, tasks, goals, steps, mock: true }`。診斷文案一律引用使用者的真實數字,不要寫成通用雞湯——那正是它取代掉的東西。
- `localGoalGuide(goalId)`:19 個內建過關條件的手寫拆解（固定集合,不需要模型）。找不到就退到通用拆法。加新的內建 goal 時要一起補（有測試守住）。
- `localQuestionHelp(questionId, answers)`:8 題精靈的手寫說明,能從已填答案推導時附「建議答案」一鍵填入（例如售價 = 成本 × 2、目標收入 = 生活費）。**推不出來就不要給數字**,寧可只給說明。

### `src/models/evidence.js`

實績驅動進度（唯一不能自評的進度來源）:

- `deriveEvidence({ reviews, financial })`:回傳 `[{ goalId, label, reason }]`,reason 是給使用者看的理由（哪一週、賣了幾個）。
- `accrueEvidence({ earnedGoalIds, reviews, financial })`:單向 union,沒有新東西時回傳同一個陣列（呼叫端可省下 state 寫入）。
- 加新規則時要保守:「賣出單位數」不等於「不重複付費客戶數」,不要用單量去證明客戶數類的條件。

### `src/models/momentum.js`

每日習慣動力:

- `localDayKey(date)` / `parseDayKey(key)`:本地日期字串互轉（`advisor.todayKey` 也委派到這裡,不要再各自實作一份 UTC 版）。
- `bumpTaskLog(taskLog, date, delta)`:每日完成計數,不會為負。
- `computeStreak(taskLog, today)`:連續天數(今天沒做以昨天為終點)。

### `src/models/weeklyReview.js`

每週回顧:

- `getWeekLabel(date)`:ISO 週標籤(例 `2026-W28`)。
- `upsertReview(reviews, entry)`:同週覆寫、最多留 12 週。

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

目前測試覆蓋（105/105 pass）：

- 任務重複週期：每階段至少 1 個 daily、daily 隔天回來但當天不回來、weekly 撐完整個 ISO 週、取消勾選釋放任務、清空所有一次性任務後仍有事可做、「沒時間」與「沒任務」可分辨。
- 實績驅動：0 單量不算數、賣出 1 個完成第一筆付款條件、四週合計達生死線才算損益平衡（週數不足或單量不足都不算）、虧損模型永遠不成立、回顧滾出視窗後已達成條件不倒退。
- 成本拆分：在職者的生死線只含事業支出、離職者才含生活費、彈性工時仍算有薪水、目標線永遠 ≥ 離職線、負數輸入不會縮小門檻、小週次讀成進度百分比而非配額缺口、dossier 明確告訴顧問不要把生活費算進生死線。
- 遷移：舊 `monthlyFixedCost` 落到生活費、冪等、髒資料不炸、profile 與 financial 都遷移、進度不遺失。
- 本機顧問：虧損診斷優先於一切、引用真實時數與單量、無資料時要資料而非亂猜、獲利者看到離職進度百分比、提醒不會蓋掉主診斷、輸出永遠符合採用按鈕的 clamp、19 個內建 goal 都有拆解、精靈建議答案通過自己欄位的驗證。
- 迴歸：精靈摘要不會因為欄位改名而印出 NaN（`calculateMoneyLines` 對 `createProfile` 產出的 profile 全欄位有限）。

- 財務生死線、虧錢模型拒絕、在職節奏風險判斷。
- 引導問答：題目順序、答案驗證、profile 產生（含探索分支與 schema 檢查）。
- 五階段路線圖：階段結構、目標全勾才解鎖下一階段、今日 micro-task 篩選、顧問建議合併、進度計算、拆解子項目的遞迴完成與階段解鎖。
- AI 顧問：模型分級、提示詞內容、回覆解析（JSON／純文字／code fence）、建議 clamp、每日上限與跨日重置、對話歷史裁剪與 API 上下文組裝（排除 mock、限最近 6 輪）。
- Org-Tree：產業無感節點、子樹複製、管理節點解鎖。
- 文案模式切換與 fallback（含顧問時代新增的 UI 詞條）。

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
- [x] 顧問對話歷史持久化（per-context、10 輪上限、採用狀態一併保存）。
- [x] 精靈問答的 AI 建議答案一鍵填入。
- [x] 更多 micro-task 模板（prepare +2、operate/grow/scale 各 +1）。
- [x] Mobile screenshot QA 自動化（`npm run qa:mobile`）。
- [x] 顧問提示詞帶即時財務數字與過關條件完成狀態。
- [x] 白話／專業切換覆蓋顧問、精靈、拆解等新 UI。
- [x] AI 加入的子項目與過關條件可移除（含子樹遞迴清除）。
- [x] 過關一次性慶祝彈窗。
- [x] 生死線↔目標收入連動（目標線）。
- [x] 目標拆解可給訓練任務（缺技能／證照時進每日任務）。
- [x] 每週回顧儀式。
- [x] 「修改目標」重開精靈（保留進度）。
- [x] loadState 型別防呆＋全域 ErrorBoundary。
- [x] README。
- [x] 今日任務「換一個」輪替＋本階段任務計數。
- [x] 每週顧問導航診斷（實際數字→走偏判斷→修正路徑）。
- [x] 🔥 連續天數 streak＋Org-Tree 階段提示。
- [x] 顧問 API 錯誤白話化。
- [x] Gemini 雙供應商支援（key 前綴自動偵測、免費額度友善）。
- [x] PWA 加入主畫面（manifest＋圖示,無 SW）。
- [x] 已離職者的階段文案變體（跑道框架）。
- [x] API key 隱形字元自動清除＋供應商偵測顯示。
- [x] 使用者完整狀態檔（dossier）餵入顧問＋透明檢視。
- [x] 審計修正:每日日界線改用本地時間（時區 bug）、每週回顧跨週自動重設輸入框、Gemini 模型 ID 對官方文件驗證。

- [x] 任務重複週期（daily/weekly）＋空狀態分流:解掉「第一關 9 天就沒東西可做」。
- [x] 實績驅動進度（`evidence.js`）:週回顧的真實數字自動完成過關條件。
- [x] 成本拆成事業支出／個人生活費,在職者改用離職線,每週回顧改成進度而非配額缺口（含舊 state 就地遷移）。
- [x] 無 API key 的本機規則顧問（診斷／目標拆解／精靈說明）,取代四個「請設定 key」死路。

### 下一步（來自 2026-08 產品體檢，按影響排序）

這些是體檢出來、**還沒做**的問題。上面四項（每天有事做、實績驅動進度、成本拆分、無 key 也有顧問）已經處理掉最大的流失原因，剩下的照順序做：

1. **首頁重複**：`SkillTree` 和 `QuestTracker` 的階段地圖顯示幾乎同一份資訊；`OrgTreePreview` 的抽象節點（Operating Unit / Value Delivery）對「想賣出第一個便當」的人沒有意義。考慮砍掉或合併，首頁收斂成三塊：今天做什麼／這個月賺多少／下一關差什麼。
2. **小瑕疵**：`suggestAfterWorkPace` 算出的 `recommendedWeeklyUnits` 從沒顯示過（只用到 >15 小時的過勞門檻）；`profile.weeklyHours` 除了餵給 AI 之外不影響任何規劃；Import JSON 沒有任何驗證就 spread 進 state。

## 8. 核心商業原則

- 先求能動，不求完整。
- 先求使用者看懂，不求架構漂亮。
- 在職者時間比功能重要。
- 任務要小到今天真的能做。
- Schema 必須支援換產業，不支援行業鎖死。
- 任何新功能都要問：是否幫使用者今天往前推 5 到 30 分鐘？
