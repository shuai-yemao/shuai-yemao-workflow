# 缺陷管理跟踪工作流

一套完整的缺陷管理跟踪工作流，支持混合来源缺陷管理、根因分析、DMAIC 改进流程，与 Scrum 敏捷开发和测试工作流无缝集成。

## 概述

本工作流覆盖完整的缺陷生命周期：

```
缺陷记录 → 分类评估 → 根因分析 → 修复跟踪 → 验证关闭 → 持续改进
```

## 位置

`~/.claude/workflows/defect-management/`

## 文件结构

```
~/.claude/workflows/defect-management/
├── workflow.js                    # 工作流入口
├── README.md                      # 说明文档
├── USAGE.md                       # 使用指南
├── modules/
│   ├── defect-logging.js          # 缺陷记录
│   ├── defect-triage.js           # 缺陷分类
│   ├── root-cause-analysis.js     # 根因分析
│   ├── defect-fixing.js           # 缺陷修复
│   ├── defect-verification.js     # 缺陷验证
│   ├── defect-dashboard.js        # 缺陷仪表盘
│   ├── improvement-tracking.js    # 改进跟踪
│   └── jira-sync.js              # Jira 同步（可选）
└── utils/
    ├── defect-manager.js          # 缺陷数据管理
    └── json-validator.js          # JSON 验证
```

## 工作流阶段

### 阶段 1: 缺陷记录 (defect-logging)

**功能：** 记录和创建缺陷

**输入：**
- 缺陷信息（来自测试、用户反馈、监控）
- 复现步骤
- 环境信息

**输出：**
- 缺陷记录 (defect-BUG-XXX.json)
- 缺陷 ID

### 阶段 2: 缺陷分类 (defect-triage)

**功能：** 分类和优先级评估

**输入：**
- 缺陷记录
- 影响范围

**输出：**
- 分类结果
- 优先级评估
- 分配建议

### 阶段 3: 根因分析 (root-cause-analysis)

**功能：** 深入分析缺陷根本原因

**输入：**
- 缺陷记录
- 代码变更历史

**输出：**
- 根因分析报告
- 影响范围评估
- 改进建议

### 阶段 4: 缺陷修复 (defect-fixing)

**功能：** 跟踪修复过程

**输入：**
- 根因分析结果
- 修复方案

**输出：**
- 修复记录
- 代码变更
- 回归测试

### 阶段 5: 缺陷验证 (defect-verification)

**功能：** 验证修复效果

**输入：**
- 修复记录
- 验证标准

**输出：**
- 验证报告
- 关闭/重开决策

### 阶段 6: 缺陷仪表盘 (defect-dashboard)

**功能：** 生成统计和趋势报告

**输入：**
- 所有缺陷记录
- Sprint 数据

**输出：**
- 缺陷统计
- 趋势分析
- 质量评估

### 阶段 7: 改进跟踪 (improvement-tracking)

**功能：** 跟踪持续改进措施

**输入：**
- 根因分析结果
- 改进建议

**输出：**
- 改进计划
- 改进措施跟踪
- 效果评估

## 输出位置

| 文档 | 输出目录 | 文件名 |
|------|----------|--------|
| 缺陷记录 | `00_Project_Management/10_缺陷管理追踪_Jira/defects/` | `defect-BUG-XXX.json` |
| 分类报告 | `00_Project_Management/10_缺陷管理追踪_Jira/triage/` | `triage-report-YYYY-MM-DD.json` |
| 根因分析 | `00_Project_Management/10_缺陷管理追踪_Jira/analysis/` | `root-cause-BUG-XXX.json` |
| 修复记录 | `00_Project_Management/10_缺陷管理追踪_Jira/fixing/` | `fix-BUG-XXX.json` |
| 验证报告 | `00_Project_Management/10_缺陷管理追踪_Jira/verification/` | `verification-BUG-XXX.json` |
| 仪表盘 | `00_Project_Management/10_缺陷管理追踪_Jira/dashboard/` | `defect-dashboard.json` |
| 改进计划 | `00_Project_Management/10_缺陷管理追踪_Jira/improvement/` | `improvement-plan.json` |

## 使用方法

```javascript
const DefectManagement = require('C:/Users/zhang/.claude/workflows/defect-management/workflow');

const dm = new DefectManagement();

// 记录新缺陷
const defect = await dm.execute({
  mode: 'log-defect',
  outputDir: 'D:/your/project/path',
  inputData: {
    title: '登录接口返回 500 错误',
    description: '当邮箱包含 "+" 字符时，登录返回 HTTP 500',
    severity: 'critical',
    priority: 'high',
    source: 'testing',
    reproduction: {
      steps: ['1. 准备包含 "+" 的邮箱', '2. 输入邮箱和密码', '3. 点击登录'],
      expected: '成功登录',
      actual: 'HTTP 500 错误',
      environment: 'staging'
    }
  }
});

// 执行根因分析
await dm.execute({
  mode: 'analyze',
  outputDir: 'D:/your/project/path',
  inputData: { defectId: defect.id }
});

// 生成仪表盘
await dm.execute({
  mode: 'dashboard',
  outputDir: 'D:/your/project/path',
  inputData: { sprintNumber: 1 }
});
```

## 执行模式

- **log-defect**: 记录新缺陷
- **triage**: 缺陷分类和优先级评估
- **analyze**: 根因分析
- **fix**: 执行修复流程
- **verify**: 验证修复
- **dashboard**: 生成仪表盘
- **improvement**: 执行改进流程
- **sync-jira**: 同步到 Jira
- **full-lifecycle**: 完整生命周期

## 缺陷生命周期

```
open → in-progress → resolved → verified → closed
  │                    │
  └→ deferred         └→ reopened → in-progress
```

## 与现有工作流集成

```
测试与 CI/CD ─────→ 缺陷记录（测试失败自动创建）
                          ↓
Scrum 敏捷开发 ←──→ 缺陷修复（纳入 Sprint）
                          ↓
需求工程 ←───────── 缺陷追溯（需求缺陷）
                          ↓
生产管理 ←───────── 缺陷分析（质量问题）
```

## DMAIC 改进流程

1. **Define（定义）** - 定义问题和目标
2. **Measure（测量）** - 收集数据，量化问题
3. **Analyze（分析）** - 分析根本原因
4. **Improve（改进）** - 制定和实施改进措施
5. **Control（控制）** - 验证效果，标准化
