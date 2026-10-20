---
name: journal-submission-kit
description: 为学术论文生成"投稿三件套"——①按目标期刊官方要求写的封面信（cover letter）②中文界面的逐步投稿操作单（逐格填什么）③可直接上传的 PDF。适用于用户说"投这家期刊""帮我投稿""封面信怎么写""投稿步骤给我"等场景。也覆盖 Zenodo/arXiv 预印本上传操作单、Elsevier 新投稿系统（submit.elsevier.com）八步逐屏实操与费用陷阱。
repo: https://github.com/yao510/agent-skills-collection
---

# 论文投稿三件套生成

> 🤖 **配套执行 skill**：本文件只管"投前准备 + 判据（选刊/封面信/终检/桌面拒稿处置）"。要**实际打开浏览器把稿投出去、拿稿号、读确认邮件**，用配套 skill **`journal-submit-automation`**（含 Playwright 脚本、429 自愈、profile 副本防锁、各系统 DOM id 清单、Receipt-Gate 交付协议）。两 skill 互补，不要重复造册。

## 何时用
- 用户要把论文投某期刊/会议，需要**封面信**、**逐步操作单**、**可上传的 PDF**。
- 用户要上传 Zenodo/arXiv 预印本，需要"看不懂英文，告诉我每一格填什么"。

## 核心原则（血泪经验）
1. **先查官方 requirements，不要凭记忆写**。用 WebFetch 打开期刊的 submission-guidelines 页面，逐条抄出：投稿入口 URL、文章类型与字数区间、ORCID 要求、参考文献格式、**封面信必须回答的问题清单**、数据/代码政策、接收后的格式要求。把原文要求写进产出物（用户会核对）。
2. **封面信必须逐条对上官方问题清单**。很多刊对"独立研究者/无发表记录者"有专门通道（如 *Artificial Life* 要"一页自足扩展摘要答 8 问"）。按官方编号 1..N 逐条作答，编辑可以直接打钩。
3. **操作单要写"中文界面字段名"**。用户常用浏览器翻译把英文站点变中文，字段名会被机器翻译得很怪 → 操作单要写成「屏幕上的中文 + 英文原词 + 你填什么」三列，并按屏幕从上到下的顺序走。
4. **诚实披露预印本**：封面信里点明"已有 Zenodo/arXiv 预印本（DOI …）"，避免编辑误判"已发表/一稿多投"。
5. **红线：一稿多投**。同一稿件同一时间只在一家审。不同稿投不同刊不冲突。

## 🔴 投稿前终检清单（2026-09-20 立，来自论文4 → Theory in Biosciences 实战）

**三类必须为零：错误 / 硬伤 / 不该出现。** 落成脚本逐文件扫描全部投稿对象（主稿 md+docx、封面信 md+docx、补充代码、中文正式稿 docx+pdf），不要只靠肉眼。

### A. 不该出现（一律清）
1. **拟投期刊信息**：稿件正文里不得出现 `拟投期刊` / `Journal: X`。期刊名只该出现在**封面信**（给该刊编辑看的正确位置）。理由：改投时残留即减分；期刊属投稿系统元数据，不属稿件内容。
2. 内部盘符路径、内部项目名、本机用户名、邮箱授权码、TODO/待补占位符、错误署名。
3. **英文稿件不得含任何中文字符**——包括**图片文件夹名**（`_图_TIB/` 会以路径文字留在 md 里 → 改名为 `Figures/`）。
4. 禁用口径与自贬措辞（`central weakness`／"最严重"／"致命的弱"；缺点一律用"范围/口径/设计选择"中性语言）。

### B. 硬伤（审稿人据此扣分或质疑诚信）
5. **AI 使用声明：封面信与稿件必须同口径**。实测过封面信仍写"未使用任何生成式 AI 撰写"而稿件已改披露式——编辑同时看两份，属诚信类硬伤。
6. **self-repetition 扫描**：正文按句切分，查 ≥12 词长句重复、≥8 词短语高频复用。**把定位句搬进引言后，讨论对应节必须改写为深化版，不能复制**（引言/讨论逐字重复是审稿人必标项）。
7. **docx 元数据**：`creator`/`lastModifiedBy` 会被 python-docx 写成 `python-docx`（审稿人在文件属性里看得到）→ **每次重出后重设作者名**。注意**加行号也会覆盖元数据**，须与元数据设置写在同一脚本里。
8. **行号**：Springer 等要求连续行号（`w:lnNumType` countBy=1 / restart=continuous）。
9. 摘要词数 / 关键词数 / Statements and Declarations / 单文件含题目页 —— 逐项对刊规。
10. **图题注 = 图链 = 图文件 = docx 内嵌图** 四者数量一致（本项不够，见 11）。
11. **图注文字必须与图文件实际内容配对**：实测发生过"图注写努力划分、图文件却是三级阶梯"的错配 → 换图/重画后**必须逐张目视**，不能只数数量。
12. **同名旧稿必须归档**：尤其标题立场已变的旧版（曾发现根目录留着主张"活的"旧标题稿，与现稿"不主张活"冲突＝误投风险）→ 移到 `_旧稿_YYYY-MM-DD_*`。
13. 投稿包内**不放** `.bak_*` / `_未采用/` / `__pycache__`；备份统一移出到 `_备份_投稿包历史/`。投稿包只应有：稿件、封面信、补充代码、图目录。

### C. 错误（客观错误，必须为零）
14. 引文双向闭环（正文引注集合 ↔ 文献表编号集合，两向差集均为空）；`§` 引用无悬空；表号连续且正文引用不越界；**中英双稿关键读数逐项一致**。
15. **PDF 量化验证 + 目视**：图片显示尺寸必须 ≤ 版心宽——**reportlab 5.0.1 对 `Image.drawWidth` 事后赋值无效**，必须用构造参数 `Image(path, width=, height=)`；再渲染关键页目视（字形空心方框、图文重叠、段落拆行）。

## 已核实的期刊硬要求（缓存，附核对日期，用前仍以官网为准）

### *Artificial Life*（MIT Press，`mc.manuscriptcentral.com/artificiallife`）— 2026-09-13 核对
- 文章类型与字数：**Article 6,000–12,000 词** / Review >12,000 / Meeting Report <2,000 / Letter <2,000
- 初投：**只交 PDF**，用 ScholarOne 提交
- **封面信必交**，且分两条通道：**Independent/new ALife researchers**（全部作者无学术职位、或无 ALife 系刊物/会议发表记录）→ **一页自足扩展摘要答 8 问**，可含至多 2 张图；**Established researchers**（≥1 位有职位或有 ALife 发表记录）→ 只答 **3 问**（主题与契合度 / 为何对 ALife 社群重要 / 谁受益）。判断依据是 ORCID 或 Google Scholar 记录
- **摘要要按"独立研究者封面信"的风格写但更简洁**，写得不合要求会被退回重写
- **ORCID：全体作者必须有**（提交者 + 共同作者都要在自己账号 E-Mail/Name 里补）
- 关键词：投稿系统 Attributes 屏 `REQUIRED: 1, MAX: 5`；**至少 1 个来自官方 ALife 关键词表**；录用稿封面页要 **5–6 个 keywords**
- 引用：**APA v7**（LaTeX 有 `apa7` bib style；Word 2016+ 的 APA v6 可接受）
- 补充材料：**评审期**必需的补充材料须与正文同时上传，或在文中给 URL（URL 不得破坏审稿匿名）；**录用后**要么传在线仓库并给公开 URL，要么**合并成单个 PDF**（内含 Supplementary Material / 标题 / 作者 / 单位与联系方式）
- 修回：**干净稿 + 标注改动稿（蓝色字或黄底）+ 逐条 reviewer response** 三件
- 录用后：LaTeX/Word 源文件 + 每图单独文件 + **Publication Agreement** + 版权许可 + 可选 feature figure；正文单栏双倍行距；投稿联系 `editor@alife.org`
- **稿件号格式**：`ALIFE-2026-XXXX`（实测 2026-09-13 提交得 `ALIFE-2026-0244`）。Submit 后立即跳转 `Submission Confirmation` 页，页上四行是权威凭证：`Submitted to` / `Manuscript ID` / `Title` / `Authors` / `Date Submitted` → **截图留档 + 登记台账**。
- 提交完成的判定：看到 `Submission Confirmation — Thank you for your submission` 并显示 Manuscript ID ✓（此前 Status 页写 `Author Submitted ✓`）


### *IEEE TCDS*（Cognitive and Developmental Systems）— 2026-09-15 核对
范围**明列** "cognitive systems / cognitive robotics / **artificial life systems** / multi-agent / developmental" → 人工生命与认知架构类稿件的**高匹配主场**。
IF 4.9（2024；早期口径 3.4）｜中科院 3 区｜Q1（神经科学类）｜**混合出版：订阅模式无 APC**，OA 可选（约 US$2,800）｜一审约 2–5 个月。
**要求**：IEEE 双栏模板；**摘要 150–250 词、单段、无缩写无引用**；**2–5 个关键词**；Regular ≤15 页（**超 10 页 $200/页**）、Correspondence ≤9 页、Survey ≤21 页、Comment ≤4 页；**AI 生成文本必须在致谢披露并在相应章节引用**；鼓励把推导放附录；投递需自行指定 publication category。

### *Cognitive Systems Research*（Elsevier，ISSN 1389-0417）— 2026-09-16 复校
范围：**类人认知 / 认知架构**（含 BICA），对标 SOAR・ACT-R・LIDA 一类工作。
IF 2.9｜Q2｜CiteScore 6.3｜**订阅免费（0 费用）**，OA 可选 **USD 2,880**｜投稿到首决约 12 天，评审到决定约 172 天。
**要求（逐项，照此准备）**：Article Type = **Research paper**｜**3,500–10,000 词**（含摘要、不含参考文献）｜**摘要 ≤250 词**、可独立成篇、避免引用与非常规缩写｜**关键词 1–7 个**｜**Highlights 3–5 条、每条 ≤85 字符**（鼓励，须作为**独立可编辑文件**上传，文件名含 "highlights"）｜⚠️ **双盲**：**标题页与匿名稿必须作为两个独立文件**（标题页含作者/单位/通讯方式/致谢/利益冲突；匿名稿不得出现任何身份信息，**自引一律写 `[Author]`**）｜**APA 7th**、文献表**字母序**｜必须齐备：competing interests（Elsevier declarations tool 生成）、funding、**generative AI use 声明**、**data statement（Elsevier Option C：要求存入仓储；无法共享须给理由）**、CRediT｜图 ≥300 dpi 且**单独文件**（矢量 EPS/PDF 优先）、表用可编辑文本且**避免竖线与底纹**｜系统 `submit.elsevier.com/COGSYS`（另有旧 `editorialmanager.com/cogsys`）。
⚠️ **纯实证/纯计算稿必须配理论建构**（"why should other researchers in cognitive systems care?"）；**不接收纯 ML 调参/分类器改进**；不接收临床医学稿。

