# 各投稿系统 DOM id / 流程清单（执行层）

> 期刊「字段口径」（字数/关键词上限/双盲要求/封面信问题清单）见 `journal-submission-kit` 的「已核实期刊硬要求」缓存块。本文件只列**浏览器驱动所需的 DOM 选择器与流程节点**，用于写/改自动填充脚本。

---

## 1. Springer Nature Snapp（`submission.springernature.com`）

真实域名即 `submission.springernature.com`（非 `submission.nature.com`）。通知中心 `notifications.springernature.com`。

### 登录（`login_snapp.js`）
- 邮箱框 `#login-email` → 点 `#email-submit`
- 密码框 `#login-password` → 点 `#password-submit`
- 两者均用原生 setter 注入（`Object.getOwnPropertyDescriptor(el.constructor.prototype,'value').set`）绕过 React 受控输入。

### Authors 页 `/new/submission/<UUID>/authors`
| 字段 | id |
|---|---|
| 名 | `author-0-first-name` |
| 姓 | `author-0-last-name` |
| 邮箱 | `author-0-email` |
| 单位 | `author-0-affiliation` |
| 通讯作者勾选 | `primary-corresponding-author` |

### Declarations 页 `/new/submission/<UUID>/declarations`（2026-09-26 实测）
| 项 | 选择器（radio/checkbox） |
|---|---|
| 稿件模式 hybrid 理解确认 | `#hybrid` |
| 无竞争利益 / 有 | `#competing-interest-no` / `#competing-interest-yes` |
| 非重复发表 / 是 | `#dual-publication-no`（yes 同理） |
| 作者政策确认 | `#authorship` |
| 无第三方素材 | `#third-party-material-no` |
| 有数据 / 无 | `#data-availability-yes` / `#data-availability-no` |
| 数据可得性正文（自由文本框） | `#data-availability-description` |
| 无资助 / 有 | `#research-funding-no` / `#research-funding-yes` |

填充后用 `getElementById(id)` 回读 `checked`/`.value` 复核（见 `snapp_finish.js` 的 `[10 声明复核]`）。

### Review & Submit
- Declarations 页点 `Next`（按钮文本正则 `^\s*next\s*$`）→ Review 页。
- Review 页：`input[type=checkbox]` 里标签命中 `/approv|confirm|warrant|agree|read and underst|accuracy/` 的全部点选。
- 提交按钮文本：`approve & submit` / `submit manuscript` / `confirm submit`（正则）。
- 部分刊有 `[role=dialog"]` / `.modal` 二次确认弹窗，其内 `approve|submit|confirm|yes` 按钮点第一个。

### 拿号口径（铁律）
- 确认页文案固定 `Submission received` / `Thank you for submitting to <刊>` / `Your submission is now at our Technical Check stage` —— **页面无稿号**。
- 唯一标识 = **Submission ID（UUID）**，见 `your-submissions`（卡片 `UUID | v.1.0` + 状态）与 `submission-details/<UUID>`（`Submission ID` 字段 + `Show history`）。
- **Technical Check 阶段不生成 EM 式正式稿号**；用 `snapp_probe.js` 做原始 HTML 探针复核（正则扫 `manuscript-number` / `[A-Z]{2,6}-[0-9]{2}-[0-9]{3,8}`）→ 页面零命中是正常的。正式号待审查通过邮件下发。
- 台账先登 Submission ID 并注"正式稿号待邮件"，拿到后回填；**绝把 UUID 当正式稿号写**。

### 429 自愈
- 触发点实测：Declarations→Review 跳转处。
- `isThrottle(txt)` = `/429|频率限制|使用量已超出|too many requests/i`。
- 命中后 `sleep(max(RESET_MS - now, 30000) + 2000)` 再重试；**不重头提交**。提交后用 `your-submissions` 确认只一条该稿记录。

---

## 2. Elsevier 新系统（`submit.elsevier.com/<CODE>`）
- 八步向导（Choose article type → Upload files → Title/abstract/keywords → Author details → Funder → 第6步因刊而异 → Additional info → Review&submit）。
- 必传 3–4 件：`Cover letter` / `Manuscript` / `Declaration of competing interests`（独立必需件）。
- 作者 `Institution` 搜不到 → 走 "Can't find your institution?" 手动填 `Independent Researcher`。`Contributor roles`(CRediT) 必勾。
- 混合刊第 6 步若弹 OA 选择 → 选 `Subscription`（BioSystems 选错 = USD 2,980）。
- 完成页无号 → `Your submissions` 追踪站取 `Manuscript Number`（如 `BIOSYS-D-26-01426`）+ 查 `em@editorialmanager.com` 确认信（收件箱+Junk+Deleted）。

## 3. Springer Editorial Manager（`editorialmanager.com/<CODE>`）
- `Build PDF for Approval` → `Submissions Waiting for Approval by Author` → 等 `Needs Approval` → `View Submission` 看 proof → `Approve Submission`。**绝不点 `Save & Submit Later`**（隔夜被清）。
- Item Type 默认 `Blind Manuscript`，每加一行先选类型再 Browse；封面信/COI/补充材料挂 `attachment to manuscript`。
- 稿号格式 `<CODE>-D-26-xxxxx`（如 `MIND-D-26-01372`），邮件 `<稿件号> - Submission Confirmation`。

## 4. ScholarOne / SAGE Track（`mc.manuscriptcentral.com/<刊>`）
- 七步；`* view proof` 带红星必做，不看 proof 永远提交不了。
- 稿号在 `Submission Confirmation` 页，前缀因刊而异（ALife=`ALIFE-2026-0244`、ADB=`AB-26-0430`）。
- 同邮箱不同刊 = 独立账号；提示"邮箱已存在"走 `Reset Password` 勿重复注册。
