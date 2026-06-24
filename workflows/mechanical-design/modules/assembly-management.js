/**
 * 装配管理模块
 */

const fs = require('fs');
const path = require('path');
const MechanicalManager = require('../utils/mechanical-manager');

class AssemblyManagement {
  constructor(options = {}) { this.options = options; this.manager = new MechanicalManager(); }

  async execute(config) {
    const { outputDir, inputData } = config;
    console.log('  [AssemblyManagement] 开始装配管理...');

    this.validateInput(inputData);
    const assemblies = this.manageAssemblies(inputData);
    const markdown = this.generateMarkdown(assemblies, inputData.product);

    const output = { product: inputData.product, assemblies, summary: this.generateSummary(assemblies) };
    this.saveOutput(outputDir, output, markdown);

    console.log(`  [AssemblyManagement] 完成，管理了 ${assemblies.length} 个装配体`);
    return { success: true, assemblies, summary: output.summary, markdown };
  }

  validateInput(inputData) {
    if (!inputData.product) throw new Error('Product information is required');
    if (!inputData.assemblies || !Array.isArray(inputData.assemblies)) throw new Error('Assemblies array is required');
  }

  manageAssemblies(inputData) {
    return inputData.assemblies.map(assy => ({
      id: assy.id || this.manager.generateId('ASSY'),
      name: assy.name,
      description: assy.description || '',
      parts: (assy.parts || []).map(p => ({ partId: p.partId, quantity: p.quantity || 1, position: p.position || '' })),
      status: assy.status || 'draft',
      totalWeight: assy.totalWeight || 0,
      assemblyInstructions: assy.assemblyInstructions || '',
      createdAt: new Date().toISOString()
    }));
  }

  generateSummary(assemblies) {
    return { total: assemblies.length, totalParts: assemblies.reduce((sum, a) => sum + a.parts.length, 0), totalWeight: assemblies.reduce((sum, a) => sum + (a.totalWeight || 0), 0) };
  }

  generateMarkdown(assemblies, product) {
    const summary = this.generateSummary(assemblies);
    let md = `# 装配管理报告\n\n**产品**: ${product.name} (${product.id})\n**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
    md += `## 概览\n\n| 指标 | 值 |\n|------|----|\n| 装配体总数 | ${summary.total} |\n| 总零件数 | ${summary.totalParts} |\n| 总重量 | ${summary.totalWeight.toFixed(2)} g |\n\n`;
    md += `## 装配体清单\n\n| ID | 名称 | 零件数 | 重量(g) | 状态 |\n|-----|------|--------|---------|------|\n`;
    for (const assy of assemblies) { const statusIcon = assy.status === 'approved' ? '✅' : '📝'; md += `| ${assy.id} | ${assy.name} | ${assy.parts.length} | ${assy.totalWeight || '-'} | ${statusIcon} ${assy.status} |\n`; }
    md += `\n## 装配详情\n\n`;
    for (const assy of assemblies) {
      md += `### ${assy.name}\n\n- **ID**: ${assy.id}\n- **描述**: ${assy.description || '无'}\n- **零件清单**:\n`;
      for (const p of assy.parts) { md += `  - ${p.partId} x ${p.quantity}\n`; }
      md += `\n`;
    }
    return md;
  }

  saveOutput(outputDir, output, markdown) {
    const dirPath = path.join(outputDir, '00_Project_Management/05_Mechanical', 'assembly-management');
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(path.join(dirPath, 'assemblies.json'), JSON.stringify(output, null, 2), 'utf8');
    fs.writeFileSync(path.join(dirPath, 'assemblies-report.md'), markdown, 'utf8');
  }
}

module.exports = AssemblyManagement;