### *Adaptive Behavior*（SAGE，ISSN 1059-7123）— 2026-09-17 复校（官网原文核对）
范围：生物体与**自主人工系统**的适应行为（具身认知、学习与进化、动机与情感、决策、社会行为），国际适应行为学会（ISAB）会刊。**"自维持/自主运行"类主题的天然主场。**
IF 1.3｜Q2(SSCI 社科跨领域)/Q4(CS-AI)｜**🔴 投稿与出版均不收费**（官网原文 *"There are no fees payable to submit or publish in this journal"*）。
**要求（逐项）**：Type = **Article**（**6,000–12,000 词**；另有 Reviews >12,000、Commentaries <500、Opinions <2,000、Short communications <2,000、Book reviews <2,000、Reports <2,000）｜**摘要非结构化**——官方原文 *"include an unstructured abstract of 250 words"*（**口径是"不超过 250"，不要为了凑整数 250 反复改稿**；注意 Python `split()` 会把独立 `—` 计为 token，会比 Word 多算 2–3 个，报词数时说清口径）｜**关键词 2–6**｜**APA 参考格式**｜**单盲**（审稿人匿名、**作者公开** → 稿件首页**要带**作者信息，无需匿名稿）｜文末必须有 `Acknowledgements`（可选，官方建议置于声明段**之前**）＋ **`Author Contributions`** ＋ 一级标题 **`Statements and Declarations`**，其下五个子标题：`Ethical considerations`／`Consent to participate`／`Consent for publication`／`Declaration of conflicting interest`／`Funding statement`（**不适用也要写 Not applicable**，编辑可能追问为何不适用）＋ **AI 使用强制声明**（`AI use statement`）｜**🔴 不接受作者推荐审稿人**（官方：*"we assign reviewers and cannot accept author recommendations"*）｜主稿优先 **Word**（也收 LaTeX，无需模板但要求标题层级清晰）｜图 ≥300 dpi、单独文件｜系统 `mc.manuscriptcentral.com/ad-behav`。
🔴 **入口坑（2026-09-17 实测）**：SAGE Track 就是 **ScholarOne 的白标系统**，投稿入口一律是 **`mc.manuscriptcentral.com/<刊缩写>`**（ADB = `/ad-behav`，落地页标题会显示刊名）。⚠️ **`support.silverchair.com/s/scholarone-manuscripts/` 是 ScholarOne 官方帮助中心**（FAQ／Release Notes／按角色卡片 Author·Reviewer·Editor·Admin／教程视频），**不用登录、也永远投不了稿** —— 从搜索引擎极易误入。**首次投稿必须先在该站 `Create An Account` 注册、再点邮件里的激活链接**；同一邮箱在**不同刊的 ScholarOne 站点是彼此独立的账号**，投过别家刊不等于本刊能直接登录。
🔴 **2026-09-17 新增必填项（官方原文）**：*"authors should attach their bios and photos at submission time"* → **投稿时必须附英文作者简介（bio）＋一张头像照**，这是易漏项，准备照抄单时**必须预置**这两样。
✅ **实测提交记录（2026-09-17）**：稿件号 **前缀是 `AB-`**（例：`AB-26-0430`）—— **不是 `ADB-`**，别按刊名缩写猜号段。提交成功页为 `Submission Confirmation`（含 Submitted to / Manuscript ID / Title / Authors / Date Submitted 五行）。
🔴 **Step 7 的最后一关是"看校样"，不是"点提交"**：该屏底部有一个**带红星的必做字段 `* view proof`**，写着 *"You must view the PDF proof before you can submit"* —— 必须先点 **`View PDF Proof`**（新开窗口/标签合成，几十秒，**别连点**），生成完**关掉校样窗口**回到主页面，**右下角 `Submit` 按钮才会由灰变可点**。不看 proof 永远提交不了。另一坑：这一屏若出现 **Sage Choice / Open Access / 印刷彩图** 之类选项，**一律选 No**（本刊 0 费用）。
⚠️ **费用陷阱**：不要选 **Sage Choice（OA）**；不要勾**印刷版彩图**（在线彩图免费且不收费，*"Figures submitted in colour will be published in colour in the online version at no cost"*，印刷彩图另计价）。
⚠️ **非合规后果**：官方明写 *"Non-compliance with the submission requirements will lead to the paper being unsubmitted"* → 字数、摘要、声明段、AI 声明、作者 bio/photo 都得齐。
⚠️ 官方另提示：警惕"第三方代投＋向编辑付费"的邮件（Sage 已报 Research Integrity Team），不收也不回。

### 🔴 选刊：先过"费用"这一关（2026-09-16 立的硬约束「收费的不投」）
先查**出版模式**再谈契合度，否则白投：
- **完全 OA 刊一票否决**（作者必付 APC）：Connection Science（T&F，≈USD 2,195）｜Discover Life（原 *Origins of Life and Evolution of Biospheres*，Springer，€1,890/£1,590）｜Entropy（MDPI）等。
- **混合刊走订阅制 = 0 费用**（录用后系统会给 OA/订阅二选一，**务必选 Subscription**）：Elsevier 系（Cognitive Systems Research、BioSystems…）、Springer 系（Minds and Machines、Biosemiotics…）、IEEE 系（TCDS）。
- **IEEE 的隐藏费用是"超页费"不是 APC**：TCDS Regular **≤10 页免费**，超 10 页 **USD 200/页**（上限 15 页）→ 控住页数即 0 费用。
- 查证口径：出版社官网 About/Insights 页的 "Article publishing options"（会明写 Subscription = No publication fee）＋ Guide for Authors 的 page-limits 段。

### 🔴 Elsevier 新投稿系统（`submit.elsevier.com/<刊名缩写>`）实操流程 — 2026-09-16 实测（*BioSystems*）

⚠️ **Elsevier 现在有两套投稿入口，别搞错**：
- **旧 = Editorial Manager**（`editorialmanager.com/<CODE>`）；**新 = `submit.elsevier.com/<CODE>`**。
- 新系统页底明写：**"在 Editorial Manager 里开的稿不能在这套新系统里继续"**。→ 开稿前先确认用户在旧系统**有没有半成品草稿**；有就别在这边再开一条（否则同一稿两条未完成记录）。
- 新系统落地页会列出**未完成草稿**（`(Not yet available)` / `Status: Incomplete submission`）→ **点它进去续填，不要点 `Start a new submission`**。

**八步向导**（右侧 `Submission tasks` 进度条）：
| 步 | 屏 | 关键项 |
|---|---|---|
| 1 | Choose your article type | 按刊要求选（BioSystems 用 `Full Length Article`，不限长度=无超页费） |
| 2 | Upload your submission files | 见下"必传/optional" |
| 3 | Title, abstract and keywords | 系统常**抽不出**摘要 → 手粘。**keywords 这栏要"分号分隔"整行粘**，不是一个个回车（页面提示 "Separate keywords with a semicolon"） |
| 4 | Author details | 见下两个坑 |
| 5 | Funder details | 无资助选 **No** |
| 6 | **因刊而异**（同一套新系统，各刊第 6 步不同！）：<br>BioSystems = `Ethical declaration`<br>CSR = **`Decide if you want to publish open access`** | BioSystems：不涉及人/动物 → 勾 **`Not applicable`** → **点 `Download statements file` 下载后勾确认框**（该文件不用上传）。<br>**CSR**：该屏只有一行红字 `Tell us how you want to publish` + 一个按钮 → 点按钮**跳到独立站点 `publishingoptions.elsevier.com`** 的弹窗 → 选 **`Subscription`** → 右下 `Save and return` 才会由灰变亮 → 回主页再 `Save and continue`。弹窗顶栏原文保证"编辑与审稿人**在录用前看不到**你的选择"，所以选订阅制不影响评审。 |
| 7 | Provide additional information | 见下 |
| 8 | Review and submit | 三个确认框全勾（CSR 实测名称：`I have read and accept the ethics in publishing policy` / `I have read and accept the copyright terms` / `I confirm I have mentioned all organizations that have funded this research`）→ `Complete your submission`。上一段 `Submission declarations` 是**告知性文字**，不用操作。 |

**必传 3–4 件 + optional**（BioSystems 实测 **3 件**；**CSR 双盲实测 4 件**）：
- **必传**：`Cover letter` / `Manuscript` / **`Declaration of competing interests`** / **双盲刊再加 `Title page with author details`**（CSR 要把稿件拆成「无作者稿 + 带作者标题页」两个独立文件，缺则退）。
  ⚠️ **`Declaration of competing interests` 是独立必需件**，别沿用旧经验只准备封面信+正文；无冲突就写一段"no competing financial or non-financial interests" + 无资助 + 无编辑任职 + 与文中厂商无关系，落款签名日期，转 docx/pdf 传。
  该屏另有一个勾选框 `I confirm that no authors of this manuscript have any competing financial or non-financial interests…` → **也勾上**；屏幕上的 `Use our declaration of interest tool`（在线生成 Word）**可以不用**，自建等效件更快、内容可控。
- **optional**（用下方 "Upload your optional and supplementary files" 栏，**每次先选类型再点 Upload**，否则报红 `Select a file type to upload`）：`Figure`×N（**PDF 优先**，PNG 600dpi 也收）、`Highlights`（**要 .docx，.txt 系统不收**）、`Graphical Abstract`、`Supplementary Material`（zip OK）。
- 不要传：图的自查用 `Figures_compiled.pdf`、系统自己生成的 manuscript PDF、README、`.md`/`.txt` 源文件。

