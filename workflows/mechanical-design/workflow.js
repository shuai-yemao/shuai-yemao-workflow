/**
 * 机械设计管理工作流
 * 用于管理机械零件设计和装配
 */

const fs = require('fs');
const path = require('path');
const PartDesign = require('./modules/part-design');
const AssemblyManagement = require('./modules/assembly-management');
const MechanicalManager = require('./utils/mechanical-manager');

class MechanicalDesignWorkflow {
  constructor(options = {}) {
    this.options = options;
    this.manager = new MechanicalManager();

    this.moduleMap = {
      'part-design': PartDesign,
      'assembly-management': AssemblyManagement
    };
  }

  async execute(config) {
    const { mode, outputDir, inputData } = config;
    console.log(`[MechanicalDesign] 开始执行，模式: ${mode}`);

    if (!outputDir) throw new Error('outputDir is required');

    let result;

    switch (mode) {
      case 'full-run':
        result = await this.executeFullRun(outputDir, inputData);
        break;
      case 'design-parts':
        result = await this.executeModule('part-design', outputDir, inputData);
        break;
      case 'manage-assemblies':
        result = await this.executeModule('assembly-management', outputDir, inputData);
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

    console.log(`[MechanicalDesign] 执行完成`);
    return result;
  }

  async executeFullRun(outputDir, inputData) {
    const results = {};

    console.log('\n[Phase 1] 零件设计');
    results.partDesign = await this.executeModule('part-design', outputDir, inputData);

    console.log('\n[Phase 2] 装配管理');
    if (inputData.assemblies) {
      results.assemblyManagement = await this.executeModule('assembly-management', outputDir, inputData);
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
    let md = `# 机械设计统计报告\n\n**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
    md += `## 总体统计\n\n| 指标 | 值 |\n|------|----|\n`;
    md += `| 总零件数 | ${stats.totalParts} |\n| 总装配体数 | ${stats.totalAssemblies} |\n| 总重量 | ${stats.totalWeight.toFixed(2)} g |\n\n`;
    md += `## 按零件类型\n\n| 类型 | 数量 |\n|------|------|\n`;
    for (const [type, count] of Object.entries(stats.byPartType)) { md += `| ${type} | ${count} |\n`; }
    return md;
  }

  generateFullRunSummary(results) {
    return {
      parts: results.partDesign?.summary?.total || 0,
      assemblies: results.assemblyManagement?.summary?.total || 0,
      totalWeight: results.partDesign?.summary?.totalWeight || 0,
      totalCost: results.partDesign?.summary?.totalCost || 0,
      markdown: `# 机械设计完整报告\n\n## 执行摘要\n\n- 零件: ${results.partDesign?.summary?.total || 0} 个\n- 装配体: ${results.assemblyManagement?.summary?.total || 0} 个\n- 总重量: ${(results.partDesign?.summary?.totalWeight || 0).toFixed(2)} g\n`
    };
  }
}

module.exports = MechanicalDesignWorkflow;
