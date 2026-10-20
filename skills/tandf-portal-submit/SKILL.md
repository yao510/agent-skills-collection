---
name: tandf-portal-submit
description: 用 playwright 自动化投 Taylor & Francis 新投稿门户（rp.tandfonline.com，Research Portal）系期刊，如 International Journal of General Systems (IJGS/journalCode=GGEN) 等。覆盖 T&F 统一账号注册（含 Cloudflare + hCaptcha 人工配合）、邮箱验证、登录、建稿、四类文件上传、稿件页/关键词页/作者页逐页填写、预览提交的全流程与全部踩坑点。当用户说"投 T&F 的刊""rp.tandfonline.com 投稿""ScholarOne 找不到投稿入口""IJGS/GGEN 投稿"时使用。若目标是 Editorial Manager 系（bthe/synt/mind/biosys）请改用 em-playwright-submit。
repo: https://github.com/yaohuancen/agent-skills-collection
---

# Taylor & Francis 新门户（Research Portal）投稿自动化

## 0. 先判系统：别投错门
- **T&F 期刊已陆续从 ScholarOne 迁到新门户**。症状：`mc.manuscriptcentral.com/<code>` 能登录，但首页横幅写
  "All submissions … should be submitted **here** via our Submission Portal"，且 Author Centre 无投稿入口。
- 新门户入口形如：`https://rp.tandfonline.com/submission/create?journalCode=<CODE大写>`
  （已知：**IJGS = GGEN**；查法＝在 ScholarOne 旧壳横幅点 "here"，或读期刊 Author Instructions 页的 Submitting Your Paper 段）。
- **账号不通用**：新门户用 T&F 统一账号（`accounts.taylorfrancis.com`，注册即送邮箱验证链接），ScholarOne 旧账号作废。
- 与其它系统分工：EM 系 → `em-playwright-submit`；Springer Nature Snapp（submission.springernature.com）→ 见本技能 §9 索引。

## 1. 运行环境（固定写死，别用裸命令）
```bash
# 解析 T&F 域名真实 IP（每天可能变！映射写错 → Cloudflare 判异常、页面卡安全验证）
"<本机 python 路径>" -c "
import socket
for h in ['rp.tandfonline.com','accounts.taylorfrancis.com','api.taylorfrancis.com','new-api.taylorfrancis.com']:
    print(h, socket.gethostbyname(h))"

# 跑脚本（playwright-core 在托管 node workspace，必须给 NODE_PATH）
cd <你的工作目录>
NODE_PATH="<playwright-core 所在 node_modules>" \
"<本机 node 路径>" <script>.js
```
- 账号凭据存档：`<凭据存档路径>`（<你的邮箱>）。
- 持久化浏览器档案：`<你的工作目录>/tf_profile/`；storageState：`tf_state.json`（**必须复用，cf_clearance 与登录态靠它**）。

## 2. 浏览器启动模板（照抄）
```js
const { chromium } = require('playwright-core');
const ctx = await chromium.launchPersistentContext('<你的工作目录>/tf_profile', {
  channel: 'msedge', headless: false,          // ★ headful：headless 过不了 Cloudflare
  args: ['--no-sandbox', '--disable-blink-features=AutomationControlled',
         '--host-resolver-rules=MAP rp.tandfonline.com <IP>,MAP accounts.taylorfrancis.com <IP>,MAP api.taylorfrancis.com <IP>,MAP new-api.taylorfrancis.com <IP>',
         '--start-maximized'],
  viewport: null, ignoreHTTPSErrors: true, locale: 'en-US'
});
```
- **headful 是硬要求**：headless 会卡在 `api.taylorfrancis.com … Performing security verification`（Cloudflare）；
  headful 实测 3 秒放行。
