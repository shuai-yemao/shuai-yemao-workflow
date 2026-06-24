/**
 * 需求管理模块
 */

const fs = require('fs');
const path = require('path');
const SoftwareManager = require('../utils/software-manager');

class RequirementManagement {
  constructor(options = {}) { this.options = options; this.manager = new SoftwareManager(); }

  async execute(config) {
    const { outputDir, inputData } = config;
    console.log('  [RequirementManagement] 开始需求管理...');

    this.validateInput(inputData);
    const requirements = this.manageRequirements(inputData);
    const markdown = this.generateMarkdown(requirements, inputData.product);

    const output = { product: inputData.product, requirements, summary: this.generateSummary(requirements) };
    this.saveOutput(outputDir, output, markdown);

    console.log(`  [RequirementManagement] 完成，管理了 ${requirements.length} 条需求`);
    return { success: true, requirements, summary: output.summary, markdown };
  }

  validateInput(inputData) {
    if (!inputData.product) throw new Error('Product information is required');
    if (!inputData.requirements || !Array.isArray(inputData.requirements)) throw new Error('Requirements array is required');
  }

  manageRequirements(inputData) {
    return inputData.requirements.map(req => ({
      id: req.id || this.manager.generateId('REQ'),
      title: req.title,
      description: req.description || '',
      type: req.type || 'functional',
      priority: req.priority || 'medium',
      status: req.status || 'planned',
      module: req.module || '',
      acceptanceCriteria: req.acceptanceCriteria || [],
      dependencies: req.dependencies || [],
      createdAt: new Date().toISOString()
    }));
  }

  generateSummary(requirements) {
    return { total: requirements.length, byType: { functional: requirements.filter(r => r.type === 'functional').length, nonFunctional: requirements.filter(r => r.type === 'non-functional').length, technical: requirements.filter(r => r.type === 'technical').length }, byPriority: { high: requirements.filter(r => r.priority === 'high').length, medium: requirements.filter(r => r.priority === 'medium').length, low: requirements.filter(r => r.priority === 'low').length }, byStatus: { planned: requirements.filter(r => r.status === 'planned').length, 'in-progress': requirements.filter(r => r.status === 'in-progress').length, completed: requirements.filter(r => r.status === 'completed').length } };
  }

  generateMarkdown(requirements, product) {
    const summary = this.generateSummary(requirements);
    let md = `# 软件需求管理报告\n\n**产品**: ${product.name} (${product.id})\n**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
    md += `## 概览\n\n| 指标 | 值 |\n|------|----|\n| 总需求数 | ${summary.total} |\n| 功能需求 | ${summary.byType.functional} |\n| 非功能需求 | ${summary.byType.nonFunctional} |\n| 技术需求 | ${summary.byType.technical} |\n| 高优先级 | ${summary.byPriority.high} |\n| 中优先级 | ${summary.byPriority.medium} |\n| 低优先级 | ${summary.byPriority.low} |\n\n`;
    md += `## 需求清单\n\n| ID | 标题 | 类型 | 优先级 | 状态 | 模块 |\n|-----|------|------|--------|------|------|\n`;
    for (const req of requirements) { const priIcon = req.priority === 'high' ? '🔴' : req.priority === 'medium' ? '🟡' : '🟢'; md += `| ${req.id} | ${req.title} | ${req.type} | ${priIcon} ${req.priority} | ${req.status} | ${req.module || '-'} |\n`; }
    return md;
  }

  saveOutput(outputDir, output, markdown) {
    const dirPath = path.join(outputDir, '00_Project_Management/04_Software', 'requirement-management');
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(path.join(dirPath, 'requirements.json'), JSON.stringify(output, null, 2), 'utf8');
    fs.writeFileSync(path.join(dirPath, 'requirements.md'), markdown, 'utf8');
  }
}

module.exports = RequirementManagement;
