# Scrum 敏捷开发工作流

一套完整的 Scrum 敏捷开发工作流，与需求工程工作流无缝集成，支持迭代式产品开发。

## 概述

本工作流模拟完整的 Scrum 流程：

```
需求列表 → Sprint 计划 → 每日例会 → Sprint 评审 → Sprint 回顾
   │           │            │           │            │
   │           ▼            ▼           ▼            ▼
   │     Sprint Backlog  进度追踪   产品增量     改进建议
   │           │            │           │            │
   └───────────┴────────────┴───────────┴────────────┘
                         ↓
                    下一个 Sprint
```

## 位置

`~/.claude/workflows/scrum-development/`

## 文件结构

```
~/.claude/workflows/scrum-development/
├── workflow.js                    # 工作流入口
├── README.md                      # 说明文档
├── USAGE.md                       # 使用指南
├── modules/
│   ├── sprint-planning.js         # Sprint 计划会议
│   ├── daily-standup.js           # 每日例会
│   ├── sprint-review.js           # Sprint 评审会议
│   └── sprint-retrospective.js    # Sprint 回顾会议
└── utils/
    ├── backlog-manager.js         # Backlog 管理
    ├── velocity-tracker.js        # 速率追踪
    └── json-validator.js          # JSON 验证
```

## 工作流阶段

### 阶段 1: Sprint 计划会议 (sprint-planning)

**输入：**
- 需求列表（来自需求工程工作流）
- 团队速率（历史数据）
- Sprint 容量（团队可用工时）

**输出：**
- Sprint 目标
- Sprint Backlog（任务列表）
- 任务分配
- 验收标准

**流程：**
1. 从需求列表中选取高优先级需求
2. 将需求拆分为用户故事
3. 估算故事点数
4. 根据团队速率确定 Sprint 容量
5. 分配任务给团队成员
6. 定义 Sprint 目标

### 阶段 2: 每日例会 (daily-standup)

**输入：**
- 当前 Sprint Backlog
- 任务状态

**输出：**
- 进度更新
- 阻塞问题列表
- 新任务分配（如有）
- 燃尽图数据

**流程：**
1. 收集每个成员的进展
2. 识别阻塞问题
3. 更新任务状态
4. 必要时重新分配任务
5. 记录燃尽图数据

### 阶段 3: Sprint 评审 (sprint-review)

**输入：**
- Sprint Backlog
- 完成的任务
- 产品增量

**输出：**
- 评审报告
- 产品增量版本
- 产品经理决策（通过/不通过）
- 反馈收集

**流程：**
1. 演示完成的功能
2. 收集利益相关者反馈
3. 产品经理评估是否满足需求
4. 决定是否发布产品增量
5. 记录反馈用于下个 Sprint

### 阶段 4: Sprint 回顾 (sprint-retrospective)

**输入：**
- Sprint 执行数据
- 团队反馈

**输出：**
- 改进建议
- 流程优化措施
- 下个 Sprint 的调整

**流程：**
1. 回顾 Sprint 中做得好的地方
2. 识别需要改进的地方
3. 制定具体改进建议
4. 分配改进任务
5. 更新团队工作协议

## 输出位置

| 文档 | 输出目录 | 文件名 |
|------|----------|--------|
| Sprint 计划 | `00_Project_Management/07_敏捷开发_Scrum/Sprint-{N}_Planning/` | `sprint-plan.json/.md` |
| 每日例会 | `00_Project_Management/07_敏捷开发_Scrum/Sprint-{N}_Daily/` | `standup-{date}.json/.md` |
| Sprint 评审 | `00_Project_Management/07_敏捷开发_Scrum/Sprint-{N}_Review/` | `review-report.json/.md` |
| Sprint 回顾 | `00_Project_Management/07_敏捷开发_Scrum/Sprint-{N}_Retrospective/` | `retrospective.json/.md` |

## 与需求工程工作流集成

```
需求工程工作流                         Scrum 开发工作流
┌─────────────────┐                 ┌─────────────────┐
│ 1. 客户需求表    │                 │                 │
│ 2. 需求约束表    │ ──────────────→ │ Sprint 计划     │
│ 3. 现有状态表    │                 │     ↓           │
│ 4. 功能图谱      │                 │ 每日例会        │
│ 5. 实施表        │ ←────────────── │     ↓           │
│ 6. 验收表        │                 │ Sprint 评审     │
└─────────────────┘                 │     ↓           │
                                    │ Sprint 回顾     │
                                    └─────────────────┘
```

## 使用方法

```javascript
const Workflow = require('C:/Users/zhang/.claude/workflows/scrum-development/workflow');

const workflow = new Workflow();

// 执行 Sprint 计划
const plan = await workflow.execute({
  mode: 'sprint-planning',
  sprintNumber: 1,
  outputDir: 'D:/your/project/path',
  inputData: {
    requirements: [],  // 来自需求工程工作流
    teamCapacity: 40,  // 人天
    teamVelocity: 30   // 历史速率
  }
});

// 执行每日例会
const standup = await workflow.execute({
  mode: 'daily-standup',
  sprintNumber: 1,
  date: '2026-06-20',
  outputDir: 'D:/your/project/path'
});

// 执行 Sprint 评审
const review = await workflow.execute({
  mode: 'sprint-review',
  sprintNumber: 1,
  outputDir: 'D:/your/project/path'
});

// 执行 Sprint 回顾
const retro = await workflow.execute({
  mode: 'sprint-retrospective',
  sprintNumber: 1,
  outputDir: 'D:/your/project/path'
});
```

## 执行模式

- **sprint-planning**: 执行 Sprint 计划会议
- **daily-standup**: 执行每日例会
- **sprint-review**: 执行 Sprint 评审
- **sprint-retrospective**: 执行 Sprint 回顾
- **full-sprint**: 完整执行一个 Sprint 周期
- **multi-sprint**: 执行多个 Sprint（支持速率调整）

## 版本管理

与需求工程工作流共享版本管理机制，每个 Sprint 生成独立版本目录。
