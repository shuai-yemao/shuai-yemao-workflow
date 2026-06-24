# DFMEA 管理工作流

## 概述

DFMEA（Design Failure Mode and Effects Analysis，设计失效模式与影响分析）工作流用于产品功能风险管控，支持完整的 DFMEA 流程，包括功能分析、风险评估、改进措施制定和跟踪验证。

## 目录结构

```
dfmea-management/
├── workflow.js                    # 工作流入口
├── README.md                      # 说明文档
├── USAGE.md                       # 使用指南
├── modules/
│   ├── function-analysis.js       # 功能分析
│   ├── risk-assessment.js         # 风险评估
│   ├── improvement-actions.js     # 改进措施
│   └── tracking-verification.js   # 跟踪验证
└── utils/
    ├── dfmea-manager.js           # DFMEA 数据管理
    └── json-validator.js          # JSON 验证
```

## 工作流阶段

| 阶段 | 模块 | 功能 |
|------|------|------|
| 1. 功能分析 | function-analysis | 识别产品功能和失效模式 |
| 2. 风险评估 | risk-assessment | 计算 RPN（风险优先数） |
| 3. 改进措施 | improvement-actions | 制定降低风险的措施 |
| 4. 跟踪验证 | tracking-verification | 跟踪措施执行和效果验证 |

## 核心概念

### RPN（Risk Priority Number，风险优先数）

RPN 是衡量风险严重程度的指标，计算公式为：

```
RPN = 严重度(S) × 发生度(O) × 检测度(D)
```

- **严重度 (Severity, S)**: 失效影响的严重程度 (1-10)
- **发生度 (Occurrence, O)**: 失效发生的频率 (1-10)
- **检测度 (Detection, D)**: 失效被检测到的难易程度 (1-10)

### 风险等级

| RPN 范围 | 风险等级 | 颜色 | 行动建议 |
|----------|----------|------|----------|
| ≥ 200 | 高 | 红色 | 必须立即采取措施 |
| 100-199 | 中 | 橙色 | 应采取措施降低风险 |
| 50-99 | 低 | 黄色 | 可考虑采取措施 |
| < 50 | 极低 | 绿色 | 接受风险 |

## 输出位置

所有输出文件位于项目目录的 `00_Project_Management/05_功能风险管控_DFMEA/` 下：

| 文件 | 说明 |
|------|------|
| `function-analysis/function-analysis.json/.md` | 功能分析结果 |
| `risk-assessment/risk-assessment.json/.md` | 风险评估结果 |
| `improvement-actions/improvement-actions.json/.md` | 改进措施 |
| `tracking-verification/tracking-verification.json/.md` | 跟踪验证 |
| `records/DFMEA-XXX.json` | DFMEA 记录 |

## 与其他工作流集成

```
需求工程 ─────→ DFMEA（功能图谱 → 功能识别）
      ↓
DFMEA ─────────→ 硬件设计（风险控制要求）
      ↓
DFMEA ─────────→ 测试 CI/CD（测试用例设计）
```

## 快速开始

```javascript
const DfmeaWorkflow = require('C:/Users/zhang/.claude/workflows/dfmea-management/workflow');

const workflow = new DfmeaWorkflow();

// 完整执行
const result = await workflow.execute({
  mode: 'full-run',
  outputDir: 'D:/your/project/path',
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

## 详细文档

- [使用指南](USAGE.md) - 详细的 API 调用示例
