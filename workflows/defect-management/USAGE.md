# 缺陷管理跟踪工作流 - 使用指南

## 快速开始

### 1. 记录新缺陷

```javascript
const DefectManagement = require('C:/Users/zhang/.claude/workflows/defect-management/workflow');

const dm = new DefectManagement();

// 记录缺陷
const defect = await dm.execute({
  mode: 'log-defect',
  outputDir: 'D:/your/project',
  inputData: {
    title: '登录接口返回 500 错误',
    description: '当邮箱包含 "+" 字符时，登录返回 HTTP 500',
    type: 'defect',
    severity: 'critical',
    priority: 'high',
    source: 'testing',
    reporter: 'tester-1',
    reproduction: {
      steps: [
        '1. 准备包含 "+" 的邮箱地址',
        '2. 输入邮箱和密码',
        '3. 点击登录按钮'
      ],
      expected: '成功登录并跳转到首页',
      actual: 'HTTP 500 Internal Server Error',
      environment: 'staging',
      buildVersion: 'v1.2.3'
    }
  }
});

console.log('缺陷已创建:', defect.id);
```

### 2. 缺陷分类

```javascript
// 分类缺陷
const triage = await dm.execute({
  mode: 'triage',
  outputDir: 'D:/your/project',
  inputData: {
    defectId: defect.id,
    impactAnalysis: {
      affectedUsers: 100,
      affectedModules: ['auth', 'email'],
      businessImpact: 'high'
    }
  }
});

console.log('分类结果:', triage.classification);
console.log('分配建议:', triage.assignment);
```

### 3. 根因分析

```javascript
// 执行根因分析
const analysis = await dm.execute({
  mode: 'analyze',
  outputDir: 'D:/your/project',
  inputData: {
    defectId: defect.id,
    codeChanges: [
      { commit: 'abc1234', files: ['src/auth/login.c'], date: '2026-06-15' }
    ]
  }
});

console.log('根因:', analysis.rootCause);
console.log('改进建议:', analysis.recommendations);
```

### 4. 执行修复

```javascript
// 修复缺陷
const fix = await dm.execute({
  mode: 'fix',
  outputDir: 'D:/your/project',
  inputData: {
    defectId: defect.id,
    fixMethod: 'fix',
    fixDescription: '使用 URL 编码处理邮箱特殊字符',
    fixedBy: 'developer-1',
    regressionTestAdded: true,
    codeReview: {
      reviewer: 'reviewer-1',
      approved: true,
      comments: '修复方案合理'
    }
  }
});

console.log('修复状态:', fix.status);
```

### 5. 验证修复

```javascript
// 验证修复
const verification = await dm.execute({
  mode: 'verify',
  outputDir: 'D:/your/project',
  inputData: {
    defectId: defect.id,
    verifiedBy: 'tester-1',
    verificationResults: [
      { step: '复现步骤不再触发问题', result: 'pass' },
      { step: '回归测试全部通过', result: 'pass' },
      { step: '无新问题引入', result: 'pass' }
    ]
  }
});

console.log('验证结果:', verification.result);
```

### 6. 生成仪表盘

```javascript
// 生成缺陷仪表盘
const dashboard = await dm.execute({
  mode: 'dashboard',
  outputDir: 'D:/your/project',
  inputData: {
    sprintNumber: 1,
    dateRange: {
      start: '2026-06-01',
      end: '2026-06-30'
    }
  }
});

console.log('缺陷统计:', dashboard.summary);
console.log('趋势数据:', dashboard.trends);
```

### 7. 执行改进流程

```javascript
// 执行 DMAIC 改进
const improvement = await dm.execute({
  mode: 'improvement',
  outputDir: 'D:/your/project',
  inputData: {
    rootCauseAnalysis: analysis,
    improvementActions: [
      {
        action: '添加邮箱格式验证',
        owner: 'developer-1',
        dueDate: '2026-07-15'
      },
      {
        action: '更新编码规范',
        owner: 'tech-lead',
        dueDate: '2026-07-20'
      }
    ]
  }
});

console.log('改进计划:', improvement.plan);
```

## 输入数据格式

### 缺陷信息

```json
{
  "title": "登录接口返回 500 错误",
  "description": "详细描述...",
  "type": "defect",
  "severity": "critical",
  "priority": "high",
  "source": "testing",
  "reporter": "tester-1",
  "reproduction": {
    "steps": ["步骤1", "步骤2"],
    "expected": "预期结果",
    "actual": "实际结果",
    "environment": "staging",
    "buildVersion": "v1.2.3"
  }
}
```

### 根因分析

