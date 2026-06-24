/**
 * 应用软件开发管理工作流
 * 用于管理应用软件开发全流程，包括架构设计、需求管理、发布管理和问题追踪
 */

const fs = require('fs');
const path = require('path');
const ArchitectureDesign = require('./modules/architecture-design');
const RequirementManagement = require('./modules/requirement-management');
const ReleaseManagement = require('./modules/release-management');
const IssueTracking = require('./modules/issue-tracking');
const SoftwareManager = require('./utils/software-manager');

class SoftwareDevelopmentWorkflow {
  constructor(options = {}) {
    this.options = options;
    this.manager = new SoftwareManager();

    this.moduleMap = {
      'architecture-design': ArchitectureDesign,
      'requirement-management': RequirementManagement,
      'release-management': ReleaseManagement,
      'issue-tracking': IssueTracking
    };
  }

  async execute(config) {
    const { mode, outputDir, inputData } = config;
    console.log(`[SoftwareDevelopment] 开始执行，模式: ${mode}`);

    if (!outputDir) throw new Error('outputDir is required');

    let result;

    switch (mode) {
      case 'full-run':
        result = await this.executeFullRun(outputDir, inputData);
        break;
      case 'design-architecture':
        result = await this.executeModule('architecture-design', outputDir, inputData);
        break;
      case 'manage-requirements':
        result = await this.executeModule('requirement-management', outputDir, inputData);
        break;
      case 'manage-releases':
        result = await this.executeModule('release-management', outputDir, inputData);
        break;
      case 'track-issues':
        result = await this.executeModule('issue-tracking', outputDir, inputData);
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

    console.log(`[SoftwareDevelopment] 执行完成`);
    return result;
  }

  async executeFullRun(outputDir, inputData) {
    const results = {};

    console.log('\n[Phase 1] 架构设计');
    results.architectureDesign = await this.executeModule('architecture-design', outputDir, inputData);

    console.log('\n[Phase 2] 需求管理');
    if (inputData.requirements) {
      results.requirementManagement = await this.executeModule('requirement-management', outputDir, inputData);
    }

    console.log('\n[Phase 3] 发布管理');
    if (inputData.releases) {
      results.releaseManagement = await this.executeModule('release-management', outputDir, inputData);
    }

    console.log('\n[Phase 4] 问题追踪');
    if (inputData.issues) {
      results.issueTracking = await this.executeModule('issue-tracking', outputDir, inputData);
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
    let md = `# 软件开发统计报告\n\n**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
    md += `## 总体统计\n\n| 指标 | 值 |\n|------|----|\n`;
    md += `| 总模块数 | ${stats.totalModules} |\n| 总需求数 | ${stats.totalRequirements} |\n| 总问题数 | ${stats.totalIssues} |\n\n`;
    md += `## 按模块类型\n\n| 类型 | 数量 |\n|------|------|\n`;
    for (const [type, count] of Object.entries(stats.byModuleType)) { md += `| ${type} | ${count} |\n`; }
    return md;
  }

  generateFullRunSummary(results) {
    return {
      architectureLayers: results.architectureDesign?.summary?.totalLayers || 0,
      modules: results.architectureDesign?.summary?.totalModules || 0,
      requirements: results.requirementManagement?.summary?.total || 0,
      releases: results.releaseManagement?.summary?.total || 0,
      issues: results.issueTracking?.summary?.total || 0,
      markdown: `# 应用软件开发完整报告\n\n## 执行摘要\n\n- 架构层级: ${results.architectureDesign?.summary?.totalLayers || 0}\n- 软件模块: ${results.architectureDesign?.summary?.totalModules || 0}\n- 需求数量: ${results.requirementManagement?.summary?.total || 0}\n- 发布版本: ${results.releaseManagement?.summary?.total || 0}\n- 问题数量: ${results.issueTracking?.summary?.total || 0}\n`
    };
  }
}

module.exports = SoftwareDevelopmentWorkflow;
