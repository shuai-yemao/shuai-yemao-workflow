/**
 * PCB 管理模块
 */

const fs = require('fs');
const path = require('path');
const HardwareManager = require('../utils/hardware-manager');

class PcbManagement {
  constructor(options = {}) { this.options = options; this.manager = new HardwareManager(); }

  async execute(config) {
    const { outputDir, inputData } = config;
    console.log('  [PcbManagement] 开始 PCB 管理...');

    this.validateInput(inputData);
    const pcbs = this.managePcbs(inputData);
    const markdown = this.generateMarkdown(pcbs, inputData.product);

    const output = { product: inputData.product, pcbs, summary: this.generateSummary(pcbs) };
    this.saveOutput(outputDir, output, markdown);

    console.log(`  [PcbManagement] 完成，管理了 ${pcbs.length} 个 PCB`);
    return { success: true, pcbs, summary: output.summary, markdown };
  }

  validateInput(inputData) {
    if (!inputData.product) throw new Error('Product information is required');
    if (!inputData.pcbs || !Array.isArray(inputData.pcbs)) throw new Error('PCBs array is required');
  }

  managePcbs(inputData) {
    return inputData.pcbs.map(pcb => ({
      id: pcb.id || this.manager.generateId('PCB'),
      name: pcb.name,
      version: pcb.version || '1.0',
      status: pcb.status || 'draft',
      layers: pcb.layers || 2,
      dimensions: pcb.dimensions || { width: 0, height: 0 },
      material: pcb.material || 'FR-4',
      surfaceFinish: pcb.surfaceFinish || 'HASL',
      minTrackWidth: pcb.minTrackWidth || '6mil',
      minDrillSize: pcb.minDrillSize || '0.3mm',
      reviews: (pcb.reviews || []).map(r => ({ ...r, date: r.date || new Date().toISOString() })),
      createdAt: new Date().toISOString()
    }));
  }

  generateSummary(pcbs) {
    return { total: pcbs.length, byStatus: { draft: pcbs.filter(p => p.status === 'draft').length, reviewed: pcbs.filter(p => p.status === 'reviewed').length, fabricated: pcbs.filter(p => p.status === 'fabricated').length, assembled: pcbs.filter(p => p.status === 'assembled').length } };
  }

  generateMarkdown(pcbs, product) {
    const summary = this.generateSummary(pcbs);
    let md = `# PCB 管理报告\n\n**产品**: ${product.name} (${product.id})\n**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
    md += `## 概览\n\n| 指标 | 值 |\n|------|----|\n| 总 PCB 数 | ${summary.total} |\n| 草稿 | ${summary.byStatus.draft} |\n| 已评审 | ${summary.byStatus.reviewed} |\n| 已制造 | ${summary.byStatus.fabricated} |\n| 已组装 | ${summary.byStatus.assembled} |\n\n## PCB 清单\n\n| ID | 名称 | 版本 | 层数 | 材料 | 状态 |\n|-----|------|------|------|------|------|\n`;
    for (const pcb of pcbs) { const statusIcon = pcb.status === 'assembled' ? '✅' : pcb.status === 'fabricated' ? '🏭' : pcb.status === 'reviewed' ? '🔍' : '📝'; md += `| ${pcb.id} | ${pcb.name} | ${pcb.version} | ${pcb.layers}L | ${pcb.material} | ${statusIcon} ${pcb.status} |\n`; }
    md += `\n## 详细规格\n\n`;
    for (const pcb of pcbs) {
      md += `### ${pcb.name}\n\n| 参数 | 值 |\n|------|----|\n| 层数 | ${pcb.layers} |\n| 尺寸 | ${pcb.dimensions.width} x ${pcb.dimensions.height} mm |\n| 材料 | ${pcb.material} |\n| 表面处理 | ${pcb.surfaceFinish} |\n| 最小线宽 | ${pcb.minTrackWidth} |\n| 最小钻孔 | ${pcb.minDrillSize} |\n\n`;
    }
    return md;
  }

  saveOutput(outputDir, output, markdown) {
    const dirPath = path.join(outputDir, '00_Project_Management/02_Hardware', 'pcb-management');
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(path.join(dirPath, 'pcbs.json'), JSON.stringify(output, null, 2), 'utf8');
    fs.writeFileSync(path.join(dirPath, 'pcbs-report.md'), markdown, 'utf8');
  }
}

module.exports = PcbManagement;
