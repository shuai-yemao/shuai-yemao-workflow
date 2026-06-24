/**
 * 风险评估模块
 * 用于计算和评估 RPN（风险优先数）
 */

const fs = require('fs');
const path = require('path');
const DfmeaManager = require('../utils/dfmea-manager');

class RiskAssessment {
  constructor(options = {}) {
    this.options = options;
    this.manager = new DfmeaManager();
  }

  /**
   * 执行风险评估
   * @param {object} config - 配置
   * @param {string} config.outputDir - 输出目录
   * @param {object} config.inputData - 输入数据
   * @returns {object} 评估结果
   */
  async execute(config) {
    const { outputDir, inputData } = config;

    console.log('  [RiskAssessment] 开始风险评估...');

    // 1. 验证输入
    this.validateInput(inputData);

    // 2. 评估风险
    const assessments = this.assessRisks(inputData);

    // 3. 生成风险矩阵
    const riskMatrix = this.generateRiskMatrix(assessments);

    // 4. 生成 Markdown 报告
    const markdown = this.generateMarkdown(assessments, riskMatrix, inputData.product);

    // 5. 保存输出
    const output = {
      product: inputData.product,
      assessments,
      riskMatrix,
      summary: this.generateSummary(assessments)
    };

    this.saveOutput(outputDir, output, markdown);

    console.log(`  [RiskAssessment] 完成，评估了 ${assessments.length} 个失效模式`);

    return {
      success: true,
      assessments,
      riskMatrix,
      summary: output.summary,
      markdown
    };
  }

  /**
   * 验证输入数据
   */
  validateInput(inputData) {
    if (!inputData.product) {
      throw new Error('Product information is required');
    }
    if (!inputData.assessments || !Array.isArray(inputData.assessments)) {
      throw new Error('Assessments array is required');
    }
  }

  /**
   * 评估风险
   */
  assessRisks(inputData) {
    return inputData.assessments.map(assessment => {
      const rpn = this.manager.calculateRpn(
        assessment.severity,
        assessment.occurrence,
        assessment.detection
      );

      const riskLevel = this.manager.getRiskLevel(rpn.total);

      return {
        functionId: assessment.functionId,
        functionName: assessment.functionName || '',
        failureModeId: assessment.failureModeId,
        failureMode: assessment.failureMode || '',
        rpn,
        riskLevel,
        recommendation: this.generateRecommendation(rpn, riskLevel),
        timestamp: new Date().toISOString()
      };
    });
  }

  /**
   * 生成建议
   */
  generateRecommendation(rpn, riskLevel) {
    const recommendations = [];

    if (rpn.total >= 200) {
      recommendations.push('必须立即采取措施降低风险');
      recommendations.push('建议重新设计或增加防护措施');
    } else if (rpn.total >= 100) {
      recommendations.push('应采取措施降低风险');
      recommendations.push('考虑增加检测手段或降低发生频率');
    } else if (rpn.total >= 50) {
      recommendations.push('可考虑采取措施进一步降低风险');
    } else {
      recommendations.push('当前风险可接受');
    }

    // 根据各维度给出具体建议
    if (rpn.severity >= 8) {
      recommendations.push('严重度高：考虑增加安全防护或冗余设计');
    }
    if (rpn.occurrence >= 7) {
      recommendations.push('发生度高：需要分析根本原因并采取预防措施');
    }
    if (rpn.detection >= 7) {
      recommendations.push('检测度高：建议增加检测手段或自动化测试');
    }

    return recommendations;
  }

  /**
   * 生成风险矩阵
   */
  generateRiskMatrix(assessments) {
    const matrix = {
      high: [],    // RPN >= 200
      medium: [],  // 100 <= RPN < 200
      low: [],     // 50 <= RPN < 100
      veryLow: []  // RPN < 50
    };

    for (const assessment of assessments) {
      const rpn = assessment.rpn.total;
      if (rpn >= 200) {
        matrix.high.push(assessment);
      } else if (rpn >= 100) {
        matrix.medium.push(assessment);
      } else if (rpn >= 50) {
        matrix.low.push(assessment);
      } else {
        matrix.veryLow.push(assessment);
      }
    }

    // 按 RPN 降序排序
    matrix.high.sort((a, b) => b.rpn.total - a.rpn.total);
    matrix.medium.sort((a, b) => b.rpn.total - a.rpn.total);

    return matrix;
  }

