// Mobile screenshot QA — walks the whole app at a phone viewport and
// drops screenshots into qa-screenshots/ for eyeballing layout issues.
//
// Requires the preview server and playwright (dev-only, not a project
// dependency to keep installs light):
//
//   npm run build && npm run preview &
//   npm install --no-save playwright
//   node scripts/mobile-qa.mjs
//
// Runs entirely in mock mode (no API key), so it is free and offline.

import { mkdirSync } from 'node:fs';

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('playwright 未安裝。先執行:npm install --no-save playwright');
  process.exit(1);
}

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4173';
const OUT_DIR = 'qa-screenshots';
mkdirSync(OUT_DIR, { recursive: true });

// CHROMIUM_PATH lets CI/sandboxes point at a pre-installed browser
// instead of downloading one via `npx playwright install`.
const executablePath = process.env.CHROMIUM_PATH;
const browser = await chromium.launch(
  executablePath ? { executablePath } : {},
);
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', (err) => errors.push(String(err)));

let shot = 0;
const snap = async (name) => {
  shot += 1;
  const path = `${OUT_DIR}/${String(shot).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`✓ ${path}`);
};

await page.goto(BASE_URL);
await page.waitForSelector('.wizard');
await snap('wizard-q1');

// Wizard question helper (mock)
await page.click('button:has-text("問 AI")');
await page.fill('.advisor-input-row input', '怎麼描述我的副業?');
await page.click('.advisor-input-row button');
await page.waitForSelector('.advisor-reply');
await snap('wizard-helper');

// Walk the wizard
await page.fill('.wizard-input', '便當店');
await page.click('.wizard-actions button.primary');
await page.click('.wizard-choices .choice:first-child');
for (const value of ['30000', '100', '55', '8', '30000']) {
  await page.fill('.wizard-input', value);
  await page.click('.wizard-actions button.primary');
}
await snap('wizard-summary');

await page.click('.wizard-actions button.primary');
await page.waitForSelector('.stages');
await snap('dashboard');

// Goal breakdown (mock)
const firstGoal = page.locator('.stage-goals > li').first();
await firstGoal.locator('.goal-row button.mini').click();
await firstGoal.locator('.advisor-input-row input').fill('我不會這個');
await firstGoal.locator('.advisor-input-row button').click();
await firstGoal.locator('.advisor-reply').waitFor();
await firstGoal.locator('.advisor-steps button.mini').click();
await firstGoal.locator('.goal-children li').first().waitFor();
await snap('goal-breakdown');

// Stage advisor (mock)
const advisorCard = page.locator('.card:has(h2:has-text("AI 創業顧問"))');
await advisorCard.locator('.advisor-input-row input').fill('第一步該做什麼?');
await advisorCard.locator('.advisor-input-row button').click();
await advisorCard.locator('.advisor-reply').waitFor();
await snap('stage-advisor');

// PRO terminology mode
await page.click('button:has-text("切換成專業")');
await snap('pro-mode');

await browser.close();

if (errors.length) {
  console.error('頁面錯誤:\n' + errors.join('\n'));
  process.exit(1);
}
console.log(`完成:${shot} 張截圖在 ${OUT_DIR}/`);
