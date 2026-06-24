# 应用软件开发管理工作流

## 概述

应用软件开发管理工作流用于管理应用软件开发全流程，包括架构设计、需求管理、发布管理和问题追踪。

## 目录结构

```
software-development/
├── workflow.js                    # 工作流入口
├── README.md                      # 说明文档
├── USAGE.md                       # 使用指南
├── modules/
│   ├── architecture-design.js     # 架构设计
│   ├── requirement-management.js  # 需求管理
│   ├── release-management.js      # 发布管理
│   └── issue-tracking.js          # 问题追踪
└── utils/
    ├── software-manager.js        # 软件数据管理
    └── json-validator.js          # JSON 验证
```

## 工作流阶段

| 阶段 | 模块 | 功能 |
|------|------|------|
| 1. 架构设计 | architecture-design | 分层架构、模块划分 |
| 2. 需求管理 | requirement-management | 功能需求、非功能需求 |
| 3. 发布管理 | release-management | 版本控制、发布计划 |
| 4. 问题追踪 | issue-tracking | Bug 追踪、功能请求 |

## 输出位置

所有输出文件位于项目目录的 `00_Project_Management/04_Software/` 下：

| 文件 | 说明 |
|------|------|
| `architecture-design/` | 架构设计文档 |
| `requirement-management/` | 需求管理 |
| `release-management/` | 发布记录 |
| `issue-tracking/` | 问题追踪 |

## 与其他工作流集成

```
需求工程 ─────→ 软件开发（功能需求 → 软件需求）
      ↓
软件开发 ─────→ 测试 CI/CD（软件测试）
      ↓
软件开发 ─────→ 固件开发（上位机软件 ↔ 固件接口）
```

## 快速开始

```javascript
const SoftwareWorkflow = require('C:/Users/zhang/.claude/workflows/software-development/workflow');

const workflow = new SoftwareWorkflow();

const result = await workflow.execute({
  mode: 'full-run',
  outputDir: 'D:/your/project/path',
  inputData: {
    product: { id: 'PROD-001', name: '智能传感器上位机' },
    layers: [
      { name: 'UI', description: '用户界面', type: 'ui' },
      { name: 'Service', description: '业务逻辑', type: 'business' }
    ],
    modules: [
      { name: 'DataPanel', type: 'frontend', layer: 'ui', language: 'TypeScript' },
      { name: 'SensorService', type: 'service', layer: 'business', language: 'TypeScript' }
    ],
    requirements: [
      { title: '实时数据展示', type: 'functional', priority: 'high' }
    ],
    releases: [
      { version: '1.0.0', status: 'released', description: '初始版本' }
    ],
    issues: [
      { title: '数据延迟', type: 'bug', priority: 'high', status: 'open' }
    ]
  }
});
```

## 详细文档

- [使用指南](USAGE.md) - 详细的 API 调用示例
