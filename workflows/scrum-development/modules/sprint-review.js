/**
 * Sprint 评审会议模块
 *
 * 职责：
 * - 演示完成的功能
 * - 收集利益相关者反馈
 * - 产品经理评估是否满足需求
 * - 决定是否发布产品增量
 * - 记录反馈用于下个 Sprint
 */

const fs = require('fs');
const path = require('path');

class SprintReview {
  /**
   * 执行 Sprint 评审
   */
  async execute(config) {
    const {
      sprintNumber,
      outputDir,
      backlog,
      demoItems = [],
      feedback = [],
      productDecision = null
    } = config;

    // 1. 计算完成情况
    const completionStats = this.calculateCompletion(backlog);

    // 2. 生成演示项目
    const demoResults = this.generateDemoResults(backlog, demoItems);

    // 3. 评估需求满足度
    const requirementAssessment = this.assessRequirements(backlog);

    // 4. 收集反馈（如果没有提供）
    const collectedFeedback = feedback.length > 0
      ? feedback
      : this.collectFeedback(demoResults, requirementAssessment);

    // 5. 产品决策
    const decision = productDecision || this.makeProductDecision(
      completionStats,
      requirementAssessment,
      collectedFeedback
    );

    // 6. 识别遗留问题
    const carryover = this.identifyCarryover(backlog);

    // 7. 生成输出
    const result = {
      sprintNumber,
      completionStats,
      demoResults,
      requirementAssessment,
      feedback: collectedFeedback,
      productDecision: decision,
      carryover,
      recommendations: this.generateRecommendations(completionStats, collectedFeedback),
      metrics: this.calculateMetrics(completionStats, backlog)
    };

    // 8. 保存到文件
    await this.saveOutput(outputDir, result);

    return result;
  }

