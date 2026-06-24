# 机械设计管理工作流

## 概述

机械设计管理工作流用于管理机械零件设计和装配过程。

## 目录结构

```
mechanical-design/
├── workflow.js                    # 工作流入口
├── README.md                      # 说明文档
├── USAGE.md                       # 使用指南
├── modules/
│   ├── part-design.js             # 零件设计
│   └── assembly-management.js     # 装配管理
└── utils/
    ├── mechanical-manager.js      # 机械数据管理
    └── json-validator.js          # JSON 验证
```

## 工作流阶段

| 阶段 | 模块 | 功能 |
|------|------|------|
| 1. 零件设计 | part-design | 零件规格、材料、尺寸 |
| 2. 装配管理 | assembly-management | 装配体、BOM、装配指导 |

## 输出位置

所有输出文件位于项目目录的 `00_Project_Management/05_Mechanical/` 下：

| 文件 | 说明 |
|------|------|
| `part-design/` | 零件设计文档 |
| `assembly-management/` | 装配管理文档 |

## 快速开始

```javascript
const MechanicalWorkflow = require('C:/Users/zhang/.claude/workflows/mechanical-design/workflow');

const workflow = new MechanicalWorkflow();

const result = await workflow.execute({
  mode: 'full-run',
  outputDir: 'D:/your/project/path',
  inputData: {
    product: { id: 'PROD-001', name: '智能传感器模块' },
    parts: [
      { name: '外壳', type: 'enclosure', material: 'ABS', weight: 50, dimensions: { length: 100, width: 60, height: 30 } }
    ],
    assemblies: [
      { name: '传感器模块总成', parts: [{ partId: 'PART-001', quantity: 1 }] }
    ]
  }
});
```

## 详细文档

- [使用指南](USAGE.md) - 详细的 API 调用示例
