---
name: em-playwright-submit
description: 用 playwright 脚本化自动化投 Editorial Manager (EM) 系期刊（Springer/Elsevier 等，如 Biological Theory=bthe、M&M=mind、BioSystems=biosys、Synthese=synt）。覆盖登录、上传、文件类型、问卷、CKEditor 填字段、Funding 必填、Build PDF、Approve 取稿号全流程与全部踩坑点。当用户说"帮我投 XX 刊""接手没投完的稿子""EM 系统卡住了""Build PDF 报 missing"时使用。注意：Taylor & Francis 期刊已迁至新门户（rp.tandfonline.com），投 T&F 刊请改用 tandf-portal-submit 技能。
repo: https://github.com/yaohuancen/agent-skills-collection
---

# Editorial Manager 投稿自动化（playwright）

## 为什么要脚本化
浏览器 Agent 每步截图喂给模型 = 烧积分。正确做法：**playwright 脚本批量执行，只在关键节点截图**
（上传后、Build PDF 后、Approve 后）。一篇稿子全流程约 3–6 次截图即可。

## 运行环境
```bash
cd <你的工作目录>
NODE_PATH="<playwright-core 所在 node_modules>" \
  "<本机 node 路径>" <script>.js
```
- `playwright-core` 装在 `<playwright-core 所在 node_modules>`
- 浏览器用 `channel:'msedge'`、`headless:false`
- 登录一次后 `storageState` 存 `<code>_auth.json`，后续脚本复用

## 十四条硬踩坑（每条都真实卡住过）

1. **向导活在独立 iframe**：页面是 `Sub*.aspx`（`SubSelectArticle → SubAttachFiles → SubReviewPrefs →
   SubAuthorForm → SubComments → SubManuscriptData`）。主页面取不到任何表单。
   必须 `page.frames().find(f => /\/<code>\/Sub[A-Za-z]+\.aspx/.test(f.url()))`。
   同样，Author 主菜单在 `AuthorMainMenu.aspx` iframe 里。

2. **标题/摘要是 CKEditor**：`textarea` 是 `display:none + readonly`，`fill()` 必超时。
   用 `CKEDITOR.instances['fullTitleHtml'].setData(t)` 和 `['abstractHtml'].setData(a)`。
   关键词是普通 `#txtKeywords`。
   ⚠️ 实例按 **elementId** 一一对应（`fullTitleHtml/abstractHtml/ckScratch`…），循环批量 setData
   会把摘要写进 title 实例污染标题——逐个按 id 精确 `setData()`＋`updateElement()`。

3. **上传控件是 `#fileInput`**（name=`upload_file`），不是 `#fileInput2`；**且非 multiple**
   → 只能 for 循环逐个 `setInputFiles`，传数组会报 `Non-multiple file input`。

4. **改完文件类型必须点 `proceedButton` 才落库**。不点 → 重进会话类型全丢回 `Choose`(999999999)，
   Attach Files 永远显示 Missing。

5. **ZIP 会被拆开，且拒收 `.py/.json`**（"file type not supported"）。
   补充材料务必合并成一个 `.txt` 纯文本件再传。

6. **Funding Information 是必填阻塞项**：不填 → Build PDF 报
   `Required information is missing from the Funding Information step`.
   解：勾选 `#FundingInfoNotAvailable`（文案 "Funding information is not applicable /
   No funding was received."），保存后隐藏域 `#FundingInfoCount` 从 `-1` 变 `0`。
   保存按钮是 `#savebtn`（Save & Submit Later），点了会退回列表，需要重新进向导。

7. **Approve 按钮识别**：`process_submission_decision.asp?...&eid=4` = **Approve Submission**；
   `eid=23` = **Remove Submission**（删稿！千万别点错）。
   动作链接在折叠区/隐藏菜单里 → 先点 "Action Links" 展开；`innerText` 常含非标准空白导致
   evaluate 正则失配 → **用 Playwright locator `a:has-text("…")` 点击**（自动规范化空白），别手写正则。
   ⚠️ **View-First 是强制闸门**（Synthese 2026-09 实测）：没真正点过 View Submission 打开 PDF 就点
   Approve，报 `You must View your submission PDF...`；旧技巧预先改 `doc<docid>.value='true'` 不再顶用。
   ⚠️ **对 PDF popup 调 `page.evaluate` 无超时永不返回**（曾 hang 19 分钟）→ popup 操作一律
   `Promise.race([op, withTimeout(ms)])` ＋全局 watchdog `process.exit(3)`。
   🔴 **View 与 Approve 必须分两个独立会话**（Synthese 2026-10 实测，血泪）：同一会话里先 View 再 Approve，
   View 弹出的 PDF 窗口会**销毁原 frame 上下文** → 紧接着 eval approve 报 `warnAuthor is not defined`，
   表现为"批准已执行"的**假成功**（稿件实际仍停在 Needs Approval，极易被误记为已完成）。
   修法＝会话①做 View（拿 PDF／过闸门）；会话②**跳过 View**，直接进 `auth_ndauthApprove.asp`，
   **遍历 `page.frames()` 找 `typeof window.warnAuthor === 'function'` 的那个 frame 再 eval**
   （通常就是列表页 frame；外层 `Default.aspx` 恒为 undefined），执行前必做死穴断言。
   🔴 **步骤跳转别按按钮 ID**：`StepIndicator_stepAttachFileButton` 这类 ID **根本不存在**
   （`getElementById` 返回 null —— 不是"点了不生效"）→ 步骤切换一律用 `persistAndNavigateTo(url)`，
   或在**内层 frame** 内直接改 `window.location.href` 到 `SubXxx.aspx?SessionThreadIdField=...`
   （外层直接跳会被弹回 `Default.aspx`）。
   ✅ **批准成功的轻量确证**：主菜单第 5 项由 `Submissions Waiting for Author's Approval`
   **变为 `Submissions Being Processed`**（比反复刷新列表判断更快）。

