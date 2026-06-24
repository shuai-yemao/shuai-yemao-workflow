/**
 * 质量检查模块
 *
 * 职责：
 * - 执行质量检查
 * - 记录不良品
 * - 生成质量报告
 */

const fs = require('fs');
const path = require('path');

class QualityControl {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * 执行质量检查
   */
  async execute(config) {
    const { outputDir, inputData = {} } = config;

    // 1. 解析检查数据
    const inspectionData = this.parseInspectionData(inputData);

    // 2. 计算质量指标
    const metrics = this.calculateMetrics(inspectionData);

    // 3. 分析不良品
    const defectAnalysis = this.analyzeDefects(inspectionData.defects);

    // 4. 评估质量等级
    const qualityGrade = this.assessQualityGrade(metrics);

    // 5. 生成改进建议
    const recommendations = this.generateRecommendations(defectAnalysis, qualityGrade);

    // 6. 生成输出
    const result = {
      batchId: inspectionData.batchId,
      inspectionDate: inspectionData.inspectionDate || new Date().toISOString().split('T')[0],
      totalUnits: inspectionData.totalUnits,
      passedUnits: inspectionData.passedUnits,
      failedUnits: inspectionData.failedUnits,
      passRate: metrics.passRate,
      checks: inspectionData.checks,
      defects: inspectionData.defects,
      metrics,
      defectAnalysis,
      qualityGrade,
      recommendations,
      summary: this.generateSummary(inspectionData, metrics, qualityGrade)
    };

    // 7. 保存到文件
    await this.saveOutput(outputDir, result);

    return result;
  }

  /**
   * 解析检查数据
   */
  parseInspectionData(inputData) {
    const totalUnits = inputData.totalUnits || 0;
    const checks = inputData.checks || [];
    const defects = inputData.defects || [];

    // 计算通过数量
    let passedUnits = totalUnits;
    for (const defect of defects) {
      if (defect.action === '报废' || defect.action === '返工失败') {
        passedUnits--;
      }
    }

    return {
      batchId: inputData.batchId || `BATCH-${Date.now()}`,
      inspectionDate: inputData.inspectionDate,
      totalUnits,
      passedUnits,
      failedUnits: defects.length,
      checks,
      defects
    };
  }

  /**
   * 计算质量指标
   */
  calculateMetrics(inspectionData) {
    const passRate = inspectionData.totalUnits > 0
      ? inspectionData.passedUnits / inspectionData.totalUnits
      : 0;

    const defectRate = inspectionData.totalUnits > 0
      ? inspectionData.failedUnits / inspectionData.totalUnits
      : 0;

    // 计算首次通过率（假设）
    const firstPassRate = passRate * 0.95;

    return {
      passRate,
      defectRate,
      firstPassRate,
      totalDefects: inspectionData.failedUnits,
      defectTypes: this.countDefectTypes(inspectionData.defects)
    };
  }

  /**
   * 统计缺陷类型
   */
  countDefectTypes(defects) {
    const types = {};

    for (const defect of defects) {
      const type = defect.rootCause || '未知';
      types[type] = (types[type] || 0) + 1;
    }

    return types;
  }

  /**
   * 分析缺陷
   */
  analyzeDefects(defects) {
    const analysis = {
      total: defects.length,
      byType: {},
      byRootCause: {},
      severity: {
        critical: 0,
        major: 0,
        minor: 0
      }
    };

    for (const defect of defects) {
      // 按类型统计
      const type = defect.issue || '其他';
      analysis.byType[type] = (analysis.byType[type] || 0) + 1;

      // 按根本原因统计
      const cause = defect.rootCause || '未知';
      analysis.byRootCause[cause] = (analysis.byRootCause[cause] || 0) + 1;

      // 按严重程度统计
      if (defect.severity === 'critical' || defect.action === '报废') {
        analysis.severity.critical++;
      } else if (defect.severity === 'major' || defect.action === '返工') {
        analysis.severity.major++;
      } else {
        analysis.severity.minor++;
      }
    }

    return analysis;
  }

  /**
   * 评估质量等级
   */
  assessQualityGrade(metrics) {
    const passRate = metrics.passRate;

    if (passRate >= 0.98) {
      return { grade: 'A', description: '优秀', color: 'green' };
    } else if (passRate >= 0.95) {
      return { grade: 'B', description: '良好', color: 'blue' };
    } else if (passRate >= 0.90) {
      return { grade: 'C', description: '一般', color: 'yellow' };
    } else if (passRate >= 0.85) {
      return { grade: 'D', description: '较差', color: 'orange' };
    } else {
      return { grade: 'F', description: '不合格', color: 'red' };
    }
  }

