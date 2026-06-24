/**
 * 每日例会模块
 *
 * 职责：
 * - 收集每个成员的进展
 * - 识别阻塞问题
 * - 更新任务状态
 * - 必要时重新分配任务
 * - 记录燃尽图数据
 */

const fs = require('fs');
const path = require('path');

class DailyStandup {
  /**
   * 执行每日例会
   */
  async execute(config) {
    const {
      sprintNumber,
      date,
      outputDir,
      backlog,
      previousStandup,
      teamMembers = []
    } = config;

    // 1. 计算 Sprint 天数
    const sprintDay = this.calculateSprintDay(backlog, date);

    // 2. 收集团队成员更新
    const memberUpdates = this.collectMemberUpdates(teamMembers, backlog);

    // 3. 识别阻塞问题
    const blockers = this.identifyBlockers(memberUpdates);

    // 4. 更新任务状态
    const taskUpdates = this.updateTaskStatus(backlog, memberUpdates);

    // 5. 计算燃尽数据
    const burnDownData = this.calculateBurnDown(backlog, previousStandup);

    // 6. 生成行动项
    const actionItems = this.generateActionItems(blockers, taskUpdates);

    // 7. 生成输出
    const result = {
      sprintNumber,
      sprintDay,
      date,
      members: memberUpdates,
      blockers,
      taskUpdates,
      burnDownData,
      actionItems,
      summary: this.generateSummary(memberUpdates, burnDownData)
    };

    // 8. 保存到文件
    await this.saveOutput(outputDir, result);

    return result;
  }

  /**
   * 计算 Sprint 天数
   */
  calculateSprintDay(backlog, date) {
    if (!backlog || !backlog.startDate) {
      return 1;
    }

    const startDate = new Date(backlog.startDate);
    const currentDate = new Date(date);
    const diffTime = currentDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(1, diffDays + 1);
  }

  /**
   * 收集团队成员更新
   */
  collectMemberUpdates(teamMembers, backlog) {
    // 如果没有提供团队成员信息，从 backlog 中提取
    const members = teamMembers.length > 0
      ? teamMembers
      : this.extractMembersFromBacklog(backlog);

    return members.map(member => {
      const memberTasks = this.getMemberTasks(backlog, member.name);

      return {
        name: member.name,
        role: member.role || 'developer',
        yesterday: this.getYesterdayWork(memberTasks),
        today: this.getTodayPlan(memberTasks),
        blockers: this.getMemberBlockers(memberTasks),
        completedTasks: this.getCompletedTasks(memberTasks),
        inProgressTasks: this.getInProgressTasks(memberTasks)
      };
    });
  }

  /**
   * 从 Backlog 提取成员
   */
  extractMembersFromBacklog(backlog) {
    const members = new Set();

    if (backlog && backlog.tasks) {
      backlog.tasks.forEach(task => {
        if (task.assignee) {
          members.add(task.assignee);
        }
      });
    }

    return Array.from(members).map(name => ({
      name,
      role: 'developer'
    }));
  }

  /**
   * 获取成员任务
   */
  getMemberTasks(backlog, memberName) {
    if (!backlog || !backlog.tasks) {
      return [];
    }

    return backlog.tasks.filter(task => task.assignee === memberName);
  }

  /**
   * 获取昨天完成的工作
   */
  getYesterdayWork(tasks) {
    const completed = tasks.filter(t => t.status === 'completed');
    if (completed.length === 0) {
      return '无';
    }
    return completed.map(t => t.title).join(', ');
  }

  /**
   * 获取今天计划
   */
  getTodayPlan(tasks) {
    const inProgress = tasks.filter(t => t.status === 'in-progress');
    const todo = tasks.filter(t => t.status === 'todo');

    const planned = [...inProgress, ...todo.slice(0, 2)];
    if (planned.length === 0) {
      return '待分配任务';
    }
    return planned.map(t => t.title).join(', ');
  }

