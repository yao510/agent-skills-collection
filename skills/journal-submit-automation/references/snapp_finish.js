// Snapp 投稿收尾通用模板：登录 → 复核作者 → 填 Declarations → Next → Review → Submit → 抓稿号 → 截图+收据
// 含 429 限流自愈：命中限流则休眠到 SN_RESET 时刻后重试，绝不重头提交。
//
// 参数(env): SN_SUB(UUID, 必填) / SN_EMAIL / SN_PASS / SN_DATA_AVAIL(数据可得性声明原文) /
//            SN_RESET(429 重置时刻 ISO, 默认 now+35min) / AI_PROFILE / SHOTS_DIR
// 参数(argv): node snapp_finish.js <UUID>  （UUID 也可经 argv 传入）
//
// 运行: NODE_PATH=<node_modules> node snapp_finish.js <UUID>
const path = require('path');
const fs = require('fs');
const { launchAI, allText, dump, SHOTS } = require('./harness.js');
const { emailLogin } = require('./login_snapp.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const SUB = process.argv[2] || process.env.SN_SUB;
if (!SUB) { console.error('[FAIL] 必须提供 Submission UUID: SN_SUB=... 或 argv[2]'); process.exit(2); }

const DATA_AVAIL = process.env.SN_DATA_AVAIL ||
  'All data, code, and scripts cited in this paper are published with the manuscript; every reading is recomputable by a third party from the timestamped persistent artifacts.';
const RESET_MS = process.env.SN_RESET ? new Date(process.env.SN_RESET).getTime()
  : Date.now() + 35 * 60 * 1000;

const isThrottle = (txt) => /429|频率限制|使用量已超出|too many requests/i.test(txt || '');
async function waitIfThrottled(page, label) {
  let txt = await page.evaluate(() => document.body.innerText).catch(() => '');
  if (!isThrottle(txt)) return false;
  const wait = Math.max(RESET_MS - Date.now(), 30000) + 2000;
  console.log(`[${label}] 检测到限流(429)，休眠 ${(wait/1000/60).toFixed(1)} 分钟后重试…`);
  await sleep(wait);
  return true;
}
const click = async (page, sel) => {
  const el = await page.$(sel);
  if (!el) return 'missing ' + sel;
  await el.click({ force: true }).catch(async () => { await page.evaluate(s => { const e = document.querySelector(s); if (e) e.click(); }, sel); });
  await sleep(1200);
  const st = await page.evaluate(s => { const e = document.querySelector(s); return e ? (e.checked || '') : 'n/a'; }, sel).catch(() => '?');
  return 'clicked, checked=' + st;
};
const setText = async (page, sel, v) => {
  const el = await page.$(sel);
  if (!el) return 'missing ' + sel;
  await el.fill(v).catch(async () => {
    await page.evaluate(({ s, v }) => {
      const e = document.querySelector(s);
      const d = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');
      d.set.call(e, v); e.dispatchEvent(new Event('input', { bubbles: true }));
    }, { s: sel, v });
  });
  await sleep(1200);
  return 'len=' + (await page.inputValue(sel).catch(() => '')).length;
};

(async () => {
  const s = await launchAI({ visible: false });
  const page = s.page;
  const receipt = { ts: new Date().toISOString(), sub: SUB, steps: [], error: null };
  try {
    // 0) 登录
    const l = await emailLogin(page, process.env.SN_EMAIL, process.env.SN_PASS);
    receipt.steps.push({ login: l });
    console.log('[0 登录]', JSON.stringify(l));
    if (await waitIfThrottled(page, 'login')) { await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {}); await sleep(5000); }

    // 1) 作者复核
    await page.goto(`https://submission.springernature.com/new/submission/${SUB}/authors`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await sleep(6000);
    await page.getByText('Accept all cookies', { exact: false }).first().click({ timeout: 5000 }).catch(() => {});
    await sleep(2500);
    if (await waitIfThrottled(page, 'authors')) { await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {}); await sleep(5000); }
    const au = await page.evaluate(() => {
      const g = id => (document.getElementById(id) || {}).value || '';
      return { fn: g('author-0-first-name'), ln: g('author-0-last-name'), em: g('author-0-email'), aff: g('author-0-affiliation'), corr: g('primary-corresponding-author') };
    }).catch(() => ({}));
    console.log('[1 作者复核]', JSON.stringify(au).slice(0, 600));
    receipt.steps.push({ authors: au });

    // 2) Declarations
    await page.goto(`https://submission.springernature.com/new/submission/${SUB}/declarations`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await sleep(7000);
    await page.getByText('Accept all cookies', { exact: false }).first().click({ timeout: 5000 }).catch(() => {});
    await sleep(2500);
    if (await waitIfThrottled(page, 'decl')) { await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {}); await sleep(5000); }

    console.log('[2 订阅模式]', await click(page, '#hybrid'));
    console.log('[3 无竞争利益]', await click(page, '#competing-interest-no'));
    console.log('[4 非重复发表]', await click(page, '#dual-publication-no'));
    console.log('[5 作者政策]', await click(page, '#authorship'));
    console.log('[6 无第三方材料]', await click(page, '#third-party-material-no'));
    console.log('[7 有数据]', await click(page, '#data-availability-yes'));
    console.log('[8 数据声明]', await setText(page, '#data-availability-description', DATA_AVAIL));
    console.log('[9 无资助]', await click(page, '#research-funding-no'));

    await sleep(4000);
    const chk = await page.evaluate(() => {
      const g = id => { const e = document.getElementById(id); return e ? (e.type === 'checkbox' || e.type === 'radio' ? e.checked : (e.value || '').slice(0, 40)) : 'n/a'; };
      return { hybrid: g('hybrid'), ciNo: g('competing-interest-no'), dpNo: g('dual-publication-no'), auth: g('authorship'), tpNo: g('third-party-material-no'), daYes: g('data-availability-yes'), daLen: (document.getElementById('data-availability-description') || {}).value?.length, rfNo: g('research-funding-no') };
    }).catch(() => ({}));
    console.log('[10 声明复核]', JSON.stringify(chk));
    receipt.steps.push({ declarations: chk });
    await page.screenshot({ path: path.join(SHOTS, 'sn_decl_filled.png'), fullPage: true }).catch(() => {});

    // 3) Next → Review
    console.log('[11 Next]', await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button,a')).find(e => /^\s*next\s*$/i.test((e.innerText || '').trim()));
      if (!b) return 'no next'; b.click(); return 'clicked';
    }).catch(e => 'err'));
    await sleep(13000);
    if (await waitIfThrottled(page, 'review')) { await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {}); await sleep(5000); }
    console.log('[12 Review URL]', page.url().slice(0, 120));
    receipt.steps.push({ reviewUrl: page.url() });
    await page.screenshot({ path: path.join(SHOTS, 'sn_review.png'), fullPage: true }).catch(() => {});

    // 4a) Review 勾选 approve/confirm 类
    const revChk = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('input[type="checkbox"]').forEach(c => {
        if (c.checked) return;
        const lab = (c.labels && c.labels[0] ? c.labels[0].innerText : '') || '';
        if (/approv|confirm|warrant|agree|read and underst|accuracy/i.test(lab)) { c.click(); out.push('checked: ' + lab.trim().slice(0, 60)); }
      });
      return out;
    }).catch(() => []);
    console.log('[13a Review勾选]', JSON.stringify(revChk));
    await sleep(2500);

    // 4b) Submit
    const submitRes = await page.evaluate(() => {
      const cands = Array.from(document.querySelectorAll('button,a')).filter(e => /approve\s*&\s*submit|submit\s*manuscript|^\s*submit\s*$|confirm\s*submit/i.test((e.innerText || e.value || '').trim()));
      if (!cands.length) return 'no submit btn; buttons=' + Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim().slice(0, 30)).join('|');
      cands[0].click();
      return 'clicked: ' + (cands[0].innerText || cands[0].value || '').trim().slice(0, 40);
    }).catch(e => 'err ' + e.message.slice(0, 80));
    console.log('[13b 提交]', submitRes);
    await sleep(4000);

    // 4c) Modal 二次确认
    const modalRes = await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"]') || document.querySelector('.modal');
      if (!dlg) return 'no modal';
      const btns = Array.from(dlg.querySelectorAll('button,a')).filter(e => /approve|submit|confirm|yes/i.test((e.innerText || '').trim()));
      if (!btns.length) return 'modal无确认按钮: ' + (dlg.innerText || '').replace(/\s+/g, ' ').slice(0, 150);
      btns[0].click();
      return 'modal clicked: ' + btns[0].innerText.trim().slice(0, 40);
    }).catch(e => 'err ' + e.message.slice(0, 80));
    console.log('[13c modal确认]', modalRes);
    await sleep(15000);
    if (await waitIfThrottled(page, 'submit')) console.log('[13] 提交后仍限流，已等待重试窗口');

    const conf = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ')).catch(() => '');
    const m = conf.match(/manuscript\s*(?:id|number|no\.?)[:#\s]*([A-Za-z0-9\-]{6,})/i)
      || conf.match(/submission\s*(?:id|number|no\.?)[:#\s]*([A-Za-z0-9\-]{6,})/i)
      || conf.match(/([A-Z]{2,}-[A-Za-z0-9\-]{6,})/);
    const manuscriptId = m ? m[1] : null;
    receipt.steps.push({ confirmText: conf.slice(0, 1200), manuscriptId, submissionId: SUB });
    await page.screenshot({ path: path.join(SHOTS, 'sn_submitted.png'), fullPage: true }).catch(() => {});
    console.log('[DONE] 完成。候选稿号=' + (manuscriptId || '未在确认页出现（Snapp 正常：去 your-submissions 取/等邮件）'));
  } catch (e) {
    receipt.error = e.message.split('\n')[0];
    console.log('[ERROR]', e.message.split('\n')[0]);
  } finally {
    fs.writeFileSync(path.join(__dirname, 'sn19_receipt.json'), JSON.stringify(receipt, null, 2));
    console.log('[RECEIPT] 已写入 sn19_receipt.json');
    await s.close();
  }
})();
