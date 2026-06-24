/**
 * 测试规划模块
 *
 * 职责：
 * - 根据需求和代码结构生成测试计划
 * - 确定测试类型和覆盖率目标
 * - 生成测试用例矩阵
 */

const fs = require('fs');
const path = require('path');

class TestPlanning {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * 执行测试规划
   */
  async execute(config) {
    const { outputDir, inputData = {} } = config;

    // 1. 分析代码结构
    const codeAnalysis = this.analyzeCodeStructure(inputData);

    // 2. 分析验收标准
    const acceptanceAnalysis = this.analyzeAcceptanceCriteria(inputData.acceptanceCriteria);

    // 3. 设计测试策略
    const testStrategy = this.designTestStrategy(codeAnalysis, acceptanceAnalysis);

    // 4. 生成测试用例
    const testCases = this.generateTestCases(testStrategy, acceptanceAnalysis);

    // 5. 计算覆盖率目标
    const coverageTargets = this.calculateCoverageTargets(testStrategy);

    // 6. 估算测试时间
    const timeEstimate = this.estimateTestTime(testCases);

    // 7. 生成输出
    const result = {
      projectId: inputData.projectId || 'unknown',
      codeAnalysis,
      acceptanceAnalysis,
      testStrategy,
      testCases,
      coverageTargets,
      timeEstimate,
      summary: this.generateSummary(testStrategy, testCases, coverageTargets)
    };

    // 8. 保存到文件
    await this.saveOutput(outputDir, result);

    return result;
  }

  /**
   * 分析代码结构
   */
  analyzeCodeStructure(inputData) {
    const structure = {
      totalFiles: 0,
      sourceFiles: 0,
      headerFiles: 0,
      testFiles: 0,
      modules: [],
      functions: [],
      dependencies: []
    };

    // 如果提供了代码结构数据
    if (inputData.codeStructure) {
      Object.assign(structure, inputData.codeStructure);
    }

    return structure;
  }

  /**
   * 分析验收标准
   */
  analyzeAcceptanceCriteria(criteria) {
    if (!criteria || !Array.isArray(criteria)) {
      return {
        total: 0,
        byType: {},
        byPriority: {},
        testable: 0
      };
    }

    const analysis = {
      total: criteria.length,
      byType: {},
      byPriority: {},
      testable: 0,
      criteria: criteria
    };

    for (const item of criteria) {
      // 按类型统计
      const type = item.testType || 'functional';
      analysis.byType[type] = (analysis.byType[type] || 0) + 1;

      // 按优先级统计
      const priority = item.priority || 'medium';
      analysis.byPriority[priority] = (analysis.byPriority[priority] || 0) + 1;

      // 可测试性评估
      if (item.testCases && item.testCases.length > 0) {
        analysis.testable++;
      }
    }

    return analysis;
  }

  /**
   * 设计测试策略
   */
  designTestStrategy(codeAnalysis, acceptanceAnalysis) {
    const strategy = {
      unitTest: {
        enabled: true,
        framework: this.options.testFramework || 'unity',
        coverageTarget: this.options.qualityGate?.unitTestCoverage || 80,
        scope: 'functions',
        priority: 'high'
      },
      integrationTest: {
        enabled: true,
        framework: this.options.testFramework || 'unity',
        coverageTarget: 100,
        scope: 'modules',
        priority: 'high'
      },
      systemTest: {
        enabled: true,
        framework: 'custom',
        coverageTarget: this.options.qualityGate?.systemTestPass || 95,
        scope: 'system',
        priority: 'medium'
      },
      staticAnalysis: {
        enabled: true,
        tool: this.options.staticAnalyzer || 'cppcheck',
        standards: [this.options.codingStandard || 'misra-c-2012'],
        severity: 'required'
      },
      hardwareTest: {
        enabled: inputData?.hardware?.required || false,
        type: inputData?.hardware?.type || 'simulator',
        platform: inputData?.targetPlatform || 'arm-cortex-m4'
      }
    };

    return strategy;
  }

  /**
   * 生成测试用例
   */
  generateTestCases(strategy, acceptanceAnalysis) {
    const testCases = {
      unit: [],
      integration: [],
      system: []
    };

    // 从验收标准生成测试用例
    if (acceptanceAnalysis.criteria) {
      for (const criteria of acceptanceAnalysis.criteria) {
        const testType = criteria.testType || 'functional';

        if (testType === 'unit' || testType === 'functional') {
          testCases.unit.push(...this.generateUnitTestCases(criteria));
        } else if (testType === 'integration') {
          testCases.integration.push(...this.generateIntegrationTestCases(criteria));
        } else if (testType === 'system') {
          testCases.system.push(...this.generateSystemTestCases(criteria));
        }
      }
    }

    // 补充基础测试用例
    testCases.unit.push(...this.generateBasicUnitTests());
    testCases.integration.push(...this.generateBasicIntegrationTests());

    return testCases;
  }