  /**
   * 计算完成情况
   */
  calculateCompletion(backlog) {
    if (!backlog || !backlog.tasks) {
      return {
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        todoTasks: 0,
        completionRate: 0,
        totalStoryPoints: 0,
        completedStoryPoints: 0,
        storyPointCompletionRate: 0
      };
    }

    const tasks = backlog.tasks;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
    const todoTasks = tasks.filter(t => t.status === 'todo').length;

    const totalStoryPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    const completedStoryPoints = tasks
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      todoTasks,
      completionRate: totalTasks > 0 ? completedTasks / totalTasks : 0,
      totalStoryPoints,
      completedStoryPoints,
      storyPointCompletionRate: totalStoryPoints > 0
        ? completedStoryPoints / totalStoryPoints
        : 0
    };
  }

  /**
   * 生成演示结果
   */
  generateDemoResults(backlog, demoItems) {
    const results = [];

    // 从 backlog 中提取已完成的任务作为演示项
    if (backlog && backlog.tasks) {
      const completedTasks = backlog.tasks.filter(t => t.status === 'completed');

      completedTasks.forEach(task => {
        results.push({
          id: task.id,
          title: task.title,
          storyPoints: task.storyPoints,
          status: 'completed',
          demoStatus: 'presented',
          feedback: null
        });
      });
    }

    // 合并用户提供的演示项
    demoItems.forEach(item => {
      const existing = results.find(r => r.id === item.id);
      if (existing) {
        existing.feedback = item.feedback;
      } else {
        results.push({
          ...item,
          demoStatus: 'presented'
        });
      }
    });

    return results;
  }

  /**
   * 评估需求满足度
   */
  assessRequirements(backlog) {
    if (!backlog || !backlog.userStories) {
      return {
        totalStories: 0,
        completedStories: 0,
        satisfactionRate: 0,
        assessment: '无数据'
      };
    }

    const stories = backlog.userStories;
    const totalStories = stories.length;
    const completedStories = stories.filter(s => s.sprintStatus === 'committed').length;

    // 根据完成率评估
    const satisfactionRate = totalStories > 0 ? completedStories / totalStories : 0;

    let assessment;
    if (satisfactionRate >= 0.9) {
      assessment = '优秀 - 完全满足需求';
    } else if (satisfactionRate >= 0.7) {
      assessment = '良好 - 基本满足需求';
    } else if (satisfactionRate >= 0.5) {
      assessment = '一般 - 部分满足需求';
    } else {
      assessment = '不足 - 需求满足度低';
    }

    return {
      totalStories,
      completedStories,
      satisfactionRate,
      assessment
    };
  }

  /**
   * 收集反馈
   */
  collectFeedback(demoResults, requirementAssessment) {
    // 这里应该由用户/产品经理提供反馈
    // 这里返回一个示例反馈结构
    return [
      {
        source: '产品经理',
        type: 'overall',
        content: `需求满足度: ${requirementAssessment.assessment}`,
        action: requirementAssessment.satisfactionRate >= 0.7 ? 'approve' : 'revise'
      }
    ];
  }

  /**
   * 做出产品决策
   */
  makeProductDecision(completionStats, requirementAssessment, feedback) {
    // 决策逻辑
    const completionRate = completionStats.completionRate;
    const satisfactionRate = requirementAssessment.satisfactionRate;

    // 检查是否有拒绝反馈
    const hasRejection = feedback.some(f => f.action === 'reject');

    if (hasRejection) {
      return {
        decision: 'rejected',
        reason: '收到拒绝反馈',
        details: feedback.filter(f => f.action === 'reject')
      };
    }

    if (completionRate >= 0.8 && satisfactionRate >= 0.7) {
      return {
        decision: 'approved',
        reason: '完成率和需求满足度达标',
        details: {
          completionRate,
          satisfactionRate
        }
      };
    } else if (completionRate >= 0.6 || satisfactionRate >= 0.5) {
      return {
        decision: 'conditional',
        reason: '部分达标，需要改进',
        details: {
          completionRate,
          satisfactionRate,
          conditions: this.generateConditions(completionStats, requirementAssessment)
        }
      };
    } else {
      return {
        decision: 'revise',
        reason: '未达到发布标准',
        details: {
          completionRate,
          satisfactionRate,
          requiredImprovements: this.generateRequiredImprovements(completionStats)
        }
      };
    }
  }

  /**
   * 生成条件
   */
  generateConditions(completionStats, requirementAssessment) {
    const conditions = [];

    if (completionStats.completionRate < 0.8) {
      conditions.push('完成剩余任务');
    }

    if (requirementAssessment.satisfactionRate < 0.7) {
      conditions.push('提高需求满足度');
    }

    return conditions;
  }

  /**
   * 生成所需改进
   */
  generateRequiredImprovements(completionStats) {
    const improvements = [];

    if (completionStats.completionRate < 0.6) {
      improvements.push('显著提高任务完成率');
    }

    if (completionStats.inProgressTasks > completionStats.completedTasks) {
      improvements.push('减少进行中任务，提高聚焦度');
    }

    return improvements;
  }

  /**
   * 识别遗留问题
   */
  identifyCarryover(backlog) {
    if (!backlog || !backlog.tasks) {
      return [];
    }

    return backlog.tasks
      .filter(t => t.status !== 'completed')
      .map(task => ({
        taskId: task.id,
        title: task.title,
        storyPoints: task.storyPoints,
        status: task.status,
        reason: task.status === 'in-progress' ? '进行中未完成' : '未开始'
      }));
  }

  /**
   * 生成建议
   */
  generateRecommendations(completionStats, feedback) {
    const recommendations = [];

    // 基于完成率的建议
    if (completionStats.completionRate < 0.7) {
      recommendations.push({
        area: '计划',
        suggestion: '下个 Sprint 减少承诺的故事点数',
        priority: 'high'
      });
    }

    // 基于反馈的建议
    feedback.forEach(f => {
      if (f.action === 'revise') {
        recommendations.push({
          area: '质量',
          suggestion: `改进: ${f.content}`,
          priority: 'high'
        });
      }
    });

    // 通用建议
    if (completionStats.inProgressTasks > 2) {
      recommendations.push({
        area: '流程',
        suggestion: '限制并行进行的任务数量',
        priority: 'medium'
      });
    }

    return recommendations;
  }

  /**
   * 计算指标
   */
  calculateMetrics(completionStats, backlog) {
    const velocity = completionStats.completedStoryPoints;
    const throughput = completionStats.completedTasks;

    // 计算效率指标
    const efficiency = completionStats.totalTasks > 0
      ? (completionStats.completedTasks / completionStats.totalTasks * 100).toFixed(1)
      : 0;

    return {
      velocity,
      throughput,
      efficiency: `${efficiency}%`,
      plannedVsActual: {
        planned: completionStats.totalStoryPoints,
        actual: completionStats.completedStoryPoints,
        variance: completionStats.completedStoryPoints - completionStats.totalStoryPoints
      }
    };
  }

  /**
   * 保存输出
   */
  async saveOutput(outputDir, result) {
    // 创建目录
    fs.mkdirSync(outputDir, { recursive: true });

    // 保存 JSON
    const jsonPath = path.join(outputDir, 'review-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf-8');

    // 保存 Markdown
    const mdPath = path.join(outputDir, 'review-report.md');
    const mdContent = this.generateMarkdown(result);
    fs.writeFileSync(mdPath, mdContent, 'utf-8');

    console.log(`   📁 输出保存到: ${outputDir}`);
  }

  /**
   * 生成 Markdown 文档
   */
  generateMarkdown(result) {
    const lines = [
      `# Sprint ${result.sprintNumber} 评审报告`,
      '',
      '## 完成情况',
      '',
      `- 总任务: ${result.completionStats.totalTasks}`,
      `- 已完成: ${result.completionStats.completedTasks}`,
      `- 进行中: ${result.completionStats.inProgressTasks}`,
      `- 待办: ${result.completionStats.todoTasks}`,
      `- 完成率: ${(result.completionStats.completionRate * 100).toFixed(1)}%`,
      '',
      `- 总故事点: ${result.completionStats.totalStoryPoints}`,
      `- 已完成故事点: ${result.completionStats.completedStoryPoints}`,
      `- 故事点完成率: ${(result.completionStats.storyPointCompletionRate * 100).toFixed(1)}%`,
      '',
      '## 演示项目',
      '',
      '| ID | 标题 | 故事点 | 状态 |',
      '|----|------|--------|------|',
    ];

    result.demoResults.forEach(item => {
      lines.push(`| ${item.id} | ${item.title} | ${item.storyPoints} | ${item.status} |`);
    });

    lines.push('', '## 需求满足度', '', `- 总需求: ${result.requirementAssessment.totalStories}`, `- 已满足: ${result.requirementAssessment.completedStories}`, `- 满足率: ${(result.requirementAssessment.satisfactionRate * 100).toFixed(1)}%`, `- 评估: ${result.requirementAssessment.assessment}`, '');

    lines.push('## 反馈', '');
    result.feedback.forEach(f => {
      lines.push(`**${f.source}** (${f.type}): ${f.content}`, `动作: ${f.action}`, '');
    });

    lines.push('## 产品决策', '', `**决策**: ${result.productDecision.decision}`, '', `**原因**: ${result.productDecision.reason}`, '');

    if (result.productDecision.details) {
      lines.push('**详细信息**:', '');
      const details = result.productDecision.details;
      if (typeof details === 'object') {
        Object.entries(details).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            lines.push(`- ${key}:`);
            value.forEach(v => lines.push(`  - ${v}`));
          } else {
            lines.push(`- ${key}: ${value}`);
          }
        });
      }
      lines.push('');
    }

    if (result.carryover.length > 0) {
      lines.push('## 遗留任务', '', '| 任务 ID | 标题 | 故事点 | 状态 | 原因 |', '|---------|------|--------|------|------|');

      result.carryover.forEach(item => {
        lines.push(`| ${item.taskId} | ${item.title} | ${item.storyPoints} | ${item.status} | ${item.reason} |`);
      });
      lines.push('');
    }

    if (result.recommendations.length > 0) {
      lines.push('## 建议', '', '| 领域 | 建议 | 优先级 |', '|------|------|--------|');

      result.recommendations.forEach(rec => {
        lines.push(`| ${rec.area} | ${rec.suggestion} | ${rec.priority} |`);
      });
      lines.push('');
    }

    lines.push('## 指标', '', `- 速率 (Velocity): ${result.metrics.velocity}`, `- 吞吐量 (Throughput): ${result.metrics.throughput}`, `- 效率: ${result.metrics.efficiency}`, '', '### 计划 vs 实际', '', `- 计划: ${result.metrics.plannedVsActual.planned} 故事点`, `- 实际: ${result.metrics.plannedVsActual.actual} 故事点`, `- 差异: ${result.metrics.plannedVsActual.variance > 0 ? '+' : ''}${result.metrics.plannedVsActual.variance} 故事点`, '');

    return lines.join('\n');
  }
}

module.exports = SprintReview;
