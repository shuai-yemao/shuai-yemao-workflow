/**
 * 工具清单模块
 */

const fs = require('fs');
const path = require('path');
const ToolchainManager = require('../utils/toolchain-manager');

class ToolInventory {
  constructor(options = {}) { this.options = options; this.manager = new ToolchainManager(); }

  async execute(config) {
    const { outputDir, inputData } = config;
    console.log('  [ToolInventory] 开始工具清单管理...');

    this.validateInput(inputData);
    const inventory = this.createInventory(inputData);
    const markdown = this.generateMarkdown(inventory, inputData.project);

    const output = { project: inputData.project, inventory, summary: this.generateSummary(inventory) };
    this.saveOutput(outputDir, output, markdown);

    console.log(`  [ToolInventory] 完成，记录了 ${inventory.tools.length} 个工具`);
    return { success: true, inventory, summary: output.summary, markdown };
  }

  validateInput(inputData) {
    if (!inputData.project) throw new Error('Project information is required');
    if (!inputData.tools || !Array.isArray(inputData.tools)) throw new Error('Tools array is required');
  }

  createInventory(inputData) {
    const tools = inputData.tools.map(tool => ({
      id: tool.id || this.manager.generateId('TOOL'),
      name: tool.name,
      category: tool.category || 'utility',
      version: tool.version || '',
      vendor: tool.vendor || '',
      license: tool.license || '',
      installPath: tool.installPath || '',
      purpose: tool.purpose || '',
      status: tool.status || 'active',
      lastUpdated: tool.lastUpdated || new Date().toISOString(),
      configurations: tool.configurations || [],
      dependencies: tool.dependencies || []
    }));

    return { tools, lastAudit: new Date().toISOString() };
  }

  generateSummary(inventory) {
    return { total: inventory.tools.length, byCategory: this.groupBy(inventory.tools, 'category'), byStatus: this.groupBy(inventory.tools, 'status') };
  }

  groupBy(array, key) {
    return array.reduce((result, item) => { const groupKey = item[key]; result[groupKey] = (result[groupKey] || 0) + 1; return result; }, {});
  }

  generateMarkdown(inventory, project) {
    const summary = this.generateSummary(inventory);
    let md = `# 开发工具清单\n\n**项目**: ${project.name} (${project.id})\n**最后审计**: ${inventory.lastAudit}\n**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
    md += `## 概览\n\n| 指标 | 值 |\n|------|----|\n| 工具总数 | ${summary.total} |\n\n`;
    md += `## 按类别\n\n| 类别 | 数量 |\n|------|------|\n`;
    for (const [cat, count] of Object.entries(summary.byCategory)) { md += `| ${cat} | ${count} |\n`; }
    md += `\n## 工具清单\n\n| ID | 名称 | 类别 | 版本 | 供应商 | 许可证 | 状态 |\n|-----|------|------|------|--------|--------|------|\n`;
    for (const tool of inventory.tools) { const statusIcon = tool.status === 'active' ? '✅' : tool.status === 'deprecated' ? '⚠️' : '📝'; md += `| ${tool.id} | ${tool.name} | ${tool.category} | ${tool.version || '-'} | ${tool.vendor || '-'} | ${tool.license || '-'} | ${statusIcon} ${tool.status} |\n`; }
    md += `\n## 详细信息\n\n`;
    for (const tool of inventory.tools) {
      md += `### ${tool.name}\n\n- **ID**: ${tool.id}\n- **类别**: ${tool.category}\n- **版本**: ${tool.version || '未知'}\n- **供应商**: ${tool.vendor || '未知'}\n- **许可证**: ${tool.license || '未知'}\n- **安装路径**: ${tool.installPath || '未知'}\n- **用途**: ${tool.purpose || '无'}\n`;
      if (tool.configurations.length > 0) { md += `- **配置项**:\n`; for (const config of tool.configurations) { md += `  - ${config.name}: ${config.value}\n`; } }
      md += `\n`;
    }
    return md;
  }

  saveOutput(outputDir, output, markdown) {
    const dirPath = path.join(outputDir, '00_Project_Management/07_Tools', 'tool-inventory');
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(path.join(dirPath, 'inventory.json'), JSON.stringify(output, null, 2), 'utf8');
    fs.writeFileSync(path.join(dirPath, 'inventory.md'), markdown, 'utf8');
  }
}

module.exports = ToolInventory;