- 每个脚本开头都加**登录自愈**（会话高频被踢回登录页）：
```js
async function loginIfNeeded(page) {
  const has = await page.evaluate(() => !!document.querySelector('input[name="inputEmail"]')).catch(()=>false);
  if (!has) return;
  await page.locator('input[name="inputEmail"]').fill(EMAIL);
  await page.locator('input[name="password"]').fill(PWD);
  await sleep(500);
  await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(x=>(x.innerText||'').trim()==='LOGIN'); if(b) b.click(); });
  await sleep(15000);
}
```
- ⚠️ 登录页有两个 `type=submit` 按钮：`Login with ORCID`(orcidBtn) 与 `LOGIN`(loginBtn)。
  **必须按文本精确匹配**（`innerText.trim()==='LOGIN'`）或用 `button[name="loginBtn"]`，否则会误点 ORCID 跳走。
- ⚠️ `getElementsByName('loginBtn')` 取不到（Angular 组件）→ 用 Playwright locator 或文本匹配。

## 3. 注册（首次投 T&F 才需要；**需要用户配合 1 次**）
1. 打开 `rp.tandfonline.com/submission/create?journalCode=<CODE>` → 跳到 `accounts.taylorfrancis.com/#/login` → 点 **Register**。
2. 表单字段：`firstName/lastName/email/country/password` + 复选框 `optOut`（拒收营销）+ `isChecked`（同意条款）。
   - 密码规则（页面红字）：**≥10 位，且含 0-9、a-z、A-Z、符号**（示例：按页面规则自拟强密码）。
   - **自定义复选框**：`elem.check()` 会超时 → 用 `page.evaluate(() => document.getElementsByName(nm)[0].click())`。
3. **hCaptcha 图片挑战必须人工**（自动化识别命中也会被判错，且强依赖真实交互）：
   - 做法：脚本停在表单页并**轮询** `textarea[name="h-captcha-response"]` 长度 > 20 → 自动点 `CREATE ACCOUNT`；
   - 用户只需在弹出窗口点一次（脚本日志提示"waiting for HUMAN captcha"）。等待窗口给足（实测用户可能 20+ 分钟才来点）。
4. 提交后页面提示 "We have sent you a verification message…" → **读 QQ 邮箱取链接**：
```python
# IMAP: imap.qq.com:993 / <你的邮箱> / 授权码见 tools\.pitch_mail.env 同目录脚本
# 邮件主题 "Verify your email address"（noreply@taylorfrancis.com）
# 链接形如 https://accounts.taylorfrancis.com/identity/#/verify-registration?user=...&verificationToken=XXXX
```
   用同一持久化 profile 打开该链接 → 页面出现 "Your email address has been successfully verified"。
5. 存 `ctx.storageState({path:'tf_storage.json'})`，并把账号写入 `ggen_account.json`。

## 4. 建稿与文件上传
1. 登录 → `rp.tandfonline.com/dashboard/`（右上 "Hi, <name>"）。
2. 点 **SUBMIT NEW MANUSCRIPT** → `submission/create` 页：
   - 期刊搜索框（`input[type=search]`）输入刊名 → 等下拉 → 点 `mat-option`（文本匹配刊名）；
   - Article type：点 `mat-select` → 选 `Research Article`（IJGS 还有 Data Note/Method/Review Article/Software Tool Article）；
   - **三个必须勾的确认框**：`publisherGuidelinesCheck` / `originalSubmissionCheck` / `publishingComplianceCheck`（JS click）；
   - 点 **Start** → 得到 `submissionId`（记住，后续直接用它导航）。
3. **文件上传页**（`/submission/fileUpload?submissionId=...`）流程：
   - ★ 每个文件必须**先选文件 → 再选类别（mat-select）→ 再点 UPLOAD**，顺序错了不生效；
   - ★ **文件名不能带点号/中文**（"The file name contains invalid characters"）→ 预先复制成
     `Manuscript_IJGS.docx` / `CoverLetter.pdf` / `S1_xxx.zip` 这类纯 ASCII 简单名；
   - 类别选项（IJGS 实测）：`Manuscript - with author details*` / `Figure` / `Cover Letter` /
     `Supplementary Material - for review` / `Supplementary Material - not for review` / `Table` / `LaTeX Source File`；
   - 典型四件套：主稿→Manuscript(with author details)、封面信→Cover Letter、补充材料+TitlePage→Supplementary(for review)；
   - 下拉有时点不开（遮罩/动画）→ 用 DOM 直点：`evaluate` 里点 `.mat-mdc-select-trigger`，选项用 `[...document.querySelectorAll('mat-option')].find(o=>o.innerText.trim().includes(cat))` 再 `.click()`。

