# 硬件设计管理工作流

## 概述

硬件设计管理工作流用于管理硬件设计全流程，包括设计规划、原理图管理、PCB 管理、BOM 管理和评审管理。

## 目录结构

```
hardware-design/
├── workflow.js                    # 工作流入口
├── README.md                      # 说明文档
├── USAGE.md                       # 使用指南
├── modules/
│   ├── design-planning.js         # 设计规划
│   ├── schematic-management.js    # 原理图管理
│   ├── pcb-management.js          # PCB 管理
│   ├── hardware-bom.js            # 硬件 BOM
│   └── review-management.js       # 评审管理
└── utils/
    ├── hardware-manager.js        # 硬件数据管理
    └── json-validator.js          # JSON 验证
```

## 工作流阶段

| 阶段 | 模块 | 功能 |
|------|------|------|
| 1. 设计规划 | design-planning | 硬件架构和组件选型 |
| 2. 原理图管理 | schematic-management | 原理图评审和版本管理 |
| 3. PCB 管理 | pcb-management | PCB 布局评审和版本管理 |
| 4. BOM 管理 | hardware-bom | 硬件物料清单管理 |
| 5. 评审管理 | review-management | 设计评审记录和问题跟踪 |

## 输出位置

所有输出文件位于项目目录的 `00_Project_Management/02_Hardware/` 下：

| 文件 | 说明 |
|------|------|
| `design-planning/` | 设计规划 |
| `schematic-management/` | 原理图管理 |
| `pcb-management/` | PCB 管理 |
| `hardware-bom/` | BOM 清单 |
| `review-management/` | 评审记录 |
| `records/` | 硬件设计记录 |

## 与其他工作流集成

```
需求工程 ─────→ 硬件设计（功能需求 → 硬件架构）
      ↓
DFMEA ─────────→ 硬件设计（风险控制要求）
      ↓
硬件设计 ─────→ 生产管理（BOM → 物料采购）
      ↓
硬件设计 ─────→ 测试 CI/CD（硬件测试用例）
```

## 快速开始

```javascript
const HardwareWorkflow = require('C:/Users/zhang/.claude/workflows/hardware-design/workflow');

const workflow = new HardwareWorkflow();

const result = await workflow.execute({
  mode: 'full-run',
  outputDir: 'D:/your/project/path',
  inputData: {
    product: { id: 'PROD-001', name: '智能传感器模块', version: '1.0' },
    requirements: { voltage: '3.3V', temperature: '-40°C to +85°C' },
    components: [
      { name: 'MCU', type: 'mcu', partNumber: 'STM32F103', supplier: 'ST', cost: 15 },
      { name: '温度传感器', type: 'sensor', partNumber: 'DS18B20', supplier: 'Maxim', cost: 5 }
    ],
    schematics: [{ name: '主控板', version: '1.0', pages: 2 }],
    pcbs: [{ name: '主控板 PCB', version: '1.0', layers: 4 }],
    bomItems: [
      { componentName: 'STM32F103', partNumber: 'STM32F103C8T6', quantity: 1, unitPrice: 15 },
      { componentName: 'DS18B20', partNumber: 'DS18B20', quantity: 2, unitPrice: 5 }
    ],
    reviews: [{ type: 'design', target: '主控板原理图', reviewer: '张三', result: 'passed' }]
  }
});
```

## 详细文档

- [使用指南](USAGE.md) - 详细的 API 调用示例