  /**
   * 生成单元测试用例
   */
  generateUnitTestCases(criteria) {
    const cases = [];

    if (criteria.testCases) {
      for (const tc of criteria.testCases) {
        cases.push({
          id: tc.id,
          name: tc.name,
          type: 'unit',
          requirement: criteria.requirement,
          input: tc.input,
          expected: tc.expected,
          priority: criteria.priority,
          status: 'pending'
        });
      }
    }

    return cases;
  }

  /**
   * 生成集成测试用例
   */
  generateIntegrationTestCases(criteria) {
    const cases = [];

    cases.push({
      id: `INT-${criteria.id}`,
      name: `集成测试: ${criteria.description}`,
      type: 'integration',
      requirement: criteria.requirement,
      modules: [],
      priority: criteria.priority,
      status: 'pending'
    });

    return cases;
  }

  /**
   * 生成系统测试用例
   */
  generateSystemTestCases(criteria) {
    const cases = [];

    cases.push({
      id: `SYS-${criteria.id}`,
      name: `系统测试: ${criteria.description}`,
      type: 'system',
      requirement: criteria.requirement,
      priority: criteria.priority,
      status: 'pending'
    });

    return cases;
  }

  /**
   * 生成基础单元测试
   */
  generateBasicUnitTests() {
    return [
      {
        id: 'UNIT-BASIC-001',
        name: '空输入测试',
        type: 'unit',
        category: 'boundary',
        description: '验证函数对空输入的处理',
        priority: 'high',
        status: 'pending'
      },
      {
        id: 'UNIT-BASIC-002',
        name: '边界值测试',
        type: 'unit',
        category: 'boundary',
        description: '验证函数对边界值的处理',
        priority: 'high',
        status: 'pending'
      },
      {
        id: 'UNIT-BASIC-003',
        name: '错误处理测试',
        type: 'unit',
        category: 'error',
        description: '验证函数的错误处理机制',
        priority: 'medium',
        status: 'pending'
      }
    ];
  }

  /**
   * 生成基础集成测试
   */
  generateBasicIntegrationTests() {
    return [
      {
        id: 'INT-BASIC-001',
        name: '模块接口测试',
        type: 'integration',
        category: 'interface',
        description: '验证模块间接口的正确性',
        priority: 'high',
        status: 'pending'
      },
      {
        id: 'INT-BASIC-002',
        name: '数据流测试',
        type: 'integration',
        category: 'dataflow',
        description: '验证模块间数据传递的正确性',
        priority: 'medium',
        status: 'pending'
      }
    ];
  }

  /**
   * 计算覆盖率目标
   */
  calculateCoverageTargets(strategy) {
    return {
      lineCoverage: strategy.unitTest.coverageTarget,
      functionCoverage: strategy.unitTest.coverageTarget,
      branchCoverage: Math.floor(strategy.unitTest.coverageTarget * 0.9),
      statementCoverage: strategy.unitTest.coverageTarget,
      integrationCoverage: strategy.integrationTest.coverageTarget,
      systemCoverage: strategy.systemTest.coverageTarget
    };
  }

  /**
   * 估算测试时间
   */
  estimateTestTime(testCases) {
    const unitCount = testCases.unit.length;
    const integrationCount = testCases.integration.length;
    const systemCount = testCases.system.length;

    // 估算每个测试用例的执行时间（秒）
    const unitTimePerCase = 0.1;
    const integrationTimePerCase = 1;
    const systemTimePerCase = 10;

    const totalUnitTime = unitCount * unitTimePerCase;
    const totalIntegrationTime = integrationCount * integrationTimePerCase;
    const totalTimeSystemTime = systemCount * systemTimePerCase;

    const totalSeconds = totalUnitTime + totalIntegrationTime + totalTimeSystemTime;

    return {
      unitTests: {
        count: unitCount,
        estimatedTime: `${totalUnitTime.toFixed(1)}s`
      },
      integrationTests: {
        count: integrationCount,
        estimatedTime: `${totalIntegrationTime.toFixed(1)}s`
      },
      systemTests: {
        count: systemCount,
        estimatedTime: `${totalTimeSystemTime.toFixed(1)}s`
      },
      total: {
        count: unitCount + integrationCount + systemCount,
        estimatedTime: `${totalSeconds.toFixed(1)}s`,
        estimatedTimeFormatted: this.formatTime(totalSeconds)
      }
    };
  }

