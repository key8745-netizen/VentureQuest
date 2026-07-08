# VentureQuest 勇闖人生

**0 成本、純前端、資料只存在你的瀏覽器**的在職創業 prototype。給還在上班的新手：先看會不會死（財務生死線），再做今天那一小步（每日 5–30 分鐘的 micro-task）。

## 核心功能

- **引導式問答**：一次一題建立你的計畫；每題可問 AI，建議答案一鍵填入。
- **五階段路線圖**：探索驗證 → 起飛準備 → 落地營運 → 穩定成長 → 規模擴張。每階段有可勾選的過關條件，全勾自動進下一關（有過關慶祝）。
- **AI 創業顧問**：依階段自動分級選模型（早期 Haiku、中期 Sonnet、後期 Opus）。顧問知道你的即時財務數字與完成進度。
- **目標遞迴拆解**：做不到的條件按「問 AI」，顧問解釋並拆成子項目；缺技能／證照時給每日訓練任務。AI 加的項目都可移除。
- **財務生死線＋目標線**：不賠錢每月要賣幾個；要賺到目標收入每月要賣幾個。
- **每週回顧**：記錄實際投入與賣出，對照生死線週配額，提示過勞風險。
- **白話／專業雙語文案**：一鍵切換。

## 快速開始

```bash
npm install
npm run dev     # 開發
npm test        # 測試（Node built-in test runner）
npm run build   # 打包到 dist/
```

## AI 顧問設定

不設定也能用（顯示示範回覆）。要啟用真實 AI，支援兩種 key，貼上自動辨識：

- **Google Gemini（免費）**：到 [aistudio.google.com](https://aistudio.google.com) 申請 key（`AIza` 開頭），有免費額度。分級：Flash-Lite → Flash → Pro。
- **Anthropic Claude（付費）**：到 [console.anthropic.com](https://console.anthropic.com) 申請 key（`sk-ant-` 開頭）並儲值。分級：Haiku → Sonnet → Opus。

key 只存在你的瀏覽器（獨立 localStorage 項目，**不會**隨 Export JSON 匯出），直連官方 API，不經過任何伺服器。寫死的費用防護欄：每天最多 20 次、單次回覆 1024 tokens、對話上下文最多帶最近 6 輪。

## 佈署

Netlify：Import 這個 repo 即可（`netlify.toml` 已設定，push `main` 自動佈署）。無後端、無環境變數。

## 給接手的 AI／開發者

架構、開發守則（不加後端、產業無感 schema、tests-first）、任務分級指南都在 [`docs/CLAUDE_HANDOFF.md`](docs/CLAUDE_HANDOFF.md)。
