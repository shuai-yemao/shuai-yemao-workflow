/**
 * 改进跟踪模块
 *
 * 职责：
 * - 执行 DMAIC 改进流程
 * - 跟踪改进措施
 * - 评估改进效果
 */

const fs = require('fs');
const path = require('path');

class ImprovementTracking {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * 执行改进流程
   */
  async execute(config) {
    const { outputDir, inputData = {} } = config;

    // 1. 定义改进目标（Define）
    const definePhase = this.definePhase(inputData);

    // 2. 测量现状（Measure）
    const measurePhase = this.measurePhase(inputData);

    // 3. 分析原因（Analyze）
    const analyzePhase = this.analyzePhase(inputData);

    // 4. 制定改进（Improve）
    const improvePhase = this.improvePhase(inputData);

    // 5. 控制效果（Control）
    const controlPhase = this.controlPhase(inputData);

    // 6. 生成输出
    const result = {
      dmaic: {
        define: definePhase,
        measure: measurePhase,
        analyze: analyzePhase,
        improve: improvePhase,
        control: controlPhase
      },
      plan: this.generatePlan(improvePhase),
      tracking: this.generateTracking(improvePhase),
      summary: this.generateSummary(definePhase, improvePhase)
    };

    // 7. 保存到文件
    await this.saveOutput(outputDir, result);

    return result;
  }

  /**
   * Define 阶段
   */
  definePhase(inputData) {
    return {
      problemStatement: inputData.problemStatement || '减少缺陷数量',
      goal: inputData.goal || '将缺陷逃逸率降低到 5% 以下',
      scope: inputData.scope || '软件开发全流程',
      timeline: inputData.timeline || '3 个月',
      stakeholders: inputData.stakeholders || ['开发团队', '测试团队', '产品经理']
    };
  }

  /**
   * Measure 阶段
   */
  measurePhase(inputData) {
    const currentMetrics = inputData.currentMetrics || {};

    return {
      currentDefectRate: currentMetrics.defectRate || 0.15,
      currentEscapeRate: currentMetrics.escapeRate || 0.1,
      currentResolutionTime: currentMetrics.resolutionTime || '3 天',
      baseline: {
        totalDefects: currentMetrics.totalDefects || 50,
        criticalDefects: currentMetrics.criticalDefects || 5,
        escapedDefects: currentMetrics.escapedDefects || 8
      }
    };
  }

  /**
   * Analyze 阶段
   */
  analyzePhase(inputData) {
    const rootCauseAnalysis = inputData.rootCauseAnalysis || {};

    return {
      rootCauses: rootCauseAnalysis.rootCauses || [
        { cause: '测试覆盖不足', impact: 'high', category: 'testing' },
        { cause: '编码规范执行不严', impact: 'medium', category: 'process' },
        { cause: '需求不明确', impact: 'medium', category: 'requirements' }
      ],
      contributingFactors: rootCauseAnalysis.contributingFactors || [
        '代码审查不充分',
        '单元测试覆盖率低',
        '需求变更频繁'
      ]
    };
  }

  /**
   * Improve 阶段
   */
  improvePhase(inputData) {
    const improvementActions = inputData.improvementActions || [];

    return {
      actions: improvementActions.length > 0 ? improvementActions : [
        {
          id: 'ACT-001',
          action: '增加单元测试覆盖率到 80%',
          owner: '开发团队',
          dueDate: '2026-07-31',
          status: 'pending',
          priority: 'high'
        },
        {
          id: 'ACT-002',
          action: '完善编码规范并执行',
          owner: '技术负责人',
          dueDate: '2026-07-15',
          status: 'pending',
          priority: 'medium'
        },
        {
          id: 'ACT-003',
          action: '加强需求评审流程',
          owner: '产品经理',
          dueDate: '2026-07-20',
          status: 'pending',
          priority: 'medium'
        }
      ],
      expectedImpact: {
        defectReduction: '30%',
        escapeRateReduction: '50%',
        resolutionTimeReduction: '20%'
      }
    };
  }

  /**
   * Control 阶段
   */
  controlPhase(inputData) {
    return {
      monitoringMetrics: [
        { metric: '缺陷逃逸率', target: '<5%', frequency: '每周' },
        { metric: '缺陷解决时间', target: '<2 天', frequency: '每周' },
        { metric: '代码审查覆盖率', target: '100%', frequency: '每次提交' }
      ],
      reviewCadence: '每周回顾',
      escalationPath: '技术负责人 → 项目经理'
    };
  }

  /**
   * 生成计划
   */
  generatePlan(improvePhase) {
    return {
      totalActions: improvePhase.actions.length,
      highPriorityActions: improvePhase.actions.filter(a => a.priority === 'high').length,
      timeline: this.calculateTimeline(improvePhase.actions),
      milestones: this.generateMilestones(improvePhase.actions)
    };
  }

  /**
   * 计算时间线
   */
  calculateTimeline(actions) {
    if (actions.length === 0) {
      return { start: 'N/A', end: 'N/A', duration: 'N/A' };
    }

    const dates = actions.map(a => new Date(a.dueDate));
    const start = new Date(Math.min(...dates));
    const end = new Date(Math.max(...dates));

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
      duration: `${Math.ceil((end - start) / (1000 * 60 * 60 * 24))} 天`
    };
  }

  /**
   * 生成里程碑
   */
  generateMilestones(actions) {
    return actions.map(action => ({
      action: action.action,
      dueDate: action.dueDate,
      status: action.status
    }));
  }

  /**
   * 生成跟踪数据
   */
  generateTracking(improvePhase) {
    return {
      totalActions: improvePhase.actions.length,
      completedActions: improvePhase.actions.filter(a => a.status === 'completed').length,
      inProgressActions: improvePhase.actions.filter(a => a.status === 'in-progress').length,
      pendingActions: improvePhase.actions.filter(a => a.status === 'pending').length,
      progress: this.calculateProgress(improvePhase.actions)
    };
  }

  /**
   * 计算进度
   */
  calculateProgress(actions) {
    if (actions.length === 0) return 0;

    const completed = actions.filter(a => a.status === 'completed').length;
    return Math.round((completed / actions.length) * 100);
  }

  /**
   * 生成摘要
   */
  generateSummary(definePhase, improvePhase) {
    return {
      problem: definePhase.problemStatement,
      goal: definePhase.goal,
      totalActions: improvePhase.actions.length,
      expectedImpact: improvePhase.expectedImpact
    };
  }

  /**
   * 保存输出
   */
  async saveOutput(outputDir, result) {
    const outputDirFull = path.join(outputDir, '00_Project_Management/10_缺陷管理追踪_Jira/improvement');

    // 创建目录
    fs.mkdirSync(outputDirFull, { recursive: true });

    // 保存改进计划
    const planPath = path.join(outputDirFull, 'improvement-plan.json');
    fs.writeFileSync(planPath, JSON.stringify(result, null, 2), 'utf-8');

    console.log(`   📁 改进计划已保存: ${outputDirFull}`);
  }
}

module.exports = ImprovementTracking;
