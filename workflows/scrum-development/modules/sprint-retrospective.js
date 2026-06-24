/**
 * Sprint 回顾会议模块
 *
 * 职责：
 * - 回顾 Sprint 中做得好的地方
 * - 识别需要改进的地方
 * - 制定具体改进建议
 * - 分配改进任务
 * - 更新团队工作协议
 */

const fs = require('fs');
const path = require('path');

class SprintRetrospective {
  /**
   * 执行 Sprint 回顾
   */
  async execute(config) {
    const {
      sprintNumber,
      outputDir,
      sprintData,
      goodPoints = [],
      improvements = [],
      actionItems = []
    } = config;

    // 1. 分析 Sprint 数据
    const sprintAnalysis = this.analyzeSprint(sprintData);

    // 2. 生成回顾讨论点
    const discussionPoints = this.generateDiscussionPoints(sprintAnalysis);

    // 3. 收集优点（如果未提供）
    const collectedGoodPoints = goodPoints.length > 0
      ? goodPoints
      : this.collectGoodPoints(sprintAnalysis);

    // 4. 收集改进点（如果未提供）
    const collectedImprovements = improvements.length > 0
      ? improvements
      : this.collectImprovements(sprintAnalysis);

    // 5. 生成行动项（如果未提供）
    const generatedActionItems = actionItems.length > 0
      ? actionItems
      : this.generateActionItems(collectedImprovements);

    // 6. 制定团队协议更新
    const protocolUpdates = this.generateProtocolUpdates(collectedGoodPoints, collectedImprovements);

    // 7. 生成输出
    const result = {
      sprintNumber,
      sprintAnalysis,
      discussionPoints,
      goodPoints: collectedGoodPoints,
      improvements: collectedImprovements,
      actionItems: generatedActionItems,
      protocolUpdates,
      summary: this.generateSummary(collectedGoodPoints, collectedImprovements, generatedActionItems)
    };

    // 8. 保存到文件
    await this.saveOutput(outputDir, result);

    return result;
  }

  /**
   * 分析 Sprint 数据
   */
  analyzeSprint(sprintData) {
    if (!sprintData) {
      return {
        velocity: 0,
        completionRate: 0,
        hasData: false
      };
    }

    return {
      velocity: sprintData.velocity || 0,
      completionRate: sprintData.completionRate || 0,
      planned: sprintData.planned || 0,
      actual: sprintData.actual || 0,
      hasData: true,
      performance: this.assessPerformance(sprintData)
    };
  }

  /**
   * 评估性能
   */
  assessPerformance(sprintData) {
    const completionRate = sprintData.completionRate || 0;

    if (completionRate >= 0.9) {
      return 'excellent';
    } else if (completionRate >= 0.7) {
      return 'good';
    } else if (completionRate >= 0.5) {
      return 'average';
    } else {
      return 'needs-improvement';
    }
  }

  /**
   * 生成讨论点
   */
  generateDiscussionPoints(sprintAnalysis) {
    const points = [];

    // 基于性能的讨论点
    if (sprintAnalysis.performance === 'excellent') {
      points.push({
        topic: '成功经验',
        question: '我们做得好的地方是什么？如何保持？',
        category: 'strengths'
      });
    } else if (sprintAnalysis.performance === 'needs-improvement') {
      points.push({
        topic: '改进机会',
        question: '什么阻碍了我们达成目标？',
        category: 'improvements'
      });
    }

    // 通用讨论点
    points.push(
      {
        topic: '团队协作',
        question: '团队协作方面有什么可以改进的？',
        category: 'process'
      },
      {
        topic: '技术实践',
        question: '技术实践方面有什么可以改进的？',
        category: 'technical'
      },
      {
        topic: '工具支持',
        question: '工具和环境方面有什么可以改进的？',
        category: 'tools'
      }
    );

    return points;
  }

  /**
   * 收集优点
   */
  collectGoodPoints(sprintAnalysis) {
    const points = [];

    if (sprintAnalysis.hasData) {
      if (sprintAnalysis.completionRate >= 0.8) {
        points.push({
          description: '任务完成率高',
          category: 'delivery',
          impact: 'high'
        });
      }

      if (sprintAnalysis.velocity > 0) {
        points.push({
          description: `速率保持在 ${sprintAnalysis.velocity} 故事点`,
          category: 'velocity',
          impact: 'medium'
        });
      }
    }

    // 默认优点
    points.push({
      description: '团队保持了每日例会',
      category: 'ceremony',
      impact: 'medium'
    });

    return points;
  }

  /**
   * 收集改进点
   */
  collectImprovements(sprintAnalysis) {
    const improvements = [];

    if (sprintAnalysis.hasData) {
      if (sprintAnalysis.completionRate < 0.7) {
        improvements.push({
          area: '计划',
          issue: '任务完成率低于预期',
          suggestion: '更准确地估算任务复杂度',
          priority: 'high'
        });
      }

      if (sprintAnalysis.completionRate > 1) {
        improvements.push({
          area: '范围',
          issue: 'Sprint 范围蔓延',
          suggestion: '更严格地控制 Sprint 范围',
          priority: 'medium'
        });
      }
    }

    // 默认改进建议
    improvements.push({
      area: '文档',
      issue: '文档更新不及时',
      suggestion: '在完成任务时同步更新文档',
      priority: 'low'
    });

    return improvements;
  }