  /**
   * 生成改进建议
   */
  generateRecommendations(defectAnalysis, qualityGrade) {
    const recommendations = [];

    // 基于质量等级的建议
    if (qualityGrade.grade === 'F' || qualityGrade.grade === 'D') {
      recommendations.push({
        type: 'process',
        priority: 'high',
        message: '质量不达标，需要全面检查生产流程',
        action: '组织质量分析会议，找出根本原因'
      });
    }

    // 基于缺陷类型的建议
    const topDefectType = Object.entries(defectAnalysis.byRootCause)
      .sort(([, a], [, b]) => b - a)[0];

    if (topDefectType) {
      recommendations.push({
        type: 'defect',
        priority: 'high',
        message: `最常见的缺陷原因是 "${topDefectType[0]}"，共 ${topDefectType[1]} 次`,
        action: `针对 "${topDefectType[0]}" 制定改进措施`
      });
    }

    // 基于严重程度的建议
    if (defectAnalysis.severity.critical > 0) {
      recommendations.push({
        type: 'critical',
        priority: 'critical',
        message: `有 ${defectAnalysis.severity.critical} 个严重缺陷`,
        action: '立即停止生产，排查问题'
      });
    }

    return recommendations;
  }

  /**
   * 生成摘要
   */
  generateSummary(inspectionData, metrics, qualityGrade) {
    return {
      batchId: inspectionData.batchId,
      totalUnits: inspectionData.totalUnits,
      passedUnits: inspectionData.passedUnits,
      failedUnits: inspectionData.failedUnits,
      passRate: metrics.passRate,
      qualityGrade: qualityGrade.grade,
      qualityDescription: qualityGrade.description
    };
  }

  /**
   * 保存输出
   */
  async saveOutput(outputDir, result) {
    const outputDirFull = path.join(outputDir, '00_Project_Management/09_产品生产管理_Six_Sigma/quality');

    // 创建目录
    fs.mkdirSync(outputDirFull, { recursive: true });

    // 保存 JSON
    const jsonPath = path.join(outputDirFull, 'quality-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf-8');

    // 保存 Markdown
    const mdPath = path.join(outputDirFull, 'quality-report.md');
    const mdContent = this.generateMarkdown(result);
    fs.writeFileSync(mdPath, mdContent, 'utf-8');

    console.log(`   📁 质量报告已保存: ${outputDirFull}`);
  }

  /**
   * 生成 Markdown 文档
   */
  generateMarkdown(result) {
    const lines = [
      `# 质量报告 - ${result.batchId}`,
      '',
      `**检查日期**: ${result.inspectionDate}`,
      `**生成时间**: ${new Date().toISOString()}`,
      '',
      '---',
      '',
      '## 质量摘要',
      '',
      `- **总数量**: ${result.totalUnits}`,
      `- **合格数量**: ${result.passedUnits}`,
      `- **不良数量**: ${result.failedUnits}`,
      `- **通过率**: ${(result.passRate * 100).toFixed(1)}%`,
      `- **质量等级**: ${result.qualityGrade} (${result.summary.qualityDescription})`,
      ''
    ];

    // 检查项目
    if (result.checks.length > 0) {
      lines.push('## 检查项目', '');
      lines.push('| 检查项 | 结果 | 备注 |', '|--------|------|------|');

      for (const check of result.checks) {
        const resultIcon = check.result === 'pass' ? '✅' : '❌';
        lines.push(`| ${check.checkItem} | ${resultIcon} ${check.result} | ${check.notes || ''} |`);
      }
      lines.push('');
    }

    // 缺陷分析
    if (result.defects.length > 0) {
      lines.push('## 缺陷分析', '');
      lines.push('### 缺陷列表', '');
      lines.push('| 产品编号 | 问题 | 根本原因 | 处理方式 |', '|----------|------|----------|----------|');

      for (const defect of result.defects) {
        lines.push(`| ${defect.unitId} | ${defect.issue} | ${defect.rootCause} | ${defect.action} |`);
      }
      lines.push('');

      lines.push('### 缺陷统计', '');
      lines.push('**按根本原因:**', '');

      for (const [cause, count] of Object.entries(result.defectAnalysis.byRootCause)) {
        lines.push(`- ${cause}: ${count} 次`);
      }
      lines.push('');
    }

    // 改进建议
    if (result.recommendations.length > 0) {
      lines.push('## 改进建议', '');

      for (const rec of result.recommendations) {
        lines.push(`- **[${rec.priority.toUpperCase()}]** ${rec.message}`);
        lines.push(`  - 操作: ${rec.action}`);
        lines.push('');
      }
    }

    return lines.join('\n');
  }
}

module.exports = QualityControl;
