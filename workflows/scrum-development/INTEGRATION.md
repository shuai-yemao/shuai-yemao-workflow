# 需求工程工作流与敏捷开发工作流集成指南

## 概述

本文档说明需求工程工作流的输出如何被敏捷开发工作流消费，实现从需求到开发的完整流程。

## 数据流转架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         需求工程工作流                                    │
│                                                                         │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐            │
│  │ 客户需求  │ → │ 需求约束  │ → │ 现有状态  │ → │ 功能图谱  │            │
│  │   表     │   │   表     │   │   表     │   │          │            │
│  └──────────┘   └──────────┘   └──────────┘   └────┬─────┘            │
│                                                      │                  │
│                                                      ▼                  │
│                                                 ┌──────────┐           │
│                                                 │ 实施表    │           │
│                                                 │ (输出)    │           │
│                                                 └────┬─────┘           │
└──────────────────────────────────────────────────────┼──────────────────┘
                                                       │
                                                       │ requirements[]
                                                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         敏捷开发工作流                                    │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     Sprint 计划会议                               │   │
│  │                                                                  │   │
│  │   输入: requirements[] + teamCapacity + teamVelocity             │   │
│  │                    ↓                                             │   │
│  │   ┌─────────────────────────────────────────────────────────┐   │   │
│  │   │  1. selectRequirements()     按优先级选择需求            │   │   │
│  │   │  2. createUserStories()      转化为用户故事              │   │   │
│  │   │  3. estimateStoryPoints()    估算故事点数                │   │   │
│  │   │  4. selectStoriesForSprint() 选择进入 Sprint 的故事      │   │   │
│  │   │  5. assignTasks()            拆分并分配任务              │   │   │
│  │   └─────────────────────────────────────────────────────────┘   │   │
│  │                    ↓                                             │   │
│  │   输出: Sprint Backlog + 任务分配                                │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              ↓                                          │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐           │
│  │ Sprint   │ → │ 每日例会  │ → │ Sprint   │ → │ Sprint   │           │
│  │ 计划     │   │          │   │ 评审     │   │ 回顾     │           │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘           │
└─────────────────────────────────────────────────────────────────────────┘
```

## 详细数据映射

### 1. 需求工程工作流输出格式

**实施表 (implementation-plan.json)**

```json
{
  "functions": [
    {
      "id": "FUNC-001",
      "name": "用户登录功能",
      "description": "支持用户名密码登录",
      "type": "function",
      "priority": "high",          // high | medium | low
      "requirement": "REQ-001"     // 关联的原始需求
    }
  ],
  "implementations": [
    {
      "functionId": "FUNC-001",
      "functionName": "用户登录功能",
      "priority": "high",
      "requirement": "REQ-001",
      "estimatedEffort": "3 人天",
      "riskLevel": "low",
      "files": [
        {
          "path": "src/auth/login.c",
          "type": "source",
          "description": "登录实现"
        }
      ]
    }
  ],
  "estimates": {
    "total": 45,
    "byPriority": {
      "high": 20,
      "medium": 15,
      "low": 10
    }
  }
}
```

### 2. 敏捷开发工作流输入格式

**Sprint 计划输入**

```javascript
{
  requirements: [
    {
      id: "REQ-001",              // 来自需求工作流
      title: "用户登录功能",       // 映射自 function.name
      description: "支持...",     // 映射自 function.description
      priority: "high",           // 直接使用
      storyPoints: 5,             // 需要转换或估算
      category: "functionality",  // 根据 function.type 推断
      acceptanceCriteria: [...]   // 从验收表获取
    }
  ],
  teamCapacity: 40,               // 人天
  teamVelocity: 30                // 故事点
}
```

## 数据转换规则

### 优先级映射

| 需求工作流 | 敏捷开发工作流 | 故事点建议 |
|-----------|---------------|-----------|
| critical | critical | 8-13 |
| high | high | 5-8 |
| medium | medium | 3-5 |
| low | low | 1-3 |

### 工时到故事点转换

```
1 故事点 ≈ 4 小时 ≈ 0.5 人天

示例:
- 需求工作流: estimatedEffort = "3 人天"
- 敏捷开发: storyPoints = 6 (3 人天 × 2 点/人天)
```

### 字段映射表

| 需求工作流字段 | 敏捷开发工作流字段 | 转换规则 |
|---------------|------------------|---------|
| functions[].id | requirements.id | 直接映射 |
| functions[].name | requirements.title | 直接映射 |
| functions[].description | requirements.description | 直接映射 |
| functions[].priority | requirements.priority | 直接映射 |
| implementations[].estimatedEffort | requirements.storyPoints | 公式转换 |
| implementations[].files | tasks[] | 拆分为任务 |
| implementations[].riskLevel | tasks.riskLevel | 直接映射 |

## 集成代码示例

### 方式一：自动转换

```javascript
const RequirementsWorkflow = require('C:/Users/zhang/.claude/workflows/requirements-engineering/workflow');
const ScrumWorkflow = require('C:/Users/zhang/.claude/workflows/scrum-development/workflow');

// 1. 执行需求工程工作流
const reqWorkflow = new RequirementsWorkflow();
const reqResult = await reqWorkflow.execute({
  mode: 'full-run',
  outputDir: 'D:/project',
  inputData: {
    customerNeeds: [...],
    technicalCharacteristics: [...]
  }
});

// 2. 转换需求格式
const requirements = convertToScrumFormat(reqResult.output.implementationPlan);

