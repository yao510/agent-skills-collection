---
name: journal-submit-automation
description: 用本地 Playwright 浏览器**实际驱动**学术投稿系统，完成「注册账号 → 登录 → 上传稿件/封面信/补充材料 → 填 Details/Authors/Declarations → 提交 → 抓稿号 → 读确认邮件 → 回写台账」的端到端自动化。适用于用户说"帮我投这家期刊""把稿子提交到 X""注册投稿账号""提交后拿稿号""盯一下确认邮件"。覆盖 Springer Nature Snapp（Acta Biotheoretica/Biosemiotics 等）、并含 Elsevier 新系统/Editorial Manager/ScholarOne 的接入口诀。与 journal-submission-kit（投稿知识：选刊/封面信/终检清单）配套使用——本 skill 负责"动手投"，那个负责"投前准备与判据"。
repo: https://github.com/REPO_OWNER_PLACEHOLDER/agent-skills-collection
---

# 学术投稿浏览器自动化（端到端执行层）

## 何时用
- 用户要把某篇稿子**实际提交**到某期刊投稿系统（不是只要操作单）。
- 用户要**注册**某期刊投稿账号、或要**取回稿号 / 查提交状态 / 读确认邮件**。
- 用户说"投了没？""稿号多少？""确认页有没有？"——需要实跑系统取证。

## 本 skill 与 journal-submission-kit 的关系（必读）
- **journal-submission-kit = 知识层**：选刊（费用/范围）、封面信写法、投稿前终检清单（红线词、引文闭环、双盲）、各刊硬要求缓存、桌面拒稿处置。**投前准备用它。**
- **本 skill = 执行层**：真正打开浏览器把稿投出去、拿收据。两者互补，**不要重复造册**。若需要某刊的字段口径（字数/关键词上限/双盲要求），先查 journal-submission-kit 的「已核实期刊硬要求」缓存块，本 skill 只管驱动。

## 🔴 铁律（Receipt-Gate 交付协议，来自用户硬性要求）
1. **没有真实稿号 / 确认页 = 不算 done**。系统确认页（Submission received / Submission Confirmation）和稿件号（或 Submission ID）必须**双证齐全**才算提交成功。
2. **Springer Snapp 确认页没有稿号**。它的唯一标识是 **Submission ID（UUID）**，正式稿号要等技术审查后邮件下发。台账里先登记 Submission ID 并注明"正式稿号待邮件"，**绝不把 Submission ID 冒充成正式稿号**。
3. **不做任何分模/学术决策**（与 YAO 项目红线一致）：只按用户给的字段值填空，绝不自己改标题/摘要/作者/声明口径。预印本 DOI、作者署名、声明措辞一律用用户提供的原文。
4. **不得一稿多投**：同稿同时间只投一家。不同稿投不同刊不冲突——但 Snapp 里挂着**未投出的空草稿**会看着乱、且易误判，提交后清掉多余 in-progress 草稿。
5. **429 限流绝不重头再提交**：限流是幂等外的不可逆动作。先查 your-submissions 确认是否已提交；未提交才按自愈逻辑重试。

## 环境固定值（本机，已核实）
- 浏览器内核：`<chromium 路径>`
- Node 运行时（受管）：`<本机 node 路径>`
- 依赖 `playwright-core` 位置（用 NODE_PATH 引入）：`<playwright-core 所在 node_modules>`
- 登录态 profile 默认：`<浏览器profile目录>`（投稿系统 + QQ 邮箱持久化，关浏览器不丢）
- 截图/收据默认输出到各脚本同级的 `shots/` 与 `*.json`
- 作者信息（姓名/单位/ORCID/邮箱）：按投稿人真实资料填写，不要写死在脚本或文档里

> 以上路径均可经环境变量覆盖（见各脚本头部 `DEFAULTS`）：`CHROME_PATH`、`NODE_PATH`（运行命令里给）、`AI_PROFILE`（指向任意 profile 副本）、`SN_EMAIL`/`SN_PASS`、`SN_SUB`（UUID）、`SN_DATA_AVAIL`、`SN_RESET`（429 重置时刻 ISO）、`SN_JOURNAL`、`SN_TYPE`。

