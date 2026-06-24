/**
 * Scrum 敏捷开发工作流
 *
 * 完整的 Scrum 流程支持：
 * - Sprint 计划会议
 * - 每日例会
 * - Sprint 评审
 * - Sprint 回顾
 */

const path = require('path');
const SprintPlanning = require('./modules/sprint-planning');
const DailyStandup = require('./modules/daily-standup');
const SprintReview = require('./modules/sprint-review');
const SprintRetrospective = require('./modules/sprint-retrospective');
const BacklogManager = require('./utils/backlog-manager');
const VelocityTracker = require('./utils/velocity-tracker');
const JsonValidator = require('./utils/json-validator');

class ScrumWorkflow {
  constructor(options = {}) {
    this.options = {
      autoAdjustVelocity: options.autoAdjustVelocity || true,
      velocityTrend: options.velocityTrend || 'average', // conservative | aggressive | average
      defaultSprintDays: options.defaultSprintDays || 10,
      ...options
    };

    this.backlogManager = new BacklogManager();
    this.velocityTracker = new VelocityTracker();
    this.validator = new JsonValidator();
  }

  /**
   * 执行工作流
   */
  async execute(config) {
    const {
      mode,
      sprintNumber,
      outputDir,
      inputData = {},
      date
    } = config;

    // 验证输入
    this.validateInput(mode, inputData);

    // 创建输出目录
    const sprintDir = this.createSprintDir(outputDir, mode, sprintNumber, date);

    let result;

    switch (mode) {
      case 'sprint-planning':
        result = await this.executeSprintPlanning(sprintNumber, sprintDir, inputData);
        break;

      case 'daily-standup':
        result = await this.executeDailyStandup(sprintNumber, date, sprintDir, inputData);
        break;

      case 'sprint-review':
        result = await this.executeSprintReview(sprintNumber, sprintDir, inputData);
        break;

      case 'sprint-retrospective':
        result = await this.executeSprintRetrospective(sprintNumber, sprintDir, inputData);
        break;

      case 'full-sprint':
        result = await this.executeFullSprint(sprintNumber, sprintDir, inputData);
        break;

      case 'multi-sprint':
        result = await this.executeMultiSprint(config, outputDir);
        break;

      default:
        throw new Error(`未知的执行模式: ${mode}`);
    }

    return result;
  }

  /**
   * 执行 Sprint 计划会议
   */
  async executeSprintPlanning(sprintNumber, outputDir, inputData) {
    console.log(`\n📋 开始 Sprint ${sprintNumber} 计划会议...`);

    const planning = new SprintPlanning();
    const result = await planning.execute({
      sprintNumber,
      outputDir,
      requirements: inputData.requirements,
      teamCapacity: inputData.teamCapacity,
      teamVelocity: inputData.teamVelocity || this.velocityTracker.getLatestVelocity(),
      sprintDays: inputData.sprintDays || this.options.defaultSprintDays
    });

    // 保存 Sprint Backlog
    this.backlogManager.saveSprintBacklog(sprintNumber, result.backlog);

    console.log(`✅ Sprint ${sprintNumber} 计划完成`);
    console.log(`   - 目标: ${result.sprintGoal}`);
    console.log(`   - 故事点: ${result.totalStoryPoints}`);
    console.log(`   - 任务数: ${result.tasks.length}`);

    return result;
  }

  /**
   * 执行每日例会
   */
  async executeDailyStandup(sprintNumber, date, outputDir, inputData) {
    console.log(`\n📅 执行 Sprint ${sprintNumber} 每日例会 (${date})...`);

    const standup = new DailyStandup();
    const backlog = this.backlogManager.getSprintBacklog(sprintNumber);

    const result = await standup.execute({
      sprintNumber,
      date,
      outputDir,
      backlog,
      previousStandup: inputData.previousStandup,
      teamMembers: inputData.teamMembers
    });

    // 更新 Backlog 状态
    this.backlogManager.updateBacklogStatus(sprintNumber, result.taskUpdates);

    console.log(`✅ 每日例会完成`);
    console.log(`   - Sprint Day: ${result.sprintDay}`);
    console.log(`   - 完成点数: ${result.burnDownData.completedPoints}`);
    console.log(`   - 剩余点数: ${result.burnDownData.remainingPoints}`);

    return result;
  }

  /**
   * 执行 Sprint 评审
   */
  async executeSprintReview(sprintNumber, outputDir, inputData) {
    console.log(`\n🎯 开始 Sprint ${sprintNumber} 评审会议...`);

    const review = new SprintReview();
    const backlog = this.backlogManager.getSprintBacklog(sprintNumber);

    const result = await review.execute({
      sprintNumber,
      outputDir,
      backlog,
      demoItems: inputData.demoItems,
      feedback: inputData.feedback,
      productDecision: inputData.productDecision
    });

    // 更新速率
    this.velocityTracker.recordSprint(sprintNumber, {
      planned: result.plannedStoryPoints,
      completed: result.completedStoryPoints,
      completionRate: result.completionRate
    });

    console.log(`✅ Sprint ${sprintNumber} 评审完成`);
    console.log(`   - 完成率: ${(result.completionRate * 100).toFixed(1)}%`);
    console.log(`   - 产品决策: ${result.productDecision}`);

    return result;
  }

