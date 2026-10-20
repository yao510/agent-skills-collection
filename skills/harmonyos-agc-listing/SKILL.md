---
name: harmonyos-agc-listing
description: >-
  HarmonyOS NEXT 应用/游戏上架华为 AppGallery Connect (AGC) 的可复用实战流程：AGC 新版四分支结构、单机APP 软著/备案豁免（重要）、图标1024规范、三设备截图规范(手机1080×1920/平板1600×2560/PC1920×1080)、隐私政策结构化填写、自动签名+命令行 hvigorw 构建签名、Playwright 浏览器自动化上传/传截图/提交审核、常见驳回排查闭环、游戏专项(IARC/版号/激励死局)。当用户要发布鸿蒙应用、处理AGC审核驳回、配置DevEco签名、准备上架素材时复用本技能。
repo: https://github.com/yaohuancen/agent-skills-collection
---

# 华为上架技能（HarmonyOS → AppGallery Connect 实战）

> 通用、可维护的鸿蒙上架实战流程。每上架一个新应用/游戏都复用本技能，并把新踩坑补回 `references/common_errors.md` 与本文。

## 0. 最高优先级认知纠正：单机APP 免软著 / 免备案

**这是被华为官方客服确认、且已被 2 个已上架应用验证过的规则，是硬事实，不要再误判。**

- **单机APP（在 AGC「备案信息」勾选"您的APP为单机APP"，且应用确实不联网/无服务器通信）→ 豁免：**
  - ① **软件著作权 / APP电子版权证书（三选一）** —— 不需要
  - ② **ICP 备案 / 公安备案** —— 不需要
- 判据：**应用真的没有 INTERNET 权限、不连接任何服务器**。只要声明单机且后台识别不到联网场景即可。
  - 验证：工程里 `grep -rl "INTERNET" entry/src AppScope` 应为空；`module.json5` 不声明 `ohos.permission.INTERNET`。
  - 风险：若工程仍声明 INTERNET 权限，华为会提示"识别到联网场景将无法通过审核"，必须先在 DevEco 去掉 INTERNET 权限并重新构建。
- **错判回顾（不要再犯）**：早期误以为"所有中国大陆应用都必须软著+备案"。这是错的。只有**非单机 / 联网类**应用才需要。已上架的「汉字学习挑战」「割草英雄」均无软著/电子版权证书也过审，即铁证。
- **游戏例外**：游戏即使单机，**中国大陆发布仍强制版号(ISBN)**（见第 11 节）。但版号与软著是两件事——单机游戏海外发布连版号都免；若走大陆，需版号但不一定需软著（按单机口径）。具体以提交时 AGC 提示为准。

## 1. 何时使用
- 用户要把 HarmonyOS NEXT 应用/游戏发布到华为应用市场 (AppGallery Connect, AGC)
- 收到 AGC 审核驳回：图标尺寸不符 / 功能异常 / 隐私政策不完整 / 图标不一致 / 系统图标 / 测试数据 等
- 配置 DevEco 签名(手动/自动)、用 keytool 核对证书指纹
- 准备上架素材：图标 1024、三设备截图、隐私政策网页

## 2. 前置条件
- DevEco Studio ≥ 5.0.5.315（低于此版本 Image Asset / 图标处理会异常）
- 华为开发者账号(个人/企业)，已在 AGC 创建应用并拿到包名(bundleName)
- **包名(bundleName)一旦确定不可修改**，必须与 `AppScope/app.json5` 的 bundleName 完全一致

## 3. AGC 新版控制台：上架四大分支
左侧「应用上架」菜单下，关键四分支（以星河为例，APP ID 见应用信息页）：
1. **应用信息** —— 应用名称(多语)、支持设备、应用图标上传(1024直角PNG)、分类、标签、客服信息
2. **软件包管理** —— 「上传」按钮传 .app；可「启动自检」「下载」
3. **版本信息** —— **提交审核入口 + 所有上架必填项**（软件包加密/发布地区/应用介绍/一句话简介/资费/内容分级/隐私声明/隐私标签/AI功能声明/备案信息(单机APP勾选)/联系方式/上架时间/**应用介绍截图**/**应用审核信息-备注**）
4. 版本/升级、版本历史、智慧分发、价格与销售范围

> 提交审核按钮在「版本信息」页底部。驳回后会回到「待修改」状态，点开版本信息可看到审核意见逐条。