  /**
   * 获取成员阻塞
   */
  getMemberBlockers(tasks) {
    return tasks
      .filter(t => t.blockers && t.blockers.length > 0)
      .flatMap(t => t.blockers);
  }

  /**
   * 获取已完成任务
   */
  getCompletedTasks(tasks) {
    return tasks.filter(t => t.status === 'completed');
  }

  /**
   * 获取进行中任务
   */
  getInProgressTasks(tasks) {
    return tasks.filter(t => t.status === 'in-progress');
  }

  /**
   * 识别阻塞问题
   */
  identifyBlockers(memberUpdates) {
    const allBlockers = [];

    memberUpdates.forEach(member => {
      member.blockers.forEach(blocker => {
        allBlockers.push({
          member: member.name,
          description: blocker,
          severity: this.assessBlockerSeverity(blocker),
          suggestedAction: this.suggestBlockerAction(blocker)
        });
      });
    });

    return allBlockers;
  }

  /**
   * 评估阻塞严重程度
   */
  assessBlockerSeverity(blocker) {
    const blockerLower = blocker.toLowerCase();

    if (blockerLower.includes('依赖') || blockerLower.includes('等待')) {
      return 'high';
    } else if (blockerLower.includes('技术') || blockerLower.includes('bug')) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * 建议阻塞处理方式
   */
  suggestBlockerAction(blocker) {
    const blockerLower = blocker.toLowerCase();

    if (blockerLower.includes('依赖')) {
      '协调依赖团队或调整任务优先级';
    } else if (blockerLower.includes('技术')) {
      '组织技术评审或寻求专家帮助';
    } else {
      '与 Scrum Master 沟通寻求支持';
    }
  }

  /**
   * 更新任务状态
   */
  updateTaskStatus(backlog, memberUpdates) {
    const updates = [];

    memberUpdates.forEach(member => {
      // 标记完成的任务
      member.completedTasks.forEach(task => {
        updates.push({
          taskId: task.id,
          oldStatus: task.status,
          newStatus: 'completed',
          updatedBy: member.name
        });
      });

      // 标记进行中的任务
      member.inProgressTasks.forEach(task => {
        if (task.status === 'todo') {
          updates.push({
            taskId: task.id,
            oldStatus: task.status,
            newStatus: 'in-progress',
            updatedBy: member.name
          });
        }
      });
    });

    return updates;
  }

  /**
   * 计算燃尽数据
   */
  calculateBurnDown(backlog, previousStandup) {
    const totalPoints = backlog
      ? backlog.tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0)
      : 0;

    let completedPoints = 0;

    if (backlog && backlog.tasks) {
      completedPoints = backlog.tasks
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    }

    const remainingPoints = totalPoints - completedPoints;

    // 计算理想燃尽
    const sprintDays = backlog?.sprintDays || 10;
    const idealPerDay = totalPoints / sprintDays;

    return {
      totalPoints,
      completedPoints,
      remainingPoints,
      idealPerDay: idealPerDay.toFixed(1),
      actualVelocity: completedPoints
    };
  }

  /**
   * 生成行动项
   */
  generateActionItems(blockers, taskUpdates) {
    const actionItems = [];

    // 为高严重度阻塞创建行动项
    blockers
      .filter(b => b.severity === 'high')
      .forEach(blocker => {
        actionItems.push({
          id: `ACTION-${Date.now()}`,
          description: `解决阻塞: ${blocker.description}`,
          assignee: blocker.member,
          dueDate: 'today',
          priority: 'high'
        });
      });

    // 为任务更新创建行动项（如果任务被阻塞）
    taskUpdates
      .filter(u => u.newStatus === 'blocked')
      .forEach(update => {
        actionItems.push({
          id: `ACTION-${Date.now()}`,
          description: `处理被阻塞的任务: ${update.taskId}`,
          assignee: update.updatedBy,
          dueDate: 'today',
          priority: 'medium'
        });
      });

    return actionItems;
  }

