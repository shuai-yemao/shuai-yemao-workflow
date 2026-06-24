/**
 * 固件开发管理工作流
 * 用于管理固件开发全流程，包括架构设计、版本控制、构建、测试和发布
 */

const fs = require('fs');
const path = require('path');
const ArchitectureDesign = require('./modules/architecture-design');
const VersionControl = require('./modules/version-control');
const BuildManagement = require('./modules/build-management');
const TestIntegration = require('./modules/test-integration');
const ReleaseManagement = require('./modules/release-management');
const FirmwareManager = require('./utils/firmware-manager');

class FirmwareDevelopmentWorkflow {
  constructor(options = {}) {
    this.options = options;
    this.manager = new FirmwareManager();

    this.moduleMap = {
      'architecture-design': ArchitectureDesign,
      'version-control': VersionControl,
      'build-management': BuildManagement,
      'test-integration': TestIntegration,
      'release-management': ReleaseManagement
    };
  }

  async execute(config) {
    const { mode, outputDir, inputData } = config;
    console.log(`[FirmwareDevelopment] 开始执行，模式: ${mode}`);

    if (!outputDir) throw new Error('outputDir is required');

    let result;

    switch (mode) {
      case 'full-run':
        result = await this.executeFullRun(outputDir, inputData);
        break;
      case 'design-architecture':
        result = await this.executeModule('architecture-design', outputDir, inputData);
        break;
      case 'manage-versions':
        result = await this.executeModule('version-control', outputDir, inputData);
        break;
      case 'manage-builds':
        result = await this.executeModule('build-management', outputDir, inputData);
        break;
      case 'manage-tests':
        result = await this.executeModule('test-integration', outputDir, inputData);
        break;
      case 'manage-releases':
        result = await this.executeModule('release-management', outputDir, inputData);
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

    console.log(`[FirmwareDevelopment] 执行完成`);
    return result;
  }

  async executeFullRun(outputDir, inputData) {
    const results = {};

    console.log('\n[Phase 1] 架构设计');
    results.architectureDesign = await this.executeModule('architecture-design', outputDir, inputData);

    console.log('\n[Phase 2] 版本控制');
    if (inputData.releases) {
      results.versionControl = await this.executeModule('version-control', outputDir, inputData);
    }

    console.log('\n[Phase 3] 构建管理');
    if (inputData.builds) {
      results.buildManagement = await this.executeModule('build-management', outputDir, inputData);
    }

    console.log('\n[Phase 4] 测试集成');
    if (inputData.testSuites) {
      results.testIntegration = await this.executeModule('test-integration', outputDir, inputData);
    }

    console.log('\n[Phase 5] 发布管理');
    if (inputData.releases) {
      results.releaseManagement = await this.executeModule('release-management', outputDir, inputData);
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
    let md = `# 固件开发统计报告\n\n**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
    md += `## 总体统计\n\n| 指标 | 值 |\n|------|----|\n`;
    md += `| 总模块数 | ${stats.totalModules} |\n| 总发布数 | ${stats.totalReleases} |\n\n`;
    md += `## 按模块类型\n\n| 类型 | 数量 |\n|------|------|\n`;
    for (const [type, count] of Object.entries(stats.byModuleType)) { md += `| ${type} | ${count} |\n`; }
    md += `\n## 按模块状态\n\n| 状态 | 数量 |\n|------|------|\n`;
    for (const [status, count] of Object.entries(stats.byModuleStatus)) { md += `| ${status} | ${count} |\n`; }
    return md;
  }

  generateFullRunSummary(results) {
    return {
      architectureLayers: results.architectureDesign?.summary?.totalLayers || 0,
      firmwareModules: results.architectureDesign?.summary?.totalModules || 0,
      releases: results.versionControl?.summary?.totalReleases || 0,
      builds: results.buildManagement?.summary?.totalBuilds || 0,
      testSuites: results.testIntegration?.summary?.totalSuites || 0,
      markdown: `# 固件开发完整报告\n\n## 执行摘要\n\n- 架构层级: ${results.architectureDesign?.summary?.totalLayers || 0}\n- 固件模块: ${results.architectureDesign?.summary?.totalModules || 0}\n- 版本发布: ${results.versionControl?.summary?.totalReleases || 0}\n- 构建次数: ${results.buildManagement?.summary?.totalBuilds || 0}\n- 测试套件: ${results.testIntegration?.summary?.totalSuites || 0}\n`
    };
  }
}

module.exports = FirmwareDevelopmentWorkflow;
