// Snapp 原始 HTML 探针：确认页面是否有未渲染的隐藏稿号字段（铁律 2 的复核手段）
// 参数(env): SN_SUB(UUID) / SN_EMAIL / SN_PASS / AI_PROFILE
// 运行: NODE_PATH=<node_modules> node snapp_probe.js
const path = require('path');
const fs = require('fs');
const { launchAI } = require('./harness.js');
const { emailLogin } = require('./login_snapp.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SUB = process.env.SN_SUB || '';

(async () => {
  const s = await launchAI({ visible: false });
  const page = s.page;
  const out = { ts: new Date().toISOString(), hits: {}, error: null };
  try {
    await emailLogin(page, process.env.SN_EMAIL, process.env.SN_PASS);
    const url = SUB ? `https://submission.springernature.com/submission-details/${SUB}` : 'https://submission.springernature.com/your-submissions';
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await sleep(9000);
    const html = await page.content().catch(() => '');
    fs.writeFileSync(path.join(__dirname, 'sn_details.html'), html);
    const grab = (re) => [...new Set(html.match(re) || [])].slice(0, 20);
    out.hits.msNumber = grab(/\b[A-Z]{2,6}[A-Z0-9]*-[A-Z0-9]{1,4}-[A-Z0-9]{3,8}\b/g);
    out.hits.manuscriptField = grab(/manuscript[- _]?(?:number|no|id|reference)[^,<]{0,80}/gi);
    out.hits.anyNumberLabel = grab(/(?:reference|ms|manuscript)[- ]?(?:no|number|id)["'\s:>]{1,6}[A-Za-z0-9\-]{4,}/gi);
    out.hits.submissionIdSeen = SUB ? (html.match(new RegExp(SUB, 'g')) || []).length : 'n/a';
    console.log(JSON.stringify(out.hits, null, 1));
  } catch (e) {
    out.error = e.message.split('\n')[0];
    console.log('[ERROR]', out.error);
  } finally {
    fs.writeFileSync(path.join(__dirname, 'sn22_receipt.json'), JSON.stringify(out, null, 2));
    await s.close();
  }
})();