**作者信息两个坑**：
1. **`Institution` 是全库搜索框**（"Type at least three characters to find your institution"）→ 独立研究者/小机构**搜不到** → 走 **"Can't find your institution?" / 手动填写**。⚠️ 页面会提示"手动填 = 不能享受 OA 折扣"——**走订阅制的话这正好是优点，不是问题**。
2. **`Contributor roles` 要勾**（CRediT），**必须与稿件里的 CRediT 段逐项对齐**；独著常见 10 项（Conceptualization / Methodology / Software / Validation / Formal analysis / Investigation / Data curation / Writing – original draft / Writing – review & editing / Visualization），**不勾** Funding acquisition、Project administration、Resources、Supervision。忘了勾或漏填 Institution → 第 4 步在进度条上**挂红色感叹号**，必须在提交前回去补。

**第 7 步（Provide additional information）三问**：
- `Do you want to share data?` → 数据随稿以 Supplementary 提供、无外部仓库时选 **No**，再在 **"Select an option that describes the availability of your research data"** 下拉里选 **`Data will be made available on request.`**（**必须与稿件 Data availability 段落口径一致**）。选 Yes 会被强制要 `https://` 仓库链接。
- 选 No 后，`Link to data repository` / `Repository name` / `Source of data` / `Title of the data set`（CSR 实测有这四格）**会自动隐藏，不用管**。**若选 No 后屏幕上并未出现 `Data will be made available on request.` 下拉、也没出现理由框 → 直接往下走，别硬等**（该口径已写在稿件 Data statement 与封面信里）。若出现理由框，粘：*"The measurement script is provided as supplementary material. Complete run records contain host engineering data (part geometry, command parameters) and cannot be released publicly; they are available to the editors and reviewers on request, together with a statistical summary."*
- ⚠️ `Source of data` 有 `Original data is reported in your research.` / `Reference data supports your article.` 两个单选 —— **自家跑出来的运行日志选前者**（选成 Reference data 等于说数据是引用别人的）。
- **SSRN Free Preprint Service**：已有 Zenodo/arXiv 预印本 → 选 **`NO, I don't want to share my research early and openly as a preprint.`**（页面原文保证"选哪项都不影响编辑流程与录用结果"）。**不要为同一稿叠第二份平行预印本**，只分散引用。

**费用陷阱（最重要）**：混合出版刊若中途/事后弹出 Open Access 选项 → **必须选 `Subscription`**（BioSystems 选错 = **USD 2,980**）。BioSystems 走订阅制 = **0 费用**、彩色在线免费、Regular Papers 不限长度。**提交后如收到 Elsevier 催选 OA 的邮件，一律订阅制。**

**提交完成判定**：`Your manuscript has now been submitted` 确认页（显示 Submitted 时间 / Journal / Article type / Title / Authors）→ 该页**不含稿件号**，要去 **`Your submissions`** 列表（Status 变 `Submitted`）→ 点标题或 `Check editor progress` 进追踪站 `Submissions Being Processed for Author` 取 **`Manuscript Number`**（形如 `BIOSYS-D-26-01426`）+ `Current Status`（`With Editor` = 编辑处理中）。**同时查邮箱（含垃圾箱）确认信。**
⚠️ 追踪页 `Initial Date Submitted` 可能比本地日期**早一天**（系统时区差异），登记时两个都写清。

### 只审"严谨性"的宽口径刊（显著性被拒时的对症解）— 2026-09-15 核对
**Scientific Reports**（~3.8，中科院 2 区，Nature Portfolio 品牌，APC 约 US$2,690）｜**Royal Society Open Science**（~2.9，APC 约 £1,000–2,000）｜**PLOS ONE**（~2.9，APC 约 US$2,300）。
共同点：评审标准是 **technically sound / rigorous**，**不做"重不重要"的判断** —— 因此被"not significant enough"桌面拒的稿件在这里最对症。
⚠️ 对外表述纪律：Scientific Reports 只能如实说"**Nature 旗下 Scientific Reports**"，**不得写成"Nature 子刊"**。

## 步骤

### A. 取要求

```
WebFetch 期刊 submission-guidelines 页 → 抄出：入口URL / 文章类型与字数 / ORCID / 引用格式 / 封面信问题清单 / 数据政策
WebFetch 投稿系统落地页（ScholarOne/Editorial Manager）→ 记录注册与提交流程
```
（若拿不到，用 WebSearch 找官方页镜像，但**优先官方域名**。）

### B. 取论文元数据（不要手打，从源文件抽）
```python
# 抽标题 / 摘要 / 关键词 / 作者 / 字数
import re
txt = open(md_path, encoding="utf-8").read()
words = len(re.sub(r"[#*`>|]", " ", txt).split())          # 全文词数
body  = txt.split("## References")[0]                       # 正文词数（对比期刊区间）
m = re.search(r"## Abstract\s*\n(.*?)(?=\n##|\Z)", txt, re.S)
k = re.search(r"\*?\*?Keywords?\*?\*?:?\s*(.+)", txt)
```
字数要对目标刊的区间（如 Article 6,000–12,000）。**不含参考文献**的正文词数最接近编辑的算法。

### C. 写封面信
- 存 `论文X_投稿<期刊>_封面信_CoverLetter.md`
- 结构：收件人 → 稿件名/作者/类型 → 一句"本稿适用哪条通道（独立研究者/常规）" → **按官方问题清单逐条作答**（每条一段，加粗小标题便于编辑打钩）→ 预印本披露 + 未投他刊声明 → 落款（姓名/单位/ORCID/邮箱）
- 篇幅：官方说"一页"就压到 ~600 词；宁可短。

### D. 生成 PDF
```bash
PY="<本机 python 路径>"
"$PY" tools/_md2pdf.py <in.md> <out.pdf> en "<页脚文字>"
```
- 第 3 参 `en`=英文（Times，含 CJK 回退），`cn`=中文（simhei）。
- **第 4 参是页脚**，必须传当前文档自己的标题，否则会抄错别的文档的页脚。
- 生成后**必须用 pypdf 抽文字验证**页数与是否非空白、有无残留标记（`*` 星号 = 斜体没渲染）。

### E. 写操作单
存 `论文X_投稿<期刊>_操作步骤_YYYY-MM-DD.md`，含：
1. 先备好哪几个文件（正文 PDF / 封面信 PDF / 可选数据册）
2. 一张"固定信息照抄表"（姓名分格写法、邮箱、单位、ORCID、文章类型、标题、预印本 DOI）
3. 注册账号步骤（含 ORCID 硬性必填）
4. 提交流程逐步（**步数因刊而异，必须以系统左栏实际显示为准**，不要照抄经验值。*Artificial Life* 实际是 **七步**：`Type, Title, & Abstract` → `File Upload` → `Attributes` → `Authors & Institutions` → `Reviewers` → `Details & Comments` → `Review & Submit`）
5. **逐格填什么**（类型/标题/摘要/关键词/作者/封面信文本框）
6. 上传文件的 File Designation 对应（Main Document / Cover Letter / Supplementary）
7. 红线与注意（APA v7、数据政策、一稿多投、修回要交"干净稿+标注稿+逐条回复"）
8. 进度勾选表

### F. 登记
把新 DOI / 稿件号 / 投稿材料路径写进项目的**论文总台账**（`重要文件别删\论文总台账_YYYY-MM-DD.md`）。

### G. 用户一边截图一边填 → 出「照抄单」（用户点名要的复用形态）
用户会在每一屏截图回来问"这格怎么填"。此时**不要长篇解释**，直接产出**可整段复制的纯文本照抄单**：
- 存成 `.txt`（不是 `.md`）——`.md` 里的 `**强调**` 会被渲染，用户复制到网页框会带出格式或丢失字；`.txt` 一复制就是纯文本。
- 每个字段一段：`【字段英文名】(上限/是否必填)` + 空行 + 可复制的值 + 空行 + `-------------` 分隔。
- 摘要这类长文本，先**剥掉 markdown 标记**再进照抄单（`re.sub(r"\*\*(.+?)\*\*", r"\1", a)`，再清残留 `*`）。
- 系统若带 **PDF 预填**功能：**中文字符会被吃掉**，标题会变成半截英文 + 一堆 `ssss`（实测 `Auditable`→`Audible`）→ 照抄单里要明确写"**先清空预填内容再粘**"。
- 用户下次在同一系统投稿时，直接按这张地图给值即可（字段名与顺序基本不变）。

**ScholarOne 各屏字段速查**（以 *Artificial Life* 实测为准）：

| 屏 | 字段 | 值从哪来 |
|---|---|---|
| 注册 1 | E-Mail / Name | 姓名**分两格** |
| 注册 2 | Primary/Secondary Address | `Institution` 与 `Address` 是 **req**；独立研究者 Institution 填 `Independent Researcher`；**State/Province 填省**（中国作者易把城市填进去 → 卡住不前进）；Secondary 整栏可空 |
| 注册 3 | User ID & Password + Keywords + 隐私确认 + 人口学 | **一张长页**：User ID 常预填邮箱（保留即可）；🔴 `Confirm Password` 要再输一遍，空着点 Finish 报错；Keywords 标 req（≤6 领域标签）；`Yes, I have read and now acknowledge the linked privacy policies.` 标 req 必勾；人口学问卷可选 `I do not consent…` 跳过 |
| Step 1 | Type | 按正文字数选（ALife：Research Article = 6,000–12,000 词） |
| Step 1 | Title | ≤50 词；**必须覆盖 PDF 预填的乱码** |
| Step 1 | Running Head | **必填，≤50 字符**（易漏） |
| Step 1 | Abstract | ≤500 词量级；优先用**论文原文摘要**，与 PDF 一致 |
| Step 2 | File Upload | **初见刊**：界面明写只传正文（`Main Document`）+ 可选 1 个补充材料 ZIP，**封面信留到 Step 6**——别在这一屏传封面信。见下方坑 |
| Step 3 | Attributes | 关键词**有硬上限**（ALife：`REQUIRED: 1, MAX: 5`，超了红字报错并挡住 Save & Continue）；本刊还要求**至少 1 个来自官方 ALife 关键词表**，找不到合适官方词要在封面信里论证符合范围。**别把论文里的关键词全塞进去**，5 个以内、用概括性词（细节词交给正文） |
| Step 4 | Authors & Institutions | 名/姓分格、Institution、ORCID、勾通讯作者 |
| Step 5 | Reviewers | **ALife 是强制的**：红字 `A minimum of 2 recommended reviewers is required`，0/2 时 Save & Continue 被挡。给 2–3 位**真实学者**（姓名 + 邮箱即可，**Department 可留空**，用户明确要求不填部门）。可从目标刊近年编委/同主题论文通讯作者里取 |
| Step 6 | Details & Comments | 封面信在这里交（文本框则粘全文；有 Browse 则传封面信 PDF）；问"是否他处审稿"→ 如实 + 披露预印本 DOI。该屏还有一串确认项（funding / special issue / previous submission / COI / 作者确认勾选框），逐屏照抄单要给这些的填法 |
| Step 7 | Review & Submit | 🔴 **`* view proof` 是带红星的必做字段**（原文 *"You must view the PDF proof before you can submit"*）：先点 **`View PDF Proof`** → 等合成（几十秒）→ 关窗回主页面 → **`Submit` 才由灰变亮**；不点永远交不上。Submit 后页面转 **`Submission Confirmation`** → 拿 Manuscript ID（⚠️ **ADB 的号前缀是 `AB-`**，例 `AB-26-0430`，不是 `ADB-`） |

### H. 点 Submit 前的 proof 自查清单（30 秒，必做）
`View Proof` 生成合成 PDF 后逐页扫这几处——**Submit 一按即锁定，不能再改**：

1. **页数对得上**：ScholarOne 会**自动加 1 页封面**（Journal / Manuscript ID: `Draft` / Manuscript Type / Complete List of Authors / Keywords），所以总数 = 1 + 正文页数；正文页数应与本地 PDF 一致（本地先数一遍：`len(PdfReader(path).pages)`）。
2. **封面页三行**：Title 正确；Authors 显示 `姓, 名`（如 `Zhang, San; Independent Researcher`）；Keywords **只显示 Attributes 屏选的那几个**（正文里写 7 个但屏上只选了 5 个是**正常的**）。`Manuscript ID: Draft` 也正常，提交后才有正式号。
3. **正文首页**：标题 / 作者 / Version / Data baseline 齐全。
4. **无乱码方框、无缺页、无残留 `*` 星号**（星号 = 斜体没渲染）。
5. **红线词清零**：对源 `.md` grep `under review|审稿中|在审|under consideration`，计数必须为 0。
6. **同一数字跨节一致**（正文 / Highlights / 附录），例：账本 719 有效·720 原始、证书 54 受审·419 原始、谱系 250 节点·81 代·317 世。

> ⚠ **别用截图 OCR 判断正文对错**：proof 里的正文由源 `.md` 生成，对不上的概率极低；若 OCR 看着有出入，先 grep 源 `.md` 核实。实测 OCR 把 `28.6%` 读成 `28.0%`、把 `v1.0.1` 读成 `v1.1.1`，源文件都是对的——照 OCR 去"改错"反而会改坏。

### I. 二次投稿（同一系统）怎么一次给全
用户说"在 <刊名> 上再投一篇"时：
1. 读本文件 **「已核实的期刊硬要求」缓存块**（用前 WebFetch 复核一次，别凭记忆）；
2. 从源 `.md` 抽：标题、摘要（剥掉 markdown 标记的纯文本）、关键词、正文字数（`## References` 之前）；
3. **直接按 G 的照抄单格式一次给全**：Title / Running Head / Abstract / Keywords（≤ 该屏上限）/ 作者四件套 / 封面信全文 / 各确认项（funding、special issue、resubmission、COI、确认勾选框），不用等用户逐屏问。

