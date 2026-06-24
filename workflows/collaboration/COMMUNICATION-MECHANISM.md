# Codex 与 Claude 通信机制详解

## 概述

本文档详细解释 Codex 与 Claude 以及两者与 IDE 之间的通信机制，包括当前实现和改进方案。

## 当前通信架构

### 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      开发者 (中间人)                          │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │  Codex 桌面端 │ ←→ │  VSCode IDE  │ ←→ │Claude Code CLI│     │
│  │  (独立应用)   │    │  (Claude插件) │    │  (命令行)    │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│         ↑                  ↑                  ↑              │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│                     手动复制粘贴                              │
└─────────────────────────────────────────────────────────────┘
```

### 通信流程

#### 流程 1：开发新功能

```
1. 开发者 ←→ Codex 桌面端
   - 开发者描述任务
   - Codex 生成代码方案
   - 开发者复制代码

2. 开发者 → VSCode IDE
   - 粘贴代码到项目
   - Claude 插件实时审查
   - 开发者根据建议修改

3. 开发者 → Claude Code CLI
   - 执行测试命令
   - 生成质量报告
   - 提交代码
```

#### 流程 2：修复 Bug

```
1. 开发者 ←→ Codex 桌面端
   - 开发者描述问题
   - Codex 分析并提供修复方案
   - 开发者复制修复代码

2. 开发者 → VSCode IDE
   - 粘贴修复代码
   - Claude 插件验证修复
   - 运行测试

3. 开发者 → Claude Code CLI
   - 生成 commit message
   - 提交代码
```

### 通信特点

| 特点 | 说明 |
|------|------|
| **手动性** | 需要开发者手动复制粘贴代码 |
| **实时性** | Claude 插件提供实时审查 |
| **上下文隔离** | 各工具有独立的上下文 |
| **无自动同步** | 工具间无法自动同步状态 |

## 改进方案

### 方案 1：基于文件系统的通信

#### 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    共享文件系统                               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  ~/.claude/shared/                    │   │
│  │  ├── input/          # 输入文件                       │   │
│  │  ├── output/         # 输出文件                       │   │
│  │  ├── context/        # 上下文文件                     │   │
│  │  └── logs/           # 日志文件                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                            ↑                                 │
│                            │ 文件读写                        │
│         ┌──────────────────┼──────────────────┐             │
│         │                  │                  │             │
│  ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐     │
│  │  Codex 桌面端 │    │  VSCode IDE  │    │Claude Code CLI│     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

#### 通信流程

```
1. Codex 桌面端 → 文件系统
   - 生成代码方案
   - 写入 output/task-id-codex.md
   - 更新 context/task-id.json

2. 文件系统 → VSCode IDE
   - Claude 插件监听文件变化
   - 自动读取 Codex 输出
   - 生成审查报告
   - 写入 output/task-id-claude-plugin.md

3. 文件系统 → Claude Code CLI
   - 监听文件变化
   - 自动执行测试
   - 生成验证报告
   - 写入 output/task-id-claude-cli.md

4. 文件系统 → 最终报告
   - 整合所有输出
   - 生成最终报告
   - 写入 output/task-id-final-report.md
```

#### 文件结构

```
~/.claude/shared/
├── input/
│   └── task-20260623120000.json      # 任务输入
├── output/
│   ├── task-20260623120000-codex.md          # Codex 输出
│   ├── task-20260623120000-claude-plugin.md  # Claude 插件输出
│   ├── task-20260623120000-claude-cli.md     # Claude CLI 输出
│   └── task-20260623120000-final-report.md   # 最终报告
├── context/
│   ├── task-20260623120000.json      # 任务上下文
│   └── .last_check                   # 最后检查时间
└── logs/
    └── collaboration.log             # 协作日志
```

#### 任务上下文格式

```json
{
    "task_id": "task-20260623120000",
    "task_description": "为 STM32F407 添加 UART 驱动",
    "status": "pending",
    "created_at": "2026-06-23T12:00:00Z",
    "completed_at": null,
    "tools": {
        "codex": "pending",
        "claude_plugin": "pending",
        "claude_cli": "pending"
    },
    "files": {
        "codex_output": "output/task-20260623120000-codex.md",
        "plugin_output": "output/task-20260623120000-claude-plugin.md",
        "cli_output": "output/task-20260623120000-claude-cli.md",
        "final_report": "output/task-20260623120000-final-report.md"
    }
}
```

### 方案 2：基于 IDE API 的通信

#### 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      VSCode IDE                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  Claude 插件                         │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │              API 服务器                      │   │   │
│  │  │  - HTTP API                                │   │   │
│  │  │  - WebSocket                               │   │   │
│  │  │  - 文件监听                                │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
│                            ↑                                 │
│                            │ API 调用                        │
│         ┌──────────────────┼──────────────────┐             │
│         │                  │                  │             │
│  ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐     │
│  │  Codex 桌面端 │    │  Web 浏览器  │    │Claude Code CLI│     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

#### API 接口设计

```javascript
// Claude 插件提供的 API 接口

// 1. 提交任务
POST /api/tasks
{
    "task_id": "task-20260623120000",
    "task_description": "为 STM32F407 添加 UART 驱动",
    "source": "codex",
    "code": "...",
    "context": "..."
}

// 2. 获取任务状态
GET /api/tasks/{task_id}

// 3. 获取任务输出
GET /api/tasks/{task_id}/output

// 4. 更新任务状态
PUT /api/tasks/{task_id}/status
{
    "status": "in_progress",
    "tool": "claude_plugin"
}

// 5. 获取审查结果
GET /api/tasks/{task_id}/review

// 6. 获取验证结果
GET /api/tasks/{task_id}/verification
```

#### 通信流程

```
1. Codex 桌面端 → Claude 插件 API
   - POST /api/tasks
   - 提交任务和代码
   - 获取任务 ID