  /**
   * 格式化时间
   */
  formatTime(seconds) {
    if (seconds < 60) {
      return `${seconds.toFixed(1)} 秒`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes} 分 ${remainingSeconds.toFixed(0)} 秒`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const remainingMinutes = Math.floor((seconds % 3600) / 60);
      return `${hours} 小时 ${remainingMinutes} 分`;
    }
  }

  /**
   * 生成摘要
   */
  generateSummary(strategy, testCases, coverageTargets) {
    return {
      totalTestCases: testCases.unit.length + testCases.integration.length + testCases.system.length,
      unitTestCases: testCases.unit.length,
      integrationTestCases: testCases.integration.length,
      systemTestCases: testCases.system.length,
      coverageTargets,
      strategy: {
        unitTestFramework: strategy.unitTest.framework,
        integrationTestFramework: strategy.integrationTest.framework,
        staticAnalyzer: strategy.staticAnalysis.tool
      }
    };
  }

  /**
   * 保存输出
   */
  async saveOutput(outputDir, result) {
    const outputDirFull = path.join(outputDir, '00_Project_Management/08_持续集成与测试_DevOps');

    // 创建目录
    fs.mkdirSync(outputDirFull, { recursive: true });

    // 保存 JSON
    const jsonPath = path.join(outputDirFull, 'test-plan.json');
    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf-8');

    // 保存 Markdown
    const mdPath = path.join(outputDirFull, 'test-plan.md');
    const mdContent = this.generateMarkdown(result);
    fs.writeFileSync(mdPath, mdContent, 'utf-8');

    console.log(`   📁 测试计划已保存: ${outputDirFull}`);
  }

  /**
   * 生成 Markdown 文档
   */
  generateMarkdown(result) {
    const lines = [
      '# 测试计划',
      '',
      `**项目 ID**: ${result.projectId}`,
      '',
      `**生成时间**: ${new Date().toISOString()}`,
      '',
      '---',
      '',
      '## 测试策略',
      '',
      '### 单元测试',
      '',
      `- 框架: ${result.testStrategy.unitTest.framework}`,
      `- 覆盖率目标: ${result.testStrategy.unitTest.coverageTarget}%`,
      `- 优先级: ${result.testStrategy.unitTest.priority}`,
      '',
      '### 集成测试',
      '',
      `- 框架: ${result.testStrategy.integrationTest.framework}`,
      `- 覆盖率目标: ${result.testStrategy.integrationTest.coverageTarget}%`,
      `- 优先级: ${result.testStrategy.integrationTest.priority}`,
      '',
      '### 系统测试',
      '',
      `- 框架: ${result.testStrategy.systemTest.framework}`,
      `- 通过率目标: ${result.testStrategy.systemTest.coverageTarget}%`,
      `- 优先级: ${result.testStrategy.systemTest.priority}`,
      '',
      '### 静态分析',
      '',
      `- 工具: ${result.testStrategy.staticAnalysis.tool}`,
      `- 标准: ${result.testStrategy.staticAnalysis.standards.join(', ')}`,
      `- 严重级别: ${result.testStrategy.staticAnalysis.severity}`,
      '',
      '## 覆盖率目标',
      '',
      '| 指标 | 目标值 |',
      '|------|--------|',
      `| 行覆盖率 | ${result.coverageTargets.lineCoverage}% |`,
      `| 函数覆盖率 | ${result.coverageTargets.functionCoverage}% |`,
      `| 分支覆盖率 | ${result.coverageTargets.branchCoverage}% |`,
      `| 语句覆盖率 | ${result.coverageTargets.statementCoverage}% |`,
      '',
      '## 测试用例统计',
      '',
      '| 类型 | 数量 |',
      '|------|------|',
      `| 单元测试 | ${result.summary.unitTestCases} |`,
      `| 集成测试 | ${result.summary.integrationTestCases} |`,
      `| 系统测试 | ${result.summary.systemTestCases} |`,
      `| **总计** | **${result.summary.totalTestCases}** |`,
      '',
      '## 时间估算',
      '',
      '| 阶段 | 测试数 | 预计时间 |',
      '|------|--------|----------|',
      `| 单元测试 | ${result.timeEstimate.unitTests.count} | ${result.timeEstimate.unitTests.estimatedTime} |`,
      `| 集成测试 | ${result.timeEstimate.integrationTests.count} | ${result.timeEstimate.integrationTests.estimatedTime} |`,
      `| 系统测试 | ${result.timeEstimate.systemTests.count} | ${result.timeEstimate.systemTests.estimatedTime} |`,
      `| **总计** | **${result.timeEstimate.total.count}** | **${result.timeEstimate.total.estimatedTimeFormatted}** |`,
      ''
    ];

    return lines.join('\n');
  }
}

module.exports = TestPlanning;