**作者信息**：姓名（名姓分两格填）、单位、ORCID、邮箱、文章类型按字数区间选、预印本一并披露（Zenodo DOI）。

### J. 桌面拒稿（desk reject）怎么处置 —— 四步，别慌

1. **先判性质**：读决定信，区分三种 ——
   - **桌面拒**（desk reject）：无审稿人意见、几天内出结果 → 是"贡献类型 / 读者匹配"的判断，**不是科学否定**；
   - **外审后拒**：有审稿人意见 → 内容问题，按条修；
   - **转投建议 / transfer offer**：编辑点名了刊物 → 优先照办（省一轮）。
2. **逐句拆理由**（关键词映射）：
   - "clear and compelling advance" / "significance" / "broad interest" → **显著性判断** → 对策：去"这就是核心贡献"的刊，或去**只审严谨性**的刊；
   - "not suited to our readership" → **读者错位** → 对策：换读者群（最好办的一种）；
   - "insufficient novelty" → 新意不足 → 对策：重写定位，必要时补对照；
   - "technical concerns" → 内容问题 → 对策：按条修。
   - 📌 如果信里出现 **"your findings are of inherent interest"** 这类句子 → **主题被认可，输在表达**，换刊 + 重写即可，别改数据。
3. **「重写 vs 原封转投」→ 默认重写**。不重写就把致病原因原样带走；且各刊格式本就不同。**重写只动"怎么说"，不动数据、不加结论**（约 1–2 天）。
4. **选刊两条路线**：A **冲高** = 去该贡献类型的对口主场；B **稳落** = 去**只审 soundness** 的刊（显著性被拒的对症解）。
   判据：查该刊评审标准里有没有 importance / significance / broad interest 字样 —— 有 = **显著性门**；只写 technically sound / rigorous = **严谨性门**。

**同时自查"是不是写得太低调"（2026-09-15 实战教训）**
- 低调**不是**桌面拒的主因，但它是**负资产**，而且是最容易修的那部分；
- **低调只允许出现在"方法 / 范围"里；标题、摘要首句、引言首段、结论必须硬**；
- 披露（预印本、姊妹稿、旧稿撤回）是**义务不是卖点** → **先说贡献，再说披露**，顺序不能反；
- 最伤的写法是「**有判断的标题 + 没判断的正文**」。

**拒稿处置自检 8 问**：① 有审稿人意见吗（桌面 vs 外审）？② 关键词属哪类（显著性/读者/新意/技术）？③ 编辑点名刊物了吗？④ 主题被认可了吗？⑤ 我的定性句有没有自我设限？⑥ 每个定性句挂数字了吗？⑦ 目标刊是显著性门还是严谨性门？⑧ 重写只动叙述、没动数据吧？

**桌面拒后的「形式 vs 范围」二次分诊（2026-09-18 *BioSystems* 实战）**

决定信里出现 **"does not correspond to the criteria commonly established for scientific papers"** 或 **"not in the scope of X"** 时，**必须先分清是"范围错"还是"体裁错"**——两者对策不同：

| 症候 | 判读 | 对策 |
|---|---|---|
| "not in the scope of <刊>" | **选刊失误**（不是稿件被否） | 换刊：查候选刊 Aims & Scope 里有没有**明列**你的关键词（如 Artificial Life / embodied cognition） |
| "not corresponding to the criteria commonly established for scientific papers" | **体裁错**：稿子是"宣言体/论纲体" | 按下一段的**已验证骨架**重写；**必须保留 Methods 性质与 Results 性质的小节**，否则同一句评语会再来一次 |
| "too premature / more work needed to substantiate" | 常是**桌面拒的标准套话**，但也可能是真的证据单薄 | 用**不新增实验**的方式补强：补第二观测窗口、把关键读数改成**可被第三方复算**的形式（见下） |

**已验证通过的论文骨架（取骨架、换问题；2026-09-18 由同项目姊妹稿实跑得到）**

1. **引言先给不可伪造的必然性**（物理/经济约束句，例："Light latency makes real-time ground command beyond Mars physically impossible"），把主张从"我希望"变成"不得不"；
2. **核心交付物是一条可执行标准**：条件/判据＋若干条**可外部核验的读数**，每条注明"外人怎么拿到这个数"；
3. **仪器/方法**（谁都能跑、只计数不决策、量纲分级：物理量为主、内部代理为辅）；
4. **实测验证**：至少两个**互不重叠**的窗口，写明哪个更干净；
5. **立规矩＋可推翻条款**（含"我们自己要做的那个最难的实验"）；
6. 讨论里明写**未做**的对照与第三方复现。

⚠️ **同系列防同质化**：一个项目里多篇论文**不能共用同一个 stakes**。前一篇用了"星际航行"，后一篇必须换成自己的（例：成本核算缺项／关机≠释放资源／伦理入口），否则被读成同一篇切香肠。
⚠️ **可复算性优于复算**：长时运行系统的日志**会被轮换**，写进论文的窗口可能事后无法重算 → 优先把读数建在**自带时间戳的持久产物**上（带 `timestamp` 的清单文件、文件名含 epoch 的事件文件、带 Unix 时间戳的账本），这样第三方"不用日志"也能复算，正好把"证据单薄"的质疑转成方法优势。

### K. 投稿前「定稿自检」—— 正式稿里**不许出现**这三类东西（2026-09-15 实跑挖出）

给审稿人看的稿子 ≠ 自己的工作台。下面每一条都是「作者自己知道、读者不该看到」的东西；留在稿里等于当场告诉编辑：**这份稿还没检查完**。

| 禁区 | 长什么样 | 为什么致命 | 正确处置 |
|---|---|---|---|
| **① 内部待办** | 「⚠️ 投稿前须逐条联网核验年份、卷期与页码（本列表按主题组织，尚未逐条核实）」 | 编辑读到的不是"严谨"，是「**知道有问题但没修**」；若真有错引，等于自认 | **把该核的核完**，再删掉这句话。核不完就不投 |
| **② 工作清单** | 「附：图表规划（≤10 项，投稿时配图）」这类内部表格 | 读者不需要知道你的配图计划 | 移出正式稿，另存 `_投稿配图规划.md` |
| **③ 占位指向** | 参考文献里 `1. Yao, J. … *This paper*.`（自引占位）、「待补」「TODO」 | 占位符 = 未完成稿的直接证据 | 删掉；本文不列自己 |

**同批必查的两条更硬的伤：**

1. **正文必须有引用标记**。参考文献列表若在正文里**一处都没被引用**，MDPI 等刊直接退（References must be cited in text）。
   - **自检**：数正文（参考文献段之前）里的 `[n]` —— 为 0 即硬伤。
   - **修法**：只把编号挂到**已有句子的句末**，**不改任何论断**。挂点选明确的出处（自创生→[9]、AI 能耗研究→[19,20]、认知架构→[13-18]、自家预印本/白皮书→[1][2][3]）。
2. **核到具体出版信息**：期刊论文核 **卷(期)+起止页**；书章核 **丛书卷次+页码+出版地+出版社**；预印本核 **arXiv 号 / DOI**。
   - **工具顺序（实测最快）**：**Crossref API**（`https://api.crossref.org/works?query.bibliographic=<题名作者年>&rows=2&select=title,container-title,volume,issue,page,issued,DOI`，脚本一次批量查）→ **arXiv API**（预印本，`export.arxiv.org/api/query?search_query=ti:"..."`）→ 网络检索（**1980–1990 年代书章** Crossref 覆盖差，必须搜索引擎补）。
   - 实测 20 条里 **12 条有出入**（缺卷期页码 / 1 条书名错 / 1 条标题错）。**凭记忆写参考文献必错**。

