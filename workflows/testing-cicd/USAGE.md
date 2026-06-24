# 测试与 CI/CD 工作流 - 使用指南

## 快速开始

### 1. 基础用法 - 完整流水线

```javascript
const TestingCICD = require('C:/Users/zhang/.claude/workflows/testing-cicd/workflow');

const cicd = new TestingCICD();

// 执行完整 CI/CD 流水线
const result = await cicd.execute({
  mode: 'full-pipeline',
  outputDir: 'D:/your/embedded-project',
  inputData: {
    projectType: 'embedded-c',           // 项目类型
    targetPlatform: 'arm-cortex-m4',     // 目标平台
    acceptanceCriteria: [...]            // 来自需求工程工作流
  }
});
```

### 2. 分步执行

```javascript
// 步骤 1: 测试规划
const testPlan = await cicd.execute({
  mode: 'single',
  module: 'test-planning',
  outputDir: 'D:/project',
  inputData: {
    codeStructure: {...},
    acceptanceCriteria: [...]
  }
});

// 步骤 2: 单元测试
const unitTest = await cicd.execute({
  mode: 'single',
  module: 'unit-testing',
  outputDir: 'D:/project'
});

// 步骤 3: 代码质量
const quality = await cicd.execute({
  mode: 'single',
  module: 'code-quality',
  outputDir: 'D:/project'
});

// 步骤 4: 构建
const build = await cicd.execute({
  mode: 'single',
  module: 'build',
  outputDir: 'D:/project',
  inputData: {
    buildType: 'release'
  }
});
```

### 3. 仅测试

```javascript
// 执行所有测试（不构建、不部署）
await cicd.execute({
  mode: 'test-only',
  outputDir: 'D:/project'
});
```

### 4. 代码质量检查

```javascript
// 仅执行代码质量检查
await cicd.execute({
  mode: 'quality-check',
  outputDir: 'D:/project',
  inputData: {
    standards: ['misra-c-2012', 'cert-c'],
    severity: 'required'  // required | advisory
  }
});
```

### 5. 增量测试

```javascript
// 仅测试变更的代码
await cicd.execute({
  mode: 'incremental',
  outputDir: 'D:/project',
  inputData: {
    changedFiles: ['src/auth/login.c', 'src/auth/auth.h'],
    changeType: 'modified'  // modified | added | deleted
  }
});
```

## 输入数据格式

### 验收标准 (acceptanceCriteria)

```json
{
  "acceptanceCriteria": [
    {
      "id": "AC-001",
      "requirement": "REQ-001",
      "description": "登录功能必须支持密码验证",
      "testType": "unit",
      "priority": "high",
      "testCases": [
        {
          "id": "TC-001",
          "name": "验证正确密码登录成功",
          "input": {"username": "user1", "password": "pass123"},
          "expected": {"result": true, "token": "jwt_token"}
        }
      ]
    }
  ]
}
```

### 项目配置

```json
{
  "projectType": "embedded-c",
  "targetPlatform": "arm-cortex-m4",
  "compiler": "arm-none-eabi-gcc",
  "buildSystem": "cmake",
  "testFramework": "unity",
  "coverageTool": "gcov",
  "staticAnalyzer": "cppcheck",
  "codingStandard": "misra-c-2012",
  "hardware": {
    "mcu": "STM32F407VGT6",
    "programmer": "jlink",
    "debugger": "jlink"
  }
}
```

### Sprint 任务 (sprintTasks)

```json
{
  "sprintTasks": [
    {
      "id": "TASK-001",
      "title": "实现用户登录 API",
      "storyPoints": 5,
      "status": "completed",
      "testCoverage": 85
    }
  ]
}
```

## 输出文件说明

### 测试计划 (test-plan.json)

```json
{
  "projectId": "proj-001",
  "testStrategy": {
    "unitTest": {
      "framework": "unity",
      "coverageTarget": 80,
      "testCount": 45
    },
    "integrationTest": {
      "framework": "unity",
      "coverageTarget": 100,
      "testCount": 12
    },
    "systemTest": {
      "framework": "custom",
      "coverageTarget": 95,
      "testCount": 20
    }
  },
  "testEnvironment": {
    "simulator": "qemu-arm",
    "hardware": false,
    "mocking": "cmock"
  },
  "totalTests": 77,
  "estimatedTime": "45 minutes"
}
```

### 单元测试报告 (unit-test/report.json)

