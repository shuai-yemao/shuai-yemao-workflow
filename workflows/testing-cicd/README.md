# 嵌入式 C/C++ 测试与 CI/CD 工作流

一套完整的测试与持续集成/持续部署工作流，专为嵌入式 C/C++ 项目设计，支持平台无关配置生成。

## 概述

本工作流覆盖完整的 CI/CD 流水线：

```
代码提交 → 测试规划 → 单元测试 → 代码质量 → 集成测试 → 构建 → 系统测试 → 部署 → 监控
```

## 位置

`~/.claude/workflows/testing-cicd/`

## 文件结构

```
~/.claude/workflows/testing-cicd/
├── workflow.js                    # 工作流入口
├── README.md                      # 说明文档
├── USAGE.md                       # 使用指南
├── INTEGRATION.md                 # 集成指南
├── modules/
│   ├── test-planning.js           # 测试规划
│   ├── unit-testing.js            # 单元测试
│   ├── integration-testing.js     # 集成测试
│   ├── system-testing.js          # 系统测试
│   ├── code-quality.js            # 代码质量
│   ├── build.js                   # 构建
│   ├── deploy.js                  # 部署
│   └── monitor.js                 # 监控
└── utils/
    ├── config-generator.js        # 平台配置生成
    ├── quality-gate.js            # 质量门禁
    └── json-validator.js          # JSON 验证
```

## 工作流阶段

### 阶段 1: 测试规划 (test-planning)

**功能：** 根据需求和代码结构生成测试计划

**输入：**
- 验收标准（来自需求工程工作流）
- 代码结构分析
- Sprint 任务

**输出：**
- 测试计划 (test-plan.json/.md)
- 测试用例矩阵
- 覆盖率目标

### 阶段 2: 单元测试 (unit-testing)

**功能：** 执行单元测试并收集覆盖率

**支持框架：**
- Unity (推荐嵌入式)
- CUnit
- Google Test
- Check

**输出：**
- 单元测试报告
- 覆盖率报告
- 失败用例详情

### 阶段 3: 代码质量 (code-quality)

**功能：** 静态分析和代码质量检查

**检查项：**
- 代码风格 (MISRA, CERT C)
- 静态分析 (clang-tidy, cppcheck)
- 复杂度分析
- 安全漏洞扫描

**输出：**
- 代码质量报告
- 违规列表
- 改进建议

### 阶段 4: 集成测试 (integration-testing)

**功能：** 模块间交互测试

**测试类型：**
- 接口测试
- 通信协议测试 (SPI, I2C, UART)
- 中断测试
- 硬件在环测试

**输出：**
- 集成测试报告
- 性能基准

### 阶段 5: 构建 (build)

**功能：** 编译和固件生成

**构建类型：**
- Debug / Release
- 交叉编译
- 固件签名

**输出：**
- 构建产物 (.elf, .hex, .bin)
- 内存使用分析

### 阶段 6: 系统测试 (system-testing)

**功能：** 系统级端到端测试

**测试类型：**
- 功能测试
- 性能测试
- 压力测试
- 可靠性测试

**输出：**
- 系统测试报告
- 风险评估

### 阶段 7: 部署 (deploy)

**功能：** 固件烧录和版本管理

**部署方式：**
- 烧录器烧录 (J-Link, ST-Link)
- OTA 更新
- 生产线烧录

**输出：**
- 部署报告
- 版本信息

### 阶段 8: 监控 (monitor)

**功能：** 运行时监控和日志

**监控项：**
- 运行状态
- 错误日志
- 性能指标

**输出：**
- 监控报告
- 告警信息

## 输出位置

| 文档 | 输出目录 | 文件名 |
|------|----------|--------|
| 测试计划 | `00_Project_Management/08_持续集成与测试_DevOps/` | `test-plan.json/.md` |
| 单元测试 | `00_Project_Management/08_持续集成与测试_DevOps/unit-test/` | `report.json/.md` |
| 代码质量 | `00_Project_Management/08_持续集成与测试_DevOps/code-quality/` | `report.json/.md` |
| 集成测试 | `00_Project_Management/08_持续集成与测试_DevOps/integration-test/` | `report.json/.md` |
| 构建报告 | `00_Project_Management/08_持续集成与测试_DevOps/build/` | `report.json/.md` |
| 系统测试 | `00_Project_Management/08_持续集成与测试_DevOps/system-test/` | `report.json/.md` |
| 部署报告 | `00_Project_Management/08_持续集成与测试_DevOps/deploy/` | `report.json/.md` |
| CI/CD 配置 | `00_Project_Management/08_持续集成与测试_DevOps/cicd-config/` | 平台配置文件 |

## 质量门禁

| 指标 | 目标值 | 门禁级别 |
|------|--------|----------|
| 单元测试覆盖率 | ≥ 80% | 阻断 |
| 集成测试通过率 | 100% | 阻断 |
| 系统测试通过率 | ≥ 95% | 警告 |
| 代码质量评分 | ≥ A | 阻断 |
| MISRA 违规数 | 0 (Required) | 阻断 |
| 构建成功率 | 100% | 阻断 |

## 使用方法

```javascript
const TestingCICD = require('C:/Users/zhang/.claude/workflows/testing-cicd/workflow');

const cicd = new TestingCICD();

// 完整 CI/CD 流水线
const result = await cicd.execute({
  mode: 'full-pipeline',
  outputDir: 'D:/your/project/path',
  inputData: {
    acceptanceCriteria: [...],  // 来自需求工程工作流
    sprintTasks: [...]          // 来自 Scrum 工作流
  }
});

// 仅执行测试
await cicd.execute({
  mode: 'test-only',
  outputDir: 'D:/your/project/path'
});

// 仅代码质量检查
await cicd.execute({
  mode: 'quality-check',
  outputDir: 'D:/your/project/path'
});
```

## 执行模式

- **full-pipeline**: 完整 CI/CD 流水线
- **test-only**: 仅执行测试（单元 + 集成 + 系统）
- **build-only**: 仅执行构建
- **quality-check**: 仅代码质量检查
- **single**: 单独执行某个模块
- **incremental**: 增量测试（仅测试变更部分）

## 平台无关设计

工作流生成平台无关的配置，支持输出到：
- GitHub Actions (.github/workflows/ci.yml)
- GitLab CI (.gitlab-ci.yml)
- Jenkins (Jenkinsfile)
- 本地脚本 (scripts/ci.sh)

## 与现有工作流集成

```
需求工程工作流 ─────→ 测试规划（验收标准）
                          ↓
Scrum 敏捷开发 ─────→ 系统测试（Sprint 评审）
                          ↓
测试与 CI/CD ───────→ 测试报告（Sprint 回顾）
```