**定稿自检清单（投稿前逐条过）**
- [ ] 全文搜「核验 / 待补 / 尚未 / TODO / 待办」→ 应 0 命中
- [ ] 正文 `[n]` 引用数 > 0，且每个编号在列表中都存在
- [ ] 无自引占位条目、无空条目
- [ ] 每条参考文献都有卷期页码（或书章页码 / 预印本编号）
- [ ] 工作清单类内容已移出正式稿
- [ ] 作者、单位、ORCID、通讯邮箱与系统账号一致
- [ ] **通读一遍问自己：这句话像不像在跟同事交代工作？** 像 → 改写成结论语气

> 一句话：**"待办语气"是正式稿最容易被忽略的败笔。** 作者知道要核、读者不该知道。核完再删，不是删了再核。

---

### L. 双盲稿怎么处理（Elsevier CSR / IEEE 系都用得着）— 2026-09-16 实操
1. **交两个文件**：`TitlePage_*.docx`（作者/单位/通讯方式/致谢/利益冲突/AI 声明）＋ `Manuscript_*.docx`（**匿名稿**）。缺标题页会被直接退回。
2. **匿名稿里清干净**：姓名、单位、邮箱、致谢、文件名里的作者名。**自引一律替换为 `[Author]`** —— 正文引注 `([Author], 2026b)`、文末文献表条目 `[Author]. (2026b). …Zenodo. https://doi.org/…`。DOI 会指向作者自己的作品，这是**匿名自引的标准做法**，编辑部接受，**不要在投稿系统里额外解释**。
3. **机器核验（必做）**：生成匿名稿后跑一遍，`姓名/邮箱/单位/中文名` 命中数必须为 **0**。
4. **单盲刊（如 Adaptive Behavior）反过来**：作者公开 → 稿件首页**要带**作者信息，**不要**另做匿名稿。

### M. 投稿前的机器二次审校（必跑，30 秒抓出会被退稿的硬伤）— 2026-09-16 立
写一支脚本对**每一份**稿件做六项检查（可复用 `tools/review_p5p6.py` 的写法）：
1. **正文引注 ↔ 文献表双向闭环**：正文出现的每个引注都能在文献表找到；文献表每条都在正文被引用（**未被引用的文献要删**）。
2. **`§` 交叉引用无悬空**：抽出所有 `§X.Y`，与真实章节号比对。**跨稿引用最容易写错**（把姊妹稿的节号写进本文）。
3. **文献表字母序**（APA/哈佛系刊都要求）。
4. **匿名稿身份信息 0 命中**（双盲刊）。
5. **合刊规**：摘要词数、关键词个数、正文词数、Highlights 字符数（≤85）逐项对上限。
6. **图注条数 = 图文件数**（编号连续、无缺号）。
⚠️ 顺手查的两个易漏点：**叙述式引注**（"Baddeley (2000)" 这种不带括号的）也要计入闭环；**中英双版本要互校**（英文版常把中文版有的关键数字漏掉）。

### N. 中英双版本的"数字对齐"（血泪）
中英两版各自生成时，**关键数字极易单边漏**（实测漏过 4 处 `74,374`）。做法：定一份**必含数字清单**（核心读数、样本量、百分比），生成后用脚本对四份稿逐份扫，任何一份缺项即报错补齐。

### O. 预印本先行：Zenodo「**先预留 DOI → 回填 → 再发布**」（2026-09-16 立，本项目铁律「投稿前先拿预印本号」）
⚠️ **顺序不能反**。一上来就 Publish 会让预印本与投稿件字节不一致、还会平白多出第二个版本号。
1. **填元数据**：Title / Creators（Family、Given **分两格** + ORCID）/ Description（粘摘要）/ License `CC BY 4.0` / **Language 只留 `English`**（默认常带"中文、汉语、英语"，要删）/ Resource type = `Publication → Preprint`。**第 5 屏（软件/出版信息）与第 6 屏（论文/会议/领域字段）全部留空** —— 那是给已发表期刊论文用的。
   - 🔴 **作者标识符（ORCID）格式坑（2026-09-17 实测）**：Zenodo `Identifiers` 认的是 **`scheme:value`**（如 `orcid:0000-0002-1825-0097`），或"scheme 下拉选 `ORCID` + 值里只填裸号"。**把裸号单独填进去、或重复写了 `ORCID:` 前缀**，保存后该行右侧会挂一条橙框 **`No valid scheme recognized for Identifier.`**，且作者行**不显示 ORCID 徽标**（= 没挂上）。该警告**不阻断 Publish**，但应修：点该行 `Edit` → 按上述格式改对，或**直接删掉那一行标识符**（ORCID 在 Zenodo 是可选，不影响 DOI 解析与记录校验）。
2. **Related works** 挂自家旧预印本（关系选 References / 相关，方案 `DOI`，填 `10.5281/zenodo.xxxxxx`），把同系统的多篇串成谱系。
   - ⚠️ **三个高频元数据坑（2026-09-17 API 实查抓出）**：① **关系别默认用 `Requires`** —— 它的语义是"本作品**依赖**该作品"，把同作者姊妹稿/前作挂成 Requires 是错的关系，应用 **`References`**（或 `Is supplement to`）；只有自己那份**被重写的前作**才用 `Is new version of`。② **同一条不要挂两遍**（本案例白皮书 DOI 被重复挂了两条）。③ **Resource type 别选错** —— 实测有一条白皮书被选成 **`publication-patent`**（"专利"），实际是 preprint/publication；这类错标会让外人误读作品性质。
   - 修法：record 页右上 **`Edit`** → 改 Related works → `Publish`；**改元数据不产生新版本、DOI 不变、文件名不变**，可以随时修。
3. 🔴 点 **`Reserve DOI`（预订）**，**不要点 `Publish`** → 立刻拿到 `10.5281/zenodo.XXXXXXXX`（形如 `22796770`）。
4. 把这串号交给 AI → **插进稿件 Declarations 段 + 封面信 Declarations 段** → 重出 PDF/DOCX（**覆盖原文件，不新增文件**——用户明确不喜欢文件堆积）。核验收据：md/docx/pdf 各含该 DOI、匿名稿身份泄露词 0 命中。
5. 用户回 Zenodo **把旧 PDF 换成带 DOI 的新版**（图不用动）→ 才点 `Publish`。
   ⚠️ 未 Publish 时该 DOI **无法解析**（Zenodo 上是"已预留未发布"状态）。投稿系统只把 DOI 当字符串存，所以可以先投稿后发布，但**别拖太久**——编辑若点开会 404。
6. 投稿系统里对应的问题（Elsevier 第 7 步）填 **Yes → 该 DOI**；SSRN 免费预印本服务一律 **NO**（同一稿不挂第二份平行预印本）。
   - ⚠️ **顶部 `Select the community where you want to submit your record` 横幅可以不管**（2026-09-17 查官方文档：communities 为 **optional**，不选照样能 `Publish`）。反而**选了要等社区管理员审核、审核期间记录对外不可见**，属于给自己加等待。要挂社区就等**发布之后**再挂。
   - ⚠️ **`Description` 若粘过旧版摘要**（比如后来为凑期刊字数把摘要改短了）：顺手换成新版即可——`Description` 发布后也能改，**不会产生新版本号**；只有**文件**改动才需要发 New version。

**双语件的两个机器核验**（每轮重出后必跑）：① 用 `docx` 库读回文本确认 DOI 在 docx 里；② 用 `pypdf`/`pdfminer` 抽 PDF 文本确认 DOI 在 PDF 里（PDF 才是真正上传的那份）。

7. ✅ **发布后一致性收据（2026-09-16 实测，比"问用户有没有替换"强）**：直接打 Zenodo API `https://zenodo.org/api/records/<记录号>`，读 `status`（应为 `published`）与 `files[].checksum`（`md5:` 前缀），**与本地带 DOI 的重出版逐文件比 md5**。一致即证明"预印本文件=投稿件"，不用再麻烦用户确认。收据示例：`Manuscript_CSR.pdf` 35,618 B / md5 `d37bffa2…` 本地与 Zenodo 完全相同。
   ⚠️ **稿件号要从邮件取，完成页没有**：投稿成功页不给号；号在 `em@editorialmanager.com` 的 `Confirming your submission` 邮件里（形如 `COGSYS-D-26-01040`），紧接着还有一封 `Confirming handling editor` 给出**处理编辑姓名**。查信时**同时看收件箱 / Junk / Deleted Messages**，别只看收件箱。

### P. ScholarOne / Sage Track **首次注册**（ADB 实测 2026-09-17，用户实际卡在这一步）

