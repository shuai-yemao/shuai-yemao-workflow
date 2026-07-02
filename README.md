# Shuai Yemao Workflow

Claude Code 工作流集合 — 用于自动化软件开发、文档编写、测试等任务。

## 目录结构

```
workflows/
├── *.js                    # 核心工作流
├── __tests__/              # 工作流测试
├── collaboration/          # 协作相关工作流
├── compliance-certification/ # 合规认证工作流
├── defect-management/      # 缺陷管理工作流
├── dfmea-management/       # DFMEA管理工作流
├── document-writing/       # 文档编写工作流（支持论文）
├── domains/                # 领域特定工作流
├── factory-test/           # 工厂测试工作流
├── firmware-development/   # 固件开发工作流
├── hardware-design/        # 硬件设计工作流
├── ip-management/          # IP管理工作流
├── learning/               # 学习相关工作流
├── mechanical-design/      # 机械设计工作流
├── production-management/  # 生产管理工作流
├── scrum-development/      # Scrum开发工作流
├── software-development/   # 软件开发工作流
├── testing-cicd/           # 测试与CI/CD工作流
├── toolchain-management/   # 工具链管理工作流
└── visualization/          # 可视化工作流
```

## 核心工作流

| 工作流 | 描述 |
|--------|------|
| `document-writing.js` | 文档写作 — 支持多种文档类型（论文/报告/指南等） |
| `homunculus-observer.js` | Homunculus 观察者 — 行为模式学习 |
| `agentshield-scanner.js` | AgentShield 扫描器 — 安全规则扫描 |
| `vector-store.js` | 向量存储 — 语义搜索支持 |
| `base-workflow.js` | 基础工作流 — 工作流基类和通用工具 |
| `workflow-executor.js` | 工作流执行器 — 执行和管理工作流 |
| `agent-teams-config.js` | Agent Teams 配置 — 多 Agent 团队协作配置 |
| `example-usage.js` | 使用示例 — 工作流使用示例 |

## 文档写作工作流

`document-writing.js` 支持多种文档类型：

| 类型 | 场景 | 说明 |
|------|------|------|
| `survey` | 调查报告 | 数据分析、竞品对比 |
| `guide` | 产品指南 | 功能详解、FAQ |
| `business-plan` | 商业计划书 | 市场分析、财务预测 |
| `meeting-report` | 会议报告 | 议程、决议、行动项 |
| `paper` | 学术论文 | 支持中文/英文，学位论文/期刊论文 |
| `technical` | 技术文档 | API 文档、架构设计 |
| `general` | 通用文档 | 灵活结构 |

### 使用示例

```javascript
// 生成中文学位论文
Workflow({
  name: 'document-writing',
  args: {
    mode: 'full-run',
    documentType: 'paper',
    topic: '基于深度学习的图像识别研究',
    language: 'zh',
    paperType: 'thesis',
    outputFormat: 'pdf'
  }
})

// 生成英文期刊论文
Workflow({
  name: 'document-writing',
  args: {
    mode: 'full-run',
    documentType: 'paper',
    topic: 'Deep Learning for Image Recognition',
    language: 'en',
    paperType: 'journal',
    outputFormat: 'pdf'
  }
})
```

## 使用方法

```bash
# 从工作流运行
Workflow({ name: 'document-writing', args: { documentType: 'paper', topic: '...' } })

# 或使用脚本路径
Workflow({ scriptPath: '~/.claude/workflows/document-writing.js' })
```

## 开发

```bash
# 运行测试
npm test

# 验证工作流
node workflows/__tests__/validate.js
```

## 许可证

MIT License

## 📋 更新日志

### 2026-07-02

- 🧹 **工作流精简**：删除 9 个冗余工作流
  - 删除 `agent-orchestration.js`（编排层）
  - 删除 `memory-layer.js`（记忆层）
  - 删除 `tool-layer.js`（工具层）
  - 删除 `ops-layer.js`（Ops层）
  - 删除 `safety-layer.js`（安全层）
  - 删除 `requirements-alignment.js`（需求对齐）
  - 删除 `paper-writing.js`（英文论文，已合并到 document-writing）
  - 删除 `thesis-writing-zh.js`（中文论文，已合并到 document-writing）
  - 删除 `journal-paper-en.js`（期刊论文，已合并到 document-writing）
- ✅ **论文写作合并**：将 4 个论文写作工作流合并为 `document-writing`
- ✅ **更新 README**：反映最新的工作流配置

### 2026-06-25

- ✅ 同步全局 workflows 到仓库
- ✅ 新增 4 个核心工作流：
  - `base-workflow.js` - 基础工作流基类
  - `workflow-executor.js` - 工作流执行器
  - `agent-teams-config.js` - Agent Teams 配置
  - `example-usage.js` - 使用示例
- ✅ 更新 README，添加新工作流说明
