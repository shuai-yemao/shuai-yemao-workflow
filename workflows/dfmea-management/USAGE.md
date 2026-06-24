# DFMEA 管理工作流使用指南

## 概述

本文档提供 DFMEA 管理工作流的详细使用示例。

## 执行模式

### 1. 完整执行 (full-run)

执行所有阶段：功能分析 → 风险评估 → 改进措施 → 跟踪验证

```javascript
const DfmeaWorkflow = require('C:/Users/zhang/.claude/workflows/dfmea-management/workflow');

const workflow = new DfmeaWorkflow();

const result = await workflow.execute({
  mode: 'full-run',
  outputDir: 'D:/project/path',
  inputData: {
    product: {
      id: 'PROD-001',
      name: '智能传感器模块',
      version: '1.0'
    },
    functions: [
      {
        name: '温度测量',
        description: '测量环境温度',
        failureModes: [
          {
            description: '测量值偏差过大',
            effects: [{ severity: 7, description: '产品功能失效' }],
            causes: [{ occurrence: 3, description: '传感器老化' }],
            currentControls: [{ detection: 4, description: '出厂校准' }]
          }
        ]
      }
    ],
    responsible: '张三',
    deadline: '2025-06-30'
  }
});
```

### 2. 功能分析 (function-analysis)

仅执行功能分析阶段

```javascript
const result = await workflow.execute({
  mode: 'function-analysis',
  outputDir: 'D:/project/path',
  inputData: {
    product: {
      id: 'PROD-001',
      name: '智能传感器模块',
      version: '1.0'
    },
    functions: [
      {
        name: '温度测量',
        description: '测量环境温度',
        failureModes: [
          {
            description: '测量值偏差过大',
            effects: [{ severity: 7, description: '产品功能失效' }],
            causes: [{ occurrence: 3, description: '传感器老化' }],
            currentControls: [{ detection: 4, description: '出厂校准' }]
          }
        ]
      }
    ]
  }
});
```

### 3. 风险评估 (risk-assessment)

仅执行风险评估阶段

```javascript
const result = await workflow.execute({
  mode: 'risk-assessment',
  outputDir: 'D:/project/path',
  inputData: {
    product: {
      id: 'PROD-001',
      name: '智能传感器模块'
    },
    assessments: [
      {
        functionId: 'FUNC-001',
        functionName: '温度测量',
        failureModeId: 'FM-001',
        failureMode: '测量值偏差过大',
        severity: 7,
        occurrence: 3,
        detection: 4
      }
    ]
  }
});
```

### 4. 改进措施 (improvement)

仅执行改进措施制定

```javascript
const result = await workflow.execute({
  mode: 'improvement',
  outputDir: 'D:/project/path',
  inputData: {
    product: {
      id: 'PROD-001',
      name: '智能传感器模块'
    },
    actions: [
      {
        failureModeId: 'FM-001',
        failureMode: '测量值偏差过大',
        functionName: '温度测量',
        description: '增加定期校准机制',
        responsible: '李四',
        deadline: '2025-06-30',
        currentSeverity: 7,
        currentOccurrence: 3,
        currentDetection: 4,
        targetSeverity: 7,
        targetOccurrence: 2,
        targetDetection: 2
      }
    ]
  }
});
```

### 5. 跟踪验证 (tracking)

仅执行跟踪验证

```javascript
const result = await workflow.execute({
  mode: 'tracking',
  outputDir: 'D:/project/path',
  inputData: {
    product: {
      id: 'PROD-001',
      name: '智能传感器模块'
    },
    actions: [
      {
        id: 'ACT-001',
        failureModeId: 'FM-001',
        failureMode: '测量值偏差过大',
        functionName: '温度测量',
        description: '增加定期校准机制',
        responsible: '李四',
        deadline: '2025-06-30',
        status: 'in-progress',
        progress: 50,
        currentRpn: { severity: 7, occurrence: 3, detection: 4, total: 84 },
        targetRpn: { severity: 7, occurrence: 2, detection: 2, total: 28 }
      }
    ]
  }
});
```

### 6. 单独执行模块 (single)

执行指定的单个模块

```javascript
const result = await workflow.execute({
  mode: 'single',
  module: 'function-analysis', // 或其他模块名
  outputDir: 'D:/project/path',
  inputData: { ... }
});
```

### 7. 更新 RPN (update-rpn)

更新特定失效模式的 RPN 值

