/**
 * 测试执行模块
 */

const fs = require('fs');
const path = require('path');
const FactoryTestManager = require('../utils/factory-test-manager');

class TestExecution {
  constructor(options = {}) { this.options = options; this.manager = new FactoryTestManager(); }

  async execute(config) {
    const { outputDir, inputData } = config;
    console.log('  [TestExecution] 开始测试执行...');

    this.validateInput(inputData);
    const execution = this.executeTests(inputData);
    const markdown = this.generateMarkdown(execution, inputData.product);

    const output = { product: inputData.product, execution, summary: this.generateSummary(execution) };
    this.saveOutput(outputDir, output, markdown);

    console.log(`  [TestExecution] 完成，执行了 ${execution.testRuns.length} 个测试`);
    return { success: true, execution, summary: output.summary, markdown };
  }

  validateInput(inputData) {
    if (!inputData.product) throw new Error('Product information is required');
    if (!inputData.testRuns || !Array.isArray(inputData.testRuns)) throw new Error('Test runs array is required');
  }

  executeTests(inputData) {
    const testRuns = inputData.testRuns.map(run => ({
      id: run.id || this.manager.generateId('TR'),
      testCaseId: run.testCaseId,
      testCaseName: run.testCaseName || '',
      serialNumber: run.serialNumber || '',
      operator: run.operator || '',
      startTime: run.startTime || new Date().toISOString(),
      endTime: run.endTime || null,
      result: run.result || 'pending',
      measurements: run.measurements || [],
      defects: run.defects || [],
      notes: run.notes || ''
    }));

    return { testRuns, passRate: this.calculatePassRate(testRuns) };
  }

  calculatePassRate(testRuns) {
    const completed = testRuns.filter(r => r.result === 'pass' || r.result === 'fail');
    if (completed.length === 0) return 0;
    return Math.round((completed.filter(r => r.result === 'pass').length / completed.length) * 100);
  }

  generateSummary(execution) {
    return { totalRuns: execution.testRuns.length, passed: execution.testRuns.filter(r => r.result === 'pass').length, failed: execution.testRuns.filter(r => r.result === 'fail').length, pending: execution.testRuns.filter(r => r.result === 'pending').length, passRate: execution.passRate };
  }

  generateMarkdown(execution, product) {
    const summary = this.generateSummary(execution);
    let md = `# 工厂测试执行报告\n\n**产品**: ${product.name} (${product.id})\n**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
    md += `## 概览\n\n| 指标 | 值 |\n|------|----|\n| 总测试数 | ${summary.totalRuns} |\n| 通过 | ${summary.passed} |\n| 失败 | ${summary.failed} |\n| 待执行 | ${summary.pending} |\n| 通过率 | ${summary.passRate}% |\n\n`;
    md += `## 测试结果\n\n| ID | 测试用例 | 产品序列号 | 操作员 | 结果 |\n|-----|----------|------------|--------|------|\n`;
    for (const run of execution.testRuns) { const resultIcon = run.result === 'pass' ? '✅' : run.result === 'fail' ? '❌' : '⏳'; md += `| ${run.id} | ${run.testCaseName} | ${run.serialNumber} | ${run.operator} | ${resultIcon} ${run.result} |\n`; }
    md += `\n## 失败详情\n\n`;
    const failedRuns = execution.testRuns.filter(r => r.result === 'fail');
    if (failedRuns.length > 0) {
      for (const run of failedRuns) {
        md += `### ${run.testCaseName} (${run.serialNumber})\n\n`;
        if (run.defects.length > 0) {
          md += `- **缺陷**:\n`;
          for (const defect of run.defects) { md += `  - ${defect.description || defect}\n`; }
        }
        md += `\n`;
      }
    } else { md += `无失败测试\n`; }
    return md;
  }

  saveOutput(outputDir, output, markdown) {
    const dirPath = path.join(outputDir, '00_Project_Management/06_Factory', 'test-execution');
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(path.join(dirPath, 'test-execution.json'), JSON.stringify(output, null, 2), 'utf8');
    fs.writeFileSync(path.join(dirPath, 'test-execution.md'), markdown, 'utf8');
  }
}

module.exports = TestExecution;
