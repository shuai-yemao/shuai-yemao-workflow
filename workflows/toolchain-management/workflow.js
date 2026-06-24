/**
 * 工具链管理工作流
 * 用于管理开发工具清单、配置和版本
 */

const fs = require('fs');
const path = require('path');
const ToolInventory = require('./modules/tool-inventory');
const ConfigurationManagement = require('./modules/configuration-management');
const VersionManagement = require('./modules/version-management');
const ToolchainManager = require('./utils/toolchain-manager');

class ToolchainManagementWorkflow {
  constructor(options = {}) {
    this.options = options;
    this.manager = new ToolchainManager();

    this.moduleMap = {
      'tool-inventory': ToolInventory,
      'configuration-management': ConfigurationManagement,
      'version-management': VersionManagement
    };
  }

  async execute(config) {
    const { mode, outputDir, inputData } = config;
    console.log(`[ToolchainManagement] 开始执行，模式: ${mode}`);

    if (!outputDir) throw new Error('outputDir is required');

    let result;

    switch (mode) {
      case 'full-run':
        result = await this.executeFullRun(outputDir, inputData);
        break;
      case 'manage-inventory':
        result = await this.executeModule('tool-inventory', outputDir, inputData);
        break;
      case 'manage-configurations':
        result = await this.executeModule('configuration-management', outputDir, inputData);
        break;
      case 'manage-versions':
        result = await this.executeModule('version-management', outputDir, inputData);
        break;
      case 'single':
        if (!config.module) throw new Error('module name is required for single mode');
        result = await this.executeModule(config.module, outputDir, inputData);
        break;
      case 'statistics':
        result = this.getStatistics(outputDir, inputData?.recordId);
        break;
      default:
        throw new Error(`Unknown mode: ${mode}`);
    }

    console.log(`[ToolchainManagement] 执行完成`);
    return result;
  }

  async executeFullRun(outputDir, inputData) {
    const results = {};

    console.log('\n[Phase 1] 工具清单');
    results.toolInventory = await this.executeModule('tool-inventory', outputDir, inputData);

    console.log('\n[Phase 2] 配置管理');
    if (inputData.configurations) {
      results.configurationManagement = await this.executeModule('configuration-management', outputDir, inputData);
    }

    console.log('\n[Phase 3] 版本管理');
    if (inputData.records) {
      results.versionManagement = await this.executeModule('version-management', outputDir, inputData);
    }

    return { success: true, mode: 'full-run', results, summary: this.generateFullRunSummary(results) };
  }

  async executeModule(moduleName, outputDir, inputData) {
    const ModuleClass = this.moduleMap[moduleName];
    if (!ModuleClass) throw new Error(`Unknown module: ${moduleName}`);
    const module = new ModuleClass(this.options);
    return await module.execute({ outputDir, inputData });
  }

  getStatistics(outputDir, recordId = null) {
    const stats = this.manager.getStatistics(outputDir, recordId);
    const markdown = this.generateStatisticsMarkdown(stats);
    return { success: true, statistics: stats, markdown };
  }

  generateStatisticsMarkdown(stats) {
    let md = `# 工具链统计报告\n\n**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
    md += `## 总体统计\n\n| 指标 | 值 |\n|------|----|\n`;
    md += `| 工具总数 | ${stats.totalTools} |\n\n`;
    md += `## 按类别\n\n| 类别 | 数量 |\n|------|------|\n`;
    for (const [cat, count] of Object.entries(stats.byCategory)) { md += `| ${cat} | ${count} |\n`; }
    return md;
  }

  generateFullRunSummary(results) {
    return {
      tools: results.toolInventory?.summary?.total || 0,
      configurations: results.configurationManagement?.summary?.total || 0,
      versionRecords: results.versionManagement?.summary?.total || 0,
      markdown: `# 工具链管理完整报告\n\n## 执行摘要\n\n- 工具数量: ${results.toolInventory?.summary?.total || 0}\n- 配置数量: ${results.configurationManagement?.summary?.total || 0}\n- 版本记录: ${results.versionManagement?.summary?.total || 0}\n`
    };
  }
}

module.exports = ToolchainManagementWorkflow;
