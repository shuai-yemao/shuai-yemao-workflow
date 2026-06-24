/**
 * 缺陷分类模块
 *
 * 职责：
 * - 分类和优先级评估
 * - 影响分析
 * - 分配建议
 */

const fs = require('fs');
const path = require('path');

class DefectTriage {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * 执行缺陷分类
   */
  async execute(config) {
    const { outputDir, inputData = {} } = config;

    // 1. 获取缺陷记录
    const defect = await this.getDefect(outputDir, inputData.defectId);

    // 2. 执行分类
    const classification = this.classifyDefect(defect, inputData);

    // 3. 执行影响分析
    const impactAnalysis = this.analyzeImpact(defect, inputData);

    // 4. 生成分配建议
    const assignment = this.suggestAssignment(classification, impactAnalysis);

    // 5. 更新缺陷记录
    await this.updateDefect(outputDir, defect.id, classification, assignment);

    // 6. 生成输出
    const result = {
      defectId: defect.id,
      classification,
      impactAnalysis,
      assignment,
      summary: this.generateSummary(defect, classification, impactAnalysis)
    };

    // 7. 保存分类报告
    await this.saveOutput(outputDir, result);

    return result;
  }

  /**
   * 获取缺陷记录
   */
  async getDefect(outputDir, defectId) {
    const defectPath = path.join(outputDir, '00_Project_Management/10_缺陷管理追踪_Jira/defects', `defect-${defectId}.json`);

    if (!fs.existsSync(defectPath)) {
      throw new Error(`缺陷 ${defectId} 不存在`);
    }

    const content = fs.readFileSync(defectPath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * 分类缺陷
   */
  classifyDefect(defect, inputData) {
    // 基于缺陷信息进行分类
    const category = this.determineCategory(defect);
    const severity = inputData.severity || this.determineSeverity(defect);
    const priority = inputData.priority || this.determinePriority(defect, severity);
    const rootCauseCategory = this.determineRootCauseCategory(defect);

    return {
      category,
      severity,
      priority,
      rootCauseCategory,
      type: defect.type || 'defect'
    };
  }

  /**
   * 确定缺陷类别
   */
  determineCategory(defect) {
    const title = defect.title.toLowerCase();
    const description = defect.description.toLowerCase();

    if (title.includes('安全') || title.includes('security') || description.includes('漏洞')) {
      return 'security';
    }
    if (title.includes('性能') || title.includes('performance') || title.includes('慢')) {
      return 'performance';
    }
    if (title.includes('回归') || title.includes('regression')) {
      return 'regression';
    }
    if (title.includes('崩溃') || title.includes('crash') || title.includes('崩溃')) {
      return 'stability';
    }
    if (title.includes('ui') || title.includes('界面') || title.includes('显示')) {
      return 'ui';
    }

    return 'functional';
  }

  /**
   * 确定严重程度
   */
  determineSeverity(defect) {
    const title = defect.title.toLowerCase();
    const description = defect.description.toLowerCase();

    // Critical: 系统崩溃、数据丢失、安全漏洞
    if (title.includes('崩溃') || title.includes('数据丢失') || title.includes('安全漏洞') ||
        title.includes('crash') || title.includes('data loss')) {
      return 'critical';
    }

    // Major: 核心功能不可用
    if (title.includes('无法') || title.includes('失败') || title.includes('错误') ||
        description.includes('核心功能')) {
      return 'major';
    }

    // Minor: 非核心功能问题
    if (title.includes('偶尔') || title.includes('显示') || description.includes('非核心')) {
      return 'minor';
    }

    // Trivial: 样式、文案等
    return 'trivial';
  }

  /**
   * 确定优先级
   */
  determinePriority(defect, severity) {
    // 严重程度直接影响优先级
    if (severity === 'critical') return 'critical';
    if (severity === 'major') return 'high';
    if (severity === 'minor') return 'medium';

    return 'low';
  }

  /**
   * 确定根本原因类别
   */
  determineRootCauseCategory(defect) {
    const title = defect.title.toLowerCase();
    const description = defect.description.toLowerCase();

    if (title.includes('接口') || title.includes('api') || description.includes('后端')) {
      return 'code-defect';
    }
    if (title.includes('设计') || title.includes('架构') || description.includes('设计')) {
      return 'design-flaw';
    }
    if (title.includes('需求') || title.includes('规格') || description.includes('需求')) {
      return 'requirement-gap';
    }
    if (title.includes('环境') || title.includes('配置') || description.includes('环境')) {
      return 'environment';
    }

    return 'code-defect';
  }

  /**
   * 分析影响
   */
  analyzeImpact(defect, inputData) {
    const impact = inputData.impactAnalysis || {};

    return {
      affectedUsers: impact.affectedUsers || this.estimateAffectedUsers(defect),
      affectedModules: impact.affectedModules || this.estimateAffectedModules(defect),
      businessImpact: impact.businessImpact || this.estimateBusinessImpact(defect),
      technicalImpact: impact.technicalImpact || 'unknown'
    };
  }

  /**
   * 估算受影响用户数
   */
  estimateAffectedUsers(defect) {
    const severity = defect.severity || 'major';

    switch (severity) {
      case 'critical': return 1000;
      case 'major': return 100;
      case 'minor': return 10;
      default: return 1;
    }
  }

  /**
   * 估算受影响模块
   */
  estimateAffectedModules(defect) {
    const modules = [];
    const reproduction = defect.reproduction || {};

    if (reproduction.environment) {
      modules.push(reproduction.environment);
    }

    return modules.length > 0 ? modules : ['unknown'];
  }

  /**
   * 估算业务影响
   */
  estimateBusinessImpact(defect) {
    const severity = defect.severity || 'major';

    switch (severity) {
      case 'critical': return 'high';
      case 'major': return 'medium';
      case 'minor': return 'low';
      default: return 'minimal';
    }
  }

  /**
   * 建议分配
   */
  suggestAssignment(classification, impactAnalysis) {
    const { severity, priority, rootCauseCategory } = classification;

    // 基于严重程度和优先级建议分配
    if (severity === 'critical' || priority === 'critical') {
      return {
        suggestedAssignee: 'senior-developer',
        suggestedTeam: 'core-team',
        sla: '4小时',
        reason: '严重缺陷需要高级开发人员立即处理'
      };
    }

    if (severity === 'major' || priority === 'high') {
      return {
        suggestedAssignee: 'developer',
        suggestedTeam: 'feature-team',
        sla: '1天',
        reason: '高优先级缺陷需要尽快修复'
      };
    }

    if (severity === 'minor' || priority === 'medium') {
      return {
        suggestedAssignee: 'developer',
        suggestedTeam: 'feature-team',
        sla: '3天',
        reason: '中等优先级缺陷可以安排在正常开发周期'
      };
    }

    return {
      suggestedAssignee: 'junior-developer',
      suggestedTeam: 'feature-team',
      sla: '1周',
      reason: '低优先级缺陷可以安排在空闲时间处理'
    };
  }

  /**
   * 更新缺陷记录
   */
  async updateDefect(outputDir, defectId, classification, assignment) {
    const defectPath = path.join(outputDir, '00_Project_Management/10_缺陷管理追踪_Jira/defects', `defect-${defectId}.json`);

    if (!fs.existsSync(defectPath)) {
      return;
    }

    const content = fs.readFileSync(defectPath, 'utf-8');
    const defect = JSON.parse(content);

    // 更新分类信息
    defect.severity = classification.severity;
    defect.priority = classification.priority;
    defect.assignee = assignment.suggestedAssignee;
    defect.updatedAt = new Date().toISOString();

    // 添加分类评论
    defect.comments.push({
      author: 'system',
      content: `缺陷分类完成: ${classification.severity} / ${classification.priority}`,
      createdAt: new Date().toISOString()
    });

    fs.writeFileSync(defectPath, JSON.stringify(defect, null, 2), 'utf-8');
  }

  /**
   * 生成摘要
   */
  generateSummary(defect, classification, impactAnalysis) {
    return {
      defectId: defect.id,
      title: defect.title,
      category: classification.category,
      severity: classification.severity,
      priority: classification.priority,
      affectedUsers: impactAnalysis.affectedUsers,
      businessImpact: impactAnalysis.businessImpact
    };
  }

  /**
   * 保存输出
   */
  async saveOutput(outputDir, result) {
    const outputDirFull = path.join(outputDir, '00_Project_Management/10_缺陷管理追踪_Jira/triage');

    // 创建目录
    fs.mkdirSync(outputDirFull, { recursive: true });

    // 保存分类报告
    const date = new Date().toISOString().split('T')[0];
    const reportPath = path.join(outputDirFull, `triage-report-${date}.json`);

    let reports = [];
    if (fs.existsSync(reportPath)) {
      const content = fs.readFileSync(reportPath, 'utf-8');
      reports = JSON.parse(content);
    }

    reports.push(result);

    fs.writeFileSync(reportPath, JSON.stringify(reports, null, 2), 'utf-8');

    console.log(`   📁 分类报告已保存: ${reportPath}`);
  }
}

module.exports = DefectTriage;
