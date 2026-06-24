# 工厂测试工作流

## 概述

工厂测试工作流用于管理工厂测试规划和执行，确保产品质量。

## 目录结构

```
factory-test/
├── workflow.js                    # 工作流入口
├── README.md                      # 说明文档
├── USAGE.md                       # 使用指南
├── modules/
│   ├── test-planning.js           # 测试规划
│   └── test-execution.js          # 测试执行
└── utils/
    ├── factory-test-manager.js    # 工厂测试数据管理
    └── json-validator.js          # JSON 验证
```

## 工作流阶段

| 阶段 | 模块 | 功能 |
|------|------|------|
| 1. 测试规划 | test-planning | 测试用例、设备、标准 |
| 2. 测试执行 | test-execution | 测试运行、结果、缺陷 |

## 测试类型

| 类型 | 说明 |
|------|------|
| ICT | 在线测试 |
| FCT | 功能测试 |
| burn-in | 老化测试 |
| environmental | 环境测试 |
| visual | 目检 |

## 输出位置

所有输出文件位于项目目录的 `00_Project_Management/06_Factory/` 下：

| 文件 | 说明 |
|------|------|
| `test-planning/` | 测试规划 |
| `test-execution/` | 测试执行报告 |

## 快速开始

```javascript
const FactoryTestWorkflow = require('C:/Users/zhang/.claude/workflows/factory-test/workflow');

const workflow = new FactoryTestWorkflow();

const result = await workflow.execute({
  mode: 'full-run',
  outputDir: 'D:/your/project/path',
  inputData: {
    product: { id: 'PROD-001', name: '智能传感器模块' },
    testCases: [
      { name: '功能测试', type: 'fct', duration: 5, equipment: ['万用表', '示波器'] }
    ],
    testRuns: [
      { testCaseName: '功能测试', serialNumber: 'SN001', operator: '张三', result: 'pass' }
    ]
  }
});
```

## 详细文档

- [使用指南](USAGE.md) - 详细的 API 调用示例
