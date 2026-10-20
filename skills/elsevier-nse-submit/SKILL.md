---
name: elsevier-nse-submit
description: 用 playwright 自动化投 Elsevier 系期刊的**新投稿平台 NSE**（New Submission Experience，submit.elsevier.com/<JOURNAL>/<UUID>/steps/...）。适用于 Cognitive Systems Research=cogsys、BioSystems=biosys 等 Elsevier 刊。覆盖 SSO 免密登录、双盲分传（匿名稿＋标题页）、文件上传、元数据（摘要 250 词硬限）、作者与 CRediT 角色、基金、订阅制 0 费出版选项、数据可用性必填、声明勾选、提交与取收据。当用户说"投 Elsevier 刊""NSE 卡住了""Save and continue 不推进""双盲匿名稿怎么传"时使用。注意 EM 经典系统（editorialmanager.com）投稿请改用 em-playwright-submit 技能；T&F 刊用 tandf-portal-submit。
repo: https://github.com/yaohuancen/agent-skills-collection
---

# Elsevier NSE 投稿自动化（playwright）

## 平台识别（先判对错，别投错门）
- Elsevier 新投稿 = **NSE**：`https://submit.elsevier.com/<JOURNAL_CODE>/<UUID>/steps/<step>`
  （React SPA，**不是** EM 经典 iframe）。EM 里的 "Submit New Manuscript" 现在会 302 跳到 NSE
  （带 `dgcid=em_nse_redirect_authormainmenu`）。
- 判据：URL 含 `submit.elsevier.com` → 用本技能；URL 含 `editorialmanager.com/.../Sub*.aspx` → 用 `em-playwright-submit`。
- 已知期刊码：`COGSYS`=Cognitive Systems Research、`BIOSYS`=BioSystems。

## 步骤顺序（固定）
```
select-article-type → submission-files-upload → metadata → authors → funders
→ article-publishing-option → questions → review → confirmation
```
步骤名可直接拼 URL 跳转（`/steps/<step>`），**回退修某一步就用 URL 直达**，别一步步点 Back。

## 登录：SSO 复用，免密
1. 打开 `https://submit.elsevier.com/<CODE>/submissions`，点 **Sign in**。
2. 经过 `login-callback` → 页面显示 "Signing you in" → 自动吃掉既有 **Elsevier Identity SSO** 会话。
3. 落页 "Your submissions"。**无需重输账号密码**。
- 若没 SSO 会话，才需要走注册/登录；此时检查账号内历史投稿（避免一稿多投）。

## 双盲刊（如 COGSYS）文件要求
NSE 强制分传，一个都不能少：
| 项 | 类型 | 说明 |
|---|---|---|
| Cover letter | 必传 | 按**首投**撰写（即使换刊也**不写** transfer/改投——没投出去就不是改投，写了反而失实）；含预印本 DOI 披露、GenAI 声明、无利益冲突 |
| **Manuscript without author details** | 必传 | **匿名稿**，作者身份必须 0 残留 |
| **Title page with author details** | 必传 | 作者／单位／ORCID／通讯／Funding |
| Declaration of competing interests | 可用**勾选框** Confirmed 代替上传 |
| Supplementary data | 可选 | **合并成单个 `.txt`**（多文件会被拆／拒 `.py/.json`） |

🔴 **现成 PDF 几乎都含 `/Author` 元数据或正文作者块，不能直接当匿名稿**。
必须先生成匿名版，再用 pypdf 校验（作者真名 / 单位 / 邮箱 / ORCID / 地址 计数**全 0** 才算过）。
生成法：md 剥离 `**Author**:` 行与 metadata 块 → `markdown` 转 HTML（Times/SimSun）→
浏览器 `page.pdf({format:'A4', printBackground:true})` 出 PDF（中文不乱码）。

## 十三条硬踩坑（每条都真实卡住过）

1. **文件上传只认两个根目录**：`browser_file_upload` 仅允许 `<本机截图目录>` 与
   `d:\WorkBuddy工作目录\脑神经学研究`。其它路径报 *File access denied: outside allowed roots*
   → **先把文件归档进允许根再传**。

2. **别在 `run_code_unsafe` 里 `fileChooser.setFiles()`**：托管环境下不落地，只留下**堆叠的
   file-chooser 模态**把页面彻底卡死。救命法：**`browser_file_upload` 省略 paths 即取消 chooser**，
   连调 N 次把模态清干净。

3. **点 Save and continue 报 422 ≠ 失败**。自动从 PDF 抽取 title/abstract 失败的瞬态错很常见，
   URL **其实已推进**。→ **先重新 snapshot 看 URL，别急着排错**（本人白排查两次）。

4. **摘要硬上限 250 词**（COGSYS）。原稿常超（如 431 词）→ 元数据字段填合规精简版
   （实测 206 词），**PDF 内保留完整摘要**，二者不同不影响。关键词上限 **6 个**。

5. **表单是 React 受控**，`fill()` 可用；但 `getByLabel` 会 strict-mode 同时撞到步骤按钮
   → **必须用 `getByRole('textbox', { name: '...' })`**。

6. **Institution 是 typeahead**。独立研究者无预设匹配 → 输入后必须点
   **"name not found — enter the institution name"** 条目才提交（变成 tag）。

7. **Contributor roles 是 CRediT 多选，点一次下拉就关闭**。循环里每次先判
   `option.count() === 0` 就重开下拉，否则只会选中第一项。
   独作者选 13 项、**排除 Funding acquisition**（无基金时不诚实）。

8. **Funders 步骤选 No**（无基金）。

9. **article-publishing-option 会开跨域新标签页** `publishingoptions.elsevier.com`
   （`page.context().pages()` 里找）。有 **OneTrust cookie 横幅挡点击** → 先点"全部拒绝"再点
   **Save and return**。选 **Subscription → 显示 "Nothing to pay"** = 0 费，守"收费一律不投"红线。
   Save 后该标签**自动关闭**＝成功。直接 Skip 这步会在 review 页留 "incomplete"。

10. **questions 步骤选 "No" 共享数据后，会额外冒出必填**「availability of your research data」下拉
    → 选 **"Data will be made available on request"**（数据随稿补充材料）。SSRN 预印本选 No
    （已发 Zenodo 的话在投稿信披露即可，别重复）。

11. **review 页会暴露未完成项**：逐个 URL 直达补完，直到 **7/7 complete**。
    最后三个声明（ethics / copyright / funding acknowledgment）必须勾选才能点
    **Complete your submission**。

12. **稿号不在 NSE 上**。确认页与 submissions 列表**都不显示** `COGSYS-D-26-xxxxx`。
    正式稿号只能等**确认邮件**。EM 侧 `editorialmanager.com/<code>` 也**不会立刻同步**
    （Author Main Menu 仍显示 Submissions Being Processed 0）→ 别反复刷，属正常延迟。

13. **EM 主菜单在 iframe 里**：`page.frames()` 找 `AuthorMainMenu.aspx`，主 frame 取不到内容。

## 提交后必做（纪律）
- 立刻 `page.pdf()` 存**确认页 PDF** 作收据（含 "Your manuscript has now been submitted" 与时间戳）。
- 当天回填投稿台账（投稿日／平台／UUID／稿号待补／预印本 DOI／出版模式）。
- 投稿记录**绝不隔夜**；稿号随确认邮件到账后立刻补。
