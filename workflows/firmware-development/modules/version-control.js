/**
 * 版本控制模块
 */

const fs = require('fs');
const path = require('path');
const FirmwareManager = require('../utils/firmware-manager');

class VersionControl {
  constructor(options = {}) { this.options = options; this.manager = new FirmwareManager(); }

  async execute(config) {
    const { outputDir, inputData } = config;
    console.log('  [VersionControl] 开始版本管理...');

    this.validateInput(inputData);
    const versions = this.manageVersions(inputData);
    const markdown = this.generateMarkdown(versions, inputData.product);

    const output = { product: inputData.product, versions, summary: this.generateSummary(versions) };
    this.saveOutput(outputDir, output, markdown);

    console.log(`  [VersionControl] 完成，管理了 ${versions.releases.length} 个版本`);
    return { success: true, versions, summary: output.summary, markdown };
  }

  validateInput(inputData) {
    if (!inputData.product) throw new Error('Product information is required');
    if (!inputData.releases || !Array.isArray(inputData.releases)) throw new Error('Releases array is required');
  }

  manageVersions(inputData) {
    const releases = inputData.releases.map(rel => ({
      id: rel.id || this.manager.generateId('REL'),
      version: rel.version,
      status: rel.status || 'planned',
      description: rel.description || '',
      modules: rel.modules || [],
      changes: rel.changes || [],
      buildDate: rel.buildDate || null,
      releaseDate: rel.releaseDate || null,
      artifacts: rel.artifacts || []
    }));

    return { releases, currentVersion: this.getCurrentVersion(releases), latestRelease: this.getLatestRelease(releases) };
  }

  getCurrentVersion(releases) {
    const released = releases.filter(r => r.status === 'released');
    return released.length > 0 ? released[released.length - 1].version : '0.0.0';
  }

  getLatestRelease(releases) {
    return releases.length > 0 ? releases[releases.length - 1] : null;
  }

  generateSummary(versions) {
    return { totalReleases: versions.releases.length, currentVersion: versions.currentVersion, byStatus: { planned: versions.releases.filter(r => r.status === 'planned').length, building: versions.releases.filter(r => r.status === 'building').length, testing: versions.releases.filter(r => r.status === 'testing').length, released: versions.releases.filter(r => r.status === 'released').length } };
  }

  generateMarkdown(versions, product) {
    const summary = this.generateSummary(versions);
    let md = `# 固件版本管理报告\n\n**产品**: ${product.name} (${product.id})\n**当前版本**: ${versions.currentVersion}\n**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
    md += `## 版本概览\n\n| 指标 | 值 |\n|------|----|\n| 总版本数 | ${summary.totalReleases} |\n| 当前版本 | ${summary.currentVersion} |\n| 已发布 | ${summary.byStatus.released} |\n| 测试中 | ${summary.byStatus.testing} |\n| 构建中 | ${summary.byStatus.building} |\n| 计划中 | ${summary.byStatus.planned} |\n\n`;
    md += `## 版本历史\n\n| 版本 | 状态 | 描述 | 发布日期 |\n|------|------|------|----------|\n`;
    for (const rel of versions.releases) { const statusIcon = rel.status === 'released' ? '✅' : rel.status === 'testing' ? '🧪' : rel.status === 'building' ? '🔨' : '📝'; md += `| ${rel.version} | ${statusIcon} ${rel.status} | ${rel.description || '-'} | ${rel.releaseDate || '-'} |\n`; }
    md += `\n## 版本详情\n\n`;
    for (const rel of versions.releases) {
      md += `### ${rel.version}\n\n- **状态**: ${rel.status}\n- **描述**: ${rel.description || '无'}\n`;
      if (rel.changes.length > 0) { md += `- **变更**:\n`; for (const change of rel.changes) { md += `  - ${change}\n`; } }
      md += `\n`;
    }
    return md;
  }

  saveOutput(outputDir, output, markdown) {
    const dirPath = path.join(outputDir, '00_Project_Management/03_Firmware', 'version-control');
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(path.join(dirPath, 'versions.json'), JSON.stringify(output, null, 2), 'utf8');
    fs.writeFileSync(path.join(dirPath, 'versions-report.md'), markdown, 'utf8');
  }
}

module.exports = VersionControl;
