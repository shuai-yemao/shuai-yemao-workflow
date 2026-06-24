/**
 * 版权管理模块
 */

const fs = require('fs');
const path = require('path');
const IpManager = require('../utils/ip-manager');

class CopyrightManagement {
  constructor(options = {}) { this.options = options; this.manager = new IpManager(); }

  async execute(config) {
    const { outputDir, inputData } = config;
    console.log('  [CopyrightManagement] 开始版权管理...');

    this.validateInput(inputData);
    const copyrights = this.manageCopyrights(inputData);
    const markdown = this.generateMarkdown(copyrights, inputData.product);

    const output = { product: inputData.product, copyrights, summary: this.generateSummary(copyrights) };
    this.saveOutput(outputDir, output, markdown);

    console.log(`  [CopyrightManagement] 完成，管理了 ${copyrights.length} 项版权`);
    return { success: true, copyrights, summary: output.summary, markdown };
  }

  validateInput(inputData) {
    if (!inputData.product) throw new Error('Product information is required');
    if (!inputData.copyrights || !Array.isArray(inputData.copyrights)) throw new Error('Copyrights array is required');
  }

  manageCopyrights(inputData) {
    return inputData.copyrights.map(cr => ({
      id: cr.id || this.manager.generateId('CR'),
      title: cr.title,
      type: cr.type || 'software',
      status: cr.status || 'planned',
      description: cr.description || '',
      author: cr.author || '',
      registrationDate: cr.registrationDate || null,
      registrationNumber: cr.registrationNumber || '',
      cost: cr.cost || 0,
      createdAt: new Date().toISOString()
    }));
  }

  generateSummary(copyrights) {
    return { total: copyrights.length, byType: { software: copyrights.filter(c => c.type === 'software').length, documentation: copyrights.filter(c => c.type === 'documentation').length, design: copyrights.filter(c => c.type === 'design').length, other: copyrights.filter(c => c.type === 'other').length }, registered: copyrights.filter(c => c.status === 'registered').length, totalCost: copyrights.reduce((sum, c) => sum + (c.cost || 0), 0) };
  }

  generateMarkdown(copyrights, product) {
    const summary = this.generateSummary(copyrights);
    let md = `# 版权管理报告\n\n**产品**: ${product.name} (${product.id})\n**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
    md += `## 概览\n\n| 指标 | 值 |\n|------|----|\n| 总版权数 | ${summary.total} |\n| 软件版权 | ${summary.byType.software} |\n| 文档版权 | ${summary.byType.documentation} |\n| 设计版权 | ${summary.byType.design} |\n| 已登记 | ${summary.registered} |\n| 总费用 | ¥${summary.totalCost.toLocaleString()} |\n\n`;
    md += `## 版权清单\n\n| ID | 名称 | 类型 | 状态 | 登记号 | 登记日 |\n|-----|------|------|------|--------|--------|\n`;
    for (const cr of copyrights) { const statusIcon = cr.status === 'registered' ? '✅' : '📝'; md += `| ${cr.id} | ${cr.title} | ${cr.type} | ${statusIcon} ${cr.status} | ${cr.registrationNumber || '-'} | ${cr.registrationDate || '-'} |\n`; }
    return md;
  }

  saveOutput(outputDir, output, markdown) {
    const dirPath = path.join(outputDir, '00_Project_Management/06_知识产权', 'copyright-management');
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(path.join(dirPath, 'copyrights.json'), JSON.stringify(output, null, 2), 'utf8');
    fs.writeFileSync(path.join(dirPath, 'copyrights-report.md'), markdown, 'utf8');
  }
}

module.exports = CopyrightManagement;
