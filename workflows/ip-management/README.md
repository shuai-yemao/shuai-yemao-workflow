# 知识产权管理工作流

## 概述

知识产权管理工作流用于管理产品的专利、商标和版权，保护创新成果。

## 目录结构

```
ip-management/
├── workflow.js                    # 工作流入口
├── README.md                      # 说明文档
├── USAGE.md                       # 使用指南
├── modules/
│   ├── patent-management.js       # 专利管理
│   ├── trademark-management.js    # 商标管理
│   └── copyright-management.js    # 版权管理
└── utils/
    ├── ip-manager.js              # 知识产权数据管理
    └── json-validator.js          # JSON 验证
```

## 工作流阶段

| 阶段 | 模块 | 功能 |
|------|------|------|
| 1. 专利管理 | patent-management | 发明、实用新型、外观设计专利 |
| 2. 商标管理 | trademark-management | 文字、图形、组合商标 |
| 3. 版权管理 | copyright-management | 软件、文档、设计版权 |

## 输出位置

所有输出文件位于项目目录的 `00_Project_Management/06_知识产权/` 下：

| 文件 | 说明 |
|------|------|
| `patent-management/` | 专利管理 |
| `trademark-management/` | 商标管理 |
| `copyright-management/` | 版权管理 |

## 快速开始

```javascript
const IpWorkflow = require('C:/Users/zhang/.claude/workflows/ip-management/workflow');

const workflow = new IpWorkflow();

const result = await workflow.execute({
  mode: 'full-run',
  outputDir: 'D:/your/project/path',
  inputData: {
    product: { id: 'PROD-001', name: '智能传感器模块' },
    patents: [
      { title: '一种基于物联网的传感器数据采集方法', type: 'invention', inventors: ['张三'] }
    ],
    trademarks: [
      { name: 'SmartSensor', category: 'text', classes: ['09', '42'] }
    ],
    copyrights: [
      { title: 'SmartSensor 嵌入式软件 V1.0', type: 'software', author: '公司' }
    ]
  }
});
```

## 详细文档

- [使用指南](USAGE.md) - 详细的 API 调用示例