## 4. 端到端流程
1. **确认是否需要备案/软著**：先判单机还是联网（见第 0 节）。单机 → 跳过；联网 → 走 ICP+公安备案 + 软著/电子版权。
2. **AGC 创建应用 & 填应用信息**：名称(多语)、分类、标签、开发者信息、上传 1024 直角图标
3. **图标合规**（见第 5 节）
4. **截图合规**（见第 6 节，三设备）
5. **隐私政策**：AGC 结构化表单填写 + 托管完整隐私政策网页为 HTTPS URL（华为云 OBS 公共读桶最稳）
6. **签名配置**（见第 7 节，强烈推荐自动签名）
7. **构建上传**：命令行 `hvigorw assembleApp`（见第 8 节）产出带签名 .app → 浏览器自动化上传（见第 9 节）
8. **填版本信息 + 提交审核**：上传三设备截图、在「应用审核信息-备注」说明特殊设计意图（回应驳回用）、关联新包、点提交审核

## 5. 图标规范（最高频驳回点）
- 单层图 `app_icon.png` **必须 1024×1024**（AGC 审核第3.1项）
- 分层图标 `foreground.png` / `background.png` 也需 **1024×1024**
- **上传到 AGC 的图标必须是直角正方形 PNG**（AGC 自动 Mask 切圆角）。不要把图标自己做圆角。
- 引用位置：`AppScope/app.json5` 与 `entry/src/main/module.json5` 的 `icon` / `startWindowIcon`
  - 单层：`"$media:app_icon"`；分层：`"$media:layered_image"`（需 `layered_image.json` 指向 foreground/background）
- 排查：`scripts/check_agc_compliance.sh <根>` 一键核对所有 media 尺寸
- 修复：用户源图常带白底 → Python/PIL 四角 flood fill 去白底再缩放 1024（`scripts/fix_icon.py`）；或 ffmpeg overlay 合成
- **坑**：图标不是上传时单独选的文件，而是打包进 .app。源文件合规 + 重新 Build 即可，不存在"选错"。
- **替换系统/默认图标**：若驳回"图标不一致/系统图标"，确认 AppScope 与 entry 两层 media 都已替换为自制图标；`foreground` 全透明则桌面显示 `background` 全图（分层机制）。

## 6. 截图规范（三设备，注意尺寸不同）
| 设备 | 要求尺寸 | 方向 | 数量 | 格式/大小 |
|---|---|---|---|---|
| 手机 phone | **1080×1920**（9:16） | 竖屏 | 3~10 | PNG/JPG ≤5MB |
| 平板 tablet | **1600×2560**（10:16） | 竖屏 | 3~10 | PNG/JPG ≤5MB |
| PC / 2in1 | **1920×1080**（16:9） | 横屏 | 3~10 | PNG/JPG ≤5MB（不要 2560×1600 的 16:10） |

- 常见错误：真机全屏竖屏截图是 1080×2340（9:19.5），需裁剪到 1920 高：`ffmpeg -i in.png -vf "crop=1080:1920:0:210" out.png`（中心裁剪；若切到顶部 HUD 改 `crop=1080:1920:0:0`）
- PC 必须 16:9 横屏，最低 1920×1080；不要做成 16:10。
- 截图必须**明亮清晰有美感**，直接展示产品最漂亮视觉；避免黑乎乎的暗色 mock；示例数据必须虚构/脱敏。
- `scripts/check_agc_compliance.sh` 已支持识别上述三种尺寸（不会误报）。

## 7. 隐私政策（结构化表单）
AGC 隐私政策为结构化填写，必填字段：
- **产品简介**：一句话说明应用做什么
- **服务模式**：勾选应用实际提供的项；不提供的项明确填"无"（个性化推荐/广告营销/第三方登录等填"无"）
- **第9项 联系方式**：必须点「增加商业联系方式」补结构化邮箱/电话；**只填自定义文本框会报"必填"错误**
- 同时托管一份完整隐私政策网页为 **HTTPS URL**，在 AGC 应用信息里填该链接（华为云 OBS 公共读桶最稳，天然 HTTPS；次选 GitHub Pages）
- 单机APP 且不涉及个人信息 → 隐私标签选"不涉及个人信息=否"；隐私声明可走"隐私托管"选已建协议