  /**
   * 执行 Sprint 回顾
   */
  async executeSprintRetrospective(sprintNumber, outputDir, inputData) {
    console.log(`\n🔄 开始 Sprint ${sprintNumber} 回顾会议...`);

    const retro = new SprintRetrospective();
    const sprintData = this.velocityTracker.getSprintData(sprintNumber);

    const result = await retro.execute({
      sprintNumber,
      outputDir,
      sprintData,
      goodPoints: inputData.goodPoints,
      improvements: inputData.improvements,
      actionItems: inputData.actionItems
    });

    console.log(`✅ Sprint ${sprintNumber} 回顾完成`);
    console.log(`   - 优点: ${result.goodPoints.length} 项`);
    console.log(`   - 改进: ${result.improvements.length} 项`);
    console.log(`   - 行动项: ${result.actionItems.length} 项`);

    return result;
  }

  /**
   * 执行完整 Sprint 周期
   */
  async executeFullSprint(sprintNumber, outputDir, inputData) {
    console.log(`\n🚀 开始执行完整 Sprint ${sprintNumber} 周期...`);

    // 1. Sprint 计划
    const planningResult = await this.executeSprintPlanning(
      sprintNumber,
      path.join(outputDir, `Sprint-${sprintNumber}_Planning`),
      inputData
    );

    // 2. 模拟每日例会（实际使用时需要每天调用）
    const standupResults = [];
    for (let day = 1; day <= inputData.sprintDays || this.options.defaultSprintDays; day++) {
      const date = this.calculateDate(inputData.startDate, day);
      const standupResult = await this.executeDailyStandup(
        sprintNumber,
        date,
        path.join(outputDir, `Sprint-${sprintNumber}_Daily`),
        {
          previousStandup: standupResults[standupResults.length - 1],
          teamMembers: inputData.teamMembers
        }
      );
      standupResults.push(standupResult);
    }

    // 3. Sprint 评审
    const reviewResult = await this.executeSprintReview(
      sprintNumber,
      path.join(outputDir, `Sprint-${sprintNumber}_Review`),
      inputData
    );

    // 4. Sprint 回顾
    const retroResult = await this.executeSprintRetrospective(
      sprintNumber,
      path.join(outputDir, `Sprint-${sprintNumber}_Retrospective`),
      inputData
    );

    console.log(`\n✅ Sprint ${sprintNumber} 完整周期执行完成`);

    return {
      planning: planningResult,
      standups: standupResults,
      review: reviewResult,
      retrospective: retroResult
    };
  }

  /**
   * 执行多个 Sprint
   */
  async executeMultiSprint(config, outputDir) {
    const {
      sprintCount,
      startSprint = 1,
      inputData
    } = config;

    const results = [];
    let currentVelocity = inputData.teamVelocity;

    for (let i = 0; i < sprintCount; i++) {
      const sprintNumber = startSprint + i;

      console.log(`\n${'='.repeat(60)}`);
      console.log(`🏃 开始 Sprint ${sprintNumber} (${i + 1}/${sprintCount})`);
      console.log(`${'='.repeat(60)}`);

      const sprintResult = await this.executeFullSprint(
        sprintNumber,
        path.join(outputDir, `Sprint-${sprintNumber}`),
        {
          ...inputData,
          teamVelocity: currentVelocity
        }
      );

      results.push(sprintResult);

      // 根据完成情况调整速率
      if (this.options.autoAdjustVelocity) {
        currentVelocity = this.velocityTracker.calculateNextVelocity(
          currentVelocity,
          sprintResult.review.completionRate
        );
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎉 完成 ${sprintCount} 个 Sprint`);
    console.log(`${'='.repeat(60)}`);

    return {
      sprints: results,
      velocityHistory: this.velocityTracker.getHistory()
    };
  }

  /**
   * 验证输入
   */
  validateInput(mode, inputData) {
    const requiredFields = {
      'sprint-planning': ['requirements', 'teamCapacity'],
      'daily-standup': [],
      'sprint-review': [],
      'sprint-retrospective': [],
      'full-sprint': ['requirements', 'teamCapacity'],
      'multi-sprint': ['requirements', 'teamCapacity', 'sprintCount']
    };

    const required = requiredFields[mode] || [];
    const missing = required.filter(field => !inputData[field]);

    if (missing.length > 0) {
      throw new Error(`缺少必需的输入字段: ${missing.join(', ')}`);
    }
  }

  /**
   * 创建 Sprint 目录
   */
  createSprintDir(outputDir, mode, sprintNumber, date) {
    const dirMap = {
      'sprint-planning': `Sprint-${sprintNumber}_Planning`,
      'daily-standup': `Sprint-${sprintNumber}_Daily`,
      'sprint-review': `Sprint-${sprintNumber}_Review`,
      'sprint-retrospective': `Sprint-${sprintNumber}_Retrospective`,
      'full-sprint': `Sprint-${sprintNumber}`,
      'multi-sprint': ''
    };

    const dirName = dirMap[mode];
    return path.join(outputDir, dirName);
  }

  /**
   * 计算日期
   */
  calculateDate(startDate, dayOffset) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + dayOffset - 1);
    return date.toISOString().split('T')[0];
  }
}

module.exports = ScrumWorkflow;
