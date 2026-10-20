---
name: ieee-rex-submit
description: 用 playwright + 常驻 Chrome(CDP) 自动化投 IEEE 系期刊的**投稿门户 Research Exchange (REX)**（IEEE Author Portal，ieee.submission.researchexchange.com）。适用于 IEEE Transactions on Cognitive and Developmental Systems (TCDS) 等 IEEE 期刊。覆盖：过 Cloudflare 的常驻浏览器会话、免密复用登录、10 步投稿流程（Article Type→Upload→Title→Abstract→Authors→Affiliations→Author Details→Match Organizations→Additional Information→Final Review→Submit）、react-select 必填下拉框、AutoSave 幂等填写、提交与取收据。当用户说"投 IEEE 刊""REX 卡住""Confirm 过不去""Research Exchange 被 Cloudflare 拦""Animal Subjects 填不了"时使用。Elsevier NSE 用 elsevier-nse-submit；EM 经典系统用 em-playwright-submit；T&F 用 tandf-portal-submit。
repo: https://github.com/yaohuancen/agent-skills-collection
---

# IEEE Research Exchange (REX) 投稿自动化（playwright + 常驻 Chrome/CDP）

## 平台识别（先判对错）
- IEEE 新投稿 = **Atypon Research Exchange (REX)**，即 "IEEE Author Portal"：`https://ieee.submission.researchexchange.com/submission/...`
  - dashboard：`/submission/dashboard?siteName=<slug>`（TCDS 的 slug = `tcds-ieee`）
  - 投稿台（Board）：`/submission/submissionBoard/<UUID>`；各步骤 = `/submissionBoard/<UUID>/<step>`
- 判据：URL 含 `submission.researchexchange.com` → 用本技能。
- **与 ScholarOne 的关系**：REX 只负责收稿；**正式 Manuscript ID 由 ScholarOne（`mc.manuscriptcentral.com/<slug>`）几天后邮件下发**，REX 确认页/页面**不显示稿件号**。
- 注意：历史上 REX 曾被 Cloudflare 拦（浏览器指纹）——**必须用真实 Chrome + 常驻 profile**，不能无头/裸 playwright 启动。

## 关键突破：常驻 Chrome + CDP（过 Cloudflare + 免密）
1. 用真实 Chrome 后台常驻启动：
   ```
   chrome.exe --remote-debugging-port=9222 --user-data-dir="<abs>\_chrome_profile" "<DASH_URL>"
   ```
   Windows 下用 `cmd //c start "" "...chrome.exe" --remote-debugging-port=9222 --user-data-dir=... "<url>"`。
2. 脚本用 `chromium.connectOverCDP('http://127.0.0.1:9222')` 连接（**不是** `chromium.launch`）。
3. 探活：`curl -s http://127.0.0.1:9222/json/version`。
4. profile 持久化 ⇒ 登录 Cookie 长期有效，**登录一次后免密**；会话掉了才走 SAML 登录（见下）。

### `_lib.js` 骨架（可复用）
```js
const { chromium } = require('playwright');
const fs = require('fs');
const CDP = 'http://127.0.0.1:9222';
const DASH = 'https://ieee.submission.researchexchange.com/submission/dashboard?siteName=tcds-ieee';
const BOARD = 'https://ieee.submission.researchexchange.com/submission/submissionBoard/<UUID>';
async function open() { const b = await chromium.connectOverCDP(CDP); const ctx = b.contexts()[0]; const page = await ctx.newPage(); await page.bringToFront().catch(()=>{}); return {browser:b, ctx, page}; }
const safe = async (fn,d)=>{ try { return await fn(); } catch(e){ return d; } };
function makeLog(f){ try{fs.writeFileSync(f,'');}catch(e){} return m=>{const s=new Date().toISOString()+' '+m; console.log(s); try{fs.appendFileSync(f,s+'\n');}catch(e){} }; }
// 登录判定（内容式，别用 URL）
async function isLoggedIn(page){ const b=await page.evaluate(()=>document.body.innerText||''); return /My Submissions/.test(b) && !/Create an IEEE Account/.test(b); }
```
- 登录（SAML）流程：goto DASH → 若未登录，读 `#signinurl` 取其链接 goto → 填 `#username`/`#password` → 点 `#modalWindowRegisterSignInBtn` → 处理 register/complete、register/confirm → 回到 dashboard。

