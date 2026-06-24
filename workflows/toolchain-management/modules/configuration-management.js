/**
 * 配置管理模块
 */

const fs = require('fs');
const path = require('path');
const ToolchainManager = require('../utils/toolchain-manager');

class ConfigurationManagement {
  constructor(options = {}) { this.options = options; this.manager = new ToolchainManager(); }

  async execute(config) {
    const { outputDir, inputData } = config;
    console.log('  [ConfigurationManagement] 开始配置管理...');

    this.validateInput(inputData);
    const configs = this.manageConfigurations(inputData);
    const markdown = this.generateMarkdown(configs, inputData.project);

    const output = { project: inputData.project, configs, summary: this.generateSummary(configs) };
    this.saveOutput(outputDir, output, markdown);

    console.log(`  [ConfigurationManagement] 完成，管理了 ${configs.configurations.length} 个配置`);
    return { success: true, configs, summary: output.summary, markdown };
  }

  validateInput(inputData) {
    if (!inputData.project) throw new Error('Project information is required');
    if (!inputData.configurations || !Array.isArray(inputData.configurations)) throw new Error('Configurations array is required');
  }

  manageConfigurations(inputData) {
    const configurations = inputData.configurations.map(config => ({
      id: config.id || this.manager.generateId('CFG'),
      name: config.name,
      tool: config.tool || '',
      type: config.type || 'editor',
      settings: config.settings || {},
      exportedPath: config.exportedPath || '',
      version: config.version || '1.0',
      lastModified: config.lastModified || new Date().toISOString()
    }));

    return { configurations, lastSync: new Date().toISOString() };
  }

  generateSummary(configs) {
    return { total: configs.configurations.length, byType: this.groupBy(configs.configurations, 'type') };
  }

  groupBy(array, key) {
    return array.reduce((result, item) => { const groupKey = item[key]; result[groupKey] = (result[groupKey] || 0) + 1; return result; }, {});
  }

  generateMarkdown(configs, project) {
    const summary = this.generateSummary(configs);
    let md = `# 开发工具配置管理\n\n**项目**: ${project.name} (${project.id})\n**最后同步**: ${configs.lastSync}\n**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
    md += `## 概览\n\n| 指标 | 值 |\n|------|----|\n| 配置总数 | ${summary.total} |\n\n`;
    md += `## 配置清单\n\n| ID | 名称 | 工具 | 类型 | 版本 | 导出路径 |\n|-----|------|------|------|------|----------|\n`;
    for (const config of configs.configurations) { md += `| ${config.id} | ${config.name} | ${config.tool} | ${config.type} | ${config.version} | ${config.exportedPath || '-'} |\n`; }
    md += `\n## 配置详情\n\n`;
    for (const config of configs.configurations) {
      md += `### ${config.name}\n\n- **工具**: ${config.tool}\n- **类型**: ${config.type}\n- **版本**: ${config.version}\n- **导出路径**: ${config.exportedPath || '未导出'}\n`;
      if (Object.keys(config.settings).length > 0) { md += `- **设置**:\n\`\`\`json\n${JSON.stringify(config.settings, null, 2)}\n\`\`\`\n`; }
      md += `\n`;
    }
    return md;
  }

  saveOutput(outputDir, output, markdown) {
    const dirPath = path.join(outputDir, '00_Project_Management/07_Tools', 'configuration-management');
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(path.join(dirPath, 'configurations.json'), JSON.stringify(output, null, 2), 'utf8');
    fs.writeFileSync(path.join(dirPath, 'configurations.md'), markdown, 'utf8');
  }
}

module.exports = ConfigurationManagement;
