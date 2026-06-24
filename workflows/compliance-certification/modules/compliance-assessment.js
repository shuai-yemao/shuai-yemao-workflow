/**
 * 合规评估模块
 * 用于评估产品的合规状态
 */

const fs = require('fs');
const path = require('path');
const CertificationManager = require('../utils/certification-manager');

class ComplianceAssessment {
  constructor(options = {}) {
    this.options = options;
    this.manager = new CertificationManager();
  }

  /**
   * 执行合规评估
   * @param {object} config - 配置
   * @param {string} config.outputDir - 输出目录
   * @param {object} config.inputData - 输入数据
   * @returns {object} 评估结果
   */
  async execute(config) {
    const { outputDir, inputData } = config;

    console.log('  [ComplianceAssessment] 开始合规评估...');

    // 1. 验证输入
    this.validateInput(inputData);

    // 2. 评估合规状态
    const assessment = this.assessCompliance(inputData);

    // 3. 生成 Markdown 报告
    const markdown = this.generateMarkdown(assessment, inputData.product);

    // 4. 保存输出
    const output = {
      product: inputData.product,
      assessment,
      summary: this.generateSummary(assessment)
    };

    this.saveOutput(outputDir, output, markdown);

    console.log(`  [ComplianceAssessment] 完成，评估了 ${assessment.regulations.length} 个法规`);

    return {
      success: true,
      assessment,
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
    if (!inputData.regulations || !Array.isArray(inputData.regulations)) {
      throw new Error('Regulations array is required');
    }
  }

  /**
   * 评估合规状态
   */
  assessCompliance(inputData) {
    const regulations = inputData.regulations.map(reg => {
      const requirements = this.assessRequirements(reg, inputData);
      const complianceRate = this.calculateComplianceRate(requirements);

      return {
        id: reg.id,
        name: reg.name,
        region: reg.region,
        category: reg.category,
        requirements,
        complianceRate,
        status: this.determineStatus(complianceRate),
        gaps: this.identifyGaps(requirements),
        recommendations: this.generateRecommendations(reg, requirements)
      };
    });

    return {
      regulations,
      overallRate: this.calculateOverallRate(regulations),
      overallStatus: this.determineOverallStatus(regulations)
    };
  }

  /**
   * 评估要求
   */
  assessRequirements(regulation, inputData) {
    const existingRequirements = regulation.requirements || [];

    // 如果没有具体要求，生成通用要求
    if (existingRequirements.length === 0) {
      return this.generateDefaultRequirements(regulation);
    }

    return existingRequirements.map(req => ({
      id: req.id,
      description: req.description,
      status: req.status || 'pending',
      evidence: req.evidence || '',
      notes: req.notes || '',
      priority: req.priority || 'medium'
    }));
  }

  /**
   * 生成默认要求
   */
  generateDefaultRequirements(regulation) {
    const defaultRequirements = {
      'safety': [
        { id: 'REQ-001', description: '电气安全测试', status: 'pending', priority: 'high' },
        { id: 'REQ-002', description: '机械安全检查', status: 'pending', priority: 'high' },
        { id: 'REQ-003', description: '温度升高测试', status: 'pending', priority: 'medium' },
        { id: 'REQ-004', description: '绝缘电阻测试', status: 'pending', priority: 'high' }
      ],
      'emc': [
        { id: 'REQ-001', description: '传导骚扰测试', status: 'pending', priority: 'high' },
        { id: 'REQ-002', description: '辐射骚扰测试', status: 'pending', priority: 'high' },
        { id: 'REQ-003', description: '静电放电抗扰度测试', status: 'pending', priority: 'medium' },
        { id: 'REQ-004', description: '浪涌抗扰度测试', status: 'pending', priority: 'medium' }
      ],
      'radio': [
        { id: 'REQ-001', description: '发射功率测试', status: 'pending', priority: 'high' },
        { id: 'REQ-002', description: '频率稳定性测试', status: 'pending', priority: 'high' },
        { id: 'REQ-003', description: '占用带宽测试', status: 'pending', priority: 'medium' },
        { id: 'REQ-004', description: '杂散发射测试', status: 'pending', priority: 'high' }
      ],
      'environmental': [
        { id: 'REQ-001', description: '有害物质含量检测', status: 'pending', priority: 'high' },
        { id: 'REQ-002', description: '可回收材料标识', status: 'pending', priority: 'medium' },
        { id: 'REQ-003', description: '能效测试', status: 'pending', priority: 'medium' }
      ]
    };

    return defaultRequirements[regulation.category] || defaultRequirements['safety'];
  }

  /**
   * 计算合规率
   */
  calculateComplianceRate(requirements) {
    if (requirements.length === 0) return 0;

    const compliantCount = requirements.filter(r => r.status === 'compliant').length;
    return Math.round((compliantCount / requirements.length) * 100);
  }

  /**
   * 确定状态
   */
  determineStatus(complianceRate) {
    if (complianceRate === 100) return 'compliant';
    if (complianceRate >= 80) return 'partial';
    if (complianceRate > 0) return 'non-compliant';
    return 'pending';
  }

  /**
   * 识别差距
   */
  identifyGaps(requirements) {
    return requirements
      .filter(r => r.status !== 'compliant')
      .map(r => ({
        requirementId: r.id,
        description: r.description,
        status: r.status,
        priority: r.priority
      }));
  }

  /**
   * 生成建议
   */
  generateRecommendations(regulation, requirements) {
    const recommendations = [];
    const gaps = this.identifyGaps(requirements);

    if (gaps.length === 0) {
      recommendations.push('产品已完全合规，可以申请认证');
    } else {
      const highPriorityGaps = gaps.filter(g => g.priority === 'high');
      const mediumPriorityGaps = gaps.filter(g => g.priority === 'medium');

      if (highPriorityGaps.length > 0) {
        recommendations.push(`优先完成 ${highPriorityGaps.length} 项高优先级要求`);
      }
      if (mediumPriorityGaps.length > 0) {
        recommendations.push(`计划完成 ${mediumPriorityGaps.length} 项中优先级要求`);
      }
      recommendations.push('建议进行预测试以验证合规性');
    }

    return recommendations;
  }

  /**
   * 计算总体合规率
   */
  calculateOverallRate(regulations) {
    const totalRequirements = regulations.reduce((sum, r) => sum + r.requirements.length, 0);
    const compliantRequirements = regulations.reduce((sum, r) =>
      sum + r.requirements.filter(req => req.status === 'compliant').length, 0);

    return totalRequirements > 0
      ? Math.round((compliantRequirements / totalRequirements) * 100)
      : 0;
  }

  /**
   * 确定总体状态
   */
  determineOverallStatus(regulations) {
    const rates = regulations.map(r => r.complianceRate);
    const avgRate = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;

    return this.determineStatus(avgRate);
  }

  /**
   * 生成摘要
   */
  generateSummary(assessment) {
    return {
      totalRegulations: assessment.regulations.length,
      overallRate: assessment.overallRate,
      overallStatus: assessment.overallStatus,
      byStatus: {
        compliant: assessment.regulations.filter(r => r.status === 'compliant').length,
        partial: assessment.regulations.filter(r => r.status === 'partial').length,
        'non-compliant': assessment.regulations.filter(r => r.status === 'non-compliant').length,
        pending: assessment.regulations.filter(r => r.status === 'pending').length
      },
      totalGaps: assessment.regulations.reduce((sum, r) => sum + r.gaps.length, 0)
    };
  }

  /**
   * 生成 Markdown 报告
   */
  generateMarkdown(assessment, product) {
    const summary = this.generateSummary(assessment);

    let md = `# 合规评估报告\n\n`;
    md += `**产品**: ${product.name} (${product.id})\n`;
    md += `**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;

    md += `## 评估概览\n\n`;
    md += `| 指标 | 值 |\n|------|----|\n`;
    md += `| 总法规数 | ${summary.totalRegulations} |\n`;
    md += `| 总体合规率 | ${summary.overallRate}% |\n`;
    md += `| 总体状态 | ${summary.overallStatus} |\n`;
    md += `| 总差距数 | ${summary.totalGaps} |\n\n`;

    md += `### 按状态分布\n\n`;
    md += `| 状态 | 数量 |\n|------|------|\n`;
    md += `| ✅ 合规 | ${summary.byStatus.compliant} |\n`;
    md += `| ⚠️ 部分合规 | ${summary.byStatus.partial} |\n`;
    md += `| ❌ 不合规 | ${summary.byStatus['non-compliant']} |\n`;
    md += `| ⏳ 待评估 | ${summary.byStatus.pending} |\n\n`;

    // 详细评估结果
    for (const reg of assessment.regulations) {
      const statusIcon = reg.status === 'compliant' ? '✅' :
        reg.status === 'partial' ? '⚠️' :
          reg.status === 'non-compliant' ? '❌' : '⏳';

      md += `## ${statusIcon} ${reg.name} (${reg.region})\n\n`;
      md += `- **合规率**: ${reg.complianceRate}%\n`;
      md += `- **状态**: ${reg.status}\n\n`;

      // 要求列表
      if (reg.requirements.length > 0) {
        md += `### 要求评估\n\n`;
        md += `| ID | 要求 | 状态 | 优先级 |\n`;
        md += `|-----|------|------|--------|\n`;

        for (const req of reg.requirements) {
          const reqStatusIcon = req.status === 'compliant' ? '✅' :
            req.status === 'partial' ? '⚠️' : '❌';
          md += `| ${req.id} | ${req.description} | ${reqStatusIcon} ${req.status} | ${req.priority} |\n`;
        }
        md += `\n`;
      }

      // 差距
      if (reg.gaps.length > 0) {
        md += `### 差距分析\n\n`;
        for (const gap of reg.gaps) {
          md += `- **${gap.description}**: ${gap.status} (优先级: ${gap.priority})\n`;
        }
        md += `\n`;
      }

      // 建议
      if (reg.recommendations.length > 0) {
        md += `### 建议\n\n`;
        for (const rec of reg.recommendations) {
          md += `- ${rec}\n`;
        }
        md += `\n`;
      }
    }

    return md;
  }

  /**
   * 保存输出
   */
  saveOutput(outputDir, output, markdown) {
    const dirPath = path.join(outputDir, '00_Project_Management/04_法规认证', 'compliance-assessment');

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    fs.writeFileSync(
      path.join(dirPath, 'compliance-assessment.json'),
      JSON.stringify(output, null, 2),
      'utf8'
    );

    fs.writeFileSync(
      path.join(dirPath, 'compliance-assessment.md'),
      markdown,
      'utf8'
    );
  }
}

module.exports = ComplianceAssessment;
