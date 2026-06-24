/**
 * 认证规划模块
 * 用于制定认证计划和时间表
 */

const fs = require('fs');
const path = require('path');
const CertificationManager = require('../utils/certification-manager');

class CertificationPlanning {
  constructor(options = {}) {
    this.options = options;
    this.manager = new CertificationManager();
  }

  /**
   * 执行认证规划
   * @param {object} config - 配置
   * @param {string} config.outputDir - 输出目录
   * @param {object} config.inputData - 输入数据
   * @returns {object} 规划结果
   */
  async execute(config) {
    const { outputDir, inputData } = config;

    console.log('  [CertificationPlanning] 开始认证规划...');

    // 1. 验证输入
    this.validateInput(inputData);

    // 2. 制定认证计划
    const plan = this.createPlan(inputData);

    // 3. 生成 Markdown 报告
    const markdown = this.generateMarkdown(plan, inputData.product);

    // 4. 保存输出
    const output = {
      product: inputData.product,
      plan,
      summary: this.generateSummary(plan)
    };

    this.saveOutput(outputDir, output, markdown);

    console.log(`  [CertificationPlanning] 完成，制定了 ${plan.certifications.length} 个认证计划`);

    return {
      success: true,
      plan,
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
    if (!inputData.targetDate) {
      throw new Error('Target date is required');
    }
  }

  /**
   * 制定认证计划
   */
  createPlan(inputData) {
    const certifications = inputData.regulations.map(reg => {
      const cert = this.createCertificationPlan(reg, inputData);
      return cert;
    });

    // 按优先级排序
    certifications.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // 计算时间线
    const timeline = this.calculateTimeline(certifications, inputData.targetDate);

    return {
      certifications,
      timeline,
      totalEstimatedCost: this.calculateTotalCost(certifications),
      criticalPath: this.identifyCriticalPath(certifications)
    };
  }

  /**
   * 创建单个认证计划
   */
  createCertificationPlan(regulation, inputData) {
    const estimatedDuration = this.estimateDuration(regulation);
    const estimatedCost = this.estimateCost(regulation);
    const priority = this.determinePriority(regulation, inputData);

    return {
      id: this.manager.generateRecordId(),
      regulationId: regulation.id,
      regulationName: regulation.name,
      region: regulation.region,
      category: regulation.category,
      authority: this.determineAuthority(regulation),
      status: 'planned',
      priority,
      estimatedDuration,
      estimatedCost,
      startDate: null,
      targetDate: inputData.targetDate,
      documents: this.generateDocumentList(regulation),
      requirements: this.mapRequirements(regulation),
      milestones: this.generateMilestones(regulation, estimatedDuration),
      notes: ''
    };
  }

  /**
   * 估计持续时间
   */
  estimateDuration(regulation) {
    const durations = {
      'safety': { min: 4, max: 8, unit: 'weeks' },
      'emc': { min: 2, max: 4, unit: 'weeks' },
      'radio': { min: 3, max: 6, unit: 'weeks' },
      'environmental': { min: 2, max: 4, unit: 'weeks' }
    };

    return durations[regulation.category] || { min: 4, max: 8, unit: 'weeks' };
  }

  /**
   * 估计成本
   */
  estimateCost(regulation) {
    const costs = {
      'CN': {
        'safety': 50000,
        'emc': 30000,
        'radio': 40000,
        'environmental': 20000
      },
      'EU': {
        'safety': 8000,
        'emc': 5000,
        'radio': 6000,
        'environmental': 3000
      },
      'US': {
        'safety': 10000,
        'emc': 6000,
        'radio': 7000,
        'environmental': 4000
      }
    };

    const regionCosts = costs[regulation.region] || costs['CN'];
    return regionCosts[regulation.category] || 30000;
  }

  /**
   * 确定优先级
   */
  determinePriority(regulation, inputData) {
    // 必需认证为高优先级
    if (['safety', 'radio'].includes(regulation.category)) {
      return 'high';
    }

    // 根据地区重要性
    if (inputData.regions && inputData.regions.indexOf(regulation.region) === 0) {
      return 'high';
    }

    return 'medium';
  }

  /**
   * 确定认证机构
   */
  determineAuthority(regulation) {
    const authorities = {
      'CN': {
        'safety': 'CCC 认证机构',
        'emc': 'EMC 认证机构',
        'radio': 'SRRC 认证机构',
        'environmental': 'CQC 认证机构'
      },
      'EU': {
        'safety': 'TÜV / CE 公告机构',
        'emc': 'CE 公告机构',
        'radio': 'CE 公告机构',
        'environmental': '第三方检测机构'
      },
      'US': {
        'safety': 'UL / ETL',
        'emc': 'FCC 认可实验室',
        'radio': 'FCC 认可实验室',
        'environmental': 'EPA 认可机构'
      }
    };

    const regionAuthorities = authorities[regulation.region] || authorities['CN'];
    return regionAuthorities[regulation.category] || '认证机构';
  }

  /**
   * 生成文档清单
   */
  generateDocumentList(regulation) {
    const commonDocs = [
      { name: '产品规格书', status: 'pending' },
      { name: '电路原理图', status: 'pending' },
      { name: 'PCB 布局图', status: 'pending' },
      { name: 'BOM 清单', status: 'pending' },
      { name: '产品照片', status: 'pending' },
      { name: '用户手册', status: 'pending' }
    ];

    const specificDocs = {
      'safety': [
        { name: '安全关键件清单', status: 'pending' },
        { name: '安全测试报告', status: 'pending' }
      ],
      'emc': [
        { name: 'EMC 测试配置', status: 'pending' },
        { name: 'EMC 测试报告', status: 'pending' }
      ],
      'radio': [
        { name: '无线模块技术规格', status: 'pending' },
        { name: '射频测试报告', status: 'pending' },
        { name: '频率使用声明', status: 'pending' }
      ],
      'environmental': [
        { name: '材料成分声明', status: 'pending' },
        { name: 'RoHS 检测报告', status: 'pending' }
      ]
    };

    return [...commonDocs, ...(specificDocs[regulation.category] || [])];
  }

  /**
   * 映射要求
   */
  mapRequirements(regulation) {
    return (regulation.requirements || []).map(req => ({
      id: req.id,
      description: req.description,
      status: req.status || 'pending',
      assignedTo: null,
      dueDate: null
    }));
  }

  /**
   * 生成里程碑
   */
  generateMilestones(regulation, duration) {
    const milestones = [
      { name: '文档准备', offset: 0, duration: 1 },
      { name: '预测试', offset: 1, duration: Math.ceil(duration.max * 0.3) },
      { name: '正式测试', offset: Math.ceil(duration.max * 0.3) + 1, duration: Math.ceil(duration.max * 0.5) },
      { name: '报告审核', offset: Math.ceil(duration.max * 0.8) + 1, duration: Math.ceil(duration.max * 0.2) },
      { name: '证书签发', offset: duration.max, duration: 1 }
    ];

    return milestones.map(m => ({
      ...m,
      targetWeek: m.offset + m.duration
    }));
  }

  /**
   * 计算时间线
   */
  calculateTimeline(certifications, targetDate) {
    const startDate = new Date();
    const target = new Date(targetDate);

    // 按优先级分配时间
    let currentDate = new Date(startDate);
    const milestones = [];

    for (const cert of certifications) {
      const certStart = new Date(currentDate);
      const durationWeeks = cert.estimatedDuration.max;
      const certEnd = new Date(currentDate);
      certEnd.setDate(certEnd.getDate() + durationWeeks * 7);

      milestones.push({
        certificationId: cert.id,
        certificationName: cert.regulationName,
        startDate: certStart.toISOString().split('T')[0],
        endDate: certEnd.toISOString().split('T')[0],
        durationWeeks
      });

      // 下一个认证延迟 2 周开始
      currentDate.setDate(currentDate.getDate() + (durationWeeks - 2) * 7);
    }

    return {
      projectStart: startDate.toISOString().split('T')[0],
      targetCompletion: targetDate,
      milestones,
      isFeasible: currentDate <= target
    };
  }

  /**
   * 计算总成本
   */
  calculateTotalCost(certifications) {
    return certifications.reduce((sum, cert) => sum + cert.estimatedCost, 0);
  }

  /**
   * 识别关键路径
   */
  identifyCriticalPath(certifications) {
    // 找出耗时最长的认证
    const sorted = [...certifications].sort((a, b) =>
      b.estimatedDuration.max - a.estimatedDuration.max
    );

    return sorted.slice(0, 3).map(cert => ({
      id: cert.id,
      name: cert.regulationName,
      duration: cert.estimatedDuration,
      priority: cert.priority
    }));
  }

  /**
   * 生成摘要
   */
  generateSummary(plan) {
    return {
      totalCertifications: plan.certifications.length,
      totalEstimatedCost: plan.totalEstimatedCost,
      isFeasible: plan.timeline.isFeasible,
      byPriority: {
        critical: plan.certifications.filter(c => c.priority === 'critical').length,
        high: plan.certifications.filter(c => c.priority === 'high').length,
        medium: plan.certifications.filter(c => c.priority === 'medium').length,
        low: plan.certifications.filter(c => c.priority === 'low').length
      }
    };
  }

  /**
   * 生成 Markdown 报告
   */
  generateMarkdown(plan, product) {
    const summary = this.generateSummary(plan);

    let md = `# 认证规划报告\n\n`;
    md += `**产品**: ${product.name} (${product.id})\n`;
    md += `**目标完成日期**: ${plan.timeline.targetCompletion}\n`;
    md += `**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;

    md += `## 规划概览\n\n`;
    md += `| 指标 | 值 |\n|------|----|\n`;
    md += `| 总认证数 | ${summary.totalCertifications} |\n`;
    md += `| 预估总成本 | ¥${summary.totalEstimatedCost.toLocaleString()} |\n`;
    md += `| 可行性 | ${summary.isFeasible ? '✅ 可行' : '⚠️ 需调整'} |\n\n`;

    md += `### 按优先级分布\n\n`;
    md += `| 优先级 | 数量 |\n|--------|------|\n`;
    md += `| 🔴 关键 | ${summary.byPriority.critical} |\n`;
    md += `| 🟠 高 | ${summary.byPriority.high} |\n`;
    md += `| 🟡 中 | ${summary.byPriority.medium} |\n`;
    md += `| 🟢 低 | ${summary.byPriority.low} |\n\n`;

    // 认证计划详情
    md += `## 认证计划详情\n\n`;

    for (const cert of plan.certifications) {
      const priorityIcon = cert.priority === 'critical' ? '🔴' :
        cert.priority === 'high' ? '🟠' :
          cert.priority === 'medium' ? '🟡' : '🟢';

      md += `### ${priorityIcon} ${cert.regulationName} (${cert.region})\n\n`;
      md += `- **ID**: ${cert.id}\n`;
      md += `- **认证机构**: ${cert.authority}\n`;
      md += `- **预估周期**: ${cert.estimatedDuration.min}-${cert.estimatedDuration.max} 周\n`;
      md += `- **预估成本**: ¥${cert.estimatedCost.toLocaleString()}\n`;
      md += `- **优先级**: ${cert.priority}\n\n`;

      // 所需文档
      md += `**所需文档:**\n`;
      for (const doc of cert.documents) {
        md += `- [ ] ${doc.name}\n`;
      }
      md += `\n`;

      // 里程碑
      md += `**里程碑:**\n`;
      md += `| 里程碑 | 目标周 |\n|--------|--------|\n`;
      for (const milestone of cert.milestones) {
        md += `| ${milestone.name} | 第 ${milestone.targetWeek} 周 |\n`;
      }
      md += `\n`;
    }

    // 时间线
    md += `## 项目时间线\n\n`;
    md += `| 认证 | 开始日期 | 结束日期 | 周期 |\n`;
    md += `|------|----------|----------|------|\n`;
    for (const milestone of plan.timeline.milestones) {
      md += `| ${milestone.certificationName} | ${milestone.startDate} | ${milestone.endDate} | ${milestone.durationWeeks} 周 |\n`;
    }
    md += `\n`;

    // 关键路径
    md += `## 关键路径\n\n`;
    md += `以下认证是项目的关键路径，需要重点关注：\n\n`;
    for (const item of plan.criticalPath) {
      md += `1. **${item.name}**: ${item.duration.min}-${item.duration.max} 周 (${item.priority} 优先级)\n`;
    }
    md += `\n`;

    return md;
  }

  /**
   * 保存输出
   */
  saveOutput(outputDir, output, markdown) {
    const dirPath = path.join(outputDir, '00_Project_Management/04_法规认证', 'certification-planning');

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    fs.writeFileSync(
      path.join(dirPath, 'certification-plan.json'),
      JSON.stringify(output, null, 2),
      'utf8'
    );

    fs.writeFileSync(
      path.join(dirPath, 'certification-plan.md'),
      markdown,
      'utf8'
    );
  }
}

module.exports = CertificationPlanning;
