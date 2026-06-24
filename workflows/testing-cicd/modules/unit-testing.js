/**
 * 单元测试模块
 *
 * 职责：
 * - 执行单元测试
 * - 收集覆盖率数据
 * - 生成测试报告
 */

const fs = require('fs');
const path = require('path');

class UnitTesting {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * 执行单元测试
   */
  async execute(config) {
    const { outputDir, inputData = {} } = config;

    // 1. 准备测试环境
    const testEnv = this.prepareTestEnvironment(inputData);

    // 2. 执行测试
    const testResults = this.executeTests(testEnv);

    // 3. 收集覆盖率
    const coverage = this.collectCoverage(testEnv);

    // 4. 分析失败用例
    const failures = this.analyzeFailures(testResults);

    // 5. 生成输出
    const result = {
      summary: {
        total: testResults.total,
        passed: testResults.passed,
        failed: testResults.failed,
        skipped: testResults.skipped,
        passRate: testResults.total > 0 ? testResults.passed / testResults.total : 0,
        duration: testResults.duration
      },
      coverage,
      failures,
      testDetails: testResults.details,
      recommendations: this.generateRecommendations(coverage, failures)
    };

    // 6. 保存到文件
    await this.saveOutput(outputDir, result);

    return result;
  }

  /**
   * 准备测试环境
   */
  prepareTestEnvironment(inputData) {
    return {
      framework: this.options.testFramework || 'unity',
      coverageTool: this.options.coverageTool || 'gcov',
      sourceDir: inputData.sourceDir || 'src',
      testDir: inputData.testDir || 'test/unit',
      includeDir: inputData.includeDir || 'include',
      buildDir: inputData.buildDir || 'build/test',
      testFilter: inputData.testFilter || null
    };
  }

  /**
   * 执行测试
   */
  executeTests(testEnv) {
    console.log(`   🧪 使用 ${testEnv.framework} 框架执行单元测试...`);

    // 模拟测试执行结果
    // 实际实现中会调用具体的测试框架
    const results = {
      total: 45,
      passed: 43,
      failed: 2,
      skipped: 0,
      duration: '12.5s',
      details: [
        {
          name: 'test_auth_login_valid_credentials',
          status: 'passed',
          duration: '0.05s'
        },
        {
          name: 'test_auth_login_invalid_password',
          status: 'passed',
          duration: '0.03s'
        },
        {
          name: 'test_auth_login_empty_username',
          status: 'failed',
          duration: '0.02s',
          message: 'Expected false but got true',
          file: 'test/test_auth.c',
          line: 45
        },
        {
          name: 'test_auth_logout_active_session',
          status: 'passed',
          duration: '0.04s'
        },
        {
          name: 'test_auth_token_generation',
          status: 'failed',
          duration: '0.08s',
          message: 'Token generation failed',
          file: 'test/test_auth.c',
          line: 78
        }
      ]
    };

    console.log(`   ✅ 测试完成: ${results.passed}/${results.total} 通过`);

    return results;
  }

  /**
   * 收集覆盖率
   */
  collectCoverage(testEnv) {
    console.log(`   📊 收集覆盖率数据 (${testEnv.coverageTool})...`);

    // 模拟覆盖率数据
    // 实际实现中会解析覆盖率报告
    const coverage = {
      lines: {
        total: 1200,
        covered: 990,
        percentage: 82.5
      },
      functions: {
        total: 150,
        covered: 132,
        percentage: 88.0
      },
      branches: {
        total: 320,
        covered: 241,
        percentage: 75.3
      },
      statements: {
        total: 1150,
        covered: 956,
        percentage: 83.1
      },
      uncoveredFiles: [
        {
          file: 'src/utils/debug.c',
          lines: 45,
          functions: 3
        },
        {
          file: 'src/hal/uart.c',
          lines: 28,
          functions: 2
        }
      ]
    };

    console.log(`   📈 行覆盖率: ${coverage.lines.percentage}%`);

    return coverage;
  }

  /**
   * 分析失败用例
   */
  analyzeFailures(testResults) {
    const failures = testResults.details
      ? testResults.details.filter(t => t.status === 'failed')
      : [];

    return failures.map(failure => ({
      ...failure,
      analysis: this.analyzeFailure(failure),
      suggestion: this.suggestFix(failure)
    }));
  }

  /**
   * 分析单个失败
   */
  analyzeFailure(failure) {
    const message = failure.message || '';

    if (message.includes('Expected') && message.includes('but got')) {
      return '断言失败 - 实际值与预期值不匹配';
    } else if (message.includes('timeout') || message.includes('Timeout')) {
      return '超时 - 函数执行时间过长';
    } else if (message.includes('segfault') || message.includes('SIGSEGV')) {
      return '段错误 - 内存访问违规';
    } else if (message.includes('leak') || message.includes('Leak')) {
      return '内存泄漏';
    }

    return '未知错误';
  }

