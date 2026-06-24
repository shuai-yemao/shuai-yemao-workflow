/**
 * 构建管理模块
 */

const fs = require('fs');
const path = require('path');
const FirmwareManager = require('../utils/firmware-manager');

class BuildManagement {
  constructor(options = {}) { this.options = options; this.manager = new FirmwareManager(); }

  async execute(config) {
    const { outputDir, inputData } = config;
    console.log('  [BuildManagement] 开始构建管理...');

    this.validateInput(inputData);
    const builds = this.manageBuilds(inputData);
    const markdown = this.generateMarkdown(builds, inputData.product);

    const output = { product: inputData.product, builds, summary: this.generateSummary(builds) };
    this.saveOutput(outputDir, output, markdown);

    console.log(`  [BuildManagement] 完成，管理了 ${builds.builds.length} 个构建`);
    return { success: true, builds, summary: output.summary, markdown };
  }

  validateInput(inputData) {
    if (!inputData.product) throw new Error('Product information is required');
    if (!inputData.builds || !Array.isArray(inputData.builds)) throw new Error('Builds array is required');
  }

  manageBuilds(inputData) {
    const builds = inputData.builds.map(build => ({
      id: build.id || this.manager.generateId('BLD'),
      version: build.version,
      status: build.status || 'pending',
      target: build.target || 'release',
      config: build.config || {},
      startTime: build.startTime || null,
      endTime: build.endTime || null,
      duration: build.duration || null,
      artifacts: build.artifacts || [],
      logs: build.logs || [],
      sizeAnalysis: build.sizeAnalysis || null
    }));

    return { builds, successfulBuilds: builds.filter(b => b.status === 'success').length, failedBuilds: builds.filter(b => b.status === 'failed').length };
  }

  generateSummary(builds) {
    return { totalBuilds: builds.builds.length, successful: builds.successfulBuilds, failed: builds.failedBuilds, successRate: builds.builds.length > 0 ? Math.round((builds.successfulBuilds / builds.builds.length) * 100) : 0 };
  }

  generateMarkdown(builds, product) {
    const summary = this.generateSummary(builds);
    let md = `# 固件构建管理报告\n\n**产品**: ${product.name} (${product.id})\n**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
    md += `## 构建概览\n\n| 指标 | 值 |\n|------|----|\n| 总构建数 | ${summary.totalBuilds} |\n| 成功 | ${summary.successful} |\n| 失败 | ${summary.failed} |\n| 成功率 | ${summary.successRate}% |\n\n`;
    md += `## 构建记录\n\n| ID | 版本 | 状态 | 目标 | 耗时 |\n|-----|------|------|------|------|\n`;
    for (const build of builds.builds) { const statusIcon = build.status === 'success' ? '✅' : build.status === 'failed' ? '❌' : build.status === 'building' ? '🔨' : '⏳'; md += `| ${build.id} | ${build.version} | ${statusIcon} ${build.status} | ${build.target} | ${build.duration || '-'} |\n`; }
    md += `\n## 构建详情\n\n`;
    for (const build of builds.builds) {
      md += `### ${build.id} - ${build.version}\n\n- **状态**: ${build.status}\n- **目标**: ${build.target}\n`;
      if (build.sizeAnalysis) { md += `- **固件大小**: ${build.sizeAnalysis.total} bytes\n`; }
      if (build.artifacts.length > 0) { md += `- **产物**:\n`; for (const art of build.artifacts) { md += `  - ${art.name}: ${art.size || '-'} bytes\n`; } }
      md += `\n`;
    }
    return md;
  }

  saveOutput(outputDir, output, markdown) {
    const dirPath = path.join(outputDir, '00_Project_Management/03_Firmware', 'build-management');
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(path.join(dirPath, 'builds.json'), JSON.stringify(output, null, 2), 'utf8');
    fs.writeFileSync(path.join(dirPath, 'builds-report.md'), markdown, 'utf8');
  }
}

module.exports = BuildManagement;
