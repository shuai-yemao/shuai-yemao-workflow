/**
 * 缺陷管理跟踪工作流
 *
 * 完整的缺陷生命周期管理，支持根因分析和 DMAIC 改进
 */

const path = require('path');
const DefectLogging = require('./modules/defect-logging');
const DefectTriage = require('./modules/defect-triage');
const RootCauseAnalysis = require('./modules/root-cause-analysis');
const DefectFixing = require('./modules/defect-fixing');
const DefectVerification = require('./modules/defect-verification');
const DefectDashboard = require('./modules/defect-dashboard');
const ImprovementTracking = require('./modules/improvement-tracking');
const JiraSync = require('./modules/jira-sync');
const DefectManager = require('./utils/defect-manager');
const JsonValidator = require('./utils/json-validator');

class DefectManagement {
  constructor(options = {}) {
    this.options = {
      defectPrefix: options.defectPrefix || 'BUG',
      autoAssign: options.autoAssign || false,
      jiraIntegration: options.jiraIntegration || false,
      ...options
    };

    this.defectManager = new DefectManager(options);
    this.validator = new JsonValidator();
  }

  /**
   * 执行工作流
   */
  async execute(config) {
    const {
      mode,
      module: moduleName,
      outputDir,
      inputData = {}
    } = config;

    // 验证输入
    this.validateInput(mode, inputData);

    let result;

    switch (mode) {
      case 'log-defect':
        result = await this.executeLogDefect(outputDir, inputData);
        break;

      case 'triage':
        result = await this.executeTriage(outputDir, inputData);
        break;

      case 'analyze':
        result = await this.executeAnalyze(outputDir, inputData);
        break;

      case 'fix':
        result = await this.executeFix(outputDir, inputData);
        break;

      case 'verify':
        result = await this.executeVerify(outputDir, inputData);
        break;

      case 'dashboard':
        result = await this.executeDashboard(outputDir, inputData);
        break;

      case 'improvement':
        result = await this.executeImprovement(outputDir, inputData);
        break;

      case 'sync-jira':
        result = await this.executeSyncJira(outputDir, inputData);
        break;

      case 'full-lifecycle':
        result = await this.executeFullLifecycle(outputDir, inputData);
        break;

      case 'single':
        result = await this.executeSingleModule(moduleName, outputDir, inputData);
        break;

      default:
        throw new Error(`未知的执行模式: ${mode}`);
    }

    return result;
  }

  /**
   * 记录新缺陷
   */
  async executeLogDefect(outputDir, inputData) {
    console.log('\n🐛 记录新缺陷...\n');

    const module = new DefectLogging(this.options);
    const result = await module.execute({ outputDir, inputData });

    console.log(`   ✅ 缺陷已创建: ${result.defect.id}`);

    return result;
  }

  /**
   * 缺陷分类
   */
  async executeTriage(outputDir, inputData) {
    console.log('\n📋 缺陷分类...\n');

    const module = new DefectTriage(this.options);
    const result = await module.execute({ outputDir, inputData });

    console.log(`   ✅ 分类完成: ${result.classification.severity} / ${result.classification.priority}`);

    return result;
  }

  /**
   * 根因分析
   */
  async executeAnalyze(outputDir, inputData) {
    console.log('\n🔍 根因分析...\n');

    const module = new RootCauseAnalysis(this.options);
    const result = await module.execute({ outputDir, inputData });

    console.log(`   ✅ 分析完成: ${result.rootCause.category}`);

    return result;
  }

  /**
   * 执行修复
   */
  async executeFix(outputDir, inputData) {
    console.log('\n🔧 执行修复...\n');

    const module = new DefectFixing(this.options);
    const result = await module.execute({ outputDir, inputData });

    console.log(`   ✅ 修复完成: ${result.status}`);

    return result;
  }

  /**
   * 验证修复
   */
  async executeVerify(outputDir, inputData) {
    console.log('\n✅ 验证修复...\n');

    const module = new DefectVerification(this.options);
    const result = await module.execute({ outputDir, inputData });

    console.log(`   ✅ 验证完成: ${result.result}`);

    return result;
  }

  /**
   * 生成仪表盘
   */
  async executeDashboard(outputDir, inputData) {
    console.log('\n📊 生成缺陷仪表盘...\n');

    const module = new DefectDashboard(this.options);
    const result = await module.execute({ outputDir, inputData });

    console.log(`   ✅ 仪表盘已生成`);
    console.log(`   📈 缺陷总数: ${result.summary.total}`);
    console.log(`   📉 缺陷逃逸率: ${(result.summary.escapeRate * 100).toFixed(1)}%`);

    return result;
  }