// 3. 执行敏捷开发工作流
const scrum = new ScrumWorkflow();
const scrumResult = await scrum.execute({
  mode: 'sprint-planning',
  sprintNumber: 1,
  outputDir: 'D:/project',
  inputData: {
    requirements,
    teamCapacity: 40,
    teamVelocity: 30
  }
});

// 转换函数
function convertToScrumFormat(implementationPlan) {
  return implementationPlan.implementations.map(impl => {
    // 解析工时字符串 "3 人天" -> 6 故事点
    const days = parseFloat(impl.estimatedEffort) || 1;
    const storyPoints = Math.ceil(days * 2);

    return {
      id: impl.requirement || impl.functionId,
      title: impl.functionName,
      description: impl.functionDescription || impl.functionName,
      priority: impl.priority,
      storyPoints: normalizeToFibonacci(storyPoints),
      category: inferCategory(impl.functionName),
      acceptanceCriteria: [],
      riskLevel: impl.riskLevel,
      files: impl.files
    };
  });
}

// 规范化到 Fibonacci 数列
function normalizeToFibonacci(points) {
  const fib = [1, 2, 3, 5, 8, 13, 21];
  return fib.reduce((prev, curr) =>
    Math.abs(curr - points) < Math.abs(prev - points) ? curr : prev
  );
}

// 推断类别
function inferCategory(functionName) {
  const name = functionName.toLowerCase();
  if (name.includes('驱动') || name.includes('硬件')) return 'hardware';
  if (name.includes('算法') || name.includes('处理')) return 'algorithm';
  if (name.includes('通信') || name.includes('协议')) return 'communication';
  if (name.includes('接口') || name.includes('API')) return 'api';
  return 'functionality';
}
```

### 方式二：从文件读取

```javascript
const fs = require('fs');
const path = require('path');

// 读取需求工作流输出
const reqOutputDir = 'D:/project/00_Project_Management/07_敏捷开发_Scrum';
const implementationPlan = JSON.parse(
  fs.readFileSync(path.join(reqOutputDir, 'implementation-plan.json'), 'utf-8')
);

// 转换并使用
const requirements = convertToScrumFormat(implementationPlan);
```

## 完整流程示例

```javascript
// 场景：从需求到第一个 Sprint

async function runFullPipeline() {
  // 步骤 1: 需求工程
  console.log('📋 步骤 1: 执行需求工程工作流...');
  const reqResult = await reqWorkflow.execute({
    mode: 'full-run',
    outputDir: 'D:/smart-home',
    inputData: {
      customerNeeds: [
        { original: '远程控制灯光', category: 'functionality', priority: 'high' },
        { original: '语音助手集成', category: 'functionality', priority: 'medium' }
      ],
      technicalCharacteristics: [
        { name: '响应时间', target: '<100ms', direction: 'lower-better' }
      ]
    }
  });

  // 步骤 2: 转换需求
  console.log('🔄 步骤 2: 转换需求格式...');
  const requirements = convertToScrumFormat(reqResult.output.implementationPlan);

  // 步骤 3: Sprint 1 计划
  console.log('📋 步骤 3: Sprint 1 计划...');
  const sprint1 = await scrum.execute({
    mode: 'sprint-planning',
    sprintNumber: 1,
    outputDir: 'D:/smart-home',
    inputData: {
      requirements,
      teamCapacity: 30,  // 3 人 × 10 天
      teamVelocity: 25
    }
  });

  // 步骤 4: 执行 Sprint (模拟每日例会)
  console.log('🏃 步骤 4: 执行 Sprint 1...');
  for (let day = 1; day <= 10; day++) {
    await scrum.execute({
      mode: 'daily-standup',
      sprintNumber: 1,
      date: `2026-06-${20 + day}`,
      outputDir: 'D:/smart-home'
    });
  }

  // 步骤 5: Sprint 评审
  console.log('🎯 步骤 5: Sprint 1 评审...');
  const review = await scrum.execute({
    mode: 'sprint-review',
    sprintNumber: 1,
    outputDir: 'D:/smart-home',
    inputData: {
      productDecision: 'approved'
    }
  });

  console.log('✅ 完成! 产品决策:', review.productDecision.decision);
}

runFullPipeline();
```

## 输出目录结构

```
D:/smart-home/
├── 00_Project_Management/
│   ├── 00_需求导入_QFD/
│   │   └── customer-needs.json/.md
│   ├── 01_需求约束_Pugh/
│   │   └── constraints.json/.md
│   ├── 02_需求转化_Basic_Statics/
│   │   └── status-assessment.json/.md
│   ├── 03_功能图谱_Function_Map/
│   │   └── function-map.json/.md/.mmd
│   ├── 07_敏捷开发_Scrum/
│   │   ├── implementation-plan.json/.md  ← 需求工作流输出
│   │   ├── Sprint-1_Planning/
│   │   │   └── sprint-plan.json/.md
│   │   ├── Sprint-1_Daily/
│   │   │   └── standup-2026-06-20.json/.md
│   │   ├── Sprint-1_Review/
│   │   │   └── review-report.json/.md
│   │   └── Sprint-1_Retrospective/
│   │       └── retrospective.json/.md
│   └── 08_持续集成与测试_DevOps/
│       └── acceptance-criteria.json/.md
```

## 注意事项

1. **优先级一致性**: 确保两个工作流使用相同的优先级定义
2. **故事点估算**: 需要根据团队实际情况调整工时到故事点的转换系数
3. **验收标准**: 需要从需求工作流的验收表中提取，并添加到用户故事
4. **依赖关系**: 需求工作流的功能依赖需要映射到 Sprint 任务的依赖
