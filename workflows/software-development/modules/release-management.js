/**
 * 软件发布管理模块
 */

const fs = require('fs');
const path = require('path');
const SoftwareManager = require('../utils/software-manager');

class ReleaseManagement {
  constructor(options = {}) { this.options = options; this.manager = new SoftwareManager(); }

  async execute(config) {
    const { outputDir, inputData } = config;
    console.log('  [ReleaseManagement] 开始发布管理...');

    this.validateInput(inputData);
    const releases = this.manageReleases(inputData);
    const markdown = this.generateMarkdown(releases, inputData.product);

    const output = { product: inputData.product, releases, summary: this.generateSummary(releases) };
    this.saveOutput(outputDir, output, markdown);

    console.log(`  [ReleaseManagement] 完成，管理了 ${releases.length} 个版本`);
    return { success: true, releases, summary: output.summary, markdown };
  }

  validateInput(inputData) {
    if (!inputData.product) throw new Error('Product information is required');
    if (!inputData.releases || !Array.isArray(inputData.releases)) throw new Error('Releases array is required');
  }

  manageReleases(inputData) {
    return inputData.releases.map(rel => ({
      id: rel.id || this.manager.generateId('REL'),
      version: rel.version,
      status: rel.status || 'planned',
      releaseDate: rel.releaseDate || null,
      description: rel.description || '',
      changelog: rel.changelog || [],
      artifacts: rel.artifacts || [],
      deploymentTarget: rel.deploymentTarget || 'production',
      createdAt: new Date().toISOString()
    }));
  }

  generateSummary(releases) {
    return { total: releases.length, released: releases.filter(r => r.status === 'released').length, planned: releases.filter(r => r.status === 'planned').length, latestVersion: releases.filter(r => r.status === 'released').pop()?.version || 'none' };
  }

  generateMarkdown(releases, product) {
    const summary = this.generateSummary(releases);
    let md = `# 软件发布管理报告\n\n**产品**: ${product.name} (${product.id})\n**最新版本**: ${summary.latestVersion}\n**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
    md += `## 概览\n\n| 指标 | 值 |\n|------|----|\n| 总版本数 | ${summary.total} |\n| 已发布 | ${summary.released} |\n| 待发布 | ${summary.planned} |\n\n`;
    md += `## 版本历史\n\n| 版本 | 状态 | 发布日期 | 描述 |\n|------|------|----------|------|\n`;
    for (const rel of releases) { const statusIcon = rel.status === 'released' ? '✅' : '📝'; md += `| ${rel.version} | ${statusIcon} ${rel.status} | ${rel.releaseDate || '-'} | ${rel.description || '-'} |\n`; }
    md += `\n## 版本详情\n\n`;
    for (const rel of releases) {
      md += `### ${rel.version}\n\n- **状态**: ${rel.status}\n- **发布日期**: ${rel.releaseDate || '待定'}\n`;
      if (rel.changelog.length > 0) { md += `- **变更日志**:\n`; for (const item of rel.changelog) { md += `  - ${item}\n`; } }
      md += `\n`;
    }
    return md;
  }

  saveOutput(outputDir, output, markdown) {
    const dirPath = path.join(outputDir, '00_Project_Management/04_Software', 'release-management');
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(path.join(dirPath, 'releases.json'), JSON.stringify(output, null, 2), 'utf8');
    fs.writeFileSync(path.join(dirPath, 'releases.md'), markdown, 'utf8');
  }
}

module.exports = ReleaseManagement;