1. **入口别走错**：投稿系统是 `https://mc.manuscriptcentral.com/ad-behav`（落地页标题即刊名 + `To begin, log in with your user ID and password.`）。🔴 搜索引擎常把 `support.silverchair.com/s/scholarone-manuscripts/` 排前面 —— 那是 **ScholarOne 官方帮助中心（纯文档站，FAQ/培训视频/Release Notes）**，**不用登录、也永远投不了稿**。用户已在这踩过一次。
2. **首次无账号 → `Create An Account`，系统分 3 步**（左侧步骤条 1 E-Mail/Name → 2 Address → 3 User ID & Password；**第 3 步是一张长页**，见下方 0C/0D/0E）：
   - **屏0A E-Mail/Name**：`Prefix`（下拉）/ `First (Given) Name` / `Middle Name` / `Last (Family) Name` / `Suffix` / `Degree` / `Primary E-Mail Address`（含 again，必填）/ `Primary Cc` / `Secondary E-Mail`（含 again、Cc，可空）。顶部若另有一个 `E-Mail Address` 空框（用于查重），填**同一个**邮箱。**ORCID 会自动按邮箱关联**（本例自动挂上作者的 ORCID，带 `Update ORCID ID` / `Remove`）→ **别点 Remove**。`Web of Science account` 区可跳过。
   - **屏0B Address**：左栏 `Primary Address` 中 **Institution / Department / Country-Region / City 四项均标 `req`（必填）**，另有 Address、State/Province、Postal Code、Phone、Fax；**右栏 `Secondary Address` 整栏留空**。
   - **第 3 步是一张长页**（不是一小屏），自上而下依次是：User ID/密码 → Keywords → 邮件 Opt In/Out → 审稿意愿 → External IDs → Unavailable Dates → Signature → Privacy Acknowledgement → Demographic Questions → `Finish`。逐块给指引，别只说"设个密码"。
   - **屏0C User ID / Password**：**系统常把 User ID 预填成邮箱** → 保留即可（ScholarOne 允许邮箱当 User ID，比另设 `jinquanyao` 更好记）。🔴 **最常卡住的真缺口 = `Confirm Password` 空着就点 `Finish`**：现场看到 Password 已填（圆点）、Confirm 空白 —— 用户会以为填完了。指引时必须点名"第二格要原样再输一遍"。
   - **屏0D Keywords / 偏好 / 签名**：Keywords 标 `req`（至少 2 个，建议 6 个填满）= **作者领域标签，投稿时可能被带入**，用与稿件一致的关键词；邮件 `Opt In/Opt Out` 只影响 SAGE 刊物资讯（可随时退订，选哪个都不影响投稿）；*Do you wish to be invited for peer review?* 勾选与否**都不影响投稿**（勾选=接受以后被邀审稿）；External IDs 只读、Unavailable Dates 留空、Signature 可选（会进系统邮件落款）。
   - **屏0E Privacy Acknowledgement + 人口学问卷**：`Yes, I have read and now acknowledge the linked privacy policies.`（**标 req，是 Finish 的前置条件**）；随后的 *Demographic Questions* 是给出版商的**多样性统计**（页面自述：单独存放、去标识化、不用于审稿、不用于歧视性用途）——**与投稿完全无关，不想共享就选 `I do not consent to the processing of my demographic information.`**（选后三题通常自动跳过；仍必答则每题选 `Prefer not to disclose`）。如实填的话：Gender `Man`／Race `Asian or Pacific Islander`／ancestry `East and Central Asia`。
3. 🔴 **姓名一律英文/拉丁转写**（拼音名 / 拼音姓），**不要填中文**。实测有作者首屏填了中文名 —— 全英文系统里中文名会带进审稿通知、作者列表、最终校样与数据库检索，**与稿件署名（拼音全名）不一致后极难修正**。
4. 🔴 **独立研究者怎么过 "Institution / Department 必填"**：`Institution` = `Independent Researcher`，`Department` = `Independent Research`（**两栏都不能留空**，写 `N/A` 反而显眼）。地址只填城市＋省份即可，**不必写真门牌**（隐私），Secondary 不填。
5. `Prefix` 是学位头衔：无博士学位的作者应选 `Mr.`，别沿用默认 `Dr.`。
6. 提交后 → 邮箱收**激活/确认邮件** → 点链接激活 → 回站点用 User ID 登录 → **Author Center** → `Start New Submission`。
7. ⚠️ **同一邮箱在不同刊的 ScholarOne 站点是各自独立的账号**：投过 SAGE 别家刊 ≠ 这里能直接登录。提示"邮箱已存在"就走 **`Reset Password`**，**别重复注册**（重复账号会导致后续稿件归属混乱）。官方原话也要求先确认是否已有账号。

### Q. Springer **Editorial Manager**（`editorialmanager.com/<CODE>`）逐屏实操 — *Minds and Machines* 实测 2026-09-18

> 适用：Springer/Birkhäuser 系用 EM 的刊（*Minds and Machines* = `editorialmanager.com/mind`）。**注意 EM ≠ ScholarOne**（`em.manuscriptcentral.com` 才是 ScholarOne），别把两套流程混着说。

0. 🔴🔴 **头号铁律：绝不点 `Save & Submit Later`，绝不让投稿记录隔夜挂起。** 实测：点它后记录挂在 `Submissions Waiting for Author's Approval`，**9.5 小时后被编辑部移除**，邮件原文 *"we have removed your submission … given that we have not received any response to our reminder emails"*（催办信实际没送达，收件箱＋垃圾箱都没有）。编辑部明示重投 `treated as a new submission`、**无不良记录**。→ 必须一口气走到 `Approve Submission`；`Needs Approval` 状态尤其不能过夜。
1. **注册**：`https://www.editorialmanager.com/<CODE>` → `Register`（**英文/拉丁转写姓名**）→ 欢迎信给出 `username`。ORCID 若已绑会显示 `already linked and Authenticated`。
2. **Add New Author** 弹窗字段：Title / Given / Middle / Family / Academic Degree(s) / E-Mail / Institution / Country or Region / `This is the corresponding author`。
   - `Country or Region` 是下拉**必选**（中国作者选 `China`，别选错成 Hong Kong SAR 之类）。
   - `Institution` 填 `Independent Researcher` 会出黄色 ⚠️ `Author Institution is Unverified`＋提示 *Start typing to display potentially matching institutions* —— **提示性校验，不拦保存**；有候选项就点，没有就保持手填，**别为它编造机构**。
   - 邮箱旁黄 ⚠️ 多半是"该邮箱已在系统中"（就是本人投稿账号，正常）。若保存被拦、提示 person already exists → 别新建，改用页面上方 **People Search / Find Existing Author** 按邮箱或姓名搜出本人选中。
   - 唯一作者保存后确认 `1st`；列表里应显示 `Mr <Name> [Corresponding Author] [First Author] [You]` + 机构。
3. **Manuscript Data 页**是折叠栏式，**每栏各有自己的 `Next`，不点等于没填**：
   - `Keywords`：🔴 **分号分隔、一行输入**（不是每行一个回车）。作者名下方 `Required ✓` 表示已有内容。
   - `Authors`：点 `+ Add Another Author`／确认顺序。
   - 🔴 **实测报错** `You cannot complete your submission until the following items are corrected: Required information is missing from the Funding Information step.` → 展开页面最底部 `+ Funding Information` 栏：有勾选框（*There are no funders to report…*）就直接勾；没有则 `Funder Name` 填 `None`；只有大文本框就写 `This research received no external funding.` → **点该栏内的 Next**，红三角消失。
   - 🔴 底部按钮排 `Back | Save & Submit Later | Build PDF for Approval` —— **`Save & Submit Later` 就夹在中间**，引导时必须点名别点。
4. `Build PDF for Approval` → 落到 `Submissions Waiting for Approval by Author`，状态 `Building PDF`、**Action 列为空属正常**（页面自述 *Actions appear automatically when your PDF is available*）→ 等 2–5 分钟按 **F5** → 状态变 `Needs Approval`、Action 列出现 `Action Links` → 展开 → **先 `View Submission` 看 proof**（双盲刊重点看正文有无身份信息；首页是否 Title Page；图与附件是否齐）→ 再 **`Approve Submission`**。🔴 `Remove Submission` = 永久移除，绝不点。
5. **完成判据（三处同时对上才算成功）**：① 页顶 `Author's Decision — Thank you for approving "…"`；② `Submissions Being Processed for Author` 里状态变 `New Submission` 且 `Initial Date Submitted` 有日期；③ 邮箱收到 `em@editorialmanager.com` 的 **`<稿件号> - Submission Confirmation`**（如 `MIND-D-26-01372`）。另有 Research Square 追踪邀请邮件（可选，不影响投稿）。
6. 🔴 **Item Type 只有 6 种**（Springer EM 通用）：`Title Page` / `Blind Manuscript` / `Figure` / `Table` / `attachment to manuscript` / `LaTeX Supporting File(s)`。
   - **本刊没有 Cover Letter 项、也没有 Supplementary 项** → 封面信、COI 声明、补充材料**一律挂 `attachment to manuscript`**；图片必须逐张选 `Figure`。
   - 🔴 **`Select Item Type` 默认落在 `Blind Manuscript`，不主动改会把文件静默归错类型**；每加一行都要先选类型再 `Browse`（文件筛选改 `All Files (*.*)`）。
   - `.py` / `.zip` 可能不被接受 → 备一份同名 **PDF** 兜底（zip 里放什么就在 PDF 里列什么）。
   - 全部改完点 **`Update File Order`**，系统按类型自动归组。
7. **`Comments` 框必填**（写给编辑部、不进正文）：粘 3–5 行——"详见封面信 + 原创未一稿多投 + 双盲（身份信息仅见于独立标题页）+ 预印本 DOI + 无资助/无利益冲突 + 推荐审稿人已在系统内"。
8. **双盲刊**（M&M 官方：*This journal follows a double-blind reviewing procedure*）：正文与元数据不得出现姓名/邮箱/DOI/机构；带作者信息的文件单独作 `Title Page`。需要 **6 位推荐审稿人**（Author 步或问卷里填）。
9. 账号页右上若显示中文名而注册信是英文名 → 用 `Update My Information` 统一为英文名（**不影响已投记录**，但影响后续所有刊的记录一致性）。

### R. Springer Nature **Snapp**（`submission.nature.com` → 实际落地域名 `submission.springernature.com`）—— 2026-09-18 *Biosemiotics* 实测；**Springer 系刊正在陆续从 EM 迁到 Snapp**

> 🔻 **域名更正（2026-09-26 实测，*Acta Biotheoretica* journal id 10441）**：`submission.nature.com` 会重定向；**登录/列表/详情/新投稿的真实域名是 `submission.springernature.com`**。写作脚本/判据时统一用后者。通知中心另在 `notifications.springernature.com`。

**🔴 第一诊断规则（省几小时瞎折腾）：旧 EM 站能登录、能看到 Author Main Menu，但 `New Submissions` 下缺 `Submit New Manuscript` 链接、主菜单 `Submit a Manuscript` 点了也不启动 → 该刊已关闭 EM 投稿通道。**（Aries 官方：期刊关闭投稿时该链接就不显示。）不要去反复注册/找按钮，**去期刊官网 `link.springer.com/journal/<id>` 看右侧 `Submit manuscript` 按钮指向哪**——指向 `submission.nature.com/new-submission/<id>/3` 就是 Snapp。
- 本案例：Biosemiotics（journal id **12304**）EM 站 `editorialmanager.com/bise` 已停收，现行入口 `https://submission.nature.com/new-submission/12304/3`。**同款第二例（2026-09-18）**：*Theory in Biosciences*（journal id **12064**）——聚合站 letpub/iikx/x-mol 仍写着旧 EM 链接 `editorialmanager.com/tibi`（该站**能打开、有 Register 按钮**，属于"能登录但投不了"），而更新过的来源（万维学术/万维书刊 2025-08 更新）给出 `https://submission.nature.com/new-submission/12064/3`。→ **判据：Springer 系刊优先信"更新更近的来源 + 官网 Submit 按钮指向"，别信静态聚合站的旧链接**；EM 站能打开**不等于**还能投稿。
- **Snapp 独立账号体系，EM 账号不通用**（邮箱或 ORCID 登录）。

