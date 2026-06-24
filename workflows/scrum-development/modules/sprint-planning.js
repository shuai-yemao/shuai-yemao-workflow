/**
 * Sprint 计划会议模块
 *
 * 职责：
 * - 从需求列表中选取高优先级需求
 * - 将需求拆分为用户故事
 * - 估算故事点数
 * - 分配任务给团队成员
 * - 定义 Sprint 目标
 */

const fs = require('fs');
const path = require('path');

class SprintPlanning {
  /**
   * 执行 Sprint 计划
   */
  async execute(config) {
    const {
      sprintNumber,
      outputDir,
      requirements,
      teamCapacity,
      teamVelocity,
      sprintDays = 10
    } = config;

    // 1. 选择需求（按优先级）
    const selectedRequirements = this.selectRequirements(
      requirements,
      teamVelocity,
      teamCapacity
    );

    // 2. 拆分为用户故事
    const userStories = this.createUserStories(selectedRequirements);

    // 3. 估算故事点数
    const estimatedStories = this.estimateStoryPoints(userStories);

    // 4. 确定 Sprint 容量
    const sprintCapacity = this.calculateSprintCapacity(teamCapacity, sprintDays);

    // 5. 选择故事进入 Sprint
    const selectedStories = this.selectStoriesForSprint(
      estimatedStories,
      sprintCapacity
    );

    // 6. 分配任务
    const tasks = this.assignTasks(selectedStories);

    // 7. 定义 Sprint 目标
    const sprintGoal = this.defineSprintGoal(selectedStories);

    // 8. 计算统计信息
    const stats = this.calculateStats(selectedStories, tasks);

    // 9. 生成输出
    const result = {
      sprintNumber,
      sprintGoal,
      startDate: this.calculateStartDate(),
      endDate: this.calculateEndDate(sprintDays),
      sprintDays,
      totalStoryPoints: stats.totalPoints,
      totalTasks: stats.totalTasks,
      tasks,
      userStories: selectedStories,
      statistics: stats
    };

    // 10. 保存到文件
    await this.saveOutput(outputDir, result);

    return result;
  }

  /**
   * 选择需求（按优先级和容量）
   */
  selectRequirements(requirements, teamVelocity, teamCapacity) {
    // 按优先级排序
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

    const sorted = [...requirements].sort((a, b) => {
      const priorityDiff = (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
      if (priorityDiff !== 0) return priorityDiff;

      // 同优先级按故事点数排序（小的优先）
      return (a.storyPoints || 5) - (b.storyPoints || 5);
    });

    // 根据容量选择
    let remainingCapacity = teamVelocity;
    const selected = [];

    for (const req of sorted) {
      const points = req.storyPoints || 5;
      if (points <= remainingCapacity) {
        selected.push(req);
        remainingCapacity -= points;
      }
    }

    return selected;
  }

  /**
   * 创建用户故事
   */
  createUserStories(requirements) {
    return requirements.map(req => ({
      id: `US-${req.id.replace('REQ-', '')}`,
      title: req.title,
      description: req.description,
      priority: req.priority,
      storyPoints: req.storyPoints || 5,
      acceptanceCriteria: req.acceptanceCriteria || [],
      dependencies: req.dependencies || [],
      category: req.category || 'functionality'
    }));
  }

  /**
   * 估算故事点数
   */
  estimateStoryPoints(stories) {
    // 使用 Fibonacci 序列: 1, 2, 3, 5, 8, 13, 21
    const fibSequence = [1, 2, 3, 5, 8, 13, 21];

    return stories.map(story => {
      // 如果故事点数不在 Fibonacci 序列中，调整到最近的值
      let points = story.storyPoints;
      if (!fibSequence.includes(points)) {
        points = fibSequence.reduce((prev, curr) =>
          Math.abs(curr - points) < Math.abs(prev - points) ? curr : prev
        );
      }

      return {
        ...story,
        storyPoints: points,
        estimatedHours: points * 4  // 假设 1 故事点 = 4 小时
      };
    });
  }

  /**
   * 计算 Sprint 容量
   */
  calculateSprintCapacity(teamCapacity, sprintDays) {
    // teamCapacity 是人天数
    // 转换为故事点数（假设 1 故事点 = 4 小时 = 0.5 人天）
    const pointsPerPersonDay = 2;

    return {
      personDays: teamCapacity,
      storyPoints: teamCapacity * pointsPerPersonDay,
      days: sprintDays
    };
  }

  /**
   * 选择故事进入 Sprint
   */
  selectStoriesForSprint(stories, capacity) {
    let remainingPoints = capacity.storyPoints;
    const selected = [];

    for (const story of stories) {
      if (story.storyPoints <= remainingPoints) {
        selected.push({
          ...story,
          sprintStatus: 'committed'
        });
        remainingPoints -= story.storyPoints;
      }
    }

    return selected;
  }

  /**
   * 分配任务
   */
  assignTasks(stories) {
    const tasks = [];

    stories.forEach(story => {
      // 将每个故事拆分为任务
      const storyTasks = this.breakDownStory(story);
      tasks.push(...storyTasks);
    });

    return tasks;
  }

  /**
   * 拆分故事为任务
   */
  breakDownStory(story) {
    const tasks = [];
    const taskId = `TASK-${story.id.replace('US-', '')}`;

    // 根据故事点数决定拆分粒度
    if (story.storyPoints <= 3) {
      // 小故事，单个任务
      tasks.push({
        id: taskId,
        storyId: story.id,
        title: story.title,
        description: story.description,
        storyPoints: story.storyPoints,
        estimatedHours: story.estimatedHours,
        status: 'todo',
        assignee: null,
        dependencies: story.dependencies,
        acceptanceCriteria: story.acceptanceCriteria
      });
    } else {
      // 大故事，拆分为多个任务
      const subTasks = this.createSubTasks(story);
      tasks.push(...subTasks);
    }

    return tasks;
  }

  /**
   * 创建子任务
   */
  createSubTasks(story) {
    const subTasks = [];
    const taskCount = Math.ceil(story.storyPoints / 3);

    // 通用的子任务模板
    const templates = [
      { suffix: '设计', phase: 'design' },
      { suffix: '实现', phase: 'implementation' },
      { suffix: '测试', phase: 'testing' },
      { suffix: '文档', phase: 'documentation' }
    ];

    for (let i = 0; i < Math.min(taskCount, templates.length); i++) {
      const template = templates[i];
      subTasks.push({
        id: `${story.id}-${template.phase}`,
        storyId: story.id,
        title: `${story.title} - ${template.suffix}`,
        description: `${story.title}的${template.suffix}工作`,
        storyPoints: Math.ceil(story.storyPoints / taskCount),
        estimatedHours: Math.ceil(story.estimatedHours / taskCount),
        status: 'todo',
        assignee: null,
        phase: template.phase,
        dependencies: [],
        acceptanceCriteria: []
      });
    }

    return subTasks;
  }

  /**
   * 定义 Sprint 目标
   */
  defineSprintGoal(stories) {
    if (stories.length === 0) {
      return '无明确目标';
    }

    // 提取关键功能
    const keyFeatures = stories.slice(0, 3).map(s => s.title);

    // 生成目标描述
    if (stories.length === 1) {
      return `完成${stories[0].title}`;
    } else if (stories.length <= 3) {
      return `完成${keyFeatures.join('、')}`;
    } else {
      return `完成${keyFeatures.join('、')}等 ${stories.length} 个功能`;
    }
  }

  /**
   * 计算统计信息
   */
  calculateStats(stories, tasks) {
    const totalPoints = stories.reduce((sum, s) => sum + s.storyPoints, 0);
    const totalHours = stories.reduce((sum, s) => sum + s.estimatedHours, 0);

    // 按优先级统计
    const byPriority = {};
    stories.forEach(s => {
      byPriority[s.priority] = (byPriority[s.priority] || 0) + 1;
    });

    // 按类别统计
    const byCategory = {};
    stories.forEach(s => {
      byCategory[s.category] = (byCategory[s.category] || 0) + 1;
    });

    return {
      totalPoints,
      totalHours,
      totalTasks: tasks.length,
      totalStories: stories.length,
      byPriority,
      byCategory,
      averagePointsPerStory: stories.length > 0
        ? (totalPoints / stories.length).toFixed(1)
        : 0
    };
  }

  /**
   * 计算开始日期
   */
  calculateStartDate() {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * 计算结束日期
   */
  calculateEndDate(sprintDays) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + sprintDays - 1);
    return endDate.toISOString().split('T')[0];
  }

