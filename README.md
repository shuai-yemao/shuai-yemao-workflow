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
├── document-writing/       # 文档编写工作流
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
| `requirements-alignment.js` | 需求对齐层 — 将模糊需求转化为明确的实现任务 |
| `agent-orchestration.js` | Agent 编排层 — 多 Agent 协作任务调度 |
| `safety-layer.js` | 安全层 — 代码安全检查与漏洞扫描 |
| `memory-layer.js` | 记忆层 — 上下文记忆管理 |
| `tool-layer.js` | 工具层 — 技能包管理 |
| `ops-layer.js` | Ops层 — 系统运维与部署 |
| `homunculus-observer.js` | Homunculus 观察者 — 行为模式学习 |
| `agentshield-scanner.js` | AgentShield 扫描器 — 安全规则扫描 |
| `vector-store.js` | 向量存储 — 语义搜索支持 |

## 使用方法

```bash
# 从工作流运行
Workflow({ name: 'requirements-alignment', args: { requirement: '...' } })

# 或使用脚本路径
Workflow({ scriptPath: '~/.claude/workflows/requirements-alignment.js' })
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
