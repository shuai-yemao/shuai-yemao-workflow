# 文件系统通信方案使用指南

## 概述

本指南详细介绍如何使用基于文件系统的 Codex 与 Claude 通信方案。

## 快速开始

### 1. 初始化共享目录

```bash
cd ~/.claude/scripts/collaboration
chmod +x init-shared-dir.sh
./init-shared-dir.sh
```

### 2. 创建任务

```bash
chmod +x task-manager.sh
./task-manager.sh create "为 STM32F407 添加 UART 驱动"
```

### 3. 执行协作流程

```bash
# 步骤 1: 在 Codex 桌面端中输入任务
# 步骤 2: 将 Codex 输出保存到 output/task-*.md
# 步骤 3: 更新任务状态
./task-manager.sh update task-20260623120000 codex done

# 步骤 4: 在 VSCode 中实现代码
# 步骤 5: Claude 插件自动审查
# 步骤 6: 更新任务状态
./task-manager.sh update task-20260623120000 claude_plugin done

# 步骤 7: 使用 Claude Code CLI 验证
# 步骤 8: 更新任务状态
./task-manager.sh update task-20260623120000 claude_cli done

# 步骤 9: 生成最终报告
./task-manager.sh report task-20260623120000
```

## 详细步骤

### 步骤 1: 初始化共享目录

```bash
cd ~/.claude/scripts/collaboration
./init-shared-dir.sh
```

输出：
```
==========================================
  初始化共享目录结构
==========================================

创建目录结构...
✅ 创建: /home/user/.claude/shared/input
✅ 创建: /home/user/.claude/shared/output
✅ 创建: /home/user/.claude/shared/context
✅ 创建: /home/user/.claude/shared/logs

==========================================
  共享目录初始化完成！
==========================================
```

### 步骤 2: 创建任务

```bash
./task-manager.sh create "为 STM32F407 添加 UART 驱动"
```

输出：
```
创建新任务...
任务 ID: task-20260623120000
任务描述: 为 STM32F407 添加 UART 驱动

✅ 创建输入文件: /home/user/.claude/shared/input/task-20260623120000.json
✅ 创建上下文文件: /home/user/.claude/shared/context/task-20260623120000.json

任务创建成功！

下一步:
  1. 在 Codex 桌面端中输入任务描述
  2. 将 Codex 输出保存到: /home/user/.claude/shared/output/task-20260623120000-codex.md
  3. 运行: ./task-manager.sh update task-20260623120000 codex done

任务 ID: task-20260623120000
```

### 步骤 3: 在 Codex 桌面端中输入任务

打开 Codex 桌面端，输入以下内容：

```
为 STM32F407 的 UART1 设计驱动，要求：
1. 支持 DMA 和中断模式
2. 遵循 MISRA C 规范
3. 包含完整的错误处理
4. 生成单元测试代码
5. 提供使用示例
```

### 步骤 4: 保存 Codex 输出

将 Codex 生成的代码保存到文件：

```bash
cat > ~/.claude/shared/output/task-20260623120000-codex.md << 'EOF'
# Codex 输出

## 任务描述

为 STM32F407 的 UART1 设计驱动

## 代码方案

```c
#include "uart_driver.h"

// UART 初始化配置
HAL_StatusTypeDef UART_Init(UART_HandleTypeDef *huart, UART_Config_t *config) {
    // 实现代码
}

// UART 发送数据
HAL_StatusTypeDef UART_Transmit(UART_HandleTypeDef *huart, uint8_t *data, uint16_t size) {
    // 实现代码
}

// UART 接收数据
HAL_StatusTypeDef UART_Receive(UART_HandleTypeDef *huart, uint8_t *data, uint16_t size) {
    // 实现代码
}
```

## 实现步骤

1. 初始化 UART 配置
2. 实现发送函数
3. 实现接收函数
4. 添加错误处理
5. 生成单元测试

## 注意事项

- 遵循 MISRA C 规范
- 包含完整的错误处理
- 支持 DMA 和中断模式
EOF
```

### 步骤 5: 更新任务状态

```bash
./task-manager.sh update task-20260623120000 codex done
```

输出：
```
更新任务状态...
任务 ID: task-20260623120000
工具: codex
状态: done

✅ 更新任务状态: codex = done
```

### 步骤 6: 在 VSCode 中实现代码

将 Codex 生成的代码复制到 VSCode 项目中，Claude 插件将自动审查代码。

### 步骤 7: 保存 Claude 插件输出

将 Claude 插件的审查结果保存到文件：

```bash
cat > ~/.claude/shared/output/task-20260623120000-claude-plugin.md << 'EOF'
# Claude 插件审查报告

## 审查结果

✅ 代码质量良好

## 建议

1. 添加更多注释
2. 优化错误处理
3. 考虑添加单元测试

## 代码质量评分

- 可读性: 9/10
- 可维护性: 8/10
- 性能: 9/10
- 安全性: 8/10
EOF
```

### 步骤 8: 更新任务状态

```bash
./task-manager.sh update task-20260623120000 claude_plugin done
```

### 步骤 9: 使用 Claude Code CLI 验证

```bash
claude-code "审查 UART 驱动代码，运行测试，生成报告"
```

