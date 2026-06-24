/**
 * 零件设计模块
 */

const fs = require('fs');
const path = require('path');
const MechanicalManager = require('../utils/mechanical-manager');

class PartDesign {
  constructor(options = {}) { this.options = options; this.manager = new MechanicalManager(); }

  async execute(config) {
    const { outputDir, inputData } = config;
    console.log('  [PartDesign] 开始零件设计...');

    this.validateInput(inputData);
    const parts = this.designParts(inputData);
    const markdown = this.generateMarkdown(parts, inputData.product);

    const output = { product: inputData.product, parts, summary: this.generateSummary(parts) };
    this.saveOutput(outputDir, output, markdown);

    console.log(`  [PartDesign] 完成，设计了 ${parts.length} 个零件`);
    return { success: true, parts, summary: output.summary, markdown };
  }

  validateInput(inputData) {
    if (!inputData.product) throw new Error('Product information is required');
    if (!inputData.parts || !Array.isArray(inputData.parts)) throw new Error('Parts array is required');
  }

  designParts(inputData) {
    return inputData.parts.map(part => ({
      id: part.id || this.manager.generateId('PART'),
      name: part.name,
      type: part.type || 'other',
      description: part.description || '',
      material: part.material || '',
      dimensions: part.dimensions || {},
      weight: part.weight || 0,
      tolerances: part.tolerances || [],
      finish: part.finish || '',
      status: part.status || 'draft',
      cadFile: part.cadFile || null,
      drawingFile: part.drawingFile || null,
      cost: part.cost || 0,
      supplier: part.supplier || '',
      createdAt: new Date().toISOString()
    }));
  }

  generateSummary(parts) {
    return { total: parts.length, byType: { enclosure: parts.filter(p => p.type === 'enclosure').length, bracket: parts.filter(p => p.type === 'bracket').length, shaft: parts.filter(p => p.type === 'shaft').length, other: parts.filter(p => p.type === 'other').length }, totalWeight: parts.reduce((sum, p) => sum + (p.weight || 0), 0), totalCost: parts.reduce((sum, p) => sum + (p.cost || 0), 0) };
  }

  generateMarkdown(parts, product) {
    const summary = this.generateSummary(parts);
    let md = `# 机械零件设计报告\n\n**产品**: ${product.name} (${product.id})\n**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
    md += `## 概览\n\n| 指标 | 值 |\n|------|----|\n| 零件总数 | ${summary.total} |\n| 总重量 | ${summary.totalWeight.toFixed(2)} g |\n| 总成本 | ¥${summary.totalCost.toFixed(2)} |\n\n`;
    md += `## 零件清单\n\n| ID | 名称 | 类型 | 材料 | 重量(g) | 状态 |\n|-----|------|------|------|---------|------|\n`;
    for (const part of parts) { const statusIcon = part.status === 'approved' ? '✅' : part.status === 'manufacturing' ? '🏭' : '📝'; md += `| ${part.id} | ${part.name} | ${part.type} | ${part.material || '-'} | ${part.weight || '-'} | ${statusIcon} ${part.status} |\n`; }
    md += `\n## 详细信息\n\n`;
    for (const part of parts) {
      md += `### ${part.name}\n\n- **ID**: ${part.id}\n- **类型**: ${part.type}\n- **材料**: ${part.material || '待定'}\n- **重量**: ${part.weight || 0} g\n- **成本**: ¥${(part.cost || 0).toFixed(2)}\n`;
      if (part.dimensions.length) { md += `- **尺寸**: ${part.dimensions.length} x ${part.dimensions.width} x ${part.dimensions.height} mm\n`; }
      md += `\n`;
    }
    return md;
  }

  saveOutput(outputDir, output, markdown) {
    const dirPath = path.join(outputDir, '00_Project_Management/05_Mechanical', 'part-design');
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(path.join(dirPath, 'parts.json'), JSON.stringify(output, null, 2), 'utf8');
    fs.writeFileSync(path.join(dirPath, 'parts-report.md'), markdown, 'utf8');
  }
}

module.exports = PartDesign;