  /**
   * 生成摘要
   */
  generateSummary(memberUpdates, burnDownData) {
    const totalMembers = memberUpdates.length;
    const membersWithBlockers = memberUpdates.filter(m => m.blockers.length > 0).length;

    return {
      totalMembers,
      membersWithBlockers,
      completionPercentage: burnDownData.totalPoints > 0
        ? ((burnDownData.completedPoints / burnDownData.totalPoints) * 100).toFixed(1) + '%'
        : '0%',
      remainingPoints: burnDownData.remainingPoints,
      healthStatus: this.assessSprintHealth(burnDownData, membersWithBlockers, totalMembers)
    };
  }

  /**
   * 评估 Sprint 健康状态
   */
  assessSprintHealth(burnDownData, membersWithBlockers, totalMembers) {
    const blockerRatio = totalMembers > 0 ? membersWithBlockers / totalMembers : 0;
    const completionRatio = burnDownData.totalPoints > 0
      ? burnDownData.completedPoints / burnDownData.totalPoints
      : 0;

    if (blockerRatio > 0.5 || completionRatio < 0.2) {
      return 'at-risk';
    } else if (blockerRatio > 0.2 || completionRatio < 0.5) {
      return 'needs-attention';
    } else {
      return 'healthy';
    }
  }

  /**
   * 保存输出
   */
  async saveOutput(outputDir, result) {
    // 创建目录
    fs.mkdirSync(outputDir, { recursive: true });

    // 保存 JSON
    const jsonPath = path.join(outputDir, `standup-${result.date}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf-8');

    // 保存 Markdown
    const mdPath = path.join(outputDir, `standup-${result.date}.md`);
    const mdContent = this.generateMarkdown(result);
    fs.writeFileSync(mdPath, mdContent, 'utf-8');

    console.log(`   📁 输出保存到: ${outputDir}`);
  }

  /**
   * 生成 Markdown 文档
   */
  generateMarkdown(result) {
    const lines = [
      `# Sprint ${result.sprintNumber} 每日例会`,
      '',
      `**日期**: ${result.date}`,
      '',
      `**Sprint Day**: ${result.sprintDay}`,
      '',
      '---',
      '',
      '## 团队更新',
      '',
    ];

    result.members.forEach(member => {
      lines.push(`### ${member.name} (${member.role})`, '');
      lines.push(`**昨天完成**: ${member.yesterday}`, '');
      lines.push(`**今天计划**: ${member.today}`, '');

      if (member.blockers.length > 0) {
        lines.push('**阻塞问题**:', '');
        member.blockers.forEach(blocker => {
          lines.push(`- ${blocker}`);
        });
        lines.push('');
      }
    });

    if (result.blockers.length > 0) {
      lines.push('## 阻塞问题', '', '| 成员 | 问题 | 严重程度 | 建议处理 |', '|------|------|----------|----------|');

      result.blockers.forEach(blocker => {
        lines.push(`| ${blocker.member} | ${blocker.description} | ${blocker.severity} | ${blocker.suggestedAction} |`);
      });
      lines.push('');
    }

    lines.push('## 燃尽图数据', '', `- 总故事点: ${result.burnDownData.totalPoints}`, `- 已完成: ${result.burnDownData.completedPoints}`, `- 剩余: ${result.burnDownData.remainingPoints}`, `- 理想每日完成: ${result.burnDownData.idealPerDay}`, '');

    if (result.actionItems.length > 0) {
      lines.push('## 行动项', '', '| 描述 | 负责人 | 截止日期 | 优先级 |', '|------|--------|----------|--------|');

      result.actionItems.forEach(item => {
        lines.push(`| ${item.description} | ${item.assignee} | ${item.dueDate} | ${item.priority} |`);
      });
      lines.push('');
    }

    lines.push('## 摘要', '', `- 团队人数: ${result.summary.totalMembers}`, `- 有阻塞成员: ${result.summary.membersWithBlockers}`, `- 完成率: ${result.summary.completionPercentage}`, `- 健康状态: ${result.summary.healthStatus}`, '');

    return lines.join('\n');
  }
}

module.exports = DailyStandup;
