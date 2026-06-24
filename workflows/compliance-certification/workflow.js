/**
 * 法规认证工作流
 * 用于管理产品认证流程，支持法规识别、合规评估、认证规划等
 */

const fs = require('fs');
const path = require('path');
const RegulationIdentification = require('./modules/regulation-identification');
const ComplianceAssessment = require('./modules/compliance-assessment');
const CertificationPlanning = require('./modules/certification-planning');
const DocumentationPreparation = require('./modules/documentation-preparation');
const TrackingManagement = require('./modules/tracking-management');
const CertificationManager = require('./utils/certification-manager');

class ComplianceCertificationWorkflow {
  constructor(options = {}) {
    this.options = options;
    this.manager = new CertificationManager();

    this.moduleMap = {
      'regulation-identification': RegulationIdentification,
      'compliance-assessment': ComplianceAssessment,
      'certification-planning': CertificationPlanning,
      'documentation-preparation': DocumentationPreparation,
      'tracking-management': TrackingManagement
    };
  }

  async execute(config) {
    const { mode, outputDir, inputData } = config;
    console.log(`[ComplianceCertification] 开始执行，模式: ${mode}`);

    if (!outputDir) throw new Error('outputDir is required');

    let result;

    switch (mode) {
      case 'full-run':
        result = await this.executeFullRun(outputDir, inputData);
        break;
      case 'identify-regulations':
        result = await this.executeModule('regulation-identification', outputDir, inputData);
        break;
      case 'assess-compliance':
        result = await this.executeModule('compliance-assessment', outputDir, inputData);
        break;
      case 'plan-certification':
        result = await this.executeModule('certification-planning', outputDir, inputData);
        break;
      case 'prepare-docs':
        result = await this.executeModule('documentation-preparation', outputDir, inputData);
        break;
      case 'track-progress':
        result = await this.executeModule('tracking-management', outputDir, inputData);
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

    console.log(`[ComplianceCertification] 执行完成`);
    return result;
  }

  async executeFullRun(outputDir, inputData) {
    const results = {};

    console.log('\n[Phase 1] 法规识别');
    results.regulationIdentification = await this.executeModule('regulation-identification', outputDir, inputData);

    console.log('\n[Phase 2] 合规评估');
    const assessmentInput = { product: inputData.product, regulations: results.regulationIdentification.regulations };
    results.complianceAssessment = await this.executeModule('compliance-assessment', outputDir, assessmentInput);

    console.log('\n[Phase 3] 认证规划');
    const planningInput = { product: inputData.product, regulations: results.regulationIdentification.regulations, targetDate: inputData.targetDate, regions: inputData.regions };
    results.certificationPlanning = await this.executeModule('certification-planning', outputDir, planningInput);

    console.log('\n[Phase 4] 文档准备');
    const docsInput = { product: inputData.product, certifications: results.certificationPlanning.plan.certifications };
    results.documentationPreparation = await this.executeModule('documentation-preparation', outputDir, docsInput);

    console.log('\n[Phase 5] 追踪管理');
    const trackingInput = { product: inputData.product, certifications: results.certificationPlanning.plan.certifications };
    results.trackingManagement = await this.executeModule('tracking-management', outputDir, trackingInput);

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
    let md = `# 法规认证统计报告\n\n**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
    md += `## 总体统计\n\n| 指标 | 值 |\n|------|----|\n`;
    md += `| 总法规数 | ${stats.totalRegulations} |\n| 总认证数 | ${stats.totalCertifications} |\n| 总成本 | ¥${stats.totalCost.toLocaleString()} |\n\n`;
    md += `## 按状态分布\n\n| 状态 | 数量 |\n|------|------|\n`;
    for (const [status, count] of Object.entries(stats.byStatus)) { md += `| ${status} | ${count} |\n`; }
    md += `\n## 即将过期证书\n\n`;
    if (stats.expiringSoon.length > 0) {
      md += `| 证书名称 | 认证机构 | 过期日期 | 剩余天数 |\n|----------|----------|----------|----------|\n`;
      for (const cert of stats.expiringSoon) { md += `| ${cert.name} | ${cert.authority} | ${cert.expiryDate} | ${cert.daysRemaining} 天 |\n`; }
    } else { md += `暂无即将过期的证书\n`; }
    return md;
  }

  generateFullRunSummary(results) {
    return {
      regulationsIdentified: results.regulationIdentification.summary.total,
      complianceRate: results.complianceAssessment.summary.overallRate,
      certificationsPlanned: results.certificationPlanning.summary.totalCertifications,
      documentsRequired: results.documentationPreparation.summary.totalDocuments,
      markdown: `# 法规认证完整分析报告\n\n## 执行摘要\n\n- 识别法规: ${results.regulationIdentification.summary.total} 个\n- 合规率: ${results.complianceAssessment.summary.overallRate}%\n- 认证规划: ${results.certificationPlanning.summary.totalCertifications} 个\n- 文档需求: ${results.documentationPreparation.summary.totalDocuments} 个\n`
    };
  }
}

module.exports = ComplianceCertificationWorkflow;
