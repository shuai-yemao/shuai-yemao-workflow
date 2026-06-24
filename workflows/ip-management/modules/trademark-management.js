/**
 * 商标管理模块
 */

const fs = require('fs');
const path = require('path');
const IpManager = require('../utils/ip-manager');

class TrademarkManagement {
  constructor(options = {}) { this.options = options; this.manager = new IpManager(); }

  async execute(config) {
    const { outputDir, inputData } = config;
    console.log('  [TrademarkManagement] 开始商标管理...');

    this.validateInput(inputData);
    const trademarks = this.manageTrademarks(inputData);
    const markdown = this.generateMarkdown(trademarks, inputData.product);

    const output = { product: inputData.product, trademarks, summary: this.generateSummary(trademarks) };
    this.saveOutput(outputDir, output, markdown);

    console.log(`  [TrademarkManagement] 完成，管理了 ${trademarks.length} 项商标`);
    return { success: true, trademarks, summary: output.summary, markdown };
  }

  validateInput(inputData) {
    if (!inputData.product) throw new Error('Product information is required');
    if (!inputData.trademarks || !Array.isArray(inputData.trademarks)) throw new Error('Trademarks array is required');
  }

  manageTrademarks(inputData) {
    return inputData.trademarks.map(tm => ({
      id: tm.id || this.manager.generateId('TM'),
      name: tm.name,
      category: tm.category || 'text',
      status: tm.status || 'planned',
      description: tm.description || '',
      classes: tm.classes || [],
      filingDate: tm.filingDate || null,
      registrationDate: tm.registrationDate || null,
      expiryDate: tm.expiryDate || null,
      applicationNumber: tm.applicationNumber || '',
      registrationNumber: tm.registrationNumber || '',
      jurisdiction: tm.jurisdiction || 'CN',
      cost: tm.cost || 0,
      createdAt: new Date().toISOString()
    }));
  }

  generateSummary(trademarks) {
    return { total: trademarks.length, byCategory: { text: trademarks.filter(t => t.category === 'text').length, logo: trademarks.filter(t => t.category === 'logo').length, combination: trademarks.filter(t => t.category === 'combination').length }, byStatus: { planned: trademarks.filter(t => t.status === 'planned').length, filed: trademarks.filter(t => t.status === 'filed').length, pending: trademarks.filter(t => t.status === 'pending').length, registered: trademarks.filter(t => t.status === 'registered').length, rejected: trademarks.filter(t => t.status === 'rejected').length }, totalCost: trademarks.reduce((sum, t) => sum + (t.cost || 0), 0) };
  }

  generateMarkdown(trademarks, product) {
    const summary = this.generateSummary(trademarks);
    let md = `# 商标管理报告\n\n**产品**: ${product.name} (${product.id})\n**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
    md += `## 概览\n\n| 指标 | 值 |\n|------|----|\n| 总商标数 | ${summary.total} |\n| 文字商标 | ${summary.byCategory.text} |\n| 图形商标 | ${summary.byCategory.logo} |\n| 组合商标 | ${summary.byCategory.combination} |\n| 已注册 | ${summary.byStatus.registered} |\n| 审查中 | ${summary.byStatus.pending} |\n| 总费用 | ¥${summary.totalCost.toLocaleString()} |\n\n`;
    md += `## 商标清单\n\n| ID | 名称 | 类型 | 状态 | 注册号 | 有效期至 |\n|-----|------|------|------|--------|----------|\n`;
    for (const tm of trademarks) { const statusIcon = tm.status === 'registered' ? '✅' : tm.status === 'pending' ? '⏳' : '📝'; md += `| ${tm.id} | ${tm.name} | ${tm.category} | ${statusIcon} ${tm.status} | ${tm.registrationNumber || '-'} | ${tm.expiryDate || '-'} |\n`; }
    return md;
  }

  saveOutput(outputDir, output, markdown) {
    const dirPath = path.join(outputDir, '00_Project_Management/06_知识产权', 'trademark-management');
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(path.join(dirPath, 'trademarks.json'), JSON.stringify(output, null, 2), 'utf8');
    fs.writeFileSync(path.join(dirPath, 'trademarks-report.md'), markdown, 'utf8');
  }
}

module.exports = TrademarkManagement;