  /**
   * 生成行动项
   */
  generateActionItems(improvements) {
    return improvements
      .filter(imp => imp.priority === 'high' || imp.priority === 'medium')
      .map((imp, index) => ({
        id: `ACTION-RETRO-${index + 1}`,
        description: imp.suggestion,
        category: imp.area,
        assignee: null, // 需要团队分配
        dueDate: this.calculateDueDate(imp.priority),
        priority: imp.priority,
        status: 'todo'
      }));
  }

  /**
   * 计算截止日期
   */
  calculateDueDate(priority) {
    const now = new Date();
    const daysToAdd = priority === 'high' ? 7 : 14;
    now.setDate(now.getDate() + daysToAdd);
    return now.toISOString().split('T')[0];
  }

  /**
   * 生成协议更新
   */
  generateProtocolUpdates(goodPoints, improvements) {
    const updates = [];

    // 从优点中提取要保持的协议
    goodPoints.forEach(point => {
      if (point.category === 'ceremony' || point.category === 'process') {
        updates.push({
          type: 'keep',
          protocol: point.description,
          reason: '有效的实践'
        });
      }
    });

    // 从改进点中提取新协议
    improvements.forEach(imp => {
      if (imp.priority === 'high') {
        updates.push({
          type: 'add',
          protocol: imp.suggestion,
          reason: imp.issue
        });
      }
    });

    return updates;
  }

  /**
   * 生成摘要
   */
  generateSummary(goodPoints, improvements, actionItems) {
    return {
      totalGoodPoints: goodPoints.length,
      totalImprovements: improvements.length,
      totalActionItems: actionItems.length,
      highPriorityItems: actionItems.filter(a => a.priority === 'high').length,
      topStrength: goodPoints[0]?.description || '无',
      topImprovement: improvements[0]?.suggestion || '无'
    };
  }

  /**
   * 保存输出
   */
  async saveOutput(outputDir, result) {
    // 创建目录
    fs.mkdirSync(outputDir, { recursive: true });

    // 保存 JSON
    const jsonPath = path.join(outputDir, 'retrospective.json');
    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf-8');

    // 保存 Markdown
    const mdPath = path.join(outputDir, 'retrospective.md');
    const mdContent = this.generateMarkdown(result);
    fs.writeFileSync(mdPath, mdContent, 'utf-8');

    console.log(`   📁 输出保存到: ${outputDir}`);
  }

  /**
   * 生成 Markdown 文档
   */
  generateMarkdown(result) {
    const lines = [
      `# Sprint ${result.sprintNumber} 回顾会议`,
      '',
      '## Sprint 分析',
      '',
      `- 速率: ${result.sprintAnalysis.velocity} 故事点`,
      `- 完成率: ${(result.sprintAnalysis.completionRate * 100).toFixed(1)}%`,
      `- 性能评估: ${result.sprintAnalysis.performance}`,
      '',
      '## 讨论点',
      '',
    ];

    result.discussionPoints.forEach(point => {
      lines.push(`### ${point.topic}`, '', `**问题**: ${point.question}`, '', `**类别**: ${point.category}`, '');
    });

    lines.push('## 做得好的地方', '');

    result.goodPoints.forEach(point => {
      lines.push(`- **${point.description}**`);
      lines.push(`  - 类别: ${point.category}`);
      lines.push(`  - 影响: ${point.impact}`);
      lines.push('');
    });

    lines.push('## 需要改进的地方', '');

    result.improvements.forEach((imp, index) => {
      lines.push(`### ${index + 1}. ${imp.area}`, '', `- **问题**: ${imp.issue}`, `- **建议**: ${imp.suggestion}`, `- **优先级**: ${imp.priority}`, '');
    });

    if (result.actionItems.length > 0) {
      lines.push('## 行动项', '', '| ID | 描述 | 类别 | 负责人 | 截止日期 | 优先级 |', '|----|------|------|--------|----------|--------|');

      result.actionItems.forEach(item => {
        lines.push(`| ${item.id} | ${item.description} | ${item.category} | ${item.assignee || '待分配'} | ${item.dueDate} | ${item.priority} |`);
      });
      lines.push('');
    }

    if (result.protocolUpdates.length > 0) {
      lines.push('## 团队协议更新', '', '| 类型 | 协议 | 原因 |', '|------|------|------|');

      result.protocolUpdates.forEach(update => {
        lines.push(`| ${update.type} | ${update.protocol} | ${update.reason} |`);
      });
      lines.push('');
    }

    lines.push('## 摘要', '', `- 优点数量: ${result.summary.totalGoodPoints}`, `- 改进数量: ${result.summary.totalImprovements}`, `- 行动项数量: ${result.summary.totalActionItems}`, `- 高优先级项: ${result.summary.highPriorityItems}`, '', `**最佳实践**: ${result.summary.topStrength}`, '', `**首要改进**: ${result.summary.topImprovement}`, '');

    return lines.join('\n');
  }
}

module.exports = SprintRetrospective;
