# 文档写作与处理工作流

## 概述

通用文档写作与处理工作流，覆盖从内容研究、写作到格式输出的全流程。可被所有业务/技术工作流调用，输出各类文档。

## 目录结构

```
document-writing/
├── workflow.js                    # 主入口
├── modules/
│   ├── document-router.js         # 文档类型路由
│   ├── content-research.js        # 内容研究
│   ├── document-writer.js         # 核心写作引擎
│   ├── template-engine.js         # 模板引擎
│   ├── format-processor.js        # 格式转换
│   └── document-reviewer.js       # 质量审查
├── utils/
│   ├── doc-manager.js             # 文档管理
│   └── json-validator.js          # 数据验证
├── templates/
│   ├── survey-report.md           # 调查报告模板
│   ├── product-guide.md           # 产品指南模板
│   ├── business-plan.md           # 商业计划书模板
│   ├── meeting-report.md          # 会议报告模板
│   └── weekly-report.md           # 周报模板
├── README.md                      # 本文件
└── USAGE.md                       # 使用指南
```

## 支持的文档类型

| 类型 | 场景 | 核心能力 |
|------|------|---------|
| `survey` | 调查报告 | 数据分析、竞品对比 |
| `guide` | 产品指南 | 功能详解、FAQ |
| `business-plan` | 商业计划书 | 市场分析、财务预测 |
| `meeting-report` | 会议报告 | 议程、决议、行动项 |
| `paper` | 学术论文 | 集成 academic-pipeline |
| `technical` | 技术文档 | API 文档、架构设计 |
| `general` | 通用文档 | 灵活结构 |

## 格式转换能力

- **Markdown → DOCX**: 通过 Pandoc
- **Markdown → PDF**: 通过 Pandoc + LaTeX
- - **Markdown → HTML**: 通过 Pandoc
- **XLSX → Markdown**: 通过 Python openpyxl
- **DOCX → Markdown**: 通过 Pandoc

## 快速开始

```javascript
const DocumentWritingWorkflow = require('./workflow');
const workflow = new DocumentWritingWorkflow(projectDir);

// 生成调查报告
const result = await workflow.execute({
  mode: 'full-run',
  documentType: 'survey',
  topic: '智能家居市场分析',
  outputFormat: 'docx'
});
```

## 与其他工作流集成

所有 16 个工作流均可调用此工作流输出文档：
- Scrum → Sprint 回顾报告
- 需求工程 → 需求规格说明书
- 缺陷管理 → 缺陷分析报告
- 生产管理 → 生产质量报告

## 依赖工具

- **Pandoc**（必需）: 文档格式转换
- **Python + openpyxl**（可选）: Excel 处理
- **LaTeX**（可选）: PDF 生成

详见 [USAGE.md](USAGE.md) 获取完整使用指南。