8. **弹窗在 iframe 里**：ORCID 弹窗、"Are you sure you want to approve" 确认弹窗，
   都是 jQuery UI `.ui-dialog`，**只能在对应 frame 里查**，在主页面 `page.evaluate` 查永远是空。
   按钮顺序：先 "Proceed without ORCID iD"，再 "OK"。

9. **EM 文件类型编码**：`6=Manuscript, 9=Table, 12=Figure, 15=Attachment to manuscript`；
   `999999999=Choose`（Choose 状态会阻塞）。删不掉的文件就归为 15 并填 description，不阻塞提交。

10. **问卷（Additional Information）点 Proceed 不保存答案**：跨页后答案归零（Q 反复变回占位，
    Build PDF 报 Additional Information Missing）。唯一落库方式 = 调页面函数
    **`persistAndNavigateTo()`（无参 = 保存当前页）**：`f.evaluate(() => persistAndNavigateTo())`
    触发真实 POST；保存后 `hdnErrorMsg` 清空、选中值保持。保存完必须 roundtrip 回来复验。

11. **问卷 radio 占位选项恒为 `value=0`**：正确答案是任意非零值。按
    `input[type=radio][value!="0"]` 点选，**不要按 label 文本匹配**——"I understand that my
    manuscript…" 这类题干用 /yes|confirm/ 永远匹配不上。

12. **Build PDF 静默被拦截先读 `#hdnErrorMsg`**：校验错误存在这个隐藏域里（如
    "Required information is missing from the Additional Information step"），页面不显示；
    validate() 发现非空就弹 `.ui-dialog` 错误框。别对着"没反应"的页面猜。

13. **Manuscript Data 是手风琴 5 面板**（title/abstract/keywords/authors/funding）：点 header 的
    `span#tlbl*` 展开；Abstract 面板内点面板 Next 才持久化；**Keywords/Funding 面板没有 Next
    （勾/填即存）**；Authors 面板 Next 保存列表。元数据自动提取会产出**重复作者条目**
    （无敬称的红❗行）→ 点行内垃圾桶图标删掉，验收看 `allAuthorFieldsComplete=1`。

14. **登录竞态 `frame.fill: Frame was detached`**：登录 iframe 偶发重建，直接重跑同一脚本即过。

15. 🔴 **向导框架正则陷阱（最容易白跑一天）**：`/Sub[A-Za-z]+\.asp/` **会误匹配
    `auth_incSubmissions.asp`**（"Submissions" 里含 "Sub"）→ 你以为进了向导，实际一直在读投稿列表页，
    表现是"每个步骤 body 都一模一样""永远找不到 Build PDF"。真实向导页用
    **`/Sub[A-Z][a-zA-Z]*\.aspx/`**（Sub 后紧跟大写、且是 `.aspx`），彻底排除小写 Submissions。

16. 🔴 **`proceedButton` 的 id 恒定但文本随步骤变**（2026-09 Synthese 实测）：
    ArticleType 步 = "Proceed"，**ManuscriptData 步 = "Build PDF for Approval"**，AttachFiles 步 = "Proceed"。
    → **点之前必须先读 `proceedButton` 的文本并断言**，否则会出现"本想构建 PDF 却把向导推进到下一步"
    （或反过来误提交）。同页 `savebtn` = "Save & Submit Later"，**绝不点**（点了退回列表）。

17. 🔴 **删除文件的确认面板是 DOM 元素，不是原生 dialog**：点 `btnRemoveCheckedFiles` 后弹出
    "Are you sure you want to remove all selected files?" + **无 id 的 "Proceed"/"Cancel" 按钮**；
    `page.on('dialog')` **不会触发**（它不是 alert/confirm）。
    → 必须点 **文本="Proceed" 且 `id !== 'proceedButton'`** 的按钮。命中 `id=proceedButton` 会跳步且
    **删除根本不生效**（还伪造出"已删除"的假阳性，因为页面已不在原步）。
    文件行：`td.fileNameCell` 定位 → 行内 `input[name="delete_CheckList"]`(value=文件ID) 勾上 → 点删除。