> ⚠️ **`ensureAuth` 会导航到 dashboard**。若下一步要操作某个步骤页，**必须 ensureAuth 之后重新 `goto` 步骤页**，否则 evaluate 跑在 dashboard 上（表现为 `cbTotal=0` 等空结果）。

## 10 步流程（固定顺序，不可跳步）
```
Article Type → Upload Manuscript → Title → Abstract → Authors → Affiliations
→ Author Details → Match Organizations → Additional Information → Final Review → Submit
```

### 推进控件
- **投稿台根页**：每个未完成板块的下一步按钮 = `button.submissionBoardWizardSection-nextButton`（按钮文本 = 下一步名字）。点击 → SPA 切到该步骤。
- **步骤页底部**：`button.button--next`（文本 "Confirm"）——填完当前步点它提交并回 Board。
- **校验失败**：出现 `.inlineNotification.submissionBoardStepButtons-error`，文案 "Some items require your attention. Please correct the items above to continue." → 用定位脚本找 `.panel-danger`/`validation.error.required$#$#$...` 找哪个字段没填。
- **提交**：Final Review 页底部 `button.button--confirm`（文本 "Complete my submission"）→ 成功页显示 "Congratulations | Your manuscript has been processed and submitted to the journal."
- **核对进度**：My Submissions / dashboard 显示 Submission Status = **Submitted** + Submitted On 日期。

### 各步骤要点
- **Article Type**：Regular（常规研究论文）。
- **Upload Manuscript**：文件按类型槽上传（Anonymized Main Document - Word/PDF、Title Page、Image/Graphical Abstract、Supplementary Material for Review、Conflict of Interest、Cover letter / Comments）。传完看 Board 上该板块是否 Complete。
- **Title / Abstract**：照录（摘要注意期刊词数上限）。
- **Authors / Affiliations**：作者、机构；Matched organization 若无匹配选 "Organization is not listed"。
- **Author Details**：连接 **ORCID**。若需人工授权，AI 打开授权页点授权，用户手动确认 ORCID 登录即可。
- **Match Organizations**：Funders → 多为 "No funding was received for this research"。
- **Additional Information**：见下（坑最多）。

## Additional Information —— 坑区（必看）
板块均为 `h3.questionTitle-title`，共 10 个：Keywords、提交历史、Informed Consent、**Animal Subjects**、Opposed Reviewers、Cover letter、先前发表、Code、Data。

### 🔴 坑 1：Animal Subjects 是**必填 react-select 下拉框**（最难发现）
- 它不是 radio，是 react-select；DOM 为 `input.css-1hac4vs-dummyInput`（`role="combobox"`），**必填**。
- **不填** → Confirm 被拦，报 `.selectBoxControl--error` + `validation.error.required`。这是首次提交最常见的拦路石。
- 3 个选项：`There were no animal subjects` / `This research involved animal subjects AND it complies with ARRIVE guidelines` / `This research involved animal subjects but did NOT comply with ARRIVE guidelines`。
- **展开方式**：普通 `locator.click()` 会因元素在视口外报 "Element is outside of the viewport"。改用：
  ```js
  await page.evaluate(() => { const i=document.querySelector('input.css-1hac4vs-dummyInput'); i && i.focus(); });
  await page.keyboard.press('ArrowDown');   // 展开菜单
  // 再在 evaluate 里对选项派发 mousedown/mouseup/click 选中，如 "There were no animal subjects"
  ```

