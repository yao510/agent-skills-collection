---
name: laap-consciousness-engine
description: 将前沿脑神经学/心理学认知论文（如 LAAP 的 PSI-RSI
  数字生命框架）工程化为可运行、可干预、可进化的意识引擎(Python)。当用户要求"工程化意识系统 / 认知架构论文 / 实现 consciousness
  engine / 让设计师接入"时使用。
repo: https://github.com/yaohuancen/agent-skills-collection
---

# LAAP 意识引擎工程化工作流

将一篇"前沿认知/意识"论文落地为可运行代码系统的可复用流程。以 LAAP
（Living Agent Application Protocol, PSI-RSI 双重驱动数字生命体）为范例。

## 何时使用
- "把 XX 认知论文用代码工程化 / 实现意识系统"
- "让智能设计师接入/编程这个意识引擎"
- 任何需要把神经科学/心理学理论变成可运行 Agent 架构的需求

## 流程

### 1. 研究真论文，别凭空编
先用 WebFetch 抓**原始文章**（CSDN/arXiv/博客），提取真实架构：
六层/六协议、模块名、数据结构、API、公式。例：LAAP 有 六层
(Infra/Tool&Perception/Memory/Cognition/AGI/Meta) + 六协议
(COM/ID/LIFE/MEM/SYNC/UI) + PSI 五需求 + RSI + 全局工作空间。
**论文没定义的部分（如"设计师接口"）才是你要补充的创新点。**

### 2. 架构映射（纯标准库，零依赖）
优先纯 stdlib，保证托管 Python 直接跑：
`<本机 Python 3.13 路径>`

### 3. 必建模块
- **core/**: `engine.py`(心跳循环 step/run)、`event_bus.py`(发布订阅 CognitiveBus，
  **默认就用真实 EventBus 而非空实现**)、`blackboard.py`(注意力读取的共享区)、
  `clock.py`。
- **cognition/**: `needs.py`(PSI 五需求，satisfaction 衰减，drive=Σdeficit·weight)；
  `emotion.py`(VAD 效价/唤醒/支配)；`world_model.py`(Entity/Relation/CausalLink，
  **用到的符号必须显式 import**)；`attention.py`(salience 选择)；
  `parliament.py`(多视角投票决策)；`self_model.py`(能力档案+自传叙事)；
  `brain.py`(皮层状态向量 + 生成候选 + 调用议会)。
- **memory/**: 五层 working/episodic/semantic/procedural/vector + `system.py`
  用巩固规则（工作→情景→语义→程序）。WorkingMemory **要有 remove()**。
- **agi/**: `conscious.py`(Qualia/AttentionEngine/ConsciousnessFrame 全局工作空间)；
  `rsi.py`(递归自我改进，**采纳的改动用 on_adopt 真实回写子系统**，而不仅是模拟)。
- **lifeform/**: physiology (LAAP-LIFE 心跳/能量)。
- **designer/**: `api.py` 智能设计师 SDK — inspect/configure/set_need/set_alpha/
  inject_percept/subscribe/register_module/intervene/trace_consciousness；
  `console.py` 可读渲染。

### 4. 端到端验证
- `demo.py`：跑 N 个心跳，打印意识流 + 演示设计师注入/订阅/干预。
- `tests/test_laap.py`：pytest 或纯 assert 冒烟测试（需求衰减、记忆巩固、
  意识帧生成、RSI 回写、设计师全访问）。
- `README.md`：论文主张 → 代码模块映射表。

### 5. 运行命令
```
python -m laap.demo
python tests/test_laap.py
```

## 关键坑
- engine 默认 EventBus，不要留 `_NullBus` 导致订阅失效。
- WorkingMemory 缺 `remove()` 会在 consolidate 时崩。
- engine 用到 `CausalLink` 等必须在 world_model import 行里显式引入。
- RSI 初始超参故意偏离最优(如 alpha=0.3)，才能演示"自我改进采纳"。

## 交付物
可运行包 + demo + 测试 + README + 设计师 SDK + 工作记忆笔记
（项目 `.workbuddy/memory/`），必要时本 skill 沉淀复用。