## 8. 签名配置 + 命令行构建（实战，已验证）
**强烈推荐自动签名**：DevEco `File → Project Structure → Signing Configs → 勾选 Automatically generate signing / 关联已注册应用`，按包名从 AGC 自动拉证书，绕开手动填密码。

**命令行构建签名（无需开 DevEco IDE，CI/自动化友好）**：
```bash
# 关键：JBR 自带 java + HarmonyOS SDK 路径必须进环境变量
set JAVA_HOME="C:\Program Files\Huawei\DevEco Studio\jbr"      # 改为本机 DevEco 安装路径
set DEVECO_SDK_HOME="C:\Users\<用户名>\AppData\Local\Huawei\Sdk"   # 改为本机 SDK 路径
cd <工程根>
hvigorw.bat assembleApp --mode module -p product=default
# 产物：build/outputs/default/<工程名>-default-signed.app
```
- `build-profile.json5` 的 `signingConfigs` 若为空（未配置签名）→ 先去 DevEco 配好自动签名再命令行构建，否则出无签名包。
- **Debug 包不可上传**（报"离线校验不通过"）。命令行默认产出 Release 带签名包。
- keytool 核对别名与公钥指纹（自动签名后也可查）：
  ```bash
  keytool -list -v -keystore <store.p12> -storepass <pwd> -alias <alias>
  ```
  输出「扩展 → SubjectKeyIdentifier → KeyIdentifier」即公钥指纹，与 AGC 证书管理比对。

## 9. 浏览器自动化上传（Playwright MCP，已验证全流程）
> WorkBuddy 自带 Playwright MCP（`mcp__playwright__*`）。可用于：登录 AGC、上传 .app、传三设备截图、填审核备注、提交审核。

