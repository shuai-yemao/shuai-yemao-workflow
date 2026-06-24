/**
 * 硬件设计管理工作流
 * 用于管理硬件设计流程，包括原理图、PCB、BOM 和评审管理
 */

const fs = require('fs');
const path = require('path');
const DesignPlanning = require('./modules/design-planning');
const SchematicManagement = require('./modules/schematic-management');
const PcbManagement = require('./modules/pcb-management');
const HardwareBom = require('./modules/hardware-bom');
const ReviewManagement = require('./modules/review-management');
const HardwareManager = require('./utils/hardware-manager');

class HardwareDesignWorkflow {
  constructor(options = {}) {
    this.options = options;
    this.manager = new HardwareManager();

    this.moduleMap = {
      'design-planning': DesignPlanning,
      'schematic-management': SchematicManagement,
      'pcb-management': PcbManagement,
      'hardware-bom': HardwareBom,
      'review-management': ReviewManagement
    };
  }

  async execute(config) {
    const { mode, outputDir, inputData } = config;
    console.log(`[HardwareDesign] 开始执行，模式: ${mode}`);

    if (!outputDir) throw new Error('outputDir is required');

    let result;

    switch (mode) {
      case 'full-run':
        result = await this.executeFullRun(outputDir, inputData);
        break;
      case 'plan-design':
        result = await this.executeModule('design-planning', outputDir, inputData);
        break;
      case 'manage-schematic':
        result = await this.executeModule('schematic-management', outputDir, inputData);
        break;
      case 'manage-pcb':
        result = await this.executeModule('pcb-management', outputDir, inputData);
        break;
      case 'manage-bom':
        result = await this.executeModule('hardware-bom', outputDir, inputData);
        break;
      case 'manage-reviews':
        result = await this.executeModule('review-management', outputDir, inputData);
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

    console.log(`[HardwareDesign] 执行完成`);
    return result;
  }

  async executeFullRun(outputDir, inputData) {
    const results = {};

    console.log('\n[Phase 1] 设计规划');
    results.designPlanning = await this.executeModule('design-planning', outputDir, inputData);

    console.log('\n[Phase 2] 原理图管理');
    if (inputData.schematics) {
      results.schematicManagement = await this.executeModule('schematic-management', outputDir, inputData);
    }

    console.log('\n[Phase 3] PCB 管理');
    if (inputData.pcbs) {
      results.pcbManagement = await this.executeModule('pcb-management', outputDir, inputData);
    }

    console.log('\n[Phase 4] BOM 管理');
    if (inputData.bomItems) {
      results.hardwareBom = await this.executeModule('hardware-bom', outputDir, inputData);
    }

    console.log('\n[Phase 5] 评审管理');
    if (inputData.reviews) {
      results.reviewManagement = await this.executeModule('review-management', outputDir, inputData);
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
    let md = `# 硬件设计统计报告\n\n**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
    md += `## 总体统计\n\n| 指标 | 值 |\n|------|----|\n`;
    md += `| 总组件数 | ${stats.totalComponents} |\n| 总原理图数 | ${stats.totalSchematics} |\n| 总 PCB 数 | ${stats.totalPcbs} |\n| BOM 条目数 | ${stats.totalBomItems} |\n| BOM 总成本 | ¥${stats.totalBomCost.toFixed(2)} |\n\n`;
    md += `## 按组件类型\n\n| 类型 | 数量 |\n|------|------|\n`;
    for (const [type, count] of Object.entries(stats.byComponentType)) { md += `| ${type} | ${count} |\n`; }
    md += `\n## 原理图状态\n\n| 状态 | 数量 |\n|------|------|\n`;
    for (const [status, count] of Object.entries(stats.bySchematicStatus)) { md += `| ${status} | ${count} |\n`; }
    md += `\n## PCB 状态\n\n| 状态 | 数量 |\n|------|------|\n`;
    for (const [status, count] of Object.entries(stats.byPcbStatus)) { md += `| ${status} | ${count} |\n`; }
    return md;
  }

  generateFullRunSummary(results) {
    return {
      componentsPlanned: results.designPlanning?.summary?.totalComponents || 0,
      schematicsManaged: results.schematicManagement?.summary?.total || 0,
      pcbsManaged: results.pcbManagement?.summary?.total || 0,
      bomItems: results.hardwareBom?.summary?.totalItems || 0,
      totalCost: results.hardwareBom?.summary?.totalCost || 0,
      reviewsCompleted: results.reviewManagement?.summary?.totalReviews || 0,
      markdown: `# 硬件设计完整报告\n\n## 执行摘要\n\n- 组件规划: ${results.designPlanning?.summary?.totalComponents || 0} 个\n- 原理图: ${results.schematicManagement?.summary?.total || 0} 个\n- PCB: ${results.pcbManagement?.summary?.total || 0} 个\n- BOM 条目: ${results.hardwareBom?.summary?.totalItems || 0} 个\n- BOM 总成本: ¥${(results.hardwareBom?.summary?.totalCost || 0).toFixed(2)}\n- 评审: ${results.reviewManagement?.summary?.totalReviews || 0} 次\n`
    };
  }
}

module.exports = HardwareDesignWorkflow;