**Snapp 6 步**：① Article Type → ② 上传文件（含封面信）→ ③ 关键信息（标题/摘要/作者，**系统会自动从文稿抽取**）→ ④ 作者信息 → ⑤ Declarations → ⑥ Review & Submit。
- **Snapp 不做匿名处理**：刊是单盲就把作者信息放在**稿件文件内**；刊是双盲必须自己在稿件文件里去身份（Snapp 不会替你隐藏）。
- **官方明写"best if your manuscript – including all text, figures and tables – is in one editable file"** → 首选**单文件投稿**：把**标题页信息块并进正文稿件**（标题 → 期刊名/文章类型 → 作者/单位/通讯作者/ORCID → Abstract → Keywords → 正文 → Statements and Declarations → References → Appendix）。这样不用赌系统有几个文件类目。
- 上传文件命名**保持同一套文件名**给用户，别一边做多个版本，容易传错。

**🔴 Snapp 提交前终检 6 条（2026-09-18 Biosemiotics 实测踩中 4 条）**
1. **封面信有独立槽位**：`Details` 屏底部 `Provide a cover letter`（**未标 optional**）。放 `Files → Supplementary files` 是错的——补充材料会随稿件发给审稿人。传进正规槽位后，回 Files 把补充材料里那份 `remove`。
2. **稿件里承诺的补充材料必须真传**（`Files → Supplementary files`）。稿件写 "provided as supplementary material" 却没传 = 空头支票。`.py` 若被系统拒收就打包 zip（文件名保留脚本名）。
3. **Declarations 的自由文本框会串行**：实测 `Data Availability` 框里连带粘进了 `Acknowledgements ¶:` 与 `Research funding …` 整段（→ 出版 PDF 的数据可用性声明下会跟着致谢与资助句）。**每个自由框逐个点开核对，只留本项内容**（Snapp 把填入内容以引号块作预览显示）。
4. **`Review` 屏的 `Share your work as a preprint` 选 No**（Research Square，CC-BY 4.0，非必填）。封面信已声明"本文未发预印本"时勾 Yes 会当场自相矛盾；要预印本按项目规则自建 Zenodo DOI。
5. **上传件版本核对**：`Details` 面板的 Title/Abstract 只是面板值，**不会自动跟本地新稿同步** → 摘要/标题必须与本地最新稿逐字一致，不一致就是传了旧版，`remove` 重传。
6. **收尾**：`Terms and conditions` 勾选 → `Submit manuscript`（**按钮文案实测就是 `Submit manuscript`，无二次确认弹窗**）→ ⚠️ **确认页不会显示稿号**（见下方"拿号口径"）。页顶 `Saved just now` = 自动存草稿（不像 EM 隔夜被清），但仍建议一口气走完。

**🔴 Snapp 拿号口径（2026-09-26 *Acta Biotheoretica* 实测，至关重要）**

- 提交成功确认页文案固定为 **`Submission received` / `Thank you for submitting to <刊名>` / `Your submission is now at our Technical Check stage`**——**页面上没有稿号，也不要在这页找死磕**。
- 该系统的唯一标识是 **Submission ID（UUID，形如 `b5551a62-e6e4-438f-94e8-d8515aa4beee`）**，出现在：
  1. `https://submission.springernature.com/your-submissions`（列表，卡片上 `UUID | v.1.0` + 状态行）
  2. `https://submission.springernature.com/submission-details/<UUID>`（详情：`Submission ID` 字段 + `Show history` 状态时间线）
  3. 通知中心 `https://notifications.springernature.com`（"Your manuscript <标题> has been submitted"）
- **Technical Check 阶段不生成 EM 式正式稿号**。已用原始 HTML 探针复核（正则扫 `manuscript-number` / `[A-Z]{2,6}-[0-9]{2}-[0-9]{3,8}` 等模式）→ **页面内零命中**。正式稿号待技术审查通过后由邮件下发。
- ⇒ **台账登记口径**：Snapp 系刊一律先登记 `Submission ID`，并注明"正式稿号待邮件下发"；拿到正式号后回填。**别把 Submission ID 写成 "Manuscript ID/稿件号" 而不加说明**，会被后读的人误当正式号。
- 校验状态用 `Show history` 时间线：应有 `Submission received` → `Submission is under technical check`（各带日期）。

**🤖 Snapp Declarations 屏 DOM id 清单（自动化直填用，2026-09-26 实测）**

| 项 | 选择器 |
|---|---|
| 稿件模式（hybrid 理解确认） | `#hybrid` |
| 无竞争利益 / 有 | `#competing-interest-no` / `#competing-interest-yes` |
| 非重复发表 / 是 | `#dual-publication-no`（对应 yes 同理） |
| 作者政策确认 | `#authorship` |
| 无第三方素材 | `#third-party-material-no` |
| 有数据 / 无 | `#data-availability-yes` / (`-no`) |
| 数据可得性正文（自由文本框） | `#data-availability-description` |
| 无资助 / 有 | `#research-funding-no` / (`-yes`) |

- **作者页**（`/new/submission/<SUB>/authors`）字段 id：`author-0-first-name` / `author-0-last-name` / `author-0-email` / `author-0-affiliation` / `primary-corresponding-author`。
- **带 429 自愈的收尾脚本范式**（可复制）：`<你的脚本目录>\sn19_finish.js`。要点：`page.goto` 各步后 `waitIfThrottled()`（页面正文匹配 `429|频率限制|使用量已超出|too many requests` → 休眠到硬编码重置时刻再重试）＋每步 `pushed into receipt` ＋`finally` 落盘 `sn19_receipt.json` ＋各屏全页截图。取号脚本 `sn20_getid.js`，通知/历史 `sn21_notif.js`，HTML 探针 `sn22_probe.js`。
- **429 触发点实测**：出现在 `Declarations → Next` 之后的 Review 页跳转；自愈休眠 0.5 分钟后重试即通过。**不要因为 429 就重头再提交**——提交是幂等外的不可逆动作，务必先确认是否已提交（查 your-submissions）。

**Springer 系刊通用合规自查（Biosemiotics/12304 实测，多数 Springer 刊同款）**：摘要 **150–250 词**｜关键词 **4–6 个**｜`Statements and Declarations` 段（Competing interests / Funding / Data and code availability / AI 工具使用声明）**缺则按 incomplete 退回**｜**自动行号**（Word：布局→行号→连续；或用 OOXML `w:lnNumType countBy="1" restart="continuous"` 写进 sectPr）｜标题页要含**期刊名**+标题+作者+单位+通讯作者联系方式+ORCID｜作者贡献与利益冲突**必须在投稿界面里也填一遍**（官方：以界面提交的为准，只有界面信息才会进正式出版版）。

**🔴 投稿件专项自查：文献表 ↔ 正文引注必须双向闭环。** 本轮实抓：11 条文献里 **7 条正文零引用**（凑文献嫌疑），且 **Froese & Ziemke (2009) 刊物写错**（应为 *Artificial Intelligence* 173(3–4) 466–500，不是 *Artificial Life*）。**做法**：给每条文献在正文找到锚点（概念首次出现处加引注），找不到锚点就**删条目**，宁少不凑。

## 实跑档案（Artificial Life 期刊，2026-09-13，全流程走通）

| 项 | 值 |
|---|---|
| 系统 | ScholarOne `mc.manuscriptcentral.com/artificiallife`，**七步** |
| 稿件 | 论文2《A Digital Lifeform Parasitic on Real Industrial CAD: A First Reported Case with Auditable Life Instrumentation》v1.0.1 |
| 上传件 | 正文 `CAD_Lifeform_FirstCase_v1.0.1_EN.pdf`（ASCII 名副本）+ 封面信 `CoverLetter_<刊名>_<作者拼音>.pdf`（Step 6） |
| 关键词 | 5 个（含官方表词 `artificial life`）；超 5 红字挡 Save |
| 审稿人 | 3 位（Sayama / Rasmussen / Dolson），Department 留空 |
| **结果** | ✅ **稿件号 `ALIFE-2026-0244`**，Date Submitted 13-Sep-2026 |
| 用时 | 首次注册到提交约 1 小时（含每屏截图核验） |

> 下次同一刊投稿：按 §I 一次给全（Type/Title/Running Head/Abstract/Keywords/作者四件套/审稿人 3 位/封面信/各确认项勾选值），不用逐屏问。

## 实跑档案（Nature Machine Intelligence，Springer Nature MTS，2026-09-13 全流程走通）

入口 `mts-natmachintell.nature.com`｜**投稿主体只有 4 步**：`1. Files → 2. Manuscript Information → 3. Validate → 4. Submit`（顺序不能跳，左栏高亮即当前步）