**关键坑（必看）**：
- **allowed roots 白名单**：Playwright 文件选择器只允许白名单目录内的文件。实测允许 `<你的白名单目录>` 与 `<你的截图暂存目录>`。**工程目录（如 <你的工程目录>）不在白名单 → 上传被拒 "File access denied... outside allowed roots"**。
  - **解决**：先把 `.app` 和截图 `copy` 到白名单目录（如 `<你的白名单目录>\outputs\agc_upload\`）再上传。
- **登录态**：信任此浏览器后自动化登录无需人工验证码（偶尔仍可能要滑块人机验证，需用户协助）。
- **上传成功提示被对话框遮挡**：上传后列表可能不即时刷新，其实是被"xxx.app 上传成功"提示框挡住；关掉提示框后刷新即可看到新包。
- **Radio 点击被 span 拦截**：点 radio 报 `el-radio__inner intercepts pointer events` → 改点外层 label 容器。
- 上传后在「软件包管理」可见新包（构建版本号+1）；去「版本信息」关联该新包再提交。

## 10. 常见驳回 / 报错速查
| 现象 | 根因 | 修复 |
|---|---|---|
| 应用图标单层图尺寸为256/512 | app_icon.png 非1024 | 替换为1024图，清 build 缓存重 Build |
| 图标不一致/系统图标 | 两层 media 未替换为自制图标 | AppScope+entry 两层都换；foreground 透明显 background |
| 离线校验不通过 | 未签名 / Debug 包 | Release 带签名包或云签名 |
| KeyAlias not exist | 别名错 或 storeFile 指错 | keytool 查真实别名与 p12 路径 |
| keystore password incorrect | 密码错 | 走自动签名 |
| Profile invalid/expired | Profile 与包名/证书不匹配 | AGC 重新下载 .p7b 与 .cer |
| 隐私政策第9项报错 | 未点「增加商业联系方式」 | 补结构化邮箱/电话 |
| 功能异常(加载失败/数据不更新) | 存档未调用/返回页未刷新/首启DB未就绪 | 查 save→load 链路；首启 DB 兜底超时延长+前端重试 |
| 测试数据(mock) | 提交版残留演示数据 | 删 seedDemo/演示注入方法，重构建 |
| 截图尺寸不符 | 1080×2340 等非规范 | 按第6节裁剪/缩放 |
| 识别到联网场景将无法通过审核 | 工程仍声明 INTERNET 但勾了单机APP | 去掉 INTERNET 权限重构建（或如实改选非单机并补备案） |
| 版权信息区为空 | 误以为必须软著 | **单机APP 豁免，无需软著/电子版权（见第0节）** |

## 11. 游戏专项（游戏类应用）
- **IARC 年龄分级**：游戏类必填（全球都需），AGC 内做 IARC 问卷（常用 3+ / E / ALL）
- **版号(ISBN)**：**中国大陆发布游戏强制**，需国家新闻出版署审批（周期数月）；单机也不例外。仅「海外发布」可免版号。
- **软著/电子版权**：游戏按单机口径同上——**单机游戏海外发布免软著**；大陆发布按 AGC 当时提示（版号是硬门槛，软著通常也要求，但与"非游戏单机免软著"规则不同，需单独确认）。
- **鸿蒙应用开发者激励计划2026（现金）死局（个人开发者必看）**：
  - 激励仅限"**面向中国大陆**"发布（海外发布不参与，互斥）
  - 个人开发者**无法在中国大陆上架游戏**（需企业资质+版号；个人申请不了版号）
  - 游戏只能走"热门应用"档（含游戏App，1万/款，需用户基础/行业影响力）
  - → 个人开发者**实际拿不到游戏激励**。正确路径：做**非游戏应用**走"新应用"档（3000元/款，个人可参与：Q15 公司信息填"姓名"或"无"）；或游戏只海外发布（免版号/软著/备案，个人可发）但不拿激励。
  - 个人应用务必"无广告+无内购"（鲸鸿动能广告/IAP 需企业资质）。

## 12. 自检脚本（`scripts/`）
- `check_agc_compliance.sh <根>` — 核对图标尺寸(1024)/三设备截图尺寸/签名配置/包名一致性
- `fix_icon.py <源图> <目标media目录...>` — 去白底 + 缩放至 1024
- `fix_screenshots.sh <截图目录> <输出目录>` — 裁剪至规范尺寸
- `scan_template_residue.py <工程根> [--old-name] [--old-bundle]` — 批量复制模板后扫描上个应用残留（只读不删）

## 13. 批量复制模板 → 新应用 的残留清理
用已上架工程复制生成多个新应用后，**必须**逐项清理，否则审核打回或不专业：
1. `rawfile/privacy_policy.html`：若仍是旧包名 → 删除或替换
2. `en/element/string.json`：英文应用名/描述改为本应用
3. 调试脚本（如 `check_dups.ps1`）→ 删除
4. `obfuscation-rules.txt`：删旧应用类名 keep 规则
5. `oh-package.json5` / `entry/oh-package.json5`：description/author 改本应用
6. `EntryAbility.ets`：hilog tag 由 `testTag` 改为应用标识
7. 空目录（components/models/viewmodel）→ 删除
8. 跑 `scan_template_residue.py` 复查清零

## 14. 实战案例：星河 (com.xinghe.memorybrain) 上架全过程
> 完整踩坑与修复见 `references/common_errors.md` 与工程内 `harmony\星河AGC上架作战地图.md`。

- **背景**：星河是纯本地记忆/星座大脑应用，数据层为原生 ArkTS SQLite（无 Python 后端、无服务器）。
- **被驳回 6 条**：①功能异常(首启DB未就绪"加载失败") ②图标不一致 ③系统图标 ④测试数据(mock) ⑤布局异常(不阻断) ⑥分享/备份小问题(不阻断)。
- **修复**：
  - ① 延长 `ApiService.ensureDbReady()` 兜底超时 3s→15s + 前端 fetch 重写"数据库未初始化"自动重试(≤4次)
  - ②/③ 两层 media 图标替换为自制星座图（background=星标全图，foreground=全透明）；旧默认图标备份 `_quarantine_*/`
  - ④ 删 `Db.seedDemoIfEmpty()` 调用与方法（演示数据来源）
  - 权限：`module_permissions.json5`/`module_network_config.json5`（含 INTERNET）确认未被引用 → 移入 `_quarantine_*/`，契合"单机APP"声明
- **重构建**：`hvigorw assembleApp` 产出 `build/outputs/default/xinghe2-default-signed.app`（versionCode 3 / 1.0.2，requestPermissions NONE）
- **上传**：复制到白名单目录 → Playwright 上传至「软件包管理」（构建版本3，使用场景"测试和正式上架"）
- **填版本信息**：传手机/平板/PC 三设备截图；「应用审核信息-备注」说明首启加载设计；关联 1.0.2 包；点提交审核
- **关键结论**：星河声明单机APP → **无需软著/电子版权/备案**，直接提交。