  /**
   * 执行改进流程
   */
  async executeImprovement(outputDir, inputData) {
    console.log('\n🔄 执行改进流程...\n');

    const module = new ImprovementTracking(this.options);
    const result = await module.execute({ outputDir, inputData });

    console.log(`   ✅ 改进计划已生成`);
    console.log(`   📋 改进措施: ${result.plan.actions.length} 项`);

    return result;
  }

  /**
   * 同步到 Jira
   */
  async executeSyncJira(outputDir, inputData) {
    console.log('\n🔄 同步到 Jira...\n');

    const module = new JiraSync(this.options);
    const result = await module.execute({ outputDir, inputData });

    console.log(`   ✅ 同步完成: ${result.syncedCount} 条记录`);

    return result;
  }

  /**
   * 完整生命周期
   */
  async executeFullLifecycle(outputDir, inputData) {
    console.log('\n🚀 执行完整缺陷生命周期...\n');

    const results = {};

    // 1. 记录缺陷
    console.log('📋 阶段 1/6: 记录缺陷...');
    results.logging = await this.executeLogDefect(outputDir, inputData);

    // 2. 分类评估
    console.log('📋 阶段 2/6: 分类评估...');
    results.triage = await this.executeTriage(outputDir, {
      defectId: results.logging.defect.id,
      impactAnalysis: inputData.impactAnalysis
    });

    // 3. 根因分析（仅对严重/高优先级缺陷）
    if (results.triage.classification.severity === 'critical' ||
        results.triage.classification.priority === 'high') {
      console.log('🔍 阶段 3/6: 根因分析...');
      results.analysis = await this.executeAnalyze(outputDir, {
        defectId: results.logging.defect.id
      });
    } else {
      console.log('🔍 阶段 3/6: 跳过根因分析（非严重缺陷）...');
    }

    // 4. 执行修复
    console.log('🔧 阶段 4/6: 执行修复...');
    results.fixing = await this.executeFix(outputDir, {
      defectId: results.logging.defect.id,
      fixMethod: inputData.fixMethod || 'fix',
      fixDescription: inputData.fixDescription,
      fixedBy: inputData.fixedBy
    });

    // 5. 验证修复
    console.log('✅ 阶段 5/6: 验证修复...');
    results.verification = await this.executeVerify(outputDir, {
      defectId: results.logging.defect.id,
      verifiedBy: inputData.verifiedBy
    });

    // 6. 生成仪表盘
    console.log('📊 阶段 6/6: 生成仪表盘...');
    results.dashboard = await this.executeDashboard(outputDir, {});

    console.log('\n✅ 完整缺陷生命周期执行完成\n');

    return {
      success: true,
      results,
      summary: this.generateSummary(results)
    };
  }

  /**
   * 执行单个模块
   */
  async executeSingleModule(moduleName, outputDir, inputData) {
    console.log(`\n📦 执行模块: ${moduleName}...\n`);

    const moduleMap = {
      'defect-logging': DefectLogging,
      'defect-triage': DefectTriage,
      'root-cause-analysis': RootCauseAnalysis,
      'defect-fixing': DefectFixing,
      'defect-verification': DefectVerification,
      'defect-dashboard': DefectDashboard,
      'improvement-tracking': ImprovementTracking,
      'jira-sync': JiraSync
    };

    const ModuleClass = moduleMap[moduleName];
    if (!ModuleClass) {
      throw new Error(`未知的模块: ${moduleName}`);
    }

    const module = new ModuleClass(this.options);
    const result = await module.execute({ outputDir, inputData });

    return {
      success: true,
      module: moduleName,
      result
    };
  }

  /**
   * 验证输入
   */
  validateInput(mode, inputData) {
    const requiredFields = {
      'log-defect': ['title', 'description'],
      'triage': ['defectId'],
      'analyze': ['defectId'],
      'fix': ['defectId'],
      'verify': ['defectId'],
      'dashboard': [],
      'improvement': [],
      'sync-jira': [],
      'full-lifecycle': ['title', 'description'],
      'single': []
    };

    const required = requiredFields[mode] || [];
    const missing = required.filter(field => !inputData[field]);

    if (missing.length > 0) {
      throw new Error(`缺少必需的输入字段: ${missing.join(', ')}`);
    }
  }

  /**
   * 生成摘要
   */
  generateSummary(results) {
    return {
      defectId: results.logging?.defect?.id,
      title: results.logging?.defect?.title,
      severity: results.triage?.classification?.severity,
      priority: results.triage?.classification?.priority,
      status: results.verification?.result || results.fixing?.status,
      rootCause: results.analysis?.rootCause?.category,
      fixedBy: results.fixing?.fixedBy,
      verifiedBy: results.verification?.verifiedBy
    };
  }
}

module.exports = DefectManagement;
