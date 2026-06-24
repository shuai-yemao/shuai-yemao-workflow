/**
 * 跟踪验证模块
 * 用于跟踪措施执行和效果验证
 */

const fs = require('fs');
const path = require('path');
const DfmeaManager = require('../utils/dfmea-manager');

class TrackingVerification {
  constructor(options = {}) {
    this.options = options;
    this.manager = new DfmeaManager();
  }

  /**
   * 执行跟踪验证
   * @param {object} config - 配置
   * @param {string} config.outputDir - 输出目录
   * @param {object} config.inputData - 输入数据
   * @returns {object} 结果
   */
  async execute(config) {
    const { outputDir, inputData } = config;

    console.log('  [TrackingVerification] 开始跟踪验证...');

    // 1. 验证输入
    this.validateInput(inputData);

    // 2. 执行跟踪验证
    const tracking = this.trackProgress(inputData);

    // 3. 验证效果
    const verification = this.verifyEffectiveness(tracking);

    // 4. 生成 Markdown 报告
    const markdown = this.generateMarkdown(tracking, verification, inputData.product);

    // 5. 保存输出
    const output = {
      product: inputData.product,
      tracking,
      verification,
      summary: this.generateSummary(tracking, verification)
    };

    this.saveOutput(outputDir, output, markdown);

    console.log(`  [TrackingVerification] 完成，跟踪了 ${tracking.actions.length} 个措施`);

    return {
      success: true,
      tracking,
      verification,
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
    if (!inputData.actions || !Array.isArray(inputData.actions)) {
      throw new Error('Actions array is required');
    }
  }

  /**
   * 跟踪进度
   */
  trackProgress(inputData) {
    const actions = inputData.actions.map(action => {
      const progress = this.calculateProgress(action);
      const isOverdue = this.checkOverdue(action);

      return {
        ...action,
        progress,
        isOverdue,
        daysRemaining: this.calculateDaysRemaining(action.deadline),
        lastUpdate: action.lastUpdate || new Date().toISOString()
      };
    });

    return {
      actions,
      summary: this.generateTrackingSummary(actions)
    };
  }

  /**
   * 计算进度
   */
  calculateProgress(action) {
    switch (action.status) {
      case 'completed':
        return 100;
      case 'in-progress':
        return action.progress || 50;
      case 'planned':
        return 0;
      default:
        return 0;
    }
  }

  /**
   * 检查是否逾期
   */
  checkOverdue(action) {
    if (!action.deadline || action.status === 'completed') {
      return false;
    }
    const deadline = new Date(action.deadline);
    const now = new Date();
    return now > deadline;
  }

  /**
   * 计算剩余天数
   */
  calculateDaysRemaining(deadline) {
    if (!deadline) return null;
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const diffTime = deadlineDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * 验证效果
   */
  verifyEffectiveness(tracking) {
    const verifications = tracking.actions
      .filter(a => a.status === 'completed')
      .map(action => {
        const effectiveness = this.evaluateEffectiveness(action);
        return {
          actionId: action.id,
          functionName: action.functionName,
          failureMode: action.failureMode,
          currentRpn: action.currentRpn,
          targetRpn: action.targetRpn,
          actualRpn: action.actualRpn || action.currentRpn,
          effectiveness,
          verified: effectiveness.score >= 80,
          verifiedAt: new Date().toISOString()
        };
      });

    return {
      verifications,
      summary: this.generateVerificationSummary(verifications)
    };
  }

  /**
   * 评估效果
   */
  evaluateEffectiveness(action) {
    if (!action.targetRpn || !action.actualRpn) {
      return { score: 0, status: 'pending', details: '缺少目标或实际 RPN 数据' };
    }

    const reduction = action.currentRpn.total - action.actualRpn.total;
    const targetReduction = action.currentRpn.total - action.targetRpn.total;

    if (targetReduction <= 0) {
      return { score: 100, status: 'effective', details: '无需降低 RPN' };
    }

    const score = Math.min(100, Math.round((reduction / targetReduction) * 100));

    let status;
    if (score >= 100) {
      status = 'effective';
    } else if (score >= 80) {
      status = 'partially-effective';
    } else {
      status = 'ineffective';
    }

    return {
      score,
      status,
      details: `降低了 ${reduction}，目标降低 ${targetReduction}`
    };
  }

  /**
   * 生成跟踪摘要
   */
  generateTrackingSummary(actions) {
    const total = actions.length;
    const byStatus = {
      planned: actions.filter(a => a.status === 'planned').length,
      'in-progress': actions.filter(a => a.status === 'in-progress').length,
      completed: actions.filter(a => a.status === 'completed').length
    };

    const overdue = actions.filter(a => a.isOverdue).length;
    const averageProgress = total > 0
      ? Math.round(actions.reduce((sum, a) => sum + a.progress, 0) / total)
      : 0;

    return {
      total,
      byStatus,
      overdue,
      averageProgress
    };
  }

  /**
   * 生成验证摘要
   */
  generateVerificationSummary(verifications) {
    const total = verifications.length;
    const verified = verifications.filter(v => v.verified).length;
    const pending = verifications.filter(v => v.effectiveness.status === 'pending').length;

    return {
      total,
      verified,
      pending,
      effectiveness: {
        effective: verifications.filter(v => v.effectiveness.status === 'effective').length,
        partiallyEffective: verifications.filter(v => v.effectiveness.status === 'partially-effective').length,
        ineffective: verifications.filter(v => v.effectiveness.status === 'ineffective').length
      }
    };
  }

  /**
   * 生成摘要
   */
  generateSummary(tracking, verification) {
    return {
      tracking: tracking.summary,
      verification: verification.summary,
      overall: {
        totalActions: tracking.summary.total,
        completionRate: tracking.summary.total > 0
          ? Math.round((tracking.summary.byStatus.completed / tracking.summary.total) * 100)
          : 0,
        verificationRate: verification.summary.total > 0
          ? Math.round((verification.summary.verified / verification.summary.total) * 100)
          : 0
      }
    };
  }

  /**
   * 生成 Markdown 报告
   */
  generateMarkdown(tracking, verification, product) {
    const summary = this.generateSummary(tracking, verification);

    let md = `# DFMEA 跟踪验证报告\n\n`;
    md += `**产品**: ${product.name} (${product.id})\n`;
    md += `**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;

    md += `## 进度概览\n\n`;
    md += `| 指标 | 值 |\n|------|----|\n`;
    md += `| 总措施数 | ${summary.tracking.total} |\n`;
    md += `| 待执行 | ${summary.tracking.byStatus.planned} |\n`;
    md += `| 执行中 | ${summary.tracking.byStatus['in-progress']} |\n`;
    md += `| 已完成 | ${summary.tracking.byStatus.completed} |\n`;
    md += `| 逾期 | ${summary.tracking.overdue} |\n`;
    md += `| 平均进度 | ${summary.tracking.averageProgress}% |\n`;
    md += `| 完成率 | ${summary.overall.completionRate}% |\n\n`;

    // 逾期措施
    const overdueActions = tracking.actions.filter(a => a.isOverdue);
    if (overdueActions.length > 0) {
      md += `## ⚠️ 逾期措施\n\n`;
      md += `| 措施 ID | 失效模式 | 负责人 | 截止日期 | 逾期天数 |\n`;
      md += `|---------|----------|--------|----------|----------|\n`;
      for (const action of overdueActions) {
        const overdueDays = Math.abs(action.daysRemaining);
        md += `| ${action.id} | ${action.failureMode} | ${action.responsible} | ${action.deadline} | ${overdueDays} 天 |\n`;
      }
      md += `\n`;
    }

    // 执行中措施
    const inProgressActions = tracking.actions.filter(a => a.status === 'in-progress');
    if (inProgressActions.length > 0) {
      md += `## 🔄 执行中措施\n\n`;
      md += `| 措施 ID | 失效模式 | 负责人 | 进度 | 剩余天数 |\n`;
      md += `|---------|----------|--------|------|----------|\n`;
      for (const action of inProgressActions) {
        const daysRemaining = action.daysRemaining !== null ? `${action.daysRemaining} 天` : '待定';
        md += `| ${action.id} | ${action.failureMode} | ${action.responsible} | ${action.progress}% | ${daysRemaining} |\n`;
      }
      md += `\n`;
    }

    // 验证结果
    if (verification.verifications.length > 0) {
      md += `## 效果验证\n\n`;
      md += `| 措施 ID | 失效模式 | 当前 RPN | 目标 RPN | 实际 RPN | 效果 |\n`;
      md += `|---------|----------|----------|----------|----------|------|\n`;
      for (const v of verification.verifications) {
        const effectivenessIcon = v.verified ? '✅' : (v.effectiveness.status === 'pending' ? '⏳' : '❌');
        md += `| ${v.actionId} | ${v.failureMode} | ${v.currentRpn.total} | ${v.targetRpn?.total || '-'} | ${v.actualRpn.total} | ${effectivenessIcon} ${v.effectiveness.status} |\n`;
      }
      md += `\n`;

      md += `### 验证摘要\n\n`;
      md += `| 指标 | 值 |\n|------|----|\n`;
      md += `| 总验证数 | ${summary.verification.total} |\n`;
      md += `| 已验证通过 | ${summary.verification.verified} |\n`;
      md += `| 待验证 | ${summary.verification.pending} |\n`;
      md += `| 有效 | ${summary.verification.effectiveness.effective} |\n`;
      md += `| 部分有效 | ${summary.verification.effectiveness.partiallyEffective} |\n`;
      md += `| 无效 | ${summary.verification.effectiveness.ineffective} |\n`;
      md += `| 验证通过率 | ${summary.overall.verificationRate}% |\n\n`;
    }

    return md;
  }

  /**
   * 保存输出
   */
  saveOutput(outputDir, output, markdown) {
    const dirPath = path.join(outputDir, '00_Project_Management/05_功能风险管控_DFMEA', 'tracking-verification');

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // 保存 JSON
    fs.writeFileSync(
      path.join(dirPath, 'tracking-verification.json'),
      JSON.stringify(output, null, 2),
      'utf8'
    );

    // 保存 Markdown
    fs.writeFileSync(
      path.join(dirPath, 'tracking-verification.md'),
      markdown,
      'utf8'
    );
  }
}

module.exports = TrackingVerification;
