# Codex 与 Claude 协作快速入门

## 环境要求

✅ Claude CLI - 已安装
✅ Codex CLI - 已安装
✅ VSCode - 已安装

## 快速开始

### 1. 安装 VSCode Claude 插件

```bash
# 在 VSCode 中安装 Claude 插件
code --install-extension anthropic.claude-code
```

或者在 VSCode 扩展市场搜索 "Claude Code" 并安装。

### 2. 配置工作流

```bash
# 运行配置脚本
cd ~/.claude/scripts/collaboration
chmod +x daily-workflow.sh
chmod +x bug-fix-workflow.sh
chmod +x refactor-workflow.sh
```

### 3. 开始协作

#### 场景 1：开发新功能

```bash
# 方法 1：使用工作流脚本
cd ~/.claude/scripts/collaboration
./daily-workflow.sh "feature" "为 STM32F407 添加 UART 驱动"

# 方法 2：手动协作
# 步骤 1：打开 Codex 桌面端，描述任务
# 步骤 2：Codex 生成代码方案
# 步骤 3：在 VSCode 中实现（Claude 插件实时审查）
# 步骤 4：使用 Claude Code CLI 验证测试
```

#### 场景 2：修复 Bug

```bash
# 方法 1：使用工作流脚本
cd ~/.claude/scripts/collaboration
./bug-fix-workflow.sh "代码出现内存泄漏"

# 方法 2：手动协作
# 步骤 1：打开 Codex 桌面端，描述问题
# 步骤 2：Codex 分析并提供修复方案
# 步骤 3：在 VSCode 中应用修复
# 步骤 4：使用 Claude Code CLI 验证修复
```

#### 场景 3：代码重构

```bash
# 方法 1：使用工作流脚本
cd ~/.claude/scripts/collaboration
./refactor-workflow.sh "优化代码结构，提高可维护性"

# 方法 2：手动协作
# 步骤 1：打开 Codex 桌面端，分析代码
# 步骤 2：Codex 生成重构方案
# 步骤 3：在 VSCode 中应用重构
# 步骤 4：使用 Claude Code CLI 验证重构
```

## 日常工作流程

### 早上开始工作

```
1. 打开 VSCode，启动 Claude 插件
2. 打开 Codex 桌面端
3. 告诉 Codex 今天的任务：
   "今天需要完成 UART 驱动开发，请帮我规划一下"
4. Codex 会给你任务清单和实现方案
5. 开始按照方案执行
```

### 开发新功能

```
步骤 1：向 Codex 描述任务
"我需要为 STM32F407 添加 SPI 驱动，支持 DMA 传输"

步骤 2：Codex 生成代码方案
- 代码结构
- 实现步骤
- 注意事项

步骤 3：在 VSCode 中实现
- 将 Codex 生成的代码复制到项目中
- Claude 插件实时审查
- 根据建议修改

步骤 4：验证
- 使用 Claude Code CLI 运行测试
- 生成质量报告
```

### 修复 Bug

```
步骤 1：向 Codex 描述问题
"这段代码出现了内存泄漏，请帮我分析"

步骤 2：Codex 分析并提供修复方案
- 问题根源
- 修复代码
- 预防措施

步骤 3：在 VSCode 中应用修复
- 复制修复代码
- Claude 插件验证
- 运行测试

步骤 4：提交
- 使用 Claude Code CLI 生成 commit message
- 提交代码
```

## 提示词技巧

### Codex 桌面端提示词

**好的提示词：**
```
为 STM32F407 的 SPI1 设计驱动，要求：
1. 支持 DMA 和中断模式
2. 遵循 MISRA C 规范
3. 包含完整的错误处理
4. 生成单元测试代码
5. 提供使用示例
```

**更好的提示词：**
```
我正在开发一个嵌入式项目，使用 STM32F407 芯片。
需要为 SPI1 设计驱动，用于与外部 Flash 通信。

要求：
1. 硬件配置：
   - SPI1: PA5(SCK), PA6(MISO), PA7(MOSI)
   - DMA1_Stream3 用于发送
   - DMA1_Stream0 用于接收
   - 中断优先级: 5

2. 功能需求：
   - 初始化配置
   - 发送数据（阻塞和非阻塞）
   - 接收数据（阻塞和非阻塞）
   - 全双工通信
   - 错误处理（超时、CRC 错误等）

3. 代码规范：
   - 遵循 MISRA C:2012
   - 使用 HAL 库
   - 包含 Doxygen 注释

4. 测试要求：
   - 单元测试（使用 Unity 框架）
   - 覆盖率 ≥ 80%
   - 包含边界测试

请生成完整的驱动代码和测试代码。
```

### Claude 插件提示词

**在 VSCode 中使用：**
```
@claude 审查这段代码，检查：
1. 是否符合 MISRA 规范
2. 是否有内存泄漏风险
3. 是否有性能问题
4. 是否有安全漏洞
```

### Claude Code CLI 提示词

**执行工作流：**
```bash
claude-code "执行固件开发工作流，完成 UART 驱动开发"

claude-code "运行测试套件，生成覆盖率报告"

claude-code "审查代码质量，生成质量报告"

claude-code "准备发布，生成版本号和变更日志"
```

## 工具切换时机

### 什么时候用 Codex 桌面端？

```
✅ 需要生成新代码时
✅ 需要设计架构时
✅ 需要分析复杂问题时
✅ 需要重构代码时
✅ 需要生成测试时
✅ 需要理解代码时
```

### 什么时候用 Claude 插件？

```
✅ 编写代码时（实时审查）
✅ 修改代码时（质量检查）
✅ 需要快速建议时
✅ 需要代码解释时
✅ 需要文档生成时
```

### 什么时候用 Claude Code CLI？

```
✅ 执行工作流时
✅ 运行测试时
✅ 生成报告时
✅ 执行 Git 操作时
✅ 需要深度分析时
✅ 需要多文件操作时
```

## 常见问题

### Q1: Codex 和 Claude 给出不同建议怎么办？

**A**: 
1. 优先考虑 Codex 的建议（它更了解整个代码库）
2. 如果 Claude 插件发现明显问题，优先修复
3. 使用 Claude Code CLI 进行深度分析

### Q2: 如何提高代码生成质量？

**A**: 
1. 提供详细的上下文信息
2. 明确功能需求和约束条件
3. 要求生成测试代码
4. 要求遵循代码规范

### Q3: 如何管理上下文？

**A**: 
1. Codex 桌面端：自动管理整个代码库
2. Claude 插件：对话历史 + 当前文件
3. Claude Code CLI：项目结构 + 工作流状态

### Q4: 如何避免代码冲突？

**A**: 
1. 使用 Git 分支管理
2. 定期同步 develop 分支
3. 使用 Claude Code CLI 进行代码合并

## 质量检查清单

### 代码质量

- [ ] 符合 MISRA 规范
- [ ] 无内存泄漏
- [ ] 无未初始化变量
- [ ] 错误处理完整
- [ ] 注释清晰

### 测试质量

- [ ] 单元测试覆盖率 ≥ 80%
- [ ] 包含边界测试
- [ ] 包含异常测试
- [ ] 测试用例清晰

### 文档质量

- [ ] API 文档完整
- [ ] 使用示例清晰
- [ ] 注意事项明确
- [ ] 故障排除完整

## 下一步

1. 安装 VSCode Claude 插件
2. 尝试使用工作流脚本
3. 根据项目需求调整提示词模板
4. 建立自己的协作最佳实践

---

**提示：** 遇到问题时，可以查看 `~/.claude/templates/` 目录下的提示词模板，或者运行 `claude-code --help` 获取更多帮助。
