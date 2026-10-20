// Snapp 提交后取真实稿号：your-submissions 列表 → 详情页 → 正则抓 XXX-D-26-XXXXX
// 参数(env): SN_SUB(UUID, 可选) / SN_EMAIL / SN_PASS / AI_PROFILE
// 运行: NODE_PATH=<node_modules> node snapp_getid.js
const path = require('path');
const fs = require('fs');
const { launchAI, SHOTS } = require('./harness.js');
const { emailLogin } = require('./login_snapp.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SUB = process.env.SN_SUB || '';

(async () => {
  const s = await launchAI({ visible: false });
  const page = s.page;
  const receipt = { ts: new Date().toISOString(), sub: SUB, steps: [], error: null };
  try {
    const l = await emailLogin(page, process.env.SN_EMAIL, process.env.SN_PASS);
    receipt.steps.push({ login: l });

    await page.goto('https://submission.springernature.com/your-submissions', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await sleep(9000);
    await page.getByText('Accept all cookies', { exact: false }).first().click({ timeout: 5000 }).catch(() => {});
    await sleep(3000);

    const txt = await page.evaluate(() => document.body.innerText.replace(/[ \t]+/g, ' ')).catch(() => '');
    const ids = [...new Set((txt.match(/\b[A-Z][A-Z0-9]{1,6}-[A-Z0-9]{1,4}-[A-Z0-9]{2,8}\b/g) || []))];
    const links = await page.evaluate(() => Array.from(document.querySelectorAll('a')).map(a => ({ t: (a.innerText || '').trim().slice(0, 70), h: a.getAttribute('href') })).filter(x => x.h && /submission|manuscript|track|progress|draft/i.test(x.h + ' ' + x.t))).catch(() => []);
    receipt.steps.push({ listText: txt.slice(0, 4000), ids, links });
    await page.screenshot({ path: path.join(SHOTS, 'sn_yoursubs.png'), fullPage: true }).catch(() => {});

    const target = links.find(x => SUB && x.h && x.h.includes(SUB)) || links.find(x => /submission\//.test(x.h || ''));
    if (target) {
      await page.goto(new URL(target.h, 'https://submission.springernature.com').href, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
      await sleep(9000);
      const t2 = await page.evaluate(() => document.body.innerText.replace(/[ \t]+/g, ' ')).catch(() => '');
      const ids2 = [...new Set((t2.match(/\b[A-Z][A-Z0-9]{1,6}-[A-Z0-9]{1,4}-[A-Z0-9]{2,8}\b/g) || []))];
      receipt.steps.push({ detailUrl: page.url(), detailText: t2.slice(0, 3000), ids2 });
      await page.screenshot({ path: path.join(SHOTS, 'sn_track.png'), fullPage: true }).catch(() => {});
      console.log('[ids]', JSON.stringify(ids2));
    }
    console.log('[list ids]', JSON.stringify(ids));
    console.log('[DONE]');
  } catch (e) {
    receipt.error = e.message.split('\n')[0];
    console.log('[ERROR]', e.message.split('\n')[0]);
  } finally {
    fs.writeFileSync(path.join(__dirname, 'sn20_receipt.json'), JSON.stringify(receipt, null, 2));
    console.log('[RECEIPT] sn20_receipt.json');
    await s.close();
  }
})();
