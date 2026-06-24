/**
 * DFMEA 管理工作流
 * 用于产品功能风险管控，支持完整的 DFMEA 流程
 */

const fs = require('fs');
const path = require('path');
const FunctionAnalysis = require('./modules/function-analysis');
const RiskAssessment = require('./modules/risk-assessment');
const ImprovementActions = require('./modules/improvement-actions');
const TrackingVerification = require('./modules/tracking-verification');
const DfmeaManager = require('./utils/dfmea-manager');

class DfmeaWorkflow {
  constructor(options = {}) {
    this.options = options;
    this.manager = new DfmeaManager();

    // 模块映射
    this.moduleMap = {
      'function-analysis': FunctionAnalysis,
      'risk-assessment': RiskAssessment,
      'improvement-actions': ImprovementActions,
      'tracking-verification': TrackingVerification
    };
  }

  /**
   * 执行工作流
   * @param {object} config - 配置
   * @param {string} config.mode - 执行模式
   * @param {string} config.outputDir - 输出目录
   * @param {object} config.inputData - 输入数据
   * @returns {object} 执行结果
   */
  async execute(config) {
    const { mode, outputDir, inputData } = config;

    console.log(`[DfmeaWorkflow] 开始执行，模式: ${mode}`);

    // 验证输入
    if (!outputDir) {
      throw new Error('outputDir is required');
    }

    let result;

    switch (mode) {
      case 'full-run':
        result = await this.executeFullRun(outputDir, inputData);
        break;

      case 'function-analysis':
        result = await this.executeModule('function-analysis', outputDir, inputData);
        break;

      case 'risk-assessment':
        result = await this.executeModule('risk-assessment', outputDir, inputData);
        break;

      case 'improvement':
        result = await this.executeModule('improvement-actions', outputDir, inputData);
        break;

      case 'tracking':
        result = await this.executeModule('tracking-verification', outputDir, inputData);
        break;

      case 'single':
        if (!config.module) {
          throw new Error('module name is required for single mode');
        }
        result = await this.executeModule(config.module, outputDir, inputData);
        break;

      case 'update-rpn':
        result = await this.updateRpn(outputDir, inputData);
        break;

      case 'statistics':
        result = this.getStatistics(outputDir, inputData?.dfmeaId);
        break;

      default:
        throw new Error(`Unknown mode: ${mode}`);
    }

    console.log(`[DfmeaWorkflow] 执行完成`);

    return result;
  }

  /**
   * 完整执行所有模块
   */
  async executeFullRun(outputDir, inputData) {
    const results = {};

    // 1. 功能分析
    console.log('\n[Phase 1] 功能分析');
    results.functionAnalysis = await this.executeModule('function-analysis', outputDir, inputData);

    // 2. 风险评估（使用功能分析的结果）
    console.log('\n[Phase 2] 风险评估');
    const riskInput = this.buildRiskInput(results.functionAnalysis, inputData);
    results.riskAssessment = await this.executeModule('risk-assessment', outputDir, riskInput);

    // 3. 改进措施（使用风险评估的结果）
    console.log('\n[Phase 3] 改进措施');
    const improvementInput = this.buildImprovementInput(results.riskAssessment, inputData);
    results.improvementActions = await this.executeModule('improvement-actions', outputDir, improvementInput);

    // 4. 跟踪验证（使用改进措施的结果）
    console.log('\n[Phase 4] 跟踪验证');
    const trackingInput = this.buildTrackingInput(results.improvementActions, inputData);
    results.trackingVerification = await this.executeModule('tracking-verification', outputDir, trackingInput);

    // 生成汇总报告
    const summary = this.generateFullRunSummary(results);

    return {
      success: true,
      mode: 'full-run',
      results,
      summary,
      markdown: summary.markdown
    };
  }

  /**
   * 执行单个模块
   */
  async executeModule(moduleName, outputDir, inputData) {
    const ModuleClass = this.moduleMap[moduleName];
    if (!ModuleClass) {
      throw new Error(`Unknown module: ${moduleName}`);
    }

    const module = new ModuleClass(this.options);
    return await module.execute({ outputDir, inputData });
  }

  /**
   * 构建风险评估输入
   */
  buildRiskInput(functionAnalysisResult, originalInput) {
    const assessments = [];

    if (functionAnalysisResult.functions) {
      for (const func of functionAnalysisResult.functions) {
        for (const fm of func.failureModes) {
          assessments.push({
            functionId: func.id,
            functionName: func.name,
            failureModeId: fm.id,
            failureMode: fm.description,
            severity: fm.rpn.severity,
            occurrence: fm.rpn.occurrence,
            detection: fm.rpn.detection
          });
        }
      }
    }

    return {
      product: originalInput.product,
      assessments
    };
  }