### 步骤 10: 保存 Claude CLI 输出

将 Claude CLI 的验证结果保存到文件：

```bash
cat > ~/.claude/shared/output/task-20260623120000-claude-cli.md << 'EOF'
# Claude CLI 验证报告

## 测试结果

✅ 所有测试通过

## 覆盖率

- 代码覆盖率: 85%
- 分支覆盖率: 80%

## 质量检查

✅ 符合 MISRA 规范
✅ 无内存泄漏
✅ 无安全漏洞
EOF
```

### 步骤 11: 更新任务状态

```bash
./task-manager.sh update task-20260623120000 claude_cli done
```

### 步骤 12: 生成最终报告

```bash
./task-manager.sh report task-20260623120000
```

输出：
```
生成最终报告...
任务 ID: task-20260623120000

✅ 最终报告已生成: /home/user/.claude/shared/output/task-20260623120000-final-report.md
✅ 任务状态已更新为: completed
```

## 查看任务状态

### 查看单个任务状态

```bash
./task-manager.sh status task-20260623120000
```

输出：
```
查看任务状态...
任务 ID: task-20260623120000

任务信息:
  任务 ID: task-20260623120000
  任务描述: 为 STM32F407 添加 UART 驱动
  状态: completed
  创建时间: 2026-06-23T12:00:00Z
  完成时间: 2026-06-23T12:30:00Z

工具状态:
  Codex: done
  Claude 插件: done
  Claude CLI: done

输出文件:
  Codex 输出: output/task-20260623120000-codex.md
  Claude 插件输出: output/task-20260623120000-claude-plugin.md
  Claude CLI 输出: output/task-20260623120000-claude-cli.md
  最终报告: output/task-20260623120000-final-report.md
```

### 列出所有任务

```bash
./task-manager.sh list
```

输出：
```
列出所有任务...

任务 ID: task-20260623120000
  状态: completed
  描述: 为 STM32F407 添加 UART 驱动

任务 ID: task-20260623130000
  状态: pending
  描述: 为 STM32F407 添加 SPI 驱动

共找到 2 个任务
```

## 清理过期任务

```bash
./task-manager.sh cleanup
```

输出：
```
清理过期任务...

清理过期任务: task-20260615120000 (创建于 2026-06-15)
清理过期任务: task-20260616120000 (创建于 2026-06-16)
已清理 2 个过期任务
```

## 监听文件变化

```bash
chmod +x file-watcher.sh
./file-watcher.sh
```

输出：
```
==========================================
  文件监视器启动
==========================================

监控目录: /home/user/.claude/shared/output
按 Ctrl+C 停止

[2026-06-23 12:00:00] 检测到文件变化: /home/user/.claude/shared/output/task-20260623120000-codex.md (CREATE)
检测到新的 Codex 输出: /home/user/.claude/shared/output/task-20260623120000-codex.md
触发 Claude 插件处理...
```

## 目录结构

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
├── logs/
│   └── collaboration.log             # 协作日志
└── README.md                         # 使用说明
```

## 文件格式

### 任务输入文件 (input/task-*.json)

```json
{
    "task_id": "task-20260623120000",
    "task_description": "为 STM32F407 添加 UART 驱动",
    "source": "manual",
    "created_at": "2026-06-23T12:00:00Z"
}
```

### 任务上下文文件 (context/task-*.json)

```json
{
    "task_id": "task-20260623120000",
    "task_description": "为 STM32F407 添加 UART 驱动",
    "status": "completed",
    "created_at": "2026-06-23T12:00:00Z",
    "completed_at": "2026-06-23T12:30:00Z",
    "tools": {
        "codex": "done",
        "claude_plugin": "done",
        "claude_cli": "done"
    },
    "files": {
        "codex_output": "output/task-20260623120000-codex.md",
        "plugin_output": "output/task-20260623120000-claude-plugin.md",
        "cli_output": "output/task-20260623120000-claude-cli.md",
        "final_report": "output/task-20260623120000-final-report.md"
    }
}
```

## 常见问题

### Q1: 如何查看任务状态？

```bash
./task-manager.sh status task-20260623120000
```

### Q2: 如何列出所有任务？

```bash
./task-manager.sh list
```

### Q3: 如何清理过期任务？

```bash
./task-manager.sh cleanup
```

### Q4: 如何生成最终报告？

```bash
./task-manager.sh report task-20260623120000
```

### Q5: 如何监听文件变化？

```bash
./file-watcher.sh
```

## 注意事项

1. **任务 ID 必须唯一**：每个任务都有唯一的 ID
2. **文件命名必须遵循规范**：按照 `task-*.md` 格式命名
3. **状态更新必须按照顺序**：pending → codex_done → plugin_done → cli_done → completed
4. **定期清理过期任务**：使用 `./task-manager.sh cleanup` 清理 7 天前的任务

## 下一步

1. ✅ 初始化共享目录
2. ✅ 创建第一个任务
3. ✅ 执行协作流程
4. ✅ 查看任务状态
5. ✅ 生成最终报告
6. ✅ 监听文件变化
7. ✅ 清理过期任务

---

**提示：** 遇到问题时，可以查看 `~/.claude/shared/README.md` 获取更多帮助。