  /**
   * 保存输出
   */
  async saveOutput(outputDir, result) {
    // 创建目录
    fs.mkdirSync(outputDir, { recursive: true });

    // 保存 JSON
    const jsonPath = path.join(outputDir, 'sprint-plan.json');
    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf-8');

    // 保存 Markdown
    const mdPath = path.join(outputDir, 'sprint-plan.md');
    const mdContent = this.generateMarkdown(result);
    fs.writeFileSync(mdPath, mdContent, 'utf-8');

    console.log(`   📁 输出保存到: ${outputDir}`);
  }

  /**
   * 生成 Markdown 文档
   */
  generateMarkdown(result) {
    const lines = [
      `# Sprint ${result.sprintNumber} 计划`,
      '',
      `**目标**: ${result.sprintGoal}`,
      '',
      `**时间**: ${result.startDate} 至 ${result.endDate} (${result.sprintDays} 天)`,
      '',
      `**故事点数**: ${result.totalStoryPoints}`,
      '',
      `**任务数**: ${result.totalTasks}`,
      '',
      '---',
      '',
      '## 用户故事',
      '',
      '| ID | 标题 | 优先级 | 故事点 | 状态 |',
      '|----|------|--------|--------|------|',
    ];

    result.userStories.forEach(story => {
      lines.push(
        `| ${story.id} | ${story.title} | ${story.priority} | ${story.storyPoints} | ${story.sprintStatus} |`
      );
    });

    lines.push('', '## 任务列表', '', '| ID | 标题 | 故事点 | 预估工时 | 状态 |', '|----|------|--------|----------|------|');

    result.tasks.forEach(task => {
      lines.push(
        `| ${task.id} | ${task.title} | ${task.storyPoints} | ${task.estimatedHours}h | ${task.status} |`
      );
    });

    lines.push('', '## 统计信息', '', `- 总故事点: ${result.statistics.totalPoints}`, `- 总任务数: ${result.statistics.totalTasks}`, `- 平均每故事点: ${result.statistics.averagePointsPerStory}`, '', '### 按优先级', '');

    Object.entries(result.statistics.byPriority).forEach(([priority, count]) => {
      lines.push(`- ${priority}: ${count} 个`);
    });

    lines.push('', '### 按类别', '');

    Object.entries(result.statistics.byCategory).forEach(([category, count]) => {
      lines.push(`- ${category}: ${count} 个`);
    });

    return lines.join('\n');
  }
}

module.exports = SprintPlanning;