2. Claude 插件 → 处理任务
   - 代码审查
   - 质量检查
   - 生成审查报告

3. Codex 桌面端 → 查询结果
   - GET /api/tasks/{task_id}/review
   - 获取审查结果
   - 根据建议修改代码

4. Claude Code CLI → 验证任务
   - GET /api/tasks/{task_id}
   - 获取任务信息
   - 执行测试验证
   - 更新任务状态
```

### 方案 3：基于消息队列的通信

#### 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      消息队列                                │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Redis / RabbitMQ                        │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │              消息主题                        │   │   │
│  │  │  - task.created                             │   │   │
│  │  │  - task.codex.done                          │   │   │
│  │  │  - task.plugin.done                         │   │   │
│  │  │  - task.cli.done                            │   │   │
│  │  │  - task.completed                           │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
│                            ↑                                 │
│                            │ 发布/订阅消息                    │
│         ┌──────────────────┼──────────────────┐             │
│         │                  │                  │             │
│  ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐     │
│  │  Codex 桌面端 │    │  VSCode IDE  │    │Claude Code CLI│     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

#### 消息格式

```json
{
    "message_id": "msg-20260623120000",
    "topic": "task.created",
    "payload": {
        "task_id": "task-20260623120000",
        "task_description": "为 STM32F407 添加 UART 驱动",
        "source": "codex",
        "timestamp": "2026-06-23T12:00:00Z"
    },
    "metadata": {
        "priority": "high",
        "retry_count": 0
    }
}
```

#### 通信流程

```
1. Codex 桌面端 → 发布消息
   - 发布 task.created 消息
   - 包含任务描述和代码

2. VSCode IDE → 订阅消息
   - 订阅 task.created 主题
   - 接收任务
   - 执行代码审查
   - 发布 task.plugin.done 消息

3. Claude Code CLI → 订阅消息
   - 订阅 task.plugin.done 主题
   - 接收审查结果
   - 执行测试验证
   - 发布 task.cli.done 消息

4. 系统 → 生成最终报告
   - 订阅 task.cli.done 主题
   - 整合所有输出
   - 发布 task.completed 消息
```

## 实际实现

### 实现 1：文件系统通信

```bash
# 启动自动化协作
cd ~/.claude/scripts/collaboration
./auto-collaboration.sh "为 STM32F407 添加 UART 驱动"

# 启动文件监视器（另一个终端）
./file-watcher.sh
```

### 实现 2：IDE API 通信

```javascript
// VSCode 插件代码示例
const vscode = require('vscode');

// 注册 API 处理器
vscode.commands.registerCommand('claude.api.submitTask', async (task) => {
    // 处理任务提交
    const result = await processTask(task);
    return result;
});

// 文件监听器
const watcher = vscode.workspace.createFileSystemWatcher('**/*.md');
watcher.onDidChange(async (uri) => {
    // 处理文件变化
    await handleFileChange(uri);
});
```

### 实现 3：消息队列通信

```python
# Redis 消息队列示例
import redis
import json

# 连接 Redis
r = redis.Redis(host='localhost', port=6379, db=0)

# 发布消息
def publish_task(task_id, description):
    message = {
        'message_id': f'msg-{task_id}',
        'topic': 'task.created',
        'payload': {
            'task_id': task_id,
            'task_description': description
        }
    }
    r.publish('tasks', json.dumps(message))

# 订阅消息
def subscribe_tasks():
    pubsub = r.pubsub()
    pubsub.subscribe('tasks')
    for message in pubsub.listen():
        if message['type'] == 'message':
            data = json.loads(message['data'])
            handle_task(data)
```

## 比较分析

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| **手动协作** | 简单、无需配置 | 效率低、易出错 | 小规模项目 |
| **文件系统** | 实现简单、可靠 | 延迟较高、需要轮询 | 中小规模项目 |
| **IDE API** | 实时性好、集成度高 | 需要插件支持 | 大规模项目 |
| **消息队列** | 解耦性好、可扩展 | 需要额外基础设施 | 企业级项目 |

## 推荐方案

### 对于个人开发者

**推荐：文件系统通信**

```bash
# 1. 使用自动化协作脚本
cd ~/.claude/scripts/collaboration
./auto-collaboration.sh "任务描述"

# 2. 启动文件监视器
./file-watcher.sh
```

### 对于团队开发

**推荐：IDE API 通信**

```bash
# 1. 安装 VSCode Claude 插件
code --install-extension anthropic.claude-code

# 2. 配置 API 服务器
# 在插件设置中启用 API 服务

# 3. 使用 API 提交任务
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"task_description": "任务描述"}'
```

### 对于企业级项目

**推荐：消息队列通信**

```bash
# 1. 部署 Redis/RabbitMQ
docker run -d -p 6379:6379 redis

# 2. 配置消息队列
# 在各工具中配置消息队列连接

# 3. 启动消息监听
python subscribe_tasks.py
```

## 总结

### 当前状态

- **手动协作**：开发者作为中间人，手动复制粘贴代码
- **优点**：简单、无需配置
- **缺点**：效率低、易出错

### 改进方向

1. **文件系统通信**：基于共享文件的自动化协作
2. **IDE API 通信**：基于 VSCode 插件的实时通信
3. **消息队列通信**：基于 Redis/RabbitMQ 的解耦通信

### 推荐实践

- **个人开发者**：使用文件系统通信
- **团队开发**：使用 IDE API 通信
- **企业级项目**：使用消息队列通信

---

**下一步：**

1. 尝试使用文件系统通信方案
2. 根据项目需求选择合适的通信方案
3. 根据实际情况调整和优化通信机制
