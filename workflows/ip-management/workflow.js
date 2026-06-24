/**
 * 知识产权管理工作流
 * 用于管理专利、商标和版权
 */

const fs = require('fs');
const path = require('path');
const PatentManagement = require('./modules/patent-management');
const TrademarkManagement = require('./modules/trademark-management');
const CopyrightManagement = require('./modules/copyright-management');
const IpManager = require('./utils/ip-manager');

class IpManagementWorkflow {
  constructor(options = {}) {
    this.options = options;
    this.manager = new IpManager();

    this.moduleMap = {
      'patent-management': PatentManagement,
      'trademark-management': TrademarkManagement,
      'copyright-management': CopyrightManagement
    };
  }

  async execute(config) {
    const { mode, outputDir, inputData } = config;
    console.log(`[IpManagement] 开始执行，模式: ${mode}`);

    if (!outputDir) throw new Error('outputDir is required');

    let result;

    switch (mode) {
      case 'full-run':
        result = await this.executeFullRun(outputDir, inputData);
        break;
      case 'manage-patents':
        result = await this.executeModule('patent-management', outputDir, inputData);
        break;
      case 'manage-trademarks':
        result = await this.executeModule('trademark-management', outputDir, inputData);
        break;
      case 'manage-copyrights':
        result = await this.executeModule('copyright-management', outputDir, inputData);
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

    console.log(`[IpManagement] 执行完成`);
    return result;
  }

  async executeFullRun(outputDir, inputData) {
    const results = {};

    console.log('\n[Phase 1] 专利管理');
    if (inputData.patents) {
      results.patentManagement = await this.executeModule('patent-management', outputDir, inputData);
    }

    console.log('\n[Phase 2] 商标管理');
    if (inputData.trademarks) {
      results.trademarkManagement = await this.executeModule('trademark-management', outputDir, inputData);
    }

    console.log('\n[Phase 3] 版权管理');
    if (inputData.copyrights) {
      results.copyrightManagement = await this.executeModule('copyright-management', outputDir, inputData);
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
    let md = `# 知识产权统计报告\n\n**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
    md += `## 总体统计\n\n| 指标 | 值 |\n|------|----|\n`;
    md += `| 总专利数 | ${stats.totalPatents} |\n| 总商标数 | ${stats.totalTrademarks} |\n| 总版权数 | ${stats.totalCopyrights} |\n| 总费用 | ¥${stats.totalCost.toLocaleString()} |\n\n`;
    md += `## 专利状态\n\n| 状态 | 数量 |\n|------|------|\n`;
    for (const [status, count] of Object.entries(stats.byPatentStatus)) { md += `| ${status} | ${count} |\n`; }
    return md;
  }

  generateFullRunSummary(results) {
    return {
      patents: results.patentManagement?.summary?.total || 0,
      trademarks: results.trademarkManagement?.summary?.total || 0,
      copyrights: results.copyrightManagement?.summary?.total || 0,
      totalCost: (results.patentManagement?.summary?.totalCost || 0) + (results.trademarkManagement?.summary?.totalCost || 0) + (results.copyrightManagement?.summary?.totalCost || 0),
      markdown: `# 知识产权完整报告\n\n## 执行摘要\n\n- 专利: ${results.patentManagement?.summary?.total || 0} 项\n- 商标: ${results.trademarkManagement?.summary?.total || 0} 项\n- 版权: ${results.copyrightManagement?.summary?.total || 0} 项\n`
    };
  }
}

module.exports = IpManagementWorkflow;
