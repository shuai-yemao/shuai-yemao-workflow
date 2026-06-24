# 法规认证工作流

## 概述

法规认证工作流用于管理产品认证流程，支持法规识别、合规评估、认证规划、文档准备和追踪管理。

## 目录结构

```
compliance-certification/
├── workflow.js                    # 工作流入口
├── README.md                      # 说明文档
├── USAGE.md                       # 使用指南
├── modules/
│   ├── regulation-identification.js   # 法规识别
│   ├── compliance-assessment.js       # 合规评估
│   ├── certification-planning.js      # 认证规划
│   ├── documentation-preparation.js   # 文档准备
│   └── tracking-management.js         # 追踪管理
└── utils/
    ├── certification-manager.js       # 认证数据管理
    └── json-validator.js              # JSON 验证
```

## 工作流阶段

| 阶段 | 模块 | 功能 |
|------|------|------|
| 1. 法规识别 | regulation-identification | 识别适用法规和标准 |
| 2. 合规评估 | compliance-assessment | 评估当前合规状态 |
| 3. 认证规划 | certification-planning | 制定认证计划和时间表 |
| 4. 文档准备 | documentation-preparation | 准备认证所需文档 |
| 5. 追踪管理 | tracking-management | 追踪认证进度和证书状态 |

## 支持的地区和法规

| 地区 | 主要法规 |
|------|----------|
| CN | CCC、SRRC、NAL、CQC |
| EU | CE、RED、RoHS、REACH、WEEE |
| US | FCC、UL、ETL、DOE |
| JP | PSE、TELEC、VCCI |
| KR | KC、KCC |

## 输出位置

所有输出文件位于项目目录的 `00_Project_Management/04_法规认证/` 下：

| 文件 | 说明 |
|------|------|
| `regulation-identification/` | 法规识别结果 |
| `compliance-assessment/` | 合规评估结果 |
| `certification-planning/` | 认证计划 |
| `documentation-preparation/` | 文档清单 |
| `tracking-management/` | 追踪状态 |
| `records/` | 认证记录 |

## 与其他工作流集成

```
需求工程 ─────→ 法规识别（产品特性 → 适用法规）
      ↓
法规认证 ─────→ 测试 CI/CD（认证测试要求）
      ↓
法规认证 ─────→ 生产管理（认证标志管理）
```

## 快速开始

```javascript
const ComplianceWorkflow = require('C:/Users/zhang/.claude/workflows/compliance-certification/workflow');

const workflow = new ComplianceWorkflow();

const result = await workflow.execute({
  mode: 'full-run',
  outputDir: 'D:/your/project/path',
  inputData: {
    product: { id: 'PROD-001', name: '智能传感器模块', version: '1.0' },
    regions: ['CN', 'EU'],
    hasWireless: true,
    hasBattery: false,
    targetDate: '2025-12-31'
  }
});
```

## 详细文档

- [使用指南](USAGE.md) - 详细的 API 调用示例
