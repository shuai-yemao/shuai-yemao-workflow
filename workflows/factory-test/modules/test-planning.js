/**
 * 测试规划模块
 */

const fs = require('fs');
const path = require('path');
const FactoryTestManager = require('../utils/factory-test-manager');

class TestPlanning {
  constructor(options = {}) { this.options = options; this.manager = new FactoryTestManager(); }

  async execute(config) {
    const { outputDir, inputData } = config;
    console.log('  [TestPlanning] 开始测试规划...');

    this.validateInput(inputData);
    const plan = this.createPlan(inputData);
    const markdown = this.generateMarkdown(plan, inputData.product);

    const output = { product: inputData.product, plan, summary: this.generateSummary(plan) };
    this.saveOutput(outputDir, output, markdown);

    console.log(`  [TestPlanning] 完成，规划了 ${plan.testCases.length} 个测试用例`);
    return { success: true, plan, summary: output.summary, markdown };
  }

  validateInput(inputData) {
    if (!inputData.product) throw new Error('Product information is required');
    if (!inputData.testCases || !Array.isArray(inputData.testCases)) throw new Error('Test cases array is required');
  }

  createPlan(inputData) {
    const testCases = inputData.testCases.map(tc => ({
      id: tc.id || this.manager.generateId('TC'),
      name: tc.name,
      type: tc.type || 'fct',
      description: tc.description || '',
      steps: tc.steps || [],
      expectedResults: tc.expectedResults || [],
      duration: tc.duration || 0,
      equipment: tc.equipment || [],
      passCriteria: tc.passCriteria || '',
      status: 'planned'
    }));

    return { testCases, totalDuration: testCases.reduce((sum, tc) => sum + (tc.duration || 0), 0), byType: this.groupByType(testCases) };
  }

  groupByType(testCases) {
    const groups = {};
    for (const tc of testCases) { groups[tc.type] = (groups[tc.type] || 0) + 1; }
    return groups;
  }

  generateSummary(plan) {
    return { totalTestCases: plan.testCases.length, totalDuration: plan.totalDuration, byType: plan.byType };
  }

  generateMarkdown(plan, product) {
    const summary = this.generateSummary(plan);
    let md = `# 工厂测试规划报告\n\n**产品**: ${product.name} (${product.id})\n**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
    md += `## 概览\n\n| 指标 | 值 |\n|------|----|\n| 测试用例数 | ${summary.totalTestCases} |\n| 总测试时长 | ${summary.totalDuration} 分钟 |\n\n`;
    md += `## 按测试类型\n\n| 类型 | 数量 |\n|------|------|\n`;
    for (const [type, count] of Object.entries(summary.byType)) { md += `| ${type} | ${count} |\n`; }
    md += `\n## 测试用例清单\n\n| ID | 名称 | 类型 | 时长(分) | 设备 |\n|-----|------|------|----------|------|\n`;
    for (const tc of plan.testCases) { md += `| ${tc.id} | ${tc.name} | ${tc.type} | ${tc.duration || '-'} | ${tc.equipment.join(', ') || '-'} |\n`; }
    md += `\n## 详细信息\n\n`;
    for (const tc of plan.testCases) {
      md += `### ${tc.name}\n\n- **ID**: ${tc.id}\n- **类型**: ${tc.type}\n- **描述**: ${tc.description || '无'}\n- **通过标准**: ${tc.passCriteria || '待定'}\n`;
      if (tc.steps.length > 0) { md += `- **测试步骤**:\n`; for (let i = 0; i < tc.steps.length; i++) { md += `  ${i + 1}. ${tc.steps[i]}\n`; } }
      md += `\n`;
    }
    return md;
  }

  saveOutput(outputDir, output, markdown) {
    const dirPath = path.join(outputDir, '00_Project_Management/06_Factory', 'test-planning');
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(path.join(dirPath, 'test-plan.json'), JSON.stringify(output, null, 2), 'utf8');
    fs.writeFileSync(path.join(dirPath, 'test-plan.md'), markdown, 'utf8');
  }
}

module.exports = TestPlanning;
