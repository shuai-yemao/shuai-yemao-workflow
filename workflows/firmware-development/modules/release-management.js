/**
 * 发布管理模块
 */

const fs = require('fs');
const path = require('path');
const FirmwareManager = require('../utils/firmware-manager');

class ReleaseManagement {
  constructor(options = {}) { this.options = options; this.manager = new FirmwareManager(); }

  async execute(config) {
    const { outputDir, inputData } = config;
    console.log('  [ReleaseManagement] 开始发布管理...');

    this.validateInput(inputData);
    const releases = this.manageReleases(inputData);
    const markdown = this.generateMarkdown(releases, inputData.product);

    const output = { product: inputData.product, releases, summary: this.generateSummary(releases) };
    this.saveOutput(outputDir, output, markdown);

    console.log(`  [ReleaseManagement] 完成，管理了 ${releases.releases.length} 个发布`);
    return { success: true, releases, summary: output.summary, markdown };
  }

  validateInput(inputData) {
    if (!inputData.product) throw new Error('Product information is required');
    if (!inputData.releases || !Array.isArray(inputData.releases)) throw new Error('Releases array is required');
  }

  manageReleases(inputData) {
    const releases = inputData.releases.map(rel => ({
      id: rel.id || this.manager.generateId('REL'),
      version: rel.version,
      status: rel.status || 'planned',
      releaseDate: rel.releaseDate || null,
      description: rel.description || '',
      changelog: rel.changelog || [],
      artifacts: rel.artifacts || [],
      approvedBy: rel.approvedBy || null,
      deploymentTarget: rel.deploymentTarget || 'production'
    }));

    return { releases, latestRelease: releases.filter(r => r.status === 'released').pop() };
  }

  generateSummary(releases) {
    return { totalReleases: releases.releases.length, released: releases.releases.filter(r => r.status === 'released').length, pending: releases.releases.filter(r => r.status === 'planned').length, latestVersion: releases.latestRelease?.version || 'none' };
  }

  generateMarkdown(releases, product) {
    const summary = this.generateSummary(releases);
    let md = `# 固件发布管理报告\n\n**产品**: ${product.name} (${product.id})\n**最新版本**: ${summary.latestVersion}\n**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
    md += `## 发布概览\n\n| 指标 | 值 |\n|------|----|\n| 总发布数 | ${summary.totalReleases} |\n| 已发布 | ${summary.released} |\n| 待发布 | ${summary.pending} |\n\n`;
    md += `## 发布历史\n\n| 版本 | 状态 | 发布日期 | 描述 |\n|------|------|----------|------|\n`;
    for (const rel of releases.releases) { const statusIcon = rel.status === 'released' ? '✅' : rel.status === 'testing' ? '🧪' : '📝'; md += `| ${rel.version} | ${statusIcon} ${rel.status} | ${rel.releaseDate || '-'} | ${rel.description || '-'} |\n`; }
    md += `\n## 发布详情\n\n`;
    for (const rel of releases.releases) {
      md += `### ${rel.version}\n\n- **状态**: ${rel.status}\n- **发布日期**: ${rel.releaseDate || '待定'}\n- **审批人**: ${rel.approvedBy || '待定'}\n`;
      if (rel.changelog.length > 0) { md += `- **变更日志**:\n`; for (const item of rel.changelog) { md += `  - ${item}\n`; } }
      md += `\n`;
    }
    return md;
  }

  saveOutput(outputDir, output, markdown) {
    const dirPath = path.join(outputDir, '00_Project_Management/03_Firmware', 'release-management');
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(path.join(dirPath, 'releases.json'), JSON.stringify(output, null, 2), 'utf8');
    fs.writeFileSync(path.join(dirPath, 'releases-report.md'), markdown, 'utf8');
  }
}

module.exports = ReleaseManagement;
