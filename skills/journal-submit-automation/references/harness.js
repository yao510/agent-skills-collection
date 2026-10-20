// AI 专用浏览器 harness —— 独立 chromium + 持久化 profile，与用户日常浏览器隔离
// 登录态存在 AI_PROFILE（默认本目录 profile），关浏览器不丢。
//
// 依赖: playwright-core（运行前用 NODE_PATH 指向受管 node workspace 的 node_modules）
// 用法(作为库): const { launchAI, dump, allText } = require('./harness.js');
// 用法(CLI): node harness.js nav <url> | dump <url> | text <url>
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright-core');

const CHROME = process.env.CHROME_PATH || '<chromium 路径>';
const PROFILE = process.env.AI_PROFILE || path.join(__dirname, 'profile');
const SHOTS = process.env.SHOTS_DIR || path.join(__dirname, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });

async function launchAI(opts = {}) {
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    executablePath: CHROME,
    headless: opts.visible === false,
    args: ['--no-sandbox', '--disable-popup-blocking', '--disable-blink-features=AutomationControlled'],
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
    ignoreHTTPSErrors: true,
    locale: 'zh-CN',
  });
  const page = ctx.pages()[0] || await ctx.newPage();
  page.on('dialog', async d => { console.log('[dialog]', d.message().slice(0, 200)); await d.accept().catch(() => {}); });
  return { ctx, page, close: async () => { try { await ctx.close(); } catch (e) {} } };
}

async function dump(page, limit = 60) {
  const targets = [page, ...page.frames().filter(f => f !== page.mainFrame())];
  const out = [];
  for (const t of targets) {
    const recs = await t.evaluate((lim) => {
      const res = [];
      document.querySelectorAll('input,select,textarea,button,a').forEach(e => {
        if (res.length >= lim) return;
        const type = (e.getAttribute('type') || '').toLowerCase();
        if (type === 'hidden') return;
        const st = getComputedStyle(e);
        if (st.display === 'none' || st.visibility === 'hidden') return;
        let label = '';
        if (e.id) { const l = document.querySelector(`label[for="${e.id}"]`); if (l) label = l.innerText.replace(/\s+/g, ' ').trim().slice(0, 70); }
        res.push({ tag: e.tagName, type, id: e.id || '', name: e.name || '', value: (e.value || '').slice(0, 100), text: (e.innerText || '').trim().slice(0, 60), href: (e.getAttribute('href') || '').slice(0, 120), label });
      });
      return res;
    }, limit).catch(() => []);
    if (recs.length) out.push({ frame: t === page ? '(main)' : t.url().slice(0, 90), recs });
  }
  return out;
}

async function allText(page, n = 3000) {
  let s = '';
  const targets = [page, ...page.frames().filter(f => f !== page.mainFrame())];
  for (const t of targets) {
    const x = await t.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 3000)).catch(() => '');
    if (x) s += `\n--- ${t === page ? '(main)' : t.url().slice(0, 90)} ---\n${x}\n`;
  }
  return s.slice(0, n);
}

module.exports = { launchAI, dump, allText, CHROME, PROFILE, SHOTS };

if (require.main === module) {
  const [cmd, url] = process.argv.slice(2);
  (async () => {
    const s = await launchAI({ visible: true });
    const page = s.page;
    try {
      if (url) { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); await page.waitForTimeout(4000); }
      if (cmd === 'dump') console.log(JSON.stringify(await dump(page), null, 1));
      else if (cmd === 'text') console.log(await allText(page));
      else { const f = path.join(SHOTS, 'shot_' + Date.now() + '.png'); await page.screenshot({ path: f, fullPage: true }); console.log('[shot]', f); if (url) console.log('[text]', (await allText(page, 1500))); }
    } catch (e) { console.log('[ERROR]', e.message.split('\n')[0]); }
    finally { await s.close(); }
  })();
}
