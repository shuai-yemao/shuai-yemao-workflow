/**
 * 问题追踪模块
 */

const fs = require('fs');
const path = require('path');
const SoftwareManager = require('../utils/software-manager');

class IssueTracking {
  constructor(options = {}) { this.options = options; this.manager = new SoftwareManager(); }

  async execute(config) {
    const { outputDir, inputData } = config;
    console.log('  [IssueTracking] 开始问题追踪...');

    this.validateInput(inputData);
    const issues = this.trackIssues(inputData);
    const markdown = this.generateMarkdown(issues, inputData.product);

    const output = { product: inputData.product, issues, summary: this.generateSummary(issues) };
    this.saveOutput(outputDir, output, markdown);

    console.log(`  [IssueTracking] 完成，追踪了 ${issues.length} 个问题`);
    return { success: true, issues, summary: output.summary, markdown };
  }

  validateInput(inputData) {
    if (!inputData.product) throw new Error('Product information is required');
    if (!inputData.issues || !Array.isArray(inputData.issues)) throw new Error('Issues array is required');
  }

  trackIssues(inputData) {
    return inputData.issues.map(issue => ({
      id: issue.id || this.manager.generateId('ISS'),
      title: issue.title,
      description: issue.description || '',
      type: issue.type || 'bug',
      priority: issue.priority || 'medium',
      status: issue.status || 'open',
      assignee: issue.assignee || '',
      module: issue.module || '',
      stepsToReproduce: issue.stepsToReproduce || [],
      createdAt: issue.createdAt || new Date().toISOString(),
      resolvedAt: issue.resolvedAt || null
    }));
  }

  generateSummary(issues) {
    return { total: issues.length, byType: { bug: issues.filter(i => i.type === 'bug').length, feature: issues.filter(i => i.type === 'feature').length, improvement: issues.filter(i => i.type === 'improvement').length }, byStatus: { open: issues.filter(i => i.status === 'open').length, 'in-progress': issues.filter(i => i.status === 'in-progress').length, resolved: issues.filter(i => i.status === 'resolved').length, closed: issues.filter(i => i.status === 'closed').length }, byPriority: { high: issues.filter(i => i.priority === 'high').length, medium: issues.filter(i => i.priority === 'medium').length, low: issues.filter(i => i.priority === 'low').length } };
  }

  generateMarkdown(issues, product) {
    const summary = this.generateSummary(issues);
    let md = `# 软件问题追踪报告\n\n**产品**: ${product.name} (${product.id})\n**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
    md += `## 概览\n\n| 指标 | 值 |\n|------|----|\n| 总问题数 | ${summary.total} |\n| 待处理 | ${summary.byStatus.open} |\n| 处理中 | ${summary.byStatus['in-progress']} |\n| 已解决 | ${summary.byStatus.resolved} |\n| 已关闭 | ${summary.byStatus.closed} |\n\n`;
    md += `## 问题清单\n\n| ID | 标题 | 类型 | 优先级 | 状态 | 负责人 |\n|-----|------|------|--------|------|--------|\n`;
    for (const issue of issues) { const priIcon = issue.priority === 'high' ? '🔴' : issue.priority === 'medium' ? '🟡' : '🟢'; md += `| ${issue.id} | ${issue.title} | ${issue.type} | ${priIcon} ${issue.priority} | ${issue.status} | ${issue.assignee || '-'} |\n`; }
    return md;
  }

  saveOutput(outputDir, output, markdown) {
    const dirPath = path.join(outputDir, '00_Project_Management/04_Software', 'issue-tracking');
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(path.join(dirPath, 'issues.json'), JSON.stringify(output, null, 2), 'utf8');
    fs.writeFileSync(path.join(dirPath, 'issues.md'), markdown, 'utf8');
  }
}

module.exports = IssueTracking;