### 🔴 坑 2：AutoSave 持久化 + checkbox 是 toggle —— 脚本必须**幂等**
- REX 会**服务端持久化**勾选状态。重复运行脚本时，直接 `cb.click()` 实际是**取消勾选**（keywords 计数 6→5→…→0）。
- **正确做法**：先读 `cb.checked`，**只对未勾选项点击**：
  ```js
  async function clickKeyword(page, t){
    return await page.evaluate((t)=>{
      const all=[...document.querySelectorAll('label,span,div,p')];
      const el=all.find(e=>(e.textContent||'').trim()===t && e.children.length===0)||all.find(e=>(e.textContent||'').trim()===t);
      if(!el) return 'noText';
      let p=el;
      for(let i=0;i<8&&p;i++){ const cb=p.querySelector&&p.querySelector('input[type="checkbox"]'); if(cb){ if(cb.checked) return 'already'; cb.click(); return 'cb@'+i; } p=p.parentElement; }
      (el.closest('label')||el).click(); return 'fallback';
    }, t);
  }
  ```
- **验证终态**用全页文案计数，别只信单点返回：`body.match(/(\d+)\s*selected keywords/i)`（Keywords 需 2–10 个）。
- **诊断经验**：怀疑状态没保存时，**重新 goto 步骤页刷新**，读服务端持久态；本地 toggle 的结果可能未落库。

### radio（是非题）定位
- radio 的 label 结构嵌套，按"叶子文本精确匹配"会 MISS。用 **`label` 全文 `includes` 匹配**，再从其下找 `input[type=radio]`：
  ```js
  await page.evaluate((t)=>{
    const lab=[...document.querySelectorAll('label')].find(l=>(l.innerText||'').trim().includes(t));
    if(lab){ const r=lab.querySelector('input'); (r||lab).click(); return true; }
    return false;
  }, 'No, it wasn\'t submitted previously');
  ```
- 精确文案示例：提交历史 `No, it wasn't submitted previously`；Informed Consent `No, there were no human subjects`；先前发表 `No, this manuscript has never been previously presented or published.`；Code `Yes, I have code associated with my manuscript`；Data `No, I do not have data associated with my article to share`；Cover letter `Yes, I'd like to add a cover letter or comments`。

### Keywords
- 48 个 checkbox + 1 个搜索框；需选 2–10 个。**优先直接勾选可见的候选关键词 checkbox**（比搜索框稳）。计数文案 "N selected keywords"。

## 提交与取收据
1. Final Review 核对全项 → 点 `button.button--confirm`（"Complete my submission"）。
2. 成功页："Congratulations … processed and submitted to the journal."（**此处无稿件号**）。
3. 收据：**确认邮件**发件 `no-reply@researchexchange.com`，主题 "Manuscript submitted to <Journal>"，正文写明 Manuscript ID 将由 ScholarOne 后续邮件下发。
4. My Submissions 页可见 **Submitted** + 日期。
5. 若最后一步有 "Build Reviewer PDF"（可选，非必须）——不点也能提交。

## 排错速查
| 现象 | 原因 | 解法 |
|---|---|---|
| Confirm 被拦 "Some items require your attention" | 有必填未填（多为 Animal Subjects 下拉） | 定位 `.panel-danger`/`validation.error.required`，补填 |
| evaluate 跑出空结果（cbTotal=0） | ensureAuth 把页导航回了 dashboard | ensureAuth 后重新 goto 步骤页 |
| keywords 计数递减到 0 | checkbox toggle + AutoSave | 改幂等：先读 checked 再点 |
| Animal Subjects 点击 "outside of viewport" | react-select 在视口外 | focus + ArrowDown 键盘展开 |
| 提交后找不到稿件号 | REX 不显示，走邮件 | 查邮箱 ScholarOne 跟进邮件 / 登 mc.manuscriptcentral.com |
| 常驻 Chrome 掉线 | 进程被回收 | 重新用带 `--remote-debugging-port=9222 --user-data-dir=<profile>` 的 Chrome 启动，Cookie 仍在 |

## 与本项目（论文投稿）关联
- 工作目录示例：`重要文件别删\论文7_零指令态判据\_投稿包_IEEE_TCDS\`，脚本前缀 `_p_*.js`，日志 `_p_*.log`。
- Node：`<本机 node 路径>`，`NODE_PATH="<playwright-core 所在 node_modules>"`。
- 投稿红线：同刊同篇不可同时两投；REX 收稿后若换投，须先确认前一投已拒。