| 步 | 子页 / 字段 | 实测值 / 做法 |
|---|---|---|
| 首页 | 稿件类型屏 | 9 选 1：`Article` / Review Article / Perspective / News and Views / Correspondence / Comment / Books and Arts / Matters Arising / Resource → 选 **Article** |
| 首页 | 账户 | 顶部 `Submit Manuscript` 起新流程；`Modify My Springer Nature Account` 改姓名/绑 ORCID。**问候语显示的名字 = 账户资料，编辑看的是提交流程里的 Author list，两处都要对** |
| 1 | **Files（7 个子页）** | `a) Upload Files` / `b) Remove & Replace Files` / `c) File Type` / `d) File Description` / `e) File Order` / `Open Research Services` / `Figshare Upload`。页内明写：初投格式灵活，鼓励**稿件+图合成单个 PDF 或 Word，≤30 MB** |
| 1 | **File Type \*** | ⚠️ **上传后必须给每个文件指定类型**（正文选 `Article File`），否则红字 `Please specify a "File Type"` 挡住 `Save and Continue`。四个子页显示 `There are no files to process.` = 文件根本没上传成功 |
| 1 | Open Research Services | `Code Availability *`（必填 Yes/No）+ `Research Data Deposition`（figshare，可选）。figshare 页红字强调**只放支撑数据，不要把稿件或图文件传上去** |
| 2 | **Manuscript Information（4 个子页）** | `a) Title, Abstract` / `b) Authors` / `c) Subject Terms and Techniques` / `d) Detailed Information` |
| 2a | Title / Abstract | Title **≤150 字符**（页上有 `Check Length`）；Abstract 框带 `α β I` 工具条，可选中词点 `I` 加斜体 |
| 2b | **Authors** | `Number of Authors` 填完**必须点 `Update form with number of authors`**（红字才消，页面会刷新）；`Submitter`= 是否通讯作者；**`Gender Identity *` 必填**（默认 `Hidden for data protection`，须点 `Change` 选 `Prefer not to say`）；末段 5 个 `Author Contributions` 勾选框；`Professional Keywords` 可选 |
| 2c | **Subject Terms** | **逐级下拉、不能打字；最少 2 个、最多 5 个"多级词"**（钻到某支最底层再点 `Add`，一串多级组合算 1 个）。树很粗：Level 1 只有 8 大类（Biological sciences / Business and commerce / Earth and environmental sciences / Health sciences / Humanities / **Physical sciences** / Scientific community and society / Social science）。本稿实测可用组合：`Physical sciences/Mathematics and computing/Computer science` + `Biological sciences/Psychology/Human behaviour`（Psychology 支到 Level 3 只有 Human behaviour 一个；Neuroscience 可作备选） |
| 2d | **d) Detailed Information（7 项，全部必填）** | ① `Research Square author dashboard` **勾同意**（仅私有作者仪表盘，不公开预印本）② `Competing interests` = **No** ③ `Dual Publication` = **No**（**预印本不算 prior publication**）④ `Preprint Deposition` = **No**（已在 Zenodo 挂过就别再挂 In Review）⑤ `Peer Review Information` = **`Single-anonymised`** ⑥ `Manuscript Comment`（自由文本：**填旧稿件号 + 撤回重投声明 + 预印本 DOI + 姊妹稿 ID + 推荐审稿人**）⑦ `Previous Interactions` = `None of the above` |
| 3 | **Validate** | `a) Approve Files`：点 `Validate PDF` 开转换稿核对 → **勾该行 `Approve` 复选框**；`b) Approve Manuscript Details` 自动绿。全绿 + 顶部 `No errors found.` 才算过。**页底三行 `Not yet completed` / `Required fields are incomplete` / `Complete` 是状态图例 + 上次校验残留，不代表当前态**——顶部 `No errors found.` 才是判据 |
| 4 | **Submit** | 只有一行橙字 + 一个 **`Approve Submission`** 按钮。**本刊流程没有独立"封面信"入口** —— 披露义务落在 2d 的 `Manuscript Comment`；要另留封面信只能提交后邮件补发 |
| 完成 | 凭证 | 首页顶部红字 **`Manuscript Approved (NATMACHINTELL-A26XXXXXX)`**、`Live Manuscripts (1)`、问候行 `Home Page for Mr <名> <姓>` |
| 稿件号 | 格式 & 变化 | `NATMACHINTELL-A26XXXXXX`。⚠️ **未保存退出后重新开始/重开流程会换号**（实测 `A26095293` → `A26095295` → **`A26095296` 最终**）→ **以提交后确认页/首页红字为准**；中途留下的空草稿（`Continue Partial Submission #…` / `Unknown Title`）不影响提交，勿再点进去提交 |
| 撤回状态在哪查 | `link.springernature.com/home/submissions`（「Your submissions」页）：卡片显示 **`Submission withdrawn`** = 撤回已生效，可安全重投 |
| 重投同一刊 | 顶部 `Submit Manuscript` 重走一遍；`Manuscript Comment` 里披露旧稿件号 + 撤回事实 + 预印本 DOI |
| 重投时标题必须英文 | 实测旧记录标题被填成中文（`如意：一个活生生的数字生命体——…`）→ 重投务必填英文全名 |

> 作者信息同上（名 / 姓 分两格、单位、ORCID——按投稿人真实资料填写）。
> 下次投 Nature 系刊：按本节一次给全（Article / 标题 / 摘要 / 作者四件套 / 2 个 Subject Terms / 2d 七项 / Manuscript Comment 文本），不用逐屏问。

## 坑
- 🔴 **"恰好 N 词"的摘要：不要靠手数，要靠脚本迭代**（2026-09-17 实测，256→250）：写个小脚本 `len(re.findall(r"[A-Za-z0-9\-]+", abstract))` 量词数（`−`/`—`/`%` 这类符号不计、`15/15-step` 计 2），**每改一轮就重量一次**，一次很可能差 1–2 词（实测降到 248 又回补 2 词）。**减词只动措辞，绝不动数字与主张**（把 `to be fully evidenced under that criterion`→`fully evidenced under it`、`host, and the criterion is`→`host; the criterion is` 这类），别为了凑字数删读数。定稿后**稿件 md 与 docx 两处都要量**，并同步改**照抄单**里粘进投稿系统的那份摘要（三处不一致就等于交了三份不同的摘要）。
- 🔴 **同一文件的多处修改必须串行或原子化**（2026-09-17 踩坑）：同一文件在一个批次里并行发 3 处 `Edit`，工具逐条回报"successfully edited"，**实际只落盘 2 处，中间那处被覆盖丢失**（表现为 grep 不到新串、词数只降了一半）。**做法**：同一文件只发一条 `Edit`（整段替换），或用一个 Python 脚本"读→改多处→一次写回"。**任何批量编辑后都要回读复核**（关键字命中 / 词数），不能只信 success 回执。
- **`submit.elsevier.com/<CODE>/submissions` 会同时列出你在 Elsevier 其他刊的投稿**：页面分两栏 —— `Your <本刊> submissions (N)` 与 `Your submissions with other journals (M)`（实测 CSR 页：`CSR submissions (0)` ＋ `BioSystems 1 篇 · With Editor`）。**别把后者误读成"本刊投过了"** —— 判据只看第一栏的 N 和右上 `Start a new submission`。同一账号投 Elsevier 任何刊都会这样汇总显示。
- **`Double-anonymised` 与"内容冻结"直接冲突**：Nature 系刊的 `Peer Review Information` 选双盲会强制"从文件与元数据里删掉一切能认出作者的信息"。若稿件已发布预印本、或用户要求正文一字不改（复用现成 PDF），**只能选 `Single-anonymised`** —— 否则等于改稿。
- **`Code Availability` 选 `Yes` 后不接受"应要求提供"**：实测在自由文本框写 "not publicly released … available upon request" **不放行**，红字要求必须给 **DOI/URL** 或**勾选真交附件文件**。稿件里没有代码可用性声明 → 最干净是把该题改回 `No`（Yes 分支整块消失，红字随之清掉）。**不得为了过审声明不实**（第三方框架代码不能当作者自有代码上传）。
- **旧校验红字会滞留**：改了单选/下拉后（如 `Yes`→`No`、`Code Availability`），页面顶部红字往往还是上一次服务端校验的结果 → **点一次 `Save and Continue` 让它重新校验**，别因为红字还在就以为填错。
- **同一文件传两遍会出现两条记录**：Nature MTS 的 Files 表里同名同大小两条（上传时间不同）→ 到 `b) Remove & Replace Files` 勾掉一条再去选 File Type，别带着重复件往下走。
- **ScholarOne Step 2 的界面段落要逐字读**：它区分 `Initial submissions` / `Revised submissions` / `Accepted submissions` 三套要求。ALife 的初投原文写明"正文一个 PDF 作 Main Document，可选补充材料 ZIP；**Cover Letter later, in Step 6**"。照经验在 Step 2 传封面信会白折腾。
- **换版本稿件必须先 `Remove All Files`**：ScholarOne 不会自动替换，旧版会一直挂在表里。改版后先删旧、再传新，认**字节数**最稳（v1.0.0=45 KB vs v1.0.1=55.8 KB）。注意早期预填的文件名可能是 `…v1.0_…`（少一位），别被绕晕。
- **中文文件名上传易失败/乱码**：投稿前把待上传 PDF 另存一份 ASCII 文件名的副本（如 `CAD_Lifeform_FirstCase_v1.0.1_EN.pdf`），用 `md5` 比对确认与原件一致再传。
- **PDF 预填的标题/摘要不可信**：中文被吞、英文被截。要么跳过预填，要么逐字覆盖。
- 正文改动后**版本要升号**（v1.0.0→v1.0.1）并同步 Zenodo（发 New version），别让投稿件与预印本出现不一致的版本。改动的**内容与理由**要记进操作单，用户会核对。
- 对外稿件**不得出现"审稿中 / under review"**（本人项目红线）：若稿件状态实为撤回，姊妹论文引用一律只写"reported separately"。搜 `under review|审稿中|在审` 逐处清掉。
- 名/姓**分两格**填，别两格都填姓氏（曾出现作者显示为 `YAO YAO`）。
- Zenodo 元数据：Affiliation 别把界面标签一起粘进去（曾出现 `单位=Independent Researcher`）；Language 别选错（曾选成 `cpi`，应为 `English`）。**发布后元数据仍可编辑，只有文件锁定**。
- Zenodo/arXiv 上传页常被浏览器译成中文 → 操作单必须给中文界面字段名。
- `tools/_md2pdf.py` 的 inline() 支持 `**bold**`、`` `code` ``、`*italic*` 与 CJK 回退；若新增标记语法，先补这个函数。
- 🔴 **`Save & Submit Later` 就是"弃稿按钮"（2026-09-18 实测）**：EM 的待批记录（`Waiting for Approval by Author` / `Needs Approval`）会被编辑部当废弃件清理——本次挂 9.5 小时即被移除，**催办邮件甚至没送达**。用户一旦说"点了保存稍后继续"，**第一件事就是查邮箱找 removal 邮件**确认是否已被清掉，而不是继续找记录。
- 🔴 **投稿系统的盲审类型必须实测确认，不能凭印象**：*Minds and Machines* 先被记成"大概率单盲"，实为**双盲**（官方原文 *follows a double-blind reviewing procedure*）。→ 准备材料前先抓官网/系统页原句，再决定要不要匿名稿与独立标题页。
- 🔴 **黄色 ⚠️ 不等于错误**：`Author Institution is Unverified`（独立研究者必然触发）、"邮箱已存在"（本人账号）都是**提示性校验**，照常保存即可。别为消警告去编机构，也别在"邮箱已存在"时重复建作者（改用 `People Search`）。