  /**
   * 构建改进措施输入
   */
  buildImprovementInput(riskAssessmentResult, originalInput) {
    const actions = [];

    if (riskAssessmentResult.assessments) {
      for (const assessment of riskAssessmentResult.assessments) {
        if (assessment.rpn.total >= 100) { // 只为中高风险项制定措施
          actions.push({
            failureModeId: assessment.failureModeId,
            failureMode: assessment.failureMode,
            functionName: assessment.functionName,
            description: assessment.recommendation[0],
            responsible: originalInput.responsible || '待分配',
            deadline: originalInput.deadline,
            currentSeverity: assessment.rpn.severity,
            currentOccurrence: assessment.rpn.occurrence,
            currentDetection: assessment.rpn.detection,
            targetSeverity: Math.max(1, assessment.rpn.severity - 2),
            targetOccurrence: Math.max(1, assessment.rpn.occurrence - 2),
            targetDetection: Math.max(1, assessment.rpn.detection - 2)
          });
        }
      }
    }

    return {
      product: originalInput.product,
      actions
    };
  }

  /**
   * 构建跟踪验证输入
   */
  buildTrackingInput(improvementResult, originalInput) {
    return {
      product: originalInput.product,
      actions: improvementResult.actions || []
    };
  }

  /**
   * 更新 RPN
   */
  async updateRpn(outputDir, inputData) {
    const { dfmeaId, functionId, failureModeId, severity, occurrence, detection } = inputData;

    const dfmea = this.manager.loadDfmea(outputDir, dfmeaId);
    if (!dfmea) {
      throw new Error(`DFMEA ${dfmeaId} not found`);
    }

    // 查找并更新指定的失效模式
    let updated = false;
    for (const func of dfmea.functions) {
      if (func.id === functionId) {
        for (const fm of func.failureModes) {
          if (fm.id === failureModeId) {
            fm.rpn = this.manager.calculateRpn(severity, occurrence, detection);
            updated = true;
            break;
          }
        }
      }
    }

    if (!updated) {
      throw new Error(`Failure mode ${failureModeId} not found in function ${functionId}`);
    }

    this.manager.saveDfmea(outputDir, dfmea);

    return {
      success: true,
      message: `RPN updated for ${failureModeId}`,
      dfmea
    };
  }

  /**
   * 获取统计信息
   */
  getStatistics(outputDir, dfmeaId = null) {
    const stats = this.manager.getStatistics(outputDir, dfmeaId);

    const markdown = this.generateStatisticsMarkdown(stats);

    return {
      success: true,
      statistics: stats,
      markdown
    };
  }

  /**
   * 生成统计 Markdown
   */
  generateStatisticsMarkdown(stats) {
    let md = `# DFMEA 统计报告\n\n`;
    md += `**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;

    md += `## 总体统计\n\n`;
    md += `| 指标 | 值 |\n|------|----|\n`;
    md += `| 总功能数 | ${stats.totalFunctions} |\n`;
    md += `| 总失效模式数 | ${stats.totalFailureModes} |\n`;
    md += `| 平均 RPN | ${stats.averageRpn} |\n`;
    md += `| 最大 RPN | ${stats.maxRpn} |\n\n`;

    md += `## 按状态分布\n\n`;
    md += `| 状态 | 数量 |\n|------|------|\n`;
    md += `| 待处理 | ${stats.byStatus.open} |\n`;
    md += `| 处理中 | ${stats.byStatus['in-progress']} |\n`;
    md += `| 已完成 | ${stats.byStatus.completed} |\n\n`;

    md += `## 按风险等级分布\n\n`;
    md += `| 等级 | 数量 |\n|------|------|\n`;
    md += `| 高风险 | ${stats.byRiskLevel.high} |\n`;
    md += `| 中风险 | ${stats.byRiskLevel.medium} |\n`;
    md += `| 低风险 | ${stats.byRiskLevel.low} |\n`;
    md += `| 极低风险 | ${stats.byRiskLevel.veryLow} |\n\n`;

    if (stats.topRisks.length > 0) {
      md += `## Top 10 高风险项\n\n`;
      md += `| 功能 | 失效模式 | RPN | 等级 |\n`;
      md += `|------|----------|-----|------|\n`;
      for (const risk of stats.topRisks) {
        md += `| ${risk.functionName} | ${risk.failureMode} | ${risk.rpn} | ${risk.riskLevel} |\n`;
      }
      md += `\n`;
    }

    return md;
  }

  /**
   * 生成完整执行摘要
   */
  generateFullRunSummary(results) {
    const markdown = `# DFMEA 完整分析报告\n\n## 执行摘要\n\n` +
      `- 功能分析: ${results.functionAnalysis.summary.totalFunctions} 个功能, ${results.functionAnalysis.summary.totalFailureModes} 个失效模式\n` +
      `- 风险评估: ${results.riskAssessment.summary.total} 个评估项\n` +
      `- 改进措施: ${results.improvementActions.summary.total} 个措施\n` +
      `- 跟踪验证: ${results.trackingVerification.summary.tracking.total} 个跟踪项\n`;

    return {
      totalFunctions: results.functionAnalysis.summary.totalFunctions,
      totalFailureModes: results.functionAnalysis.summary.totalFailureModes,
      totalActions: results.improvementActions.summary.total,
      markdown
    };
  }
}

module.exports = DfmeaWorkflow;