## 标准端到端流程
0. **投前**：先用 journal-submission-kit 确认该刊的费用/范围/双盲/字段口径；备好三件套文件（正文 docx/pdf、Cover Letter PDF、Supplementary zip）。
1. **锁定 Submission UUID**：Snapp 下，要么从 `your-submissions` 列表取已存在的 UUID，要么从期刊 `new-submission/<journalId>/3` 启动新投稿拿到 UUID。脚本都接受 `SN_SUB=<UUID>` 或 `argv[2]`。
2. **登录**：`login_snapp.js` 的 `emailLogin(page, email, pass)`（邮箱+密码经 DOM 原生 setter 注入，绕过受控输入）。
3. **逐屏填空**（以 Snapp 为例，DOM id 见 `references/dom_ids.md`）：
   - Authors 页 `/new/submission/<SUB>/authors`：复核/填写 author-0-first-name / last-name / email / affiliation / 勾 primary-corresponding-author。
   - Declarations 页 `/new/submission/<SUB>/declarations`：勾 hybrid / 无竞争利益 / 非重复发表 / 作者政策 / 无第三方材料 / 有数据(+数据可得性文本框) / 无资助。
   - Next → Review 页：勾 approve/confirm 类 checkbox → 点 `Submit manuscript` → 若有 modal 二次确认就点确认。
4. **取证**：确认页截图 `sn_submitted.png` + 写 `sn19_receipt.json`（含 confirmText、manuscriptId 候选）。
5. **取号**：`snapp_getid.js` 进 `your-submissions` + 详情页正则抓 `XXX-D-26-XXXXX` 式稿号；`snapp_probe.js` 做原始 HTML 探针复核是否真有隐藏稿号字段。
6. **读确认邮件**：`mail_read.js`（用 profile **副本**离线读，避免锁住正在用的 profile）+ 在通知中心/邮箱里找含稿号的信。
7. **回写台账**：把稿号/Submission ID/日期写进 `重要文件别删\论文总台账_*.md` 的对应论文条目；保留退稿记录与预印本披露不动。