## 5. 三步内容页（**跨会话不保存！同一脚本内必须一口气填完整步**）
路径：`/submission/flow?submissionId=<ID>&step=1|2|3&journalOwner=TaylorAndFrancis&c=<base64>`
（`c` 参数形如 `R0dFTiZSZXNlYXJjaCBBcnRpY2xl`；直接用 dashboard→RESUME 拿完整 URL 最稳。）

### step=1 Manuscript（字段全用 **id** 定位，`name` 常为空）
| 字段 | 选择器 | 值 |
|---|---|---|
| 标题 | `#title` | ≤50 词（`page.fill` 可用） |
| 摘要 | `#formly_XX_custom-textarea_submissionAbstract_1`（用 `#` 前缀 + id；或 `document.querySelector('textarea')`） | 刊限（IJGS ~200 词，超限会被拦） |
| special issue | radio 组，语义文本含 "special issue" | **No**（无 CFP/邀请） |
| 数据集 | radio 组，语义文本含 "data set" | **Yes** → 触发 `#additionalDetails.basicDataSetDOI` → 填 concept DOI |
| 人类受试者 | radio 组含 "human participant" | **No** |
| 第三方许可 | radio 组含 "permissions" | **No** |
| 声明勾选 ×5 | `additionalDetails.copyright` / `ethicalGuidelines` / `additionalDetails.aiPolicy` / `additionalDetails.consentToPublish` / `additionalDetails.acknowledgementsYesNo` | 全勾 |
| 字数 | `#additionalDetails.manuscriptWordCount` | 实测词数 |
- radio 的 **id 每次渲染都变**（`formly_8/10/11_…`）⇒ **必须靠语义文本定位**，不能写死 id：
  向上找包住 ≥2 个 radio 的容器，读其 `innerText` 判定组语义，再取"有 id 的=Yes / 无 id 的=No"。
- 文本框 `page.fill` 若超时（组件未渲染/被遮挡）→ 用 JS 原生 setter：
```js
const el = document.getElementById(id);
const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
s.call(el, v);
['input','change','blur'].forEach(t => el.dispatchEvent(new Event(t,{bubbles:true})));
```

### step=2 Subject（关键词）
- 输入框 id `mat-chip-list-input-1`；**每个关键词 `fill` 后按 `Enter`**（或逗号分隔），IJGS 3–6 个。

### step=3 Authors（全流程最容易卡的一页）
1. 先选 **"I am an author"**（第一个 radio，用 `document.querySelectorAll('input[type=radio]')[0].click()`）。
2. 作者卡默认**折叠**，必须**展开**，否则 `institutionalDetails.*` 等字段根本不在 DOM 里（表现为 getElementById 全 missing）。
   - 展开器文案随版本变：旧版是 **"Complete details"**，2026-09 实测是作者行右侧的 **▼ 箭头**（行内形如
     `<作者名> [YOU] [CORRESPONDING AUTHOR] … Edit ▼`）。**"Edit" 是另一功能，点它不会展开**（实测点 6 次无效）。
   - ⚠️ 该展开器**不是** Material 展开组件：`mat-expansion-panel-header` / `[aria-expanded]` / `mat-panel-title`
     候选查出来可能是 **0 个** → 别只按这些选择器找。正解：按"含作者名的可点行"扩面扫
     （`click` 后校验 `!!document.getElementById('institutionalDetails.department')`），或直接**截图目视**定位 ▼ 坐标点击。
   - 展开偶发失败 → **循环点 5–6 次 + 每次等 6–7 秒 + 每轮校验字段是否出现**。
   - 🔴 **登录密码只有 3 次机会**（错误提示 "You have made N unsuccessful attempt(s). A maximum of 3 login attempts are permitted."）：
     密码务必从**注册脚本/规则**取证再试，**绝不盲试**。教训：曾把密码记错丢了符号导致失败（注册规则要求"≥10 位且含 0-9/a-z/A-Z/符号"，无符号必错）。