```javascript
const result = await workflow.execute({
  mode: 'update-rpn',
  outputDir: 'D:/project/path',
  inputData: {
    dfmeaId: 'DFMEA-001',
    functionId: 'FUNC-001',
    failureModeId: 'FM-001',
    severity: 8,
    occurrence: 2,
    detection: 3
  }
});
```

### 8. 获取统计信息 (statistics)

获取 DFMEA 统计数据

```javascript
const result = await workflow.execute({
  mode: 'statistics',
  outputDir: 'D:/project/path',
  inputData: {
    dfmeaId: 'DFMEA-001' // 可选，不传则统计所有
  }
});
```

## 输出格式

### JSON 输出

```json
{
  "id": "DFMEA-001",
  "product": {
    "id": "PROD-001",
    "name": "智能传感器模块",
    "version": "1.0"
  },
  "functions": [
    {
      "id": "FUNC-001",
      "name": "温度测量",
      "description": "测量环境温度",
      "failureModes": [
        {
          "id": "FM-001",
          "description": "测量值偏差过大",
          "effects": [
            { "severity": 7, "description": "产品功能失效" }
          ],
          "causes": [
            { "occurrence": 3, "description": "传感器老化" }
          ],
          "currentControls": [
            { "detection": 4, "description": "出厂校准" }
          ],
          "rpn": {
            "severity": 7,
            "occurrence": 3,
            "detection": 4,
            "total": 84
          },
          "status": "open"
        }
      ]
    }
  ],
  "metadata": {
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
}
```

### Markdown 输出

工作流会自动生成 Markdown 格式的报告，包含：
- 摘要统计
- 风险矩阵
- 详细的功能和失效模式列表
- 改进措施和跟踪状态

## 与其他工作流集成

### 从需求工程获取输入

```javascript
const RequirementsWorkflow = require('C:/Users/zhang/.claude/workflows/requirements-engineering/workflow');
const DfmeaWorkflow = require('C:/Users/zhang/.claude/workflows/dfmea-management/workflow');

// 1. 执行需求工程工作流
const reqResult = await new RequirementsWorkflow().execute({
  mode: 'full-run',
  outputDir: 'D:/project/path',
  inputData: { ... }
});

// 2. 将功能图谱转换为 DFMEA 输入
const dfmeaInput = {
  product: { ... },
  functions: reqResult.results.functionMap.functions.map(func => ({
    name: func.name,
    description: func.description,
    failureModes: [] // 需要用户补充
  }))
};

// 3. 执行 DFMEA 工作流
const dfmeaResult = await new DfmeaWorkflow().execute({
  mode: 'full-run',
  outputDir: 'D:/project/path',
  inputData: dfmeaInput
});
```

### 为硬件设计提供输入

```javascript
// DFMEA 结果可以作为硬件设计的风险控制输入
const hardwareInput = {
  riskControls: dfmeaResult.results.improvementActions.actions
    .filter(a => a.actionType === 'design')
    .map(a => ({
      failureMode: a.failureMode,
      requirement: a.description,
      priority: a.priority
    }))
};
```

### 为测试提供输入

```javascript
// DFMEA 结果可以指导测试用例设计
const testInput = {
  riskBasedTests: dfmeaResult.results.riskAssessment.assessments
    .filter(a => a.rpn.total >= 100)
    .map(a => ({
      scenario: a.failureMode,
      severity: a.rpn.severity,
      priority: a.rpn.total >= 200 ? 'critical' : 'high'
    }))
};
```

## 常见问题

### Q: RPN 的阈值如何设置？

A: 建议的阈值：
- RPN ≥ 200: 必须立即采取措施
- 100 ≤ RPN < 200: 应采取措施
- 50 ≤ RPN < 100: 可考虑采取措施
- RPN < 50: 接受风险

可以根据项目实际情况调整这些阈值。

### Q: 如何处理多个失效模式？

A: 建议按 RPN 降序处理，优先处理高风险项。工作流会自动按风险等级分组显示。

### Q: 如何跟踪改进措施的执行情况？

A: 使用 `tracking` 模式，传入包含 `status`、`progress`、`deadline` 等字段的措施数据。工作流会自动计算进度、检查逾期、验证效果。

### Q: 可以只执行部分阶段吗？

A: 可以。使用 `single` 模式并指定模块名，或直接使用对应的模式（如 `function-analysis`）。
