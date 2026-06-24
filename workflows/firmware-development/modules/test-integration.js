/**
 * 测试集成模块
 */

const fs = require('fs');
const path = require('path');
const FirmwareManager = require('../utils/firmware-manager');

class TestIntegration {
  constructor(options = {}) { this.options = options; this.manager = new FirmwareManager(); }

  async execute(config) {
    const { outputDir, inputData } = config;
    console.log('  [TestIntegration] 开始测试集成...');

    this.validateInput(inputData);
    const tests = this.manageTests(inputData);
    const markdown = this.generateMarkdown(tests, inputData.product);

    const output = { product: inputData.product, tests, summary: this.generateSummary(tests) };
    this.saveOutput(outputDir, output, markdown);

    console.log(`  [TestIntegration] 完成，管理了 ${tests.testSuites.length} 个测试套件`);
    return { success: true, tests, summary: output.summary, markdown };
  }

  validateInput(inputData) {
    if (!inputData.product) throw new Error('Product information is required');
    if (!inputData.testSuites || !Array.isArray(inputData.testSuites)) throw new Error('Test suites array is required');
  }

  manageTests(inputData) {
    const testSuites = inputData.testSuites.map(suite => ({
      id: suite.id || this.manager.generateId('TST'),
      name: suite.name,
      type: suite.type || 'unit',
      status: suite.status || 'pending',
      tests: (suite.tests || []).map(test => ({
        id: test.id || this.manager.generateId('TC'),
        name: test.name,
        status: test.status || 'pending',
        duration: test.duration || null,
        assertions: test.assertions || 0
      })),
      coverage: suite.coverage || null,
      startTime: suite.startTime || null,
      endTime: suite.endTime || null
    }));

    return { testSuites, totalTests: testSuites.reduce((sum, s) => sum + s.tests.length, 0), passedTests: testSuites.reduce((sum, s) => sum + s.tests.filter(t => t.status === 'passed').length, 0), failedTests: testSuites.reduce((sum, s) => sum + s.tests.filter(t => t.status === 'failed').length, 0) };
  }

  generateSummary(tests) {
    return { totalSuites: tests.testSuites.length, totalTests: tests.totalTests, passed: tests.passedTests, failed: tests.failedTests, passRate: tests.totalTests > 0 ? Math.round((tests.passedTests / tests.totalTests) * 100) : 0 };
  }

  generateMarkdown(tests, product) {
    const summary = this.generateSummary(tests);
    let md = `# 固件测试集成报告\n\n**产品**: ${product.name} (${product.id})\n**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
    md += `## 测试概览\n\n| 指标 | 值 |\n|------|----|\n| 测试套件数 | ${summary.totalSuites} |\n| 测试用例数 | ${summary.totalTests} |\n| 通过 | ${summary.passed} |\n| 失败 | ${summary.failed} |\n| 通过率 | ${summary.passRate}% |\n\n`;
    md += `## 测试套件\n\n| ID | 名称 | 类型 | 状态 | 用例数 | 通过率 |\n|-----|------|------|------|--------|--------|\n`;
    for (const suite of tests.testSuites) {
      const statusIcon = suite.status === 'passed' ? '✅' : suite.status === 'failed' ? '❌' : '⏳';
      const suitePassRate = suite.tests.length > 0 ? Math.round((suite.tests.filter(t => t.status === 'passed').length / suite.tests.length) * 100) : 0;
      md += `| ${suite.id} | ${suite.name} | ${suite.type} | ${statusIcon} ${suite.status} | ${suite.tests.length} | ${suitePassRate}% |\n`;
    }
    md += `\n## 失败用例\n\n`;
    const failedTests = tests.testSuites.flatMap(s => s.tests.filter(t => t.status === 'failed').map(t => ({ suite: s.name, ...t })));
    if (failedTests.length > 0) {
      md += `| 套件 | 用例 | 耗时 |\n|------|------|------|\n`;
      for (const test of failedTests) { md += `| ${test.suite} | ${test.name} | ${test.duration || '-'} |\n`; }
    } else { md += `无失败用例\n`; }
    return md;
  }

  saveOutput(outputDir, output, markdown) {
    const dirPath = path.join(outputDir, '00_Project_Management/03_Firmware', 'test-integration');
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(path.join(dirPath, 'tests.json'), JSON.stringify(output, null, 2), 'utf8');
    fs.writeFileSync(path.join(dirPath, 'tests-report.md'), markdown, 'utf8');
  }
}

module.exports = TestIntegration;
