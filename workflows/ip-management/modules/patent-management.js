/**
 * 专利管理模块
 */

const fs = require('fs');
const path = require('path');
const IpManager = require('../utils/ip-manager');

class PatentManagement {
  constructor(options = {}) { this.options = options; this.manager = new IpManager(); }

  async execute(config) {
    const { outputDir, inputData } = config;
    console.log('  [PatentManagement] 开始专利管理...');

    this.validateInput(inputData);
    const patents = this.managePatents(inputData);
    const markdown = this.generateMarkdown(patents, inputData.product);

    const output = { product: inputData.product, patents, summary: this.generateSummary(patents) };
    this.saveOutput(outputDir, output, markdown);

    console.log(`  [PatentManagement] 完成，管理了 ${patents.length} 项专利`);
    return { success: true, patents, summary: output.summary, markdown };
  }

  validateInput(inputData) {
    if (!inputData.product) throw new Error('Product information is required');
    if (!inputData.patents || !Array.isArray(inputData.patents)) throw new Error('Patents array is required');
  }

  managePatents(inputData) {
    return inputData.patents.map(patent => ({
      id: patent.id || this.manager.generateId('PAT'),
      title: patent.title,
      type: patent.type || 'invention',
      status: patent.status || 'draft',
      description: patent.description || '',
      inventors: patent.inventors || [],
      filingDate: patent.filingDate || null,
      grantDate: patent.grantDate || null,
      expiryDate: patent.expiryDate || null,
      applicationNumber: patent.applicationNumber || '',
      patentNumber: patent.patentNumber || '',
      jurisdiction: patent.jurisdiction || 'CN',
      cost: patent.cost || 0,
      annualFees: patent.annualFees || [],
      createdAt: new Date().toISOString()
    }));
  }

  generateSummary(patents) {
    return { total: patents.length, byType: { invention: patents.filter(p => p.type === 'invention').length, 'utility-model': patents.filter(p => p.type === 'utility-model').length, design: patents.filter(p => p.type === 'design').length }, byStatus: { draft: patents.filter(p => p.status === 'draft').length, filed: patents.filter(p => p.status === 'filed').length, pending: patents.filter(p => p.status === 'pending').length, granted: patents.filter(p => p.status === 'granted').length, rejected: patents.filter(p => p.status === 'rejected').length }, totalCost: patents.reduce((sum, p) => sum + (p.cost || 0), 0) };
  }

  generateMarkdown(patents, product) {
    const summary = this.generateSummary(patents);
    let md = `# 专利管理报告\n\n**产品**: ${product.name} (${product.id})\n**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
    md += `## 概览\n\n| 指标 | 值 |\n|------|----|\n| 总专利数 | ${summary.total} |\n| 发明专利 | ${summary.byType.invention} |\n| 实用新型 | ${summary.byType['utility-model']} |\n| 外观设计 | ${summary.byType.design} |\n| 已授权 | ${summary.byStatus.granted} |\n| 审查中 | ${summary.byStatus.pending} |\n| 总费用 | ¥${summary.totalCost.toLocaleString()} |\n\n`;
    md += `## 专利清单\n\n| ID | 名称 | 类型 | 状态 | 申请日 | 授权日 |\n|-----|------|------|------|--------|--------|\n`;
    for (const patent of patents) { const statusIcon = patent.status === 'granted' ? '✅' : patent.status === 'pending' ? '⏳' : patent.status === 'rejected' ? '❌' : '📝'; md += `| ${patent.id} | ${patent.title} | ${patent.type} | ${statusIcon} ${patent.status} | ${patent.filingDate || '-'} | ${patent.grantDate || '-'} |\n`; }
    md += `\n## 详细信息\n\n`;
    for (const patent of patents) {
      md += `### ${patent.title}\n\n- **ID**: ${patent.id}\n- **类型**: ${patent.type}\n- **状态**: ${patent.status}\n- **发明人**: ${patent.inventors.join(', ') || '-'}\n- **申请号**: ${patent.applicationNumber || '-'}\n- **专利号**: ${patent.patentNumber || '-'}\n- **费用**: ¥${patent.cost.toLocaleString()}\n\n`;
    }
    return md;
  }

  saveOutput(outputDir, output, markdown) {
    const dirPath = path.join(outputDir, '00_Project_Management/06_知识产权', 'patent-management');
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(path.join(dirPath, 'patents.json'), JSON.stringify(output, null, 2), 'utf8');
    fs.writeFileSync(path.join(dirPath, 'patents-report.md'), markdown, 'utf8');
  }
}

module.exports = PatentManagement;
