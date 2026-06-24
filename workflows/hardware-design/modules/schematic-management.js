/**
 * 原理图管理模块
 */

const fs = require('fs');
const path = require('path');
const HardwareManager = require('../utils/hardware-manager');

class SchematicManagement {
  constructor(options = {}) { this.options = options; this.manager = new HardwareManager(); }

  async execute(config) {
    const { outputDir, inputData } = config;
    console.log('  [SchematicManagement] 开始原理图管理...');

    this.validateInput(inputData);
    const schematics = this.manageSchematics(inputData);
    const markdown = this.generateMarkdown(schematics, inputData.product);

    const output = { product: inputData.product, schematics, summary: this.generateSummary(schematics) };
    this.saveOutput(outputDir, output, markdown);

    console.log(`  [SchematicManagement] 完成，管理了 ${schematics.length} 个原理图`);
    return { success: true, schematics, summary: output.summary, markdown };
  }

  validateInput(inputData) {
    if (!inputData.product) throw new Error('Product information is required');
    if (!inputData.schematics || !Array.isArray(inputData.schematics)) throw new Error('Schematics array is required');
  }

  manageSchematics(inputData) {
    return inputData.schematics.map(sch => ({
      id: sch.id || this.manager.generateId('SCH'),
      name: sch.name,
      version: sch.version || '1.0',
      status: sch.status || 'draft',
      description: sch.description || '',
      pages: sch.pages || 0,
      components: sch.components || [],
      reviews: (sch.reviews || []).map(r => ({ ...r, date: r.date || new Date().toISOString() })),
      createdAt: new Date().toISOString()
    }));
  }

  generateSummary(schematics) {
    return { total: schematics.length, byStatus: { draft: schematics.filter(s => s.status === 'draft').length, reviewed: schematics.filter(s => s.status === 'reviewed').length, approved: schematics.filter(s => s.status === 'approved').length, rejected: schematics.filter(s => s.status === 'rejected').length } };
  }

  generateMarkdown(schematics, product) {
    const summary = this.generateSummary(schematics);
    let md = `# 原理图管理报告\n\n**产品**: ${product.name} (${product.id})\n**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
    md += `## 概览\n\n| 指标 | 值 |\n|------|----|\n| 总原理图数 | ${summary.total} |\n| 草稿 | ${summary.byStatus.draft} |\n| 已评审 | ${summary.byStatus.reviewed} |\n| 已批准 | ${summary.byStatus.approved} |\n\n## 原理图清单\n\n| ID | 名称 | 版本 | 页数 | 状态 |\n|-----|------|------|------|------|\n`;
    for (const sch of schematics) { const statusIcon = sch.status === 'approved' ? '✅' : sch.status === 'reviewed' ? '🔍' : sch.status === 'rejected' ? '❌' : '📝'; md += `| ${sch.id} | ${sch.name} | ${sch.version} | ${sch.pages} | ${statusIcon} ${sch.status} |\n`; }
    md += `\n## 评审记录\n\n`;
    for (const sch of schematics.filter(s => s.reviews.length > 0)) {
      md += `### ${sch.name}\n\n| 日期 | 评审人 | 结果 | 问题 |\n|------|--------|------|------|\n`;
      for (const r of sch.reviews) { md += `| ${r.date} | ${r.reviewer} | ${r.result} | ${r.issues || '-'} |\n`; }
      md += `\n`;
    }
    return md;
  }

  saveOutput(outputDir, output, markdown) {
    const dirPath = path.join(outputDir, '00_Project_Management/02_Hardware', 'schematic-management');
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(path.join(dirPath, 'schematics.json'), JSON.stringify(output, null, 2), 'utf8');
    fs.writeFileSync(path.join(dirPath, 'schematics-report.md'), markdown, 'utf8');
  }
}

module.exports = SchematicManagement;