## 运行范式（复制即用）
```bash
cd <本技能 references 目录>
export NODE_PATH=<playwright-core 所在 node_modules>
NODE="<本机 node 路径>"
# 收尾提交（Snapp，已知 UUID）
SN_SUB=b5551a62-e6e4-438f-94e8-d8515aa4beee \
SN_DATA_AVAIL="数据可得性声明原文…" \
AI_PROFILE=<浏览器profile目录> \
$NODE snapp_finish.js
# 取稿号
SN_SUB=b5551a62-e6e4-438f-94e8-d8515aa4beee AI_PROFILE=<浏览器profile目录> $NODE snapp_getid.js
# 读确认邮件（先复制 profile 避免锁冲突）
$NODE profile_copy.js && AI_PROFILE=<浏览器profile副本> $NODE mail_read.js
```
Windows Git-Bash 下把 `export` 换 `SET`、`\` 换行删掉即可；目录用 `/` 或转义 `\/`。

## 安全与隔离（血泪经验）
- **Profile 副本读信**：读 QQ 邮箱/投稿系统状态时，先 `profile_copy.js` 复制一份 profile 到 `profile_mailread`，用 `AI_PROFILE` 指向副本启动。**绝不**直接动正在被另一窗口占用的 `profile/`（会触发 SingletonLock 冲突、还可能打断用户正在进行的重投会话）。
- **429 自愈**：`snapp_finish.js` 内置 `waitIfThrottled()`——页面文本命中 `429|频率限制|使用量已超出|too many requests` 时，休眠到 `SN_RESET`（默认提交时刻后 ~0.5–1 分钟）再重试，**不重头提交**。触发点实测在 Declarations→Review 跳转处。
- **每一步落收据**：所有脚本 `finally` 都写 `*.json` 收据 + 关键屏全页截图；失败也在收据里记 `error`。交付前先读收据与截图，确认双证齐全再报 done。
- **双 be 校验**: 429 后不要凭"页面没报错"就认定成功——去 `your-submissions` 看状态是否 `Technical check` / `Submitted`。

## 各系统口径速查（执行层）
### Springer Nature Snapp（`submission.springernature.com`）
- 真实域名就是 `submission.springernature.com`（不是 `submission.nature.com`，后者会重定向）。通知中心在 `notifications.springernature.com`。
- 独立账号体系，**EM 账号不通用**。
- 6 步：Article Type → 上传文件(含封面信独立槽位) → 关键信息(标题/摘要/作者，系统自动抽取) → 作者 → Declarations → Review&Submit。
- 提交按钮文案实测即 `Submit manuscript`，**无二次确认弹窗**（但部分刊有 modal 二次确认，脚本已处理）。
- 拿号口径见上「铁律 2」。DOM id 清单见 `references/dom_ids.md`。
- 参考实跑：`sn19_finish.js`/`sn20_getid.js`/`sn21_notif.js`/`sn22_probe.js`（在 `<浏览器工作目录>/` 有完整实战版，本 skill 的 `references/` 是净化参数版）。

### Elsevier 新系统（`submit.elsevier.com/<CODE>`）& 旧 EM（`editorialmanager.com/<CODE>`）
- 走 journal-submission-kit 的「实操流程」块。执行层面要点：新系统草稿在 `Your submissions` 列表；EM 的 `Build PDF for Approval → Approve Submission` 必须一口气走完，**绝不点 `Save & Submit Later`**（隔夜会被编辑部清掉）。
- 取号：完成页不给号，**去 `Your submissions` 追踪站取 `Manuscript Number`**（形如 `BIOSYS-D-26-01426`），并查 `em@editorialmanager.com` 确认信（收件箱+Junk+Deleted 都看）。

### ScholarOne / SAGE Track（`mc.manuscriptcentral.com/<刊>`）
- 七步；`* view proof` 是带红星必做项，不看 proof 永远提交不了。稿号在 `Submission Confirmation` 页（前缀因刊而异，如 ALife=`ALIFE-2026-0244`、ADB=`AB-26-0430`）。
- 同邮箱在**不同刊** ScholarOne 是各自独立账号。

## 交付检查清单（每次投完自审）
- [ ] 确认页截图 + 收据 JSON 双证存在
- [ ] 稿号 / Submission ID 已取到并登记（Snapp 注明"正式号待邮件"）
- [ ] 429 期间未重头重复提交（your-submissions 只有一条该稿记录）
- [ ] 多余空草稿已清（Snapp in-progress 只留已投出的）
- [ ] 台账对应论文条目已更新（稿号/日期/状态），退稿与预印本披露原样保留
- [ ] 确认邮件已读、稿号与系统一致

## 脚本索引（references/）
| 文件 | 作用 |
|---|---|
| `harness.js` | Playwright 浏览器封装：`launchAI`/`dump`/`allText`，env 可覆盖 CHROME/PROFILE/SHOTS |
| `login_snapp.js` | Snapp 登录 `emailLogin(page,email,pass)` + 进期刊向导 `gotoWizard` |
| `snapp_finish.js` | **通用提交收尾模板**：Authors复核→Declarations全填→Review→Submit→modal→截图+收据，**内置 429 自愈** |
| `snapp_getid.js` | 从 your-submissions/详情页抓正式稿号（正则 `XXX-D-26-XXXXX`） |
| `snapp_probe.js` | 原始 HTML 探针，确认页面是否有未渲染的隐藏稿号字段 |
| `mail_read.js` | 读 QQ 收件箱（用 `AI_PROFILE` 指向的副本 profile，锁安全） |
| `profile_copy.js` | 复制 profile 到 `profile_mailread`（跳锁文件），供离线读信 |
| `dom_ids.md` | 各系统投稿页 DOM id 清单 + 429 自愈口径 |
