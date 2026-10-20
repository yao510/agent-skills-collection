// Springer Nature Snapp 登录 + 进入投稿向导（可复用，参数化）
// 用法(库): const { emailLogin, gotoWizard, DEFAULT } = require('./login_snapp.js');
//           await emailLogin(page, email, pass);
// 凭证默认走本机固定账号；可经 env 覆盖：SN_EMAIL / SN_PASS / SN_JOURNAL / SN_TYPE
const sleep = ms => new Promise(r => setTimeout(r, ms));

const DEFAULT = {
  email: process.env.SN_EMAIL,
  pass: process.env.SN_PASS,
  journalUrl: process.env.SN_JOURNAL || 'https://submission.springernature.com/new-submission/10441/3',
  type: process.env.SN_TYPE || 'research',
};

// 用原生 setter 注入受控输入（绕过 React controlled component 的 value 拦截）
function nativeSet(page, sel, val) {
  return page.evaluate(({ s, v }) => {
    const e = document.querySelector(s);
    if (!e) return false;
    const d = Object.getOwnPropertyDescriptor(e.constructor.prototype, 'value');
    d.set.call(e, v); e.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }, { s: sel, v: val }).catch(() => false);
}

async function emailLogin(page, email, pass) {
  await page.goto('https://submission.springernature.com/', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(4000);
  await page.getByText('Accept all cookies', { exact: false }).first().click({ timeout: 5000 }).catch(() => {});
  await sleep(1200);
  await nativeSet(page, '#login-email', email);
  await page.evaluate(() => { const b = document.getElementById('email-submit'); if (b) b.click(); }).catch(() => {});
  await sleep(9000);
  if (/\/password/i.test(page.url())) {
    await nativeSet(page, '#login-password', pass);
    await page.evaluate(() => { const b = document.getElementById('password-submit'); if (b) b.click(); }).catch(() => {});
    await sleep(11000);
  }
  const t = await page.evaluate(() => document.body.innerText.slice(0, 200)).catch(() => '');
  return { url: page.url(), loggedIn: !/Log in, or register/i.test(t) };
}

// 进期刊投稿页；若在起始页则选类型并 Start submission
async function gotoWizard(page, journalUrl, type) {
  await page.goto(journalUrl, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(5000);
  await page.getByText('Accept all cookies', { exact: false }).first().click({ timeout: 5000 }).catch(() => {});
  await sleep(1500);
  const body = await page.evaluate(() => document.body.innerText).catch(() => '');
  if (/new-submission\/\d+\/\d+$/.test(page.url()) || /Select an option/i.test(body)) {
    await page.evaluate((tp) => {
      const s2 = document.getElementById('article_type') || Array.from(document.querySelectorAll('select'))[0];
      if (!s2) return;
      const opt = Array.from(s2.options).find(o => o.value === tp) || Array.from(s2.options).find(o => new RegExp(tp, 'i').test(o.text));
      if (!opt) return;
      const d = Object.getOwnPropertyDescriptor(s2.constructor.prototype, 'value');
      d.set.call(s2, opt.value);
      s2.dispatchEvent(new Event('change', { bubbles: true }));
    }, type).catch(() => {});
    await sleep(2500);
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button,a,input')).find(e => /start submission/i.test((e.innerText || e.value || '').trim()));
      if (b) b.click();
    }).catch(() => {});
    await sleep(13000);
  }
  return page.url();
}

async function start(page, opts = {}) {
  const o = Object.assign({}, DEFAULT, opts);
  const l = await emailLogin(page, o.email, o.pass);
  if (!l.loggedIn) return { ok: false, stage: 'login', url: l.url };
  const u = await gotoWizard(page, o.journalUrl, o.type);
  return { ok: true, url: u };
}

module.exports = { emailLogin, gotoWizard, start, DEFAULT };
