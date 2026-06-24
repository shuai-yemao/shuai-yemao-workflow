# Scrum 敏捷开发工作流 - 使用指南

## 快速开始

### 1. 确保需求已准备好

在使用 Scrum 工作流之前，请先运行需求工程工作流生成需求列表：

```javascript
const RequirementsWorkflow = require('C:/Users/zhang/.claude/workflows/requirements-engineering/workflow');

const reqWorkflow = new RequirementsWorkflow();
await reqWorkflow.execute({
  mode: 'full-run',
  outputDir: 'D:/your/project/path',
  inputData: {
    customerNeeds: [...],
    technicalCharacteristics: [...]
  }
});
```

### 2. 开始第一个 Sprint

#### 方式一：使用完整 Sprint 周期

```javascript
const ScrumWorkflow = require('C:/Users/zhang/.claude/workflows/scrum-development/workflow');

const scrum = new ScrumWorkflow();

// 完整执行一个 Sprint
const result = await scrum.execute({
  mode: 'full-sprint',
  sprintNumber: 1,
  outputDir: 'D:/your/project/path',
  inputData: {
    requirements: require('./00_Project_Management/07_敏捷开发_Scrum/implementation-plan.json'),
    teamCapacity: 40,  // 团队总工时（人天）
    teamVelocity: 30   // 历史速率（故事点）
  }
});
```

#### 方式二：分步执行

```javascript
// Step 1: Sprint 计划
const plan = await scrum.execute({
  mode: 'sprint-planning',
  sprintNumber: 1,
  outputDir: 'D:/your/project/path',
  inputData: {
    requirements: [...],
    teamCapacity: 40,
    teamVelocity: 30
  }
});

// Step 2: 每日例会（每天执行一次）
for (let day = 1; day <= 10; day++) {
  await scrum.execute({
    mode: 'daily-standup',
    sprintNumber: 1,
    date: `2026-06-${19 + day}`,
    outputDir: 'D:/your/project/path'
  });
}

// Step 3: Sprint 评审
const review = await scrum.execute({
  mode: 'sprint-review',
  sprintNumber: 1,
  outputDir: 'D:/your/project/path'
});

// Step 4: Sprint 回顾
const retro = await scrum.execute({
  mode: 'sprint-retrospective',
  sprintNumber: 1,
  outputDir: 'D:/your/project/path'
});
```

## 输入数据格式

### 需求列表 (requirements)

```json
{
  "requirements": [
    {
      "id": "REQ-001",
      "title": "用户登录功能",
      "description": "支持用户名密码登录",
      "priority": "high",
      "storyPoints": 5,
      "acceptanceCriteria": [
        "用户可以输入用户名和密码",
        "系统验证凭据正确性",
        "登录成功后跳转到首页"
      ]
    }
  ]
}
```

### 团队信息

```json
{
  "teamCapacity": 40,      // Sprint 总工时（人天）
  "teamVelocity": 30,      // 历史平均速率（故事点）
  "teamMembers": [
    {
      "name": "张三",
      "role": "frontend",
      "capacity": 10        // 个人工时（人天）
    },
    {
      "name": "李四",
      "role": "backend",
      "capacity": 10
    }
  ]
}
```

## 输出文件说明

### Sprint 计划 (sprint-plan.json)

```json
{
  "sprintNumber": 1,
  "sprintGoal": "完成用户认证模块",
  "startDate": "2026-06-20",
  "endDate": "2026-07-03",
  "totalStoryPoints": 28,
  "tasks": [
    {
      "id": "TASK-001",
      "title": "实现登录 API",
      "assignee": "李四",
      "storyPoints": 5,
      "status": "todo",
      "dependencies": []
    }
  ]
}
```

### 每日例会 (standup-2026-06-20.json)

```json
{
  "date": "2026-06-20",
  "sprintDay": 1,
  "members": [
    {
      "name": "张三",
      "yesterday": "无（Sprint 首日）",
      "today": "开始实现登录页面",
      "blockers": []
    }
  ],
  "burnDownData": {
    "remainingPoints": 28,
    "completedPoints": 0
  }
}
```

### Sprint 评审 (review-report.json)

```json
{
  "sprintNumber": 1,
  "completedTasks": 8,
  "totalTasks": 10,
  "completionRate": 0.8,
  "demoItems": [
    {
      "feature": "用户登录",
      "status": "completed",
      "feedback": "产品经理确认通过"
    }
  ],
  "productDecision": "通过",
  "feedback": [
    {
      "source": "产品经理",
      "content": "登录流程顺畅，可以发布",
      "action": "none"
    }
  ]
}
```

### Sprint 回顾 (retrospective.json)

```json
{
  "sprintNumber": 1,
  "goodPoints": [
    "团队协作顺畅",
    "每日例会效率高"
  ],
  "improvements": [
    {
      "area": "测试",
      "issue": "测试覆盖率不足",
      "action": "下个 Sprint 增加单元测试",
      "owner": "张三"
    }
  ],
  "actionItems": [
    {
      "task": "建立自动化测试框架",
      "assignee": "张三",
      "dueDate": "2026-07-03"
    }
  ]
}
```

## 高级用法

### 多 Sprint 执行

```javascript
// 执行 3 个 Sprint
const results = await scrum.execute({
  mode: 'multi-sprint',
  sprintCount: 3,
  startSprint: 1,
  outputDir: 'D:/your/project/path',
  inputData: {
    requirements: [...],
    teamCapacity: 40,
    teamVelocity: 30
  }
});
```

### 速率调整

工作流会根据每个 Sprint 的完成情况自动调整速率：

```javascript
// 自动调整速率
const scrum = new ScrumWorkflow({
  autoAdjustVelocity: true,
  velocityTrend: 'conservative'  // conservative | aggressive | average
});
```

### 与需求工程工作流集成

```javascript
// 完整流程：需求 → 开发
const reqResult = await reqWorkflow.execute({...});
const scrumResult = await scrum.execute({
  mode: 'full-sprint',
  inputData: {
    requirements: reqResult.output.implementationPlan,
    ...teamInfo
  }
});
```

## 常见问题

### Q: 如何处理 Sprint 中的需求变更？

A: 在每日例会中记录变更需求，在下个 Sprint 计划中评估和纳入。

### Q: 团队速率如何初始化？

A: 首个 Sprint 可以使用估算值，后续根据实际完成情况调整。

### Q: 如何处理跨 Sprint 的任务？

A: 未完成的任务会自动进入下个 Sprint 的 Backlog。

### Q: Sprint 周期应该是多长？

A: 推荐 2 周（10 个工作日），可根据项目实际情况调整。
