/**
 * 硬件 BOM 管理模块
 */

const fs = require('fs');
const path = require('path');
const HardwareManager = require('../utils/hardware-manager');

class HardwareBom {
  constructor(options = {}) { this.options = options; this.manager = new HardwareManager(); }

  async execute(config) {
    const { outputDir, inputData } = config;
    console.log('  [HardwareBom] 开始 BOM 管理...');

    this.validateInput(inputData);
    const bom = this.createBom(inputData);
    const markdown = this.generateMarkdown(bom, inputData.product);

    const output = { product: inputData.product, bom, summary: this.generateSummary(bom) };
    this.saveOutput(outputDir, output, markdown);

    console.log(`  [HardwareBom] 完成，管理了 ${bom.items.length} 个物料`);
    return { success: true, bom, summary: output.summary, markdown };
  }

  validateInput(inputData) {
    if (!inputData.product) throw new Error('Product information is required');
    if (!inputData.bomItems || !Array.isArray(inputData.bomItems)) throw new Error('BOM items array is required');
  }

  createBom(inputData) {
    const items = inputData.bomItems.map((item, index) => ({
      id: item.id || this.manager.generateId('BOM'),
      itemId: `ITEM-${String(index + 1).padStart(3, '0')}`,
      componentName: item.componentName,
      partNumber: item.partNumber || '',
      description: item.description || '',
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || 0,
      totalPrice: (item.quantity || 1) * (item.unitPrice || 0),
      supplier: item.supplier || '',
      category: item.category || 'other',
      status: item.status || 'active'
    }));

    const totalCost = items.reduce((sum, item) => sum + item.totalPrice, 0);
    return { items, totalCost, currency: inputData.currency || 'CNY', lastUpdated: new Date().toISOString() };
  }

  generateSummary(bom) {
    const byCategory = {};
    for (const item of bom.items) { byCategory[item.category] = (byCategory[item.category] || 0) + 1; }
    return { totalItems: bom.items.length, totalCost: bom.totalCost, currency: bom.currency, byCategory };
  }

  generateMarkdown(bom, product) {
    const summary = this.generateSummary(bom);
    let md = `# 硬件 BOM 清单\n\n**产品**: ${product.name} (${product.id})\n**生成时间**: ${new Date().toLocaleString('zh-CN')}\n**总成本**: ¥${summary.totalCost.toFixed(2)}\n\n`;
    md += `## BOM 概览\n\n| 指标 | 值 |\n|------|----|\n| 总物料数 | ${summary.totalItems} |\n| 总成本 | ¥${summary.totalCost.toFixed(2)} |\n\n## 物料清单\n\n| 序号 | 物料编码 | 物料名称 | 型号 | 数量 | 单价 | 总价 | 供应商 |\n|------|----------|----------|------|------|------|------|--------|\n`;
    for (const item of bom.items) { md += `| ${item.itemId} | ${item.id} | ${item.componentName} | ${item.partNumber || '-'} | ${item.quantity} | ¥${item.unitPrice.toFixed(2)} | ¥${item.totalPrice.toFixed(2)} | ${item.supplier || '-'} |\n`; }
    md += `\n## 按类别统计\n\n| 类别 | 数量 |\n|------|------|\n`;
    for (const [category, count] of Object.entries(summary.byCategory)) { md += `| ${category} | ${count} |\n`; }
    return md;
  }

  saveOutput(outputDir, output, markdown) {
    const dirPath = path.join(outputDir, '00_Project_Management/02_Hardware', 'hardware-bom');
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(path.join(dirPath, 'hardware-bom.json'), JSON.stringify(output, null, 2), 'utf8');
    fs.writeFileSync(path.join(dirPath, 'hardware-bom.md'), markdown, 'utf8');
  }
}

module.exports = HardwareBom;
