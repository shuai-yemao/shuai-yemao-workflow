# 产品生产管理工作流

一套简洁实用的生产管理工作流，专为小批量试产场景设计，支持模块化产品的生产管理。

## 概述

本工作流覆盖核心生产管理流程：

```
BOM 管理 → 库存追踪 → 生产排产 → 质量检查
```

## 位置

`~/.claude/workflows/production-management/`

## 文件结构

```
~/.claude/workflows/production-management/
├── workflow.js                    # 工作流入口
├── README.md                      # 说明文档
├── USAGE.md                       # 使用指南
├── modules/
│   ├── bom-management.js          # BOM 物料清单管理
│   ├── inventory-tracking.js      # 库存追踪
│   ├── production-planning.js     # 生产排产计划
│   └── quality-control.js         # 质量检查
└── utils/
    └── json-validator.js          # JSON 验证
```

## 工作流阶段

### 阶段 1: BOM 管理 (bom-management)

**功能：** 管理产品物料清单

**输入：**
- 产品设计文档
- 物料信息
- 模块定义

**输出：**
- BOM 清单 (bom.json/.md)
- 成本汇总
- 物料需求

### 阶段 2: 库存追踪 (inventory-tracking)

**功能：** 追踪原材料、在制品、成品库存

**输入：**
- BOM 清单
- 出入库记录

**输出：**
- 库存状态 (inventory-status.json/.md)
- 预警信息
- 采购建议

### 阶段 3: 生产排产 (production-planning)

**功能：** 根据订单和产能安排生产计划

**输入：**
- 订单列表
- 产能数据
- 物料可用性

**输出：**
- 排产计划 (production-plan.json/.md)
- 甘特图数据

### 阶段 4: 质量检查 (quality-control)

**功能：** 执行质量检查和记录

**输入：**
- 生产批次
- 检查标准

**输出：**
- 质量报告 (quality-report.json/.md)
- 不良品记录

## 输出位置

| 文档 | 输出目录 | 文件名 |
|------|----------|--------|
| BOM 清单 | `00_Project_Management/09_产品生产管理_Six_Sigma/bom/` | `bom-{product}.json/.md` |
| 库存状态 | `00_Project_Management/09_产品生产管理_Six_Sigma/inventory/` | `inventory-status.json/.md` |
| 排产计划 | `00_Project_Management/09_产品生产管理_Six_Sigma/planning/` | `production-plan.json/.md` |
| 质量报告 | `00_Project_Management/09_产品生产管理_Six_Sigma/quality/` | `quality-report.json/.md` |

## 使用方法

```javascript
const ProductionManagement = require('C:/Users/zhang/.claude/workflows/production-management/workflow');

const pm = new ProductionManagement();

// 完整执行
const result = await pm.execute({
  mode: 'full-run',
  outputDir: 'D:/your/project/path',
  inputData: {
    product: {
      id: 'PROD-001',
      name: '智能传感器模块',
      modules: [...]
    },
    batchSize: 50
  }
});

// 仅 BOM 管理
await pm.execute({
  mode: 'bom-only',
  outputDir: 'D:/your/project/path',
  inputData: { product: {...} }
});

// 生产排产
await pm.execute({
  mode: 'plan-production',
  outputDir: 'D:/your/project/path',
  inputData: {
    orderId: 'ORD-001',
    quantity: 50
  }
});
```

## 执行模式

- **full-run**: 完整执行所有模块
- **bom-only**: 仅执行 BOM 管理
- **inventory-check**: 库存检查和预警
- **plan-production**: 生产排产
- **quality-audit**: 质量审计
- **daily-report**: 每日生产报告
- **single**: 单独执行某个模块

## 与现有工作流集成

```
需求工程工作流 ─────→ BOM 管理（功能图谱 → 物料需求）
                          ↓
测试与 CI/CD ───────→ 质量检查（测试通过 → 生产准备）
                          ↓
生产管理工作流 ─────→ 生产执行（BOM + 排产 + 质量）
```

## 设计原则

- **KISS**: 保持简单，不过度设计
- **渐进式**: 先实现核心，后续扩展
- **实用性**: 适合小批量试产场景
- **不可变数据**: 物料信息、订单状态不原地修改
