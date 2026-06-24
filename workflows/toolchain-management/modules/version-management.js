/**
 * 工具版本管理模块
 */

const fs = require('fs');
const path = require('path');
const ToolchainManager = require('../utils/toolchain-manager');

class VersionManagement {
  constructor(options = {}) { this.options = options; this.manager = new ToolchainManager(); }

  async execute(config) {
    const { outputDir, inputData } = config;
    console.log('  [VersionManagement] 开始版本管理...');

    this.validateInput(inputData);
    const versions = this.manageVersions(inputData);
    const markdown = this.generateMarkdown(versions, inputData.project);

    const output = { project: inputData.project, versions, summary: this.generateSummary(versions) };
    this.saveOutput(outputDir, output, markdown);

    console.log(`  [VersionManagement] 完成，管理了 ${versions.records.length} 条版本记录`);
    return { success: true, versions, summary: output.summary, markdown };
  }

  validateInput(inputData) {
    if (!inputData.project) throw new Error('Project information is required');
    if (!inputData.records || !Array.isArray(inputData.records)) throw new Error('Records array is required');
  }

  manageVersions(inputData) {
    const records = inputData.records.map(record => ({
      id: record.id || this.manager.generateId('VER'),
      toolName: record.toolName,
      previousVersion: record.previousVersion || '',
      currentVersion: record.currentVersion,
      upgradeDate: record.upgradeDate || new Date().toISOString().split('T')[0],
      upgradedBy: record.upgradedBy || '',
      changes: record.changes || [],
      status: record.status || 'completed',
      notes: record.notes || ''
    }));

    return { records, lastAudit: new Date().toISOString() };
  }

  generateSummary(versions) {
    return { total: versions.records.length, completed: versions.records.filter(r => r.status === 'completed').length, pending: versions.records.filter(r => r.status === 'pending').length };
  }

  generateMarkdown(versions, project) {
    const summary = this.generateSummary(versions);
    let md = `# 工具版本管理报告\n\n**项目**: ${project.name} (${project.id})\n**最后审计**: ${versions.lastAudit}\n**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
    md += `## 概览\n\n| 指标 | 值 |\n|------|----|\n| 版本变更记录 | ${summary.total} |\n| 已完成 | ${summary.completed} |\n| 待处理 | ${summary.pending} |\n\n`;
    md += `## 版本变更记录\n\n| ID | 工具 | 旧版本 | 新版本 | 升级日期 | 操作人 | 状态 |\n|-----|------|--------|--------|----------|--------|------|\n`;
    for (const record of versions.records) { const statusIcon = record.status === 'completed' ? '✅' : '⏳'; md += `| ${record.id} | ${record.toolName} | ${record.previousVersion || '-'} | ${record.currentVersion} | ${record.upgradeDate} | ${record.upgradedBy || '-'} | ${statusIcon} ${record.status} |\n`; }
    md += `\n## 详细信息\n\n`;
    for (const record of versions.records) {
      md += `### ${record.toolName} 升级记录\n\n- **版本**: ${record.previousVersion || '初始'} → ${record.currentVersion}\n- **日期**: ${record.upgradeDate}\n- **操作人**: ${record.upgradedBy || '未知'}\n`;
      if (record.changes.length > 0) { md += `- **变更内容**:\n`; for (const change of record.changes) { md += `  - ${change}\n`; } }
      if (record.notes) { md += `- **备注**: ${record.notes}\n`; }
      md += `\n`;
    }
    return md;
  }

  saveOutput(outputDir, output, markdown) {
    const dirPath = path.join(outputDir, '00_Project_Management/07_Tools', 'version-management');
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(path.join(dirPath, 'versions.json'), JSON.stringify(output, null, 2), 'utf8');
    fs.writeFileSync(path.join(dirPath, 'versions.md'), markdown, 'utf8');
  }
}

module.exports = VersionManagement;
