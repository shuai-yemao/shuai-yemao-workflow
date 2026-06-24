# 固件开发管理工作流

## 概述

固件开发管理工作流用于管理嵌入式固件开发全流程，包括架构设计、版本控制、构建管理、测试集成和发布管理。

## 目录结构

```
firmware-development/
├── workflow.js                    # 工作流入口
├── README.md                      # 说明文档
├── USAGE.md                       # 使用指南
├── modules/
│   ├── architecture-design.js     # 架构设计
│   ├── version-control.js         # 版本控制
│   ├── build-management.js        # 构建管理
│   ├── test-integration.js        # 测试集成
│   └── release-management.js      # 发布管理
└── utils/
    ├── firmware-manager.js        # 固件数据管理
    └── json-validator.js          # JSON 验证
```

## 工作流阶段

| 阶段 | 模块 | 功能 |
|------|------|------|
| 1. 架构设计 | architecture-design | 硬件抽象层、驱动、中间件、应用 |
| 2. 版本控制 | version-control | 版本号管理、变更日志 |
| 3. 构建管理 | build-management | 编译配置、产物管理 |
| 4. 测试集成 | test-integration | 单元测试、集成测试 |
| 5. 发布管理 | release-management | 发布审批、部署 |

## 输出位置

所有输出文件位于项目目录的 `00_Project_Management/03_Firmware/` 下：

| 文件 | 说明 |
|------|------|
| `architecture-design/` | 架构设计文档 |
| `version-control/` | 版本管理 |
| `build-management/` | 构建记录 |
| `test-integration/` | 测试报告 |
| `release-management/` | 发布记录 |

## 与其他工作流集成

```
硬件设计 ─────→ 固件开发（硬件约束 → 固件架构）
      ↓
固件开发 ─────→ 测试 CI/CD（固件测试）
      ↓
固件开发 ─────→ 生产管理（固件烧录）
```

## 快速开始

```javascript
const FirmwareWorkflow = require('C:/Users/zhang/.claude/workflows/firmware-development/workflow');

const workflow = new FirmwareWorkflow();

const result = await workflow.execute({
  mode: 'full-run',
  outputDir: 'D:/your/project/path',
  inputData: {
    product: { id: 'PROD-001', name: '智能传感器模块', version: '1.0' },
    requirements: { mcu: 'STM32F103', clockSpeed: '72MHz', ram: '20KB', flash: '64KB' },
    modules: [
      { name: 'HAL', type: 'driver', layer: 'hal' },
      { name: 'Sensor Driver', type: 'driver', layer: 'driver', dependencies: ['HAL'] },
      { name: 'Application', type: 'application', layer: 'application', dependencies: ['Sensor Driver'] }
    ],
    releases: [
      { version: '1.0.0', status: 'released', description: '初始版本' }
    ]
  }
});
```

## 详细文档

- [使用指南](USAGE.md) - 详细的 API 调用示例
