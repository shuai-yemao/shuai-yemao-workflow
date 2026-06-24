/**
 * 改进措施模块
 * 用于制定降低风险的措施
 */

const fs = require('fs');
const path = require('path');
const DfmeaManager = require('../utils/dfmea-manager');

class ImprovementActions {
  constructor(options = {}) {
    this.options = options;
    this.manager = new DfmeaManager();
  }

  /**
   * 执行改进措施制定
   * @param {object} config - 配置
   * @param {string} config.outputDir - 输出目录
   * @param {object} config.inputData - 输入数据
   * @returns {object} 结果
   */
  async execute(config) {
    const { outputDir, inputData } = config;

    console.log('  [ImprovementActions] 开始制定改进措施...');

    // 1. 验证输入
    this.validateInput(inputData);

    // 2. 制定改进措施
    const actions = this.createActions(inputData);

    // 3. 生成 Markdown 报告
    const markdown = this.generateMarkdown(actions, inputData.product);

    // 4. 保存输出
    const output = {
      product: inputData.product,
      actions,
      summary: this.generateSummary(actions)
    };

    this.saveOutput(outputDir, output, markdown);

    console.log(`  [ImprovementActions] 完成，制定了 ${actions.length} 个改进措施`);

    return {
      success: true,
      actions,
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
   * 创建改进措施
   */
  createActions(inputData) {
    return inputData.actions.map((action, index) => {
      const actionId = action.id || this.manager.generateActionId();

      // 计算目标 RPN
      let targetRpn = null;
      if (action.targetSeverity || action.targetOccurrence || action.targetDetection) {
        targetRpn = this.manager.calculateRpn(
          action.targetSeverity || action.currentSeverity || 5,
          action.targetOccurrence || action.currentOccurrence || 5,
          action.targetDetection || action.currentDetection || 5
        );
      }

      // 计算当前 RPN
      const currentRpn = this.manager.calculateRpn(
        action.currentSeverity || 5,
        action.currentOccurrence || 5,
        action.currentDetection || 5
      );

      return {
        id: actionId,
        failureModeId: action.failureModeId,
        failureMode: action.failureMode || '',
        functionName: action.functionName || '',
        description: action.description,
        responsible: action.responsible,
        deadline: action.deadline,
        status: action.status || 'planned',
        currentRpn,
        targetRpn,
        reduction: targetRpn ? currentRpn.total - targetRpn.total : 0,
        reductionPercent: targetRpn ? Math.round((1 - targetRpn.total / currentRpn.total) * 100) : 0,
        actionType: action.actionType || this.determineActionType(action),
        priority: action.priority || this.determinePriority(currentRpn.total),
        createdAt: new Date().toISOString()
      };
    });
  }

  /**
   * 确定措施类型
   */
  determineActionType(action) {
    if (action.description.includes('设计') || action.description.includes('re设计')) {
      return 'design';
    }
    if (action.description.includes('检测') || action.description.includes('测试')) {
      return 'detection';
    }
    if (action.description.includes('预防') || action.description.includes('控制')) {
      return 'prevention';
    }
    return 'other';
  }

  /**
   * 确定优先级
   */
  determinePriority(rpn) {
    if (rpn >= 200) return 'critical';
    if (rpn >= 100) return 'high';
    if (rpn >= 50) return 'medium';
    return 'low';
  }

  /**
   * 生成摘要
   */
  generateSummary(actions) {
    return {
      total: actions.length,
      byStatus: {
        planned: actions.filter(a => a.status === 'planned').length,
        'in-progress': actions.filter(a => a.status === 'in-progress').length,
        completed: actions.filter(a => a.status === 'completed').length
      },
      byPriority: {
        critical: actions.filter(a => a.priority === 'critical').length,
        high: actions.filter(a => a.priority === 'high').length,
        medium: actions.filter(a => a.priority === 'medium').length,
        low: actions.filter(a => a.priority === 'low').length
      },
      byType: {
        design: actions.filter(a => a.actionType === 'design').length,
        detection: actions.filter(a => a.actionType === 'detection').length,
        prevention: actions.filter(a => a.actionType === 'prevention').length,
        other: actions.filter(a => a.actionType === 'other').length
      },
      totalReduction: actions.reduce((sum, a) => sum + a.reduction, 0),
      averageReductionPercent: actions.length > 0
        ? Math.round(actions.reduce((sum, a) => sum + a.reductionPercent, 0) / actions.length)
        : 0
    };
  }

  /**
   * 生成 Markdown 报告
   */
  generateMarkdown(actions, product) {
    const summary = this.generateSummary(actions);

    let md = `# DFMEA 改进措施报告\n\n`;
    md += `**产品**: ${product.name} (${product.id})\n`;
    md += `**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;

    md += `## 措施概览\n\n`;
    md += `| 指标 | 值 |\n|------|----|\n`;
    md += `| 总措施数 | ${summary.total} |\n`;
    md += `| 待执行 | ${summary.byStatus.planned} |\n`;
    md += `| 执行中 | ${summary.byStatus['in-progress']} |\n`;
    md += `| 已完成 | ${summary.byStatus.completed} |\n`;
    md += `| 总 RPN 降低 | ${summary.totalReduction} |\n`;
    md += `| 平均降低率 | ${summary.averageReductionPercent}% |\n\n`;

    md += `## 按优先级分布\n\n`;
    md += `| 优先级 | 数量 |\n|--------|------|\n`;
    md += `| 🔴 关键 | ${summary.byPriority.critical} |\n`;
    md += `| 🟠 高 | ${summary.byPriority.high} |\n`;
    md += `| 🟡 中 | ${summary.byPriority.medium} |\n`;
    md += `| 🟢 低 | ${summary.byPriority.low} |\n\n`;

    // 按优先级列出措施
    const priorityOrder = ['critical', 'high', 'medium', 'low'];
    const priorityLabels = { critical: '🔴 关键', high: '🟠 高', medium: '🟡 中', low: '🟢 低' };

    for (const priority of priorityOrder) {
      const priorityActions = actions.filter(a => a.priority === priority);
      if (priorityActions.length === 0) continue;

      md += `## ${priorityLabels[priority]} 优先级措施\n\n`;

      for (const action of priorityActions) {
        md += `### ${action.id} - ${action.failureMode}\n\n`;
        md += `- **功能**: ${action.functionName}\n`;
        md += `- **描述**: ${action.description}\n`;
        md += `- **负责人**: ${action.responsible}\n`;
        md += `- **截止日期**: ${action.deadline || '待定'}\n`;
        md += `- **状态**: ${action.status}\n`;
        md += `- **当前 RPN**: ${action.currentRpn.total} (S=${action.currentRpn.severity}, O=${action.currentRpn.occurrence}, D=${action.currentRpn.detection})\n`;
        if (action.targetRpn) {
          md += `- **目标 RPN**: ${action.targetRpn.total} (S=${action.targetRpn.severity}, O=${action.targetRpn.occurrence}, D=${action.targetRpn.detection})\n`;
          md += `- **预期降低**: ${action.reduction} (${action.reductionPercent}%)\n`;
        }
        md += `- **措施类型**: ${action.actionType}\n\n`;
      }
    }

    return md;
  }

  /**
   * 保存输出
   */
  saveOutput(outputDir, output, markdown) {
    const dirPath = path.join(outputDir, '00_Project_Management/05_功能风险管控_DFMEA', 'improvement-actions');

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // 保存 JSON
    fs.writeFileSync(
      path.join(dirPath, 'improvement-actions.json'),
      JSON.stringify(output, null, 2),
      'utf8'
    );

    // 保存 Markdown
    fs.writeFileSync(
      path.join(dirPath, 'improvement-actions.md'),
      markdown,
      'utf8'
    );
  }
}

module.exports = ImprovementActions;
