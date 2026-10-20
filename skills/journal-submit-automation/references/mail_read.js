// 读 QQ 收件箱（用 AI_PROFILE 指向的 profile，建议是副本——见 profile_copy.js）
// 输出结构化条目 + 全量文本，存 mail_list_<日期>.txt 到 SHOTS_DIR。
// 参数(env): AI_PROFILE(指向副本) / SHOTS_DIR / MAIL_URL(默认 mail.qq.com)
// 运行: NODE_PATH=<node_modules> AI_PROFILE=<浏览器profile副本> node mail_read.js
const fs = require('fs');
const path = require('path');
const { launchAI, SHOTS } = require('./harness.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const s = await launchAI({ visible: false });
  const page = s.page;
  let log = '';
  const add = t => { log += t + '\n'; console.log(t); };
  const date = new Date().toISOString().slice(0, 10);
  try {
    await page.goto(process.env.MAIL_URL || 'https://mail.qq.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(7000);
    for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, 3000).catch(() => {}); await sleep(1500); }
    const items = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('div, li').forEach(el => {
        const t = (el.innerText || '').replace(/\s+/g, ' ').trim();
        if (t.length > 12 && t.length < 200) out.push(t);
      });
      return out.slice(0, 80);
    }).catch(() => []);
    add('=== 列表条目 (' + items.length + ') ===');
    items.forEach((t, i) => add(i + '. ' + t));
    const full = await page.evaluate(() => (document.body ? document.body.innerText : '').replace(/\n{2,}/g, '\n')).catch(() => '');
    add('\n=== 全量文本 (' + full.length + ' 字符) ===');
    add(full.slice(0, 12000));
    const out = path.join(SHOTS, `mail_list_${date}.txt`);
    fs.writeFileSync(out, log, 'utf8');
    add('[已存] ' + out);
  } catch (e) {
    add('[ERROR] ' + e.message.split('\n')[0]);
  } finally {
    await s.close();
  }
})();