```json
{
  "summary": {
    "total": 45,
    "passed": 43,
    "failed": 2,
    "skipped": 0,
    "passRate": 0.956,
    "duration": "12.5s"
  },
  "coverage": {
    "lines": 82.5,
    "functions": 88.3,
    "branches": 75.2,
    "statements": 83.1
  },
  "failures": [
    {
      "test": "test_login_with_invalid_password",
      "file": "test/test_auth.c",
      "line": 45,
      "expected": "false",
      "actual": "true",
      "message": "Password validation failed"
    }
  ]
}
```

### 代码质量报告 (code-quality/report.json)

```json
{
  "summary": {
    "score": "A",
    "totalIssues": 3,
    "critical": 0,
    "high": 1,
    "medium": 1,
    "low": 1
  },
  "staticAnalysis": {
    "tool": "cppcheck",
    "issues": [
      {
        "severity": "high",
        "file": "src/auth/login.c",
        "line": 78,
        "message": "Buffer overflow risk",
        "rule": "CERT C"
      }
    ]
  },
  "codingStandard": {
    "standard": "misra-c-2012",
    "compliance": 0.98,
    "violations": [
      {
        "rule": "Rule 11.3",
        "severity": "required",
        "file": "src/utils/string.c",
        "line": 23
      }
    ]
  }
}
```

## 高级用法

### 自定义测试框架

```javascript
const cicd = new TestingCICD({
  testFramework: 'unity',      // unity | cunit | gtest | check
  coverageTool: 'gcov',        // gcov | lcov | bullseye
  mockFramework: 'cmock',      // cmock | cppumock | custom
  staticAnalyzer: 'cppcheck',  // cppcheck | clang-tidy | pc-lint
  codingStandard: 'misra-c-2012'
});
```

### 质量门禁配置

```javascript
const cicd = new TestingCICD({
  qualityGate: {
    unitTestCoverage: 80,      // 最低单元测试覆盖率
    integrationTestPass: 100,  // 集成测试通过率
    systemTestPass: 95,        // 系统测试通过率
    codeQualityScore: 'A',     // 代码质量评分
    misraViolations: 0,        // MISRA 违规数（Required）
    securityVulnerabilities: 0 // 安全漏洞数
  }
});
```

### 生成 CI/CD 配置

```javascript
// 生成 GitHub Actions 配置
await cicd.execute({
  mode: 'generate-config',
  outputDir: 'D:/project',
  inputData: {
    platform: 'github-actions',
    triggers: ['push', 'pull_request'],
    branches: ['main', 'develop']
  }
});
```

## 与需求工程工作流集成

```javascript
const RequirementsWorkflow = require('C:/Users/zhang/.claude/workflows/requirements-engineering/workflow');
const TestingCICD = require('C:/Users/zhang/.claude/workflows/testing-cicd/workflow');

// 1. 执行需求工程工作流
const reqWorkflow = new RequirementsWorkflow();
const reqResult = await reqWorkflow.execute({
  mode: 'full-run',
  outputDir: 'D:/project'
});

// 2. 提取验收标准
const acceptanceCriteria = reqResult.output.acceptanceCriteria;

// 3. 执行测试工作流
const cicd = new TestingCICD();
const testResult = await cicd.execute({
  mode: 'full-pipeline',
  outputDir: 'D:/project',
  inputData: {
    acceptanceCriteria
  }
});
```

## 与 Scrum 工作流集成

```javascript
const ScrumWorkflow = require('C:/Users/zhang/.claude/workflows/scrum-development/workflow');
const TestingCICD = require('C:/Users/zhang/.claude/workflows/testing-cicd/workflow');

// Sprint 完成后执行测试
const scrum = new ScrumWorkflow();
const sprintReview = await scrum.execute({
  mode: 'sprint-review',
  sprintNumber: 1,
  outputDir: 'D:/project'
});

// 根据 Sprint 结果执行测试
const cicd = new TestingCICD();
const testResult = await cicd.execute({
  mode: 'test-only',
  outputDir: 'D:/project',
  inputData: {
    sprintTasks: sprintReview.tasks
  }
});
```

## 常见问题

### Q: 如何选择测试框架？

A: 嵌入式 C 项目推荐使用 Unity（轻量、易集成），如果需要更丰富的功能可以使用 Google Test。

### Q: 如何处理硬件依赖的测试？

A: 使用模拟器（如 QEMU）或硬件在环（HIL）测试，工作流支持配置测试环境。

### Q: 如何提高测试覆盖率？

A: 使用增量测试模式，专注于新代码和修改代码的测试。

### Q: 如何集成到现有项目？

A: 工作流支持单模块执行，可以逐步集成到现有 CI/CD 流程中。

### Q: 支持哪些目标平台？

A: 支持所有 ARM Cortex-M 系列，以及 RISC-V、MIPS 等架构，通过配置文件指定交叉编译工具链。