  /**
   * 建议修复方案
   */
  suggestFix(failure) {
    const analysis = this.analyzeFailure(failure);

    if (analysis.includes('断言失败')) {
      return '检查函数逻辑，确保返回值符合预期';
    } else if (analysis.includes('超时')) {
      return '优化算法复杂度，或检查是否有死循环';
    } else if (analysis.includes('段错误')) {
      return '检查指针使用，确保内存分配正确';
    } else if (analysis.includes('内存泄漏')) {
      return '检查 malloc/free 配对，使用内存检测工具';
    }

    return '查看详细日志进行调试';
  }

  /**
   * 生成建议
   */
  generateRecommendations(coverage, failures) {
    const recommendations = [];

    // 基于覆盖率的建议
    if (coverage.lines.percentage < 80) {
      recommendations.push({
        type: 'coverage',
        severity: 'high',
        message: `行覆盖率 ${coverage.lines.percentage}% 低于目标 80%`,
        action: '增加测试用例，覆盖未测试的代码路径'
      });
    }

    if (coverage.branches.percentage < 70) {
      recommendations.push({
        type: 'coverage',
        severity: 'medium',
        message: `分支覆盖率 ${coverage.branches.percentage}% 偏低`,
        action: '添加边界值测试和条件分支测试'
      });
    }

    // 基于失败的建议
    if (failures.length > 0) {
      recommendations.push({
        type: 'failure',
        severity: 'high',
        message: `${failures.length} 个测试用例失败`,
        action: '优先修复失败的测试用例'
      });
    }

    // 基于未覆盖文件的建议
    if (coverage.uncoveredFiles && coverage.uncoveredFiles.length > 0) {
      recommendations.push({
        type: 'uncovered',
        severity: 'medium',
        message: `${coverage.uncoveredFiles.length} 个文件未完全覆盖`,
        action: '为这些文件添加单元测试'
      });
    }

    return recommendations;
  }

  /**
   * 保存输出
   */
  async saveOutput(outputDir, result) {
    const outputDirFull = path.join(outputDir, '00_Project_Management/08_持续集成与测试_DevOps/unit-test');

    // 创建目录
    fs.mkdirSync(outputDirFull, { recursive: true });

    // 保存 JSON
    const jsonPath = path.join(outputDirFull, 'report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf-8');

    // 保存覆盖率 JSON
    const coveragePath = path.join(outputDirFull, 'coverage.json');
    fs.writeFileSync(coveragePath, JSON.stringify(result.coverage, null, 2), 'utf-8');

    // 保存 Markdown
    const mdPath = path.join(outputDirFull, 'report.md');
    const mdContent = this.generateMarkdown(result);
    fs.writeFileSync(mdPath, mdContent, 'utf-8');

    console.log(`   📁 单元测试报告已保存: ${outputDirFull}`);
  }

  /**
   * 生成 Markdown 文档
   */
  generateMarkdown(result) {
    const lines = [
      '# 单元测试报告',
      '',
      `**生成时间**: ${new Date().toISOString()}`,
      '',
      '---',
      '',
      '## 测试摘要',
      '',
      `- 总测试数: ${result.summary.total}`,
      `- 通过: ${result.summary.passed}`,
      `- 失败: ${result.summary.failed}`,
      `- 跳过: ${result.summary.skipped}`,
      `- 通过率: ${(result.summary.passRate * 100).toFixed(1)}%`,
      `- 执行时间: ${result.summary.duration}`,
      '',
      '## 覆盖率',
      '',
      '| 指标 | 总数 | 已覆盖 | 覆盖率 |',
      '|------|------|--------|--------|',
      `| 行 | ${result.coverage.lines.total} | ${result.coverage.lines.covered} | ${result.coverage.lines.percentage}% |`,
      `| 函数 | ${result.coverage.functions.total} | ${result.coverage.functions.covered} | ${result.coverage.functions.percentage}% |`,
      `| 分支 | ${result.coverage.branches.total} | ${result.coverage.branches.covered} | ${result.coverage.branches.percentage}% |`,
      `| 语句 | ${result.coverage.statements.total} | ${result.coverage.statements.covered} | ${result.coverage.statements.percentage}% |`,
      ''
    ];

    if (result.failures.length > 0) {
      lines.push('## 失败用例', '');

      for (const failure of result.failures) {
        lines.push(`### ${failure.name}`, '');
        lines.push(`- 文件: ${failure.file}:${failure.line}`);
        lines.push(`- 错误: ${failure.message}`);
        lines.push(`- 分析: ${failure.analysis}`);
        lines.push(`- 建议: ${failure.suggestion}`);
        lines.push('');
      }
    }

    if (result.recommendations.length > 0) {
      lines.push('## 建议', '');

      for (const rec of result.recommendations) {
        lines.push(`- **[${rec.severity}]** ${rec.message}`);
        lines.push(`  - 操作: ${rec.action}`);
        lines.push('');
      }
    }

    if (result.coverage.uncoveredFiles && result.coverage.uncoveredFiles.length > 0) {
      lines.push('## 未覆盖文件', '');

      for (const file of result.coverage.uncoveredFiles) {
        lines.push(`- ${file.file}: ${file.lines} 行, ${file.functions} 函数`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}

module.exports = UnitTesting;