3. 展开后需填/确认：
   - `#firstName` / `#lastName`（**只接受拉丁字符**，中文会报"特殊字符不被接受"）；账号自带值为佳；
   - `formly_XX_orcid_orcid_0` = ORCID（16 位）；
   - `#publishedName`、`#institutionalDetails.position`、`#institutionalDetails.department`（如 `Independent Researcher`）；
   - **Country/Region**：`mat-select` → 点 trigger → 选项文本含前后空格，须 `trim()==='China'` 精确匹配后点；
   - **Organization**：见 §6 专门说明；
   - funding 单选 → **No**；competing interests 单选 → **No**（同为语义定位）；
   - **CRediT 角色**（≥1 个，建议 7 个）：Conceptualization / Methodology / Software / Investigation /
     Data curation / Writing – original draft / Writing – review & editing（注意 en-dash `–`，用宽松正则 `/writing/` 匹配）；
   - 点 **Done**（页面可能同时存在多个同名按钮：资助区/利益冲突区/作者卡各一个 →
     取**未 disabled** 的、按 y 坐标**自下而上**逐个点）。
4. 若 `Next` 点了没反应 → 说明还有必填缺项；用"扫红字"定位：
```js
[...document.querySelectorAll('*')].filter(e=>e.childElementCount===0 && /required field|is required|必填/i.test(e.innerText||''))
  .map(e=>{let p=e.parentElement,c='';for(let i=0;i<4&&p;i++){if((p.innerText||'').trim().length>4){c=p.innerText.replace(/\s+/g,' ').trim().slice(0,60);break;}p=p.parentElement;}return c;});
```

## 6. 两个"必须人工"的坎（写进交付说明，别硬扛）
1. **hCaptcha（仅注册那一次）**：Cloudflare 通过后仍会给图片挑战；程序化点击整图坐标偶尔蒙对（曾用截图读数+坐标点击命中选择框），但**判定会失败**，且 CDP 连接方案在本机会挂起。
   ⇒ 正解：headful 停表 → **用户在窗口里点** → 脚本轮询 token 自动续跑。之后 cf_clearance 与登录态留在 `tf_profile`，**后续投稿不再弹验证**。
2. **Organization（作者页）**：Ringgold 机构库 selectize 组件，**自动化会话内查询恒返回 0 项**（反爬），自由文本 Enter 不被接受。
   ⇒ 正解：让用户在真实浏览器点 **"我找不到我的组织 / I cannot find my organisation"** → 弹窗「Please provide us with your organization details」→
   `Organization` 填英文机构名（无机构填 `Independent Researcher`），Country 保持中国，其余可留空 → **Save**。
   （该弹窗是自由文本，不再查库。）
3. **ORCID 锁定姓名**（若用户 ORCID 档案里是中文名）：First/Last name 会出现 🚫 且改不掉。
   ⇒ 解法优先级：① **清空 ORCID 那一格**（该格未锁）→ 姓名格即刻解锁 → 填拉丁名；② 关掉浏览器自动翻译 + 用无痕窗口重登再试；
   ③ 到 orcid.org → Account settings → Names 改拉丁名 → 回页点 "Retrieve author details from ORCID" 重新同步。

## 7. 收尾（Services → Preview → 提交）
- 页面导航：File Upload → Manuscript → Subject → Authors → **Services** → **Preview**。
- Services：一律**不选任何收费项**（订阅制 0 费是我们选刊前提）。
- Preview：核对标题/摘要/文件清单 → **Submit**。
- ✅ 成功标志：页面出现「感谢您的投稿 / Thank you for your submission」+ **Submission ID**；
  同时 `journalshelpdesk@taylorandfrancis.com` 会发 `Submission received for <Journal>`（含 Submission ID）。
