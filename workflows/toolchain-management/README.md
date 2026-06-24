# 工具链管理工作流

## 概述

工具链管理工作流用于管理项目开发工具清单、配置和版本，确保团队工具环境一致性。

## 目录结构

```
toolchain-management/
├── workflow.js                    # 工作流入口
├── README.md                      # 说明文档
├── USAGE.md                       # 使用指南
├── modules/
│   ├── tool-inventory.js          # 工具清单
│   ├── configuration-management.js # 配置管理
│   └── version-management.js      # 版本管理
└── utils/
    ├── toolchain-manager.js       # 工具链数据管理
    └── json-validator.js          # JSON 验证
```

## 工作流阶段

| 阶段 | 模块 | 功能 |
|------|------|------|
| 1. 工具清单 | tool-inventory | IDE、编译器、调试器等工具登记 |
| 2. 配置管理 | configuration-management | 工具配置导出和同步 |
| 3. 版本管理 | version-management | 工具版本升级记录 |

## 工具类别

| 类别 | 说明 |
|------|------|
| ide | 集成开发环境 |
| compiler | 编译器 |
| debugger | 调试器 |
| vcs | 版本控制系统 |
| build | 构建工具 |
| test | 测试工具 |
| deploy | 部署工具 |
| utility | 实用工具 |

## 输出位置

所有输出文件位于项目目录的 `00_Project_Management/07_Tools/` 下：

| 文件 | 说明 |
|------|------|
| `tool-inventory/` | 工具清单 |
| `configuration-management/` | 配置管理 |
| `version-management/` | 版本管理 |

## 快速开始

```javascript
const ToolchainWorkflow = require('C:/Users/zhang/.claude/workflows/toolchain-management/workflow');

const workflow = new ToolchainWorkflow();

const result = await workflow.execute({
  mode: 'full-run',
  outputDir: 'D:/your/project/path',
  inputData: {
    project: { id: 'PROJ-001', name: '智能传感器项目' },
    tools: [
      { name: 'VS Code', category: 'ide', version: '1.85.0', vendor: 'Microsoft', license: 'MIT' },
      { name: 'GCC', category: 'compiler', version: '12.2.0', vendor: 'GNU' }
    ],
    configurations: [
      { name: 'VS Code 配置', tool: 'VS Code', type: 'editor', settings: { theme: 'Dark+', extensions: [...] } }
    ],
    records: [
      { toolName: 'VS Code', previousVersion: '1.84.0', currentVersion: '1.85.0', upgradedBy: '张三' }
    ]
  }
});
```

## 详细文档

- [使用指南](USAGE.md) - 详细的 API 调用示例
