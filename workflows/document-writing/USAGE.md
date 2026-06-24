# 文档写作与处理工作流 — 使用指南

## 快速开始

### 1. 生成调查报告

```javascript
const DocumentWritingWorkflow = require('./workflow');

const workflow = new DocumentWritingWorkflow('/path/to/project');

const result = await workflow.execute({
  mode: 'full-run',
  documentType: 'survey',
  topic: '智能家居市场分析',
  outputFormat: 'markdown',
  researchData: {
    summary: '智能家居市场持续增长...',
    findings: [
      '市场规模预计2025年达到XXX亿元',
      '主要增长驱动因素为XXX',
      '竞争格局呈现XXX特点'
    ],
    sources: [
      { title: '行业报告2024', author: '研究机构', year: '2024' }
    ]
  }
});
```

### 2. 生成产品指南

```javascript
const result = await workflow.execute({
  mode: 'full-run',
  documentType: 'guide',
  topic: '智能网关用户手册',
  outputFormat: 'docx',
  researchData: {
    features: [
      { name: '设备配网', description: '支持WiFi、蓝牙、Zigbee等多种配网方式...' },
      { name: '场景联动', description: '支持自定义场景，实现设备间智能联动...' }
    ],
    faq: [
      { question: '如何重置设备？', answer: '长按RESET键5秒...' }
    ]
  }
});
```

### 3. 生成会议纪要

```javascript
const result = await workflow.execute({
  mode: 'full-run',
  documentType: 'meeting-report',
  topic: 'Sprint 评审会议',
  outputFormat: 'markdown'
});
```

### 4. 格式转换

```javascript
// 将已有的 Markdown 转换为 DOCX
const result = await workflow.execute({
  mode: 'convert',
  content: '# 我的文档\n\n这是内容...',
  sourceFormat: 'markdown',
  outputFormat: 'docx',
  outputPath: '11_DocumentWriting/general',
  fileName: 'my-document'
});
```

### 5. 批量生成

```javascript
const result = await workflow.execute({
  mode: 'batch',
  documents: [
    { documentType: 'survey', topic: '报告A', researchData: {...} },
    { documentType: 'guide', topic: '指南B', researchData: {...} },
    { documentType: 'meeting-report', topic: '会议C' }
  ],
  outputFormat: 'markdown'
});
```

## 文档类型详解

### 调查报告 (survey)

**适用场景**: 市场调研、技术调研、竞品分析、用户调研

**推荐数据结构**:
```javascript
{
  summary: '摘要...',
  background: '背景...',
  methodology: '方法论...',
  findings: ['发现1', '发现2', ...],
  dataAnalysis: '数据分析...',
  conclusions: '结论...',
  recommendations: '建议...',
  sources: [{ title, author, year, url }]
}
```

**输出章节**:
1. 调查背景
2. 调查目的
3. 调查方法
4. 主要发现
5. 数据分析
6. 结论与建议
7. 参考文献

### 产品指南 (guide)

**适用场景**: 用户手册、使用指南、操作手册、FAQ

**推荐数据结构**:
```javascript
{
  features: [{ name: '功能名', description: '描述...' }],
  faq: [{ question: '问题', answer: '答案' }],
  installation: '安装步骤...',
  troubleshooting: '故障排除...'
}
```

### 商业计划书 (business-plan)

**适用场景**: BP、融资材料、项目立项、商业提案

**推荐数据结构**:
```javascript
{
  executiveSummary: '执行摘要...',
  marketAnalysis: '市场分析...',
  product: '产品介绍...',
  businessModel: '商业模式...',
  team: '团队介绍...',
  financials: '财务预测...'
}
```

### 会议报告 (meeting-report)

**适用场景**: 评审纪要、周会记录、项目汇报、站会记录

**推荐数据结构**:
```javascript
{
  date: '2024-01-15',
  location: '会议室A',
  attendees: '张三、李四、王五',
  recorder: '张三',
  agenda: ['议题1', '议题2'],
  discussions: { '议题1': '讨论内容...' },
  resolutions: ['决议1', '决议2'],
  actionItems: [{ task: '任务', owner: '负责人', dueDate: '2024-01-20' }]
}
```

### 学术论文 (paper)

**适用场景**: 科研论文、技术文章、综述

**注意**: 建议使用 `/academic-pipeline` 获取完整的 12-agent 论文写作流水线。

### 技术文档 (technical)

**适用场景**: API 文档、设计方案、规格说明、架构文档

## 格式转换

### 支持的转换路径

| 源格式 | 目标格式 | 依赖工具 |
|--------|----------|----------|
| Markdown | DOCX | Pandoc |
| Markdown | PDF | Pandoc + LaTeX |
| Markdown | HTML | Pandoc |
| XLSX | Markdown | Python openpyxl |
| DOCX | Markdown | Pandoc |
| PDF | Markdown | pdfplumber / Nutrient API |

### 安装依赖

```bash
# Pandoc（必需）
# Windows
choco install pandoc

# macOS
brew install pandoc

# Python 依赖（可选，用于 Excel/PDF 处理）
pip install openpyxl pdfplumber
```

## 模板系统

### 内置模板

- `survey-report.md` — 调查报告
- `product-guide.md` — 产品指南
- `business-plan.md` — 商业计划书
- `meeting-report.md` — 会议报告
- `weekly-report.md` — 周报

### 自定义模板

```javascript
const result = await workflow.execute({
  mode: 'full-run',
  documentType: 'general',
  topic: '我的文档',
  customTemplate: `# {{title}}

## 第一部分

{{section1}}

## 第二部分

{{section2}}`,
  template: {
    title: '自定义文档标题',
    section1: '第一部分内容...',
    section2: '第二部分内容...'
  }
});
```

## 与其他工作流集成

### 从 Scrum 工作流生成 Sprint 回顾报告

```javascript
// 在 Scrum 工作流中调用
const docWorkflow = new DocumentWritingWorkflow(projectDir);

const sprintReview = await docWorkflow.execute({
  mode: 'full-run',
  documentType: 'meeting-report',
  topic: `Sprint ${sprintNumber} 回顾`,
  researchData: {
    date: sprint.endDate,
    attendees: teamMembers,
    agenda: ['Sprint 目标回顾', '完成的工作', '未完成的工作', '改进项'],
    resolutions: sprint.retrospective.improvements,
    actionItems: sprint.retrospective.actionItems
  }
});
```

### 从需求工程工作流生成需求文档

```javascript
const docWorkflow = new DocumentWritingWorkflow(projectDir);

const requirementsDoc = await docWorkflow.execute({
  mode: 'full-run',
  documentType: 'technical',
  topic: '需求规格说明书',
  researchData: requirementsEngineeringResults
});
```

## 故障排除

### Pandoc 未安装

```
错误: Pandoc 未安装，请先安装 Pandoc
```

**解决方案**: 安装 Pandoc 后重试

### Python 依赖缺失

```
警告: Python openpyxl 未安装，无法处理 Excel 文件
```

**解决方案**: 运行 `pip install openpyxl`

### 占位符未替换

```
警告: 存在 N 个未替换的占位符
```

**解决方案**: 确保提供了所有必要的模板变量
