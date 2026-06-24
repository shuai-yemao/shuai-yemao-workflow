/**
 * 工厂测试工作流
 * 用于管理工厂测试规划和执行
 */

const fs = require('fs');
const path = require('path');
const TestPlanning = require('./modules/test-planning');
const TestExecution = require('./modules/test-execution');
const FactoryTestManager = require('./utils/factory-test-manager');

class FactoryTestWorkflow {
  constructor(options = {}) {
    this.options = options;
    this.manager = new FactoryTestManager();

    this.moduleMap = {
      'test-planning': TestPlanning,
      'test-execution': TestExecution
    };
  }

  async execute(config) {
    const { mode, outputDir, inputData } = config;
    console.log(`[FactoryTest] 开始执行，模式: ${mode}`);

    if (!outputDir) throw new Error('outputDir is required');

    let result;

    switch (mode) {
      case 'full-run':
        result = await this.executeFullRun(outputDir, inputData);
        break;
      case 'plan-tests':
        result = await this.executeModule('test-planning', outputDir, inputData);
        break;
      case 'execute-tests':
        result = await this.executeModule('test-execution', outputDir, inputData);
        break;
      case 'single':
        if (!config.module) throw new Error('module name is required for single mode');
        result = await this.executeModule(config.module, outputDir, inputData);
        break;
      case 'statistics':
        result = this.getStatistics(outputDir, inputData?.recordId);
        break;
      default:
        throw new Error(`Unknown mode: ${mode}`);
    }

    console.log(`[FactoryTest] 执行完成`);
    return result;
  }

  async executeFullRun(outputDir, inputData) {
    const results = {};

    console.log('\n[Phase 1] 测试规划');
    results.testPlanning = await this.executeModule('test-planning', outputDir, inputData);

    console.log('\n[Phase 2] 测试执行');
    if (inputData.testRuns) {
      results.testExecution = await this.executeModule('test-execution', outputDir, inputData);
    }

    return { success: true, mode: 'full-run', results, summary: this.generateFullRunSummary(results) };
  }

  async executeModule(moduleName, outputDir, inputData) {
    const ModuleClass = this.moduleMap[moduleName];
    if (!ModuleClass) throw new Error(`Unknown module: ${moduleName}`);
    const module = new ModuleClass(this.options);
    return await module.execute({ outputDir, inputData });
  }

  getStatistics(outputDir, recordId = null) {
    const stats = this.manager.getStatistics(outputDir, recordId);
    const markdown = this.generateStatisticsMarkdown(stats);
    return { success: true, statistics: stats, markdown };
  }

  generateStatisticsMarkdown(stats) {
    let md = `# 工厂测试统计报告\n\n**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
    md += `## 总体统计\n\n| 指标 | 值 |\n|------|----|\n`;
    md += `| 总测试用例 | ${stats.totalTestCases} |\n| 总测试运行 | ${stats.totalTestRuns} |\n| 通过率 | ${stats.passRate}% |\n\n`;
    md += `## 按测试类型\n\n| 类型 | 数量 |\n|------|------|\n`;
    for (const [type, count] of Object.entries(stats.byType)) { md += `| ${type} | ${count} |\n`; }
    return md;
  }

  generateFullRunSummary(results) {
    return {
      testCases: results.testPlanning?.summary?.totalTestCases || 0,
      testRuns: results.testExecution?.summary?.totalRuns || 0,
      passRate: results.testExecution?.summary?.passRate || 0,
      markdown: `# 工厂测试完整报告\n\n## 执行摘要\n\n- 测试用例: ${results.testPlanning?.summary?.totalTestCases || 0} 个\n- 测试运行: ${results.testExecution?.summary?.totalRuns || 0} 次\n- 通过率: ${results.testExecution?.summary?.passRate || 0}%\n`
    };
  }
}

module.exports = FactoryTestWorkflow;