```json
{
  "defectId": "BUG-001",
  "rootCause": {
    "category": "code-defect",
    "description": "邮箱解析未处理 '+' 字符",
    "affectedFiles": ["src/auth/login.c"],
    "relatedCommit": "abc1234"
  },
  "fiveWhyAnalysis": [
    "为什么返回 500？因为邮箱解析出错",
    "为什么邮箱解析出错？因为未处理 '+' 字符",
    "为什么未处理？因为编码规范未覆盖",
    "为什么规范未覆盖？因为历史遗留问题",
    "为什么是遗留问题？因为早期设计不完善"
  ]
}
```

## 输出文件说明

### 缺陷记录 (defect-BUG-001.json)

```json
{
  "id": "BUG-001",
  "title": "登录接口返回 500 错误",
  "description": "当邮箱包含 '+' 字符时...",
  "type": "defect",
  "severity": "critical",
  "priority": "high",
  "status": "open",
  "source": "testing",
  "reporter": "tester-1",
  "assignee": null,
  "createdAt": "2026-06-20T10:00:00Z",
  "updatedAt": "2026-06-20T10:00:00Z",
  "reproduction": {...},
  "rootCause": null,
  "resolution": null,
  "links": {
    "relatedRequirements": ["REQ-001"],
    "relatedTests": ["TEST-001"]
  }
}
```

### 缺陷仪表盘 (defect-dashboard.json)

```json
{
  "sprintNumber": 1,
  "summary": {
    "total": 15,
    "byStatus": {
      "open": 5,
      "in-progress": 3,
      "resolved": 5,
      "closed": 2
    },
    "bySeverity": {
      "critical": 1,
      "major": 4,
      "minor": 8,
      "trivial": 2
    },
    "avgResolutionTime": "2.3 天",
    "escapeRate": 0.15
  },
  "trends": {
    "newVsResolved": [
      { "date": "2026-06-20", "new": 3, "resolved": 1 },
      { "date": "2026-06-21", "new": 2, "resolved": 3 }
    ]
  }
}
```

## 与 Scrum 工作流集成

### 将缺陷纳入 Sprint

```javascript
const ScrumWorkflow = require('C:/Users/zhang/.claude/workflows/scrum-development/workflow');
const DefectManagement = require('C:/Users/zhang/.claude/workflows/defect-management/workflow');

const scrum = new ScrumWorkflow();
const dm = new DefectManagement();

// 获取高优先级缺陷
const criticalDefects = await dm.execute({
  mode: 'dashboard',
  inputData: { filterByPriority: 'critical' }
});

// 纳入 Sprint 计划
await scrum.execute({
  mode: 'sprint-planning',
  inputData: {
    requirements: [...],
    defects: criticalDefects.defects  // 添加缺陷作为任务
  }
});
```

### 更新缺陷状态

```javascript
// 当 Scrum 任务完成时，更新缺陷状态
await dm.execute({
  mode: 'fix',
  inputData: {
    defectId: 'BUG-001',
    fixedBy: 'developer-1',
    linkedTaskId: 'TASK-US-001'  // 关联 Scrum 任务
  }
});
```

## 与测试工作流集成

### 测试失败自动创建缺陷

```javascript
const TestingCICD = require('C:/Users/zhang/.claude/workflows/testing-cicd/workflow');
const DefectManagement = require('C:/Users/zhang/.claude/workflows/defect-management/workflow');

const cicd = new TestingCICD();
const dm = new DefectManagement();

// 执行测试
const testResult = await cicd.execute({
  mode: 'test-only',
  outputDir: 'D:/project'
});

// 自动创建缺陷
if (testResult.results.unitTesting.failures.length > 0) {
  for (const failure of testResult.results.unitTesting.failures) {
    await dm.execute({
      mode: 'log-defect',
      inputData: {
        title: `测试失败: ${failure.name}`,
        description: failure.message,
        source: 'testing',
        severity: 'major',
        reproduction: {
          steps: [`运行测试: ${failure.name}`],
          expected: '测试通过',
          actual: failure.message
        }
      }
    });
  }
}
```

## 常见问题

### Q: 如何处理重复缺陷？

A: 使用 `links.duplicateOf` 字段关联重复缺陷，系统会自动合并统计。

### Q: 如何处理无法复现的缺陷？

A: 将状态设置为 `deferred`，并记录复现尝试，等待更多信息。

### Q: 如何追踪缺陷逃逸率？

A: 仪表盘会自动计算缺陷逃逸率 = 测试后发现的缺陷 / 总缺陷。

### Q: 如何与 Jira 同步？

A: 使用 `sync-jira` 模式，配置 Jira API 凭据即可同步。

### Q: 如何生成质量报告？

A: 使用 `dashboard` 模式，会生成完整的缺陷统计和趋势分析。