  /**
   * 生成摘要
   */
  generateSummary(assessments) {
    const summary = {
      total: assessments.length,
      byRiskLevel: {
        high: assessments.filter(a => a.rpn.total >= 200).length,
        medium: assessments.filter(a => a.rpn.total >= 100 && a.rpn.total < 200).length,
        low: assessments.filter(a => a.rpn.total >= 50 && a.rpn.total < 100).length,
        veryLow: assessments.filter(a => a.rpn.total < 50).length
      },
      averageRpn: 0,
      maxRpn: 0,
      topRisks: []
    };

    if (assessments.length > 0) {
      const rpns = assessments.map(a => a.rpn.total);
      summary.averageRpn = Math.round(rpns.reduce((a, b) => a + b, 0) / rpns.length);
      summary.maxRpn = Math.max(...rpns);

      summary.topRisks = assessments
        .filter(a => a.rpn.total >= 100)
        .sort((a, b) => b.rpn.total - a.rpn.total)
        .slice(0, 10)
        .map(a => ({
          functionId: a.functionId,
          failureModeId: a.failureModeId,
          failureMode: a.failureMode,
          rpn: a.rpn.total,
          riskLevel: a.riskLevel.level
        }));
    }

    return summary;
  }

  /**
   * 生成 Markdown 报告
   */
  generateMarkdown(assessments, riskMatrix, product) {
    const summary = this.generateSummary(assessments);

    let md = `# DFMEA 风险评估报告\n\n`;
    md += `**产品**: ${product.name} (${product.id})\n`;
    md += `**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;

    md += `## 风险概览\n\n`;
    md += `| 指标 | 值 |\n|------|----|\n`;
    md += `| 总失效模式数 | ${summary.total} |\n`;
    md += `| 高风险 (RPN≥200) | ${summary.byRiskLevel.high} |\n`;
    md += `| 中风险 (100≤RPN<200) | ${summary.byRiskLevel.medium} |\n`;
    md += `| 低风险 (50≤RPN<100) | ${summary.byRiskLevel.low} |\n`;
    md += `| 极低风险 (RPN<50) | ${summary.byRiskLevel.veryLow} |\n`;
    md += `| 平均 RPN | ${summary.averageRpn} |\n`;
    md += `| 最大 RPN | ${summary.maxRpn} |\n\n`;

    // 高风险项
    if (riskMatrix.high.length > 0) {
      md += `## ⚠️ 高风险项 (RPN≥200)\n\n`;
      md += `| 失效模式 | 功能 | S | O | D | RPN | 建议 |\n`;
      md += `|----------|------|---|---|---|-----|------|\n`;
      for (const a of riskMatrix.high) {
        md += `| ${a.failureMode} | ${a.functionName} | ${a.rpn.severity} | ${a.rpn.occurrence} | ${a.rpn.detection} | **${a.rpn.total}** | ${a.recommendation[0]} |\n`;
      }
      md += `\n`;
    }

    // 中风险项
    if (riskMatrix.medium.length > 0) {
      md += `## ⚡ 中风险项 (100≤RPN<200)\n\n`;
      md += `| 失效模式 | 功能 | S | O | D | RPN | 建议 |\n`;
      md += `|----------|------|---|---|---|-----|------|\n`;
      for (const a of riskMatrix.medium) {
        md += `| ${a.failureMode} | ${a.functionName} | ${a.rpn.severity} | ${a.rpn.occurrence} | ${a.rpn.detection} | **${a.rpn.total}** | ${a.recommendation[0]} |\n`;
      }
      md += `\n`;
    }

    // 详细评估结果
    md += `## 详细评估结果\n\n`;
    for (const a of assessments) {
      md += `### ${a.failureModeId} - ${a.failureMode}\n\n`;
      md += `- **功能**: ${a.functionName} (${a.functionId})\n`;
      md += `- **RPN**: ${a.rpn.total} (S=${a.rpn.severity}, O=${a.rpn.occurrence}, D=${a.rpn.detection})\n`;
      md += `- **风险等级**: ${a.riskLevel.level}\n`;
      md += `- **建议**:\n`;
      for (const rec of a.recommendation) {
        md += `  - ${rec}\n`;
      }
      md += `\n`;
    }

    return md;
  }

  /**
   * 保存输出
   */
  saveOutput(outputDir, output, markdown) {
    const dirPath = path.join(outputDir, '00_Project_Management/05_功能风险管控_DFMEA', 'risk-assessment');

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // 保存 JSON
    fs.writeFileSync(
      path.join(dirPath, 'risk-assessment.json'),
      JSON.stringify(output, null, 2),
      'utf8'
    );

    // 保存 Markdown
    fs.writeFileSync(
      path.join(dirPath, 'risk-assessment.md'),
      markdown,
      'utf8'
    );
  }
}

module.exports = RiskAssessment;