- ⚠️ 「Save as Draft」≠ 提交；**投稿记录绝不隔夜**（当天必须走到提交成功页）。

## 8. 全局禁忌与自检
- ❌ **不要与用户同时操作同一 submissionId**：并发会让 "Complete details" 等组件拒绝展开（实测两次都失败）。
  自动化前确认用户已离开该页面。
- ❌ 不要在主页面上用原生 `form.submit()`（ScholarOne 会白屏；T&F 一律走按钮 click）。
- ⚠️ 页面偶发 `submission/failed-initialisation` 错误页 → 回 dashboard 重进即可，**已保存数据不丢**（未点 Done/Next 的当步会丢）。
- ⚠️ 会话被踢概率高 → 每步前 `loginIfNeeded()`；脚本之间靠 `tf_profile` 保持登录。
- 自检清单：① 提交后有 Submission ID 页面 + 收据邮件；② 仪表盘状态显示"提交的手稿"；
  ③ 文件 4 件齐（含 Manuscript-with author details）；④ 稿件内含作者信息（**T&F 多为单盲**，见期刊 Checklist 首条）。

## 9. 脚本资产索引（`<你的工作目录>\`）
| 脚本 | 职责 |
|---|---|
| `ggen00_probe.js` | 探测入口（判定 ScholarOne 旧壳 vs 新门户、抓按钮/字段名） |
| `ggen13~17*.js` | 注册表单探测与填写（自定义复选框、hCaptcha 尝试） |
| `ggen21_register_headful.js` | **headful 注册（过 Cloudflare）** ★ |
| `ggen27A/28_wait_human.js` | **停表等人点验证码 → 轮询 token → 自动 CREATE ACCOUNT**（含 25/60 分钟等待版）★ |
| `ggen29_verify_and_wizard.js` | 打开邮箱验证链接 → 进投稿页 |
| `ggen30~34*.js` | 登录（含 ORCID 误点修复、loginBtn 精确定位） |
| `ggen35~37*.js` | 建稿（期刊/文章类型/三个确认框 → submissioId） |
| `ggen38~44*.js` | 文件上传（类别选择、DOM 直点下拉、批量补传） |
| `ggen45~53*.js` | step=1 稿件页（填标题/摘要/单选/勾选/DOI/字数 → 保存） |
| `ggen54_keywords.js` | step=2 关键词 |
| `ggen55~71*.js` | step=3 作者页（展开重试、radio 语义定位、CRediT、机构 selectize、红字定位） |
| `ggen72~74*.js` | 账号资料/ORCID 锁定诊断 |

其它系统（勿混用）：EM 系看 `em-playwright-submit`；**Springer Nature Snapp**（论文4/9/8 用过）
脚本在 `<你的脚本目录>\sn*.js` 与 `<你的工作目录>\acbi_*.js`、`ccom_*_synt_*.js`，
要点（台账已记）：React 受控 select 必须 `page.selectOption`；标题摘要手填（系统抽取会混正文）；
In Review(Research Square) 选 No；Declarations 七项如实；Technical Check 阶段只发 Submission ID。

## 10. 标准作业顺序（下次投 T&F 刊照这个走）
1. 解析 4 个域名 IP → 写进 `--host-resolver-rules`。
2. 有账号+`tf_profile` → 直接 §4；无账号 → §3（提醒用户**只有验证码那一下要动手**）。
3. §4 建稿 → 上传（文件名先改成 ASCII 简单名）。
4. **同一个脚本**依次完成 step1 → step2 → step3 并逐步验证（不要把一步拆成几个脚本）。
5. step3 若卡 Organization / ORCID 锁名 → 按 §6 交用户 30 秒处理。
6. Services（不买）→ Preview → **Submit** → 取 Submission ID。
7. 立刻：查收据邮件 → 更新 `重要文件别删\论文总台账_2026-09-13.md` → 记 memory。
