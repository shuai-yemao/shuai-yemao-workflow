/**
 * 评审管理模块
 */

const fs = require('fs');
const path = require('path');
const HardwareManager = require('../utils/hardware-manager');

class ReviewManagement {
  constructor(options = {}) { this.options = options; this.manager = new HardwareManager(); }

  async execute(config) {
    const { outputDir, inputData } = config;
    console.log('  [ReviewManagement] 开始评审管理...');

    this.validateInput(inputData);
    const reviews = this.manageReviews(inputData);
    const markdown = this.generateMarkdown(reviews, inputData.product);

    const output = { product: inputData.product, reviews, summary: this.generateSummary(reviews) };
    this.saveOutput(outputDir, output, markdown);

    console.log(`  [ReviewManagement] 完成，管理了 ${reviews.length} 条评审记录`);
    return { success: true, reviews, summary: output.summary, markdown };
  }

  validateInput(inputData) {
    if (!inputData.product) throw new Error('Product information is required');
    if (!inputData.reviews || !Array.isArray(inputData.reviews)) throw new Error('Reviews array is required');
  }

  manageReviews(inputData) {
    return inputData.reviews.map(review => ({
      id: review.id || this.manager.generateId('REV'),
      type: review.type || 'design',
      target: review.target || '',
      date: review.date || new Date().toISOString(),
      reviewer: review.reviewer || '',
      result: review.result || 'pending',
      issues: (review.issues || []).map(issue => ({ id: this.manager.generateId('ISS'), description: issue.description, severity: issue.severity || 'medium', status: issue.status || 'open' })),
      actionItems: review.actionItems || [],
      notes: review.notes || ''
    }));
  }

  generateSummary(reviews) {
    const totalIssues = reviews.reduce((sum, r) => sum + r.issues.length, 0);
    const openIssues = reviews.reduce((sum, r) => sum + r.issues.filter(i => i.status === 'open').length, 0);
    return { totalReviews: reviews.length, totalIssues, openIssues, byResult: { passed: reviews.filter(r => r.result === 'passed').length, conditional: reviews.filter(r => r.result === 'conditional').length, failed: reviews.filter(r => r.result === 'failed').length, pending: reviews.filter(r => r.result === 'pending').length } };
  }

  generateMarkdown(reviews, product) {
    const summary = this.generateSummary(reviews);
    let md = `# 设计评审报告\n\n**产品**: ${product.name} (${product.id})\n**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
    md += `## 评审概览\n\n| 指标 | 值 |\n|------|----|\n| 总评审数 | ${summary.totalReviews} |\n| 总问题数 | ${summary.totalIssues} |\n| 未解决问题 | ${summary.openIssues} |\n| 通过 | ${summary.byResult.passed} |\n| 有条件通过 | ${summary.byResult.conditional} |\n| 未通过 | ${summary.byResult.failed} |\n| 待评审 | ${summary.byResult.pending} |\n\n## 评审记录\n\n`;
    for (const review of reviews) {
      const resultIcon = review.result === 'passed' ? '✅' : review.result === 'conditional' ? '⚠️' : review.result === 'failed' ? '❌' : '⏳';
      md += `### ${resultIcon} ${review.type} 评审 - ${review.target}\n\n`;
      md += `- **日期**: ${review.date}\n- **评审人**: ${review.reviewer}\n- **结果**: ${review.result}\n`;
      if (review.issues.length > 0) {
        md += `\n**问题列表:**\n\n| ID | 描述 | 严重度 | 状态 |\n|-----|------|--------|------|\n`;
        for (const issue of review.issues) { md += `| ${issue.id} | ${issue.description} | ${issue.severity} | ${issue.status} |\n`; }
      }
      md += `\n`;
    }
    return md;
  }

  saveOutput(outputDir, output, markdown) {
    const dirPath = path.join(outputDir, '00_Project_Management/02_Hardware', 'review-management');
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(path.join(dirPath, 'reviews.json'), JSON.stringify(output, null, 2), 'utf8');
    fs.writeFileSync(path.join(dirPath, 'reviews-report.md'), markdown, 'utf8');
  }
}

module.exports = ReviewManagement;