18. **向导切步必须 `persistAndNavigateTo(url)`**：URL 从当前页 HTML 正则
    `/persistAndNavigateTo\(['"]([^'"]+)['"]/g` 提取（含**当次** `SessionThreadIdField`，每次会话都变，
    不能写死）。StepIndicator 按钮的 `.click()` **不生效**（切了但内容不变）。

19. **下载 author PDF**：动作是 `javascript:viewAuthorPDFs(docid, msnum, 0, msid, 'R')`——
    是 **JS 函数调用不是 URL**，`window.open(href)` 无效。
    正确做法：**点那个 a 标签**（或 `evaluate` 里调 `viewAuthorPDFs(...)`）+ 在 **`page`** 上监听
    `page.on('download')`（事件在 page 不在 popup），然后 `saveAs(目标路径)`。
    ⚠️ 不 saveAs 的话文件**不会落到默认下载目录**（实测 E:\AppData\Downloads 为空，下载被丢弃）。

20. **重传文件后必须重建 PDF**：改/删文件会让投稿从"待批准"退回 **Incomplete Submissions**，
    且 **AuthorMainMenu 里 "Submissions Waiting for Author's Approval" 链接会消失**——
    该链接重新出现 = PDF 重建成功的可靠收据。

## 标准流程（一稿通投）

| 步 | 动作 | 验收收据 |
|---|---|---|
| 1 | 登录 → 存 `storageState` | 页面出现 `<姓名> \| Logout` |
| 2 | 进向导（重试 3 次取 `submit_revision.asp` href，在 iframe 内 `window.location.href` 跳转） | frame URL 含 `Sub[A-Za-z]+.aspx` |
| 3 | Attach Files：逐个上传 + 设类型 + **Proceed** | Attach Files 状态 = Completed |
| 4 | 问卷/Additional Information 逐项填（含姊妹稿、预印本 DOI、GenAI 声明）＋每页 persistAndNavigateTo() 落库 | roundtrip 复验选项值≠0、hdnErrorMsg 为空 |
| 5 | Comments 填附件说明 | `#txtComments` 有值 |
| 6 | Manuscript Data：CKEditor 填标题/摘要 + 关键词 + 勾 Funding | `FundingInfoCount=0` |
| 7 | Build PDF for Approval → 轮询约 3–8 分钟 | 列表状态 = Needs Approval |
| 8 | **下载 PDF 人工核对**（页数、标题、图、封面信、声明） | PDF 落盘 + 关键串计数 |
| 9 | Approve（eid=4）→ 过 ORCID 弹窗 → 过确认弹窗 | 回执页 `Thank you for approving` |
| 10 | 到 `auth_pendSubmissions.asp` 取正式稿号 | `XXX-D-26-xxxxx` |

## 关键 URL
- 登录/主菜单：`https://www.editorialmanager.com/<code>/default2.aspx`
- 作者主菜单：`AuthorMainMenu.aspx`（iframe）
- 未完成投稿：`auth_incSubmissions.asp`
- 待批准：`auth_ndauthApprove.asp`
- 已投出（取稿号）：`auth_pendSubmissions.asp`
- 状态总览：`manuscript_status.asp`

## 铁律
- 收费一律不投（选订阅制 0 费用）；不得一稿多投；预印本必须如实披露。
- **Approve 前必须下载 PDF 核对**，不看 PDF 就批准 = 糊弄交付。
- 拿到稿号后**立刻回写论文总台账**（时间线 + 一眼定位表）。
- 别把密码明文写进脚本；如已有，提醒用户改密或删文件。

## ORCID 认证（Authenticated ORCID iD）
EM 会弹窗要求认证 ORCID，可先选 "Proceed without ORCID iD" 完成投稿，事后补：
1. `Update My Information`（info_update.asp，**在 iframe 里**）→ 点 `#orcidPopupHyperLink`(Fetch/Register)
2. popup 开 `orcid.org/signin?client_id=APP-...` → 填 `#username-input` + `#password` → `#signin-button`
3. 自动跳 `orcid.org/oauth/authorize`（该页可能无可见按钮，若之前授权过会直接跳回）
4. 回 EM 后检查 `#orcidAuthenticated` 隐藏域 = "True"、页面显示 ORCID 号、Fetch 按钮消失 → 点 Submit 保存
坑：EM 电话字段**只收纯数字**（如 13800000000），带 `+` 号会被静默丢弃。
坑：EM 的 ORCID 认证是**账号级**的，每个 EM 期刊账号要各自认证一次。
