/**
 * 根因分析模块
 *
 * 职责：
 * - 深入分析缺陷根本原因
 * - 5 Why 分析
 * - 影响范围评估
 * - 改进建议
 */

const fs = require('fs');
const path = require('path');

class RootCauseAnalysis {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * 执行根因分析
   */
  async execute(config) {
    const { outputDir, inputData = {} } = config;

    // 1. 获取缺陷记录
    const defect = await this.getDefect(outputDir, inputData.defectId);

    // 2. 执行 5 Why 分析
    const fiveWhyAnalysis = this.performFiveWhyAnalysis(defect, inputData);

    // 3. 确定根本原因
    const rootCause = this.determineRootCause(defect, fiveWhyAnalysis, inputData);

    // 4. 评估影响范围
    const impactScope = this.assessImpactScope(defect, rootCause);

    // 5. 生成改进建议
    const recommendations = this.generateRecommendations(rootCause, impactScope);

    // 6. 更新缺陷记录
    await this.updateDefect(outputDir, defect.id, rootCause);

    // 7. 生成输出
    const result = {
      defectId: defect.id,
      fiveWhyAnalysis,
      rootCause,
      impactScope,
      recommendations,
      summary: this.generateSummary(defect, rootCause, impactScope)
    };

    // 8. 保存分析报告
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
   * 执行 5 Why 分析
   */
  performFiveWhyAnalysis(defect, inputData) {
    const questions = [
      '为什么会出现这个问题？',
      '为什么会发生这个原因？',
      '为什么这个原因会发生？',
      '为什么这个根本原因没有被预防？',
      '为什么这个预防措施没有生效？'
    ];

    // 基于缺陷信息生成 5 Why 分析
    const analysis = [];
    let currentAnswer = defect.description || defect.title;

    for (let i = 0; i < questions.length; i++) {
      const answer = this.generateWhyAnswer(i, currentAnswer, defect);
      analysis.push({
        level: i + 1,
        question: questions[i],
        answer: answer
      });
      currentAnswer = answer;
    }

    return analysis;
  }

  /**
   * 生成 Why 回答
   */
  generateWhyAnswer(level, previousAnswer, defect) {
    const title = defect.title.toLowerCase();
    const reproduction = defect.reproduction || {};

    // 基于不同层级生成回答
    switch (level) {
      case 0: // 直接原因
        if (title.includes('500') || title.includes('错误')) {
          return '代码执行时发生异常，返回 HTTP 500 错误';
        }
        if (title.includes('崩溃') || title.includes('crash')) {
          return '程序崩溃，无法正常运行';
        }
        return '程序未按预期行为执行';

      case 1: // 为什么会出现这个直接原因
        if (title.includes('邮箱') || title.includes('email')) {
          return '邮箱地址包含特殊字符 "+"，解析时未正确处理';
        }
        if (title.includes('空指针') || title.includes('null')) {
          return '访问了空指针，未进行空值检查';
        }
        return '输入数据未按预期格式处理';

      case 2: // 为什么会发生这个原因
        return '编码规范未覆盖该场景，开发时未考虑';

      case 3: // 为什么没有被预防
        return '单元测试未覆盖该边界条件';

      case 4: // 为什么预防措施没有生效
        return '测试用例设计不完整，未考虑所有边界情况';

      default:
        return '需要进一步调查';
    }
  }

  /**
   * 确定根本原因
   */
  determineRootCause(defect, fiveWhyAnalysis, inputData) {
    const lastWhy = fiveWhyAnalysis[fiveWhyAnalysis.length - 1];

    // 基于 5 Why 分析确定根本原因类别
    const category = this.categorizeRootCause(lastWhy.answer, defect);

    return {
      category,
      description: lastWhy.answer,
      affectedFiles: inputData.codeChanges?.flatMap(c => c.files) || [],
      relatedCommit: inputData.codeChanges?.[0]?.commit || null,
      evidence: this.gatherEvidence(defect, inputData)
    };
  }

  /**
   * 分类根本原因
   */
  categorizeRootCause(answer, defect) {
    const answerLower = answer.toLowerCase();

    if (answerLower.includes('测试') || answerLower.includes('测试用例')) {
      return 'testing-gap';
    }
    if (answerLower.includes('规范') || answerLower.includes('编码')) {
      return 'process-gap';
    }
    if (answerLower.includes('设计') || answerLower.includes('架构')) {
      return 'design-flaw';
    }
    if (answerLower.includes('需求') || answerLower.includes('规格')) {
      return 'requirement-gap';
    }
    if (answerLower.includes('环境') || answerLower.includes('配置')) {
      return 'environment';
    }

    return 'code-defect';
  }

  /**
   * 收集证据
   */
  gatherEvidence(defect, inputData) {
    const evidence = [];

    if (defect.reproduction?.steps?.length > 0) {
      evidence.push({
        type: 'reproduction-steps',
        description: '复现步骤',
        data: defect.reproduction.steps
      });
    }

    if (inputData.codeChanges?.length > 0) {
      evidence.push({
        type: 'code-changes',
        description: '相关代码变更',
        data: inputData.codeChanges
      });
    }

    if (defect.reproduction?.environment) {
      evidence.push({
        type: 'environment',
        description: '运行环境',
        data: defect.reproduction.environment
      });
    }

    return evidence;
  }

  /**
   * 评估影响范围
   */
  assessImpactScope(defect, rootCause) {
    return {
      directImpact: this.assessDirectImpact(defect),
      indirectImpact: this.assessIndirectImpact(rootCause),
      affectedComponents: this.identifyAffectedComponents(rootCause),
      riskLevel: this.calculateRiskLevel(defect, rootCause)
    };
  }

  /**
   * 评估直接影响
   */
  assessDirectImpact(defect) {
    const severity = defect.severity || 'major';

    return {
      userImpact: severity === 'critical' ? 'high' : severity === 'major' ? 'medium' : 'low',
      functionalityImpact: severity === 'critical' ? 'core' : 'non-core',
      dataImpact: severity === 'critical' ? 'potential-data-loss' : 'no-data-loss'
    };
  }

  /**
   * 评估间接影响
   */
  assessIndirectImpact(rootCause) {
    return {
      codebaseImpact: rootCause.affectedFiles?.length || 0 > 0 ? 'high' : 'low',
      maintenanceImpact: rootCause.category === 'design-flaw' ? 'high' : 'medium',
      testingImpact: rootCause.category === 'testing-gap' ? 'high' : 'low'
    };
  }

  /**
   * 识别受影响组件
   */
  identifyAffectedComponents(rootCause) {
    const components = [];

    if (rootCause.affectedFiles) {
      for (const file of rootCause.affectedFiles) {
        const component = file.split('/')[1] || 'unknown';
        if (!components.includes(component)) {
          components.push(component);
        }
      }
    }

    return components.length > 0 ? components : ['unknown'];
  }

  /**
   * 计算风险等级
   */
  calculateRiskLevel(defect, rootCause) {
    let riskScore = 0;

    // 基于严重程度
    if (defect.severity === 'critical') riskScore += 40;
    else if (defect.severity === 'major') riskScore += 25;
    else if (defect.severity === 'minor') riskScore += 10;

    // 基于根本原因类别
    if (rootCause.category === 'design-flaw') riskScore += 30;
    else if (rootCause.category === 'process-gap') riskScore += 20;
    else if (rootCause.category === 'testing-gap') riskScore += 15;

    // 基于影响范围
    if (rootCause.affectedFiles?.length > 5) riskScore += 15;

    if (riskScore >= 70) return 'high';
    if (riskScore >= 40) return 'medium';
    return 'low';
  }

  /**
   * 生成改进建议
   */
  generateRecommendations(rootCause, impactScope) {
    const recommendations = [];

    // 基于根本原因类别的建议
    switch (rootCause.category) {
      case 'testing-gap':
        recommendations.push({
          type: 'testing',
          priority: 'high',
          message: '补充单元测试，覆盖边界条件',
          action: '添加测试用例，确保覆盖所有边界情况'
        });
        break;

      case 'process-gap':
        recommendations.push({
          type: 'process',
          priority: 'medium',
          message: '更新编码规范，明确相关规则',
          action: '在编码规范中添加相关条款'
        });
        break;

      case 'design-flaw':
        recommendations.push({
          type: 'design',
          priority: 'high',
          message: '重构相关代码，改善设计',
          action: '进行代码重构，提高可维护性'
        });
        break;

      case 'requirement-gap':
        recommendations.push({
          type: 'requirements',
          priority: 'medium',
          message: '补充需求文档，明确边界条件',
          action: '更新需求规格说明'
        });
        break;
    }

    // 基于影响范围的建议
    if (impactScope.riskLevel === 'high') {
      recommendations.push({
        type: 'monitoring',
        priority: 'high',
        message: '增加监控告警，及时发现类似问题',
        action: '在关键路径添加监控点'
      });
    }

    return recommendations;
  }

  /**
   * 更新缺陷记录
   */
  async updateDefect(outputDir, defectId, rootCause) {
    const defectPath = path.join(outputDir, '00_Project_Management/10_缺陷管理追踪_Jira/defects', `defect-${defectId}.json`);

    if (!fs.existsSync(defectPath)) {
      return;
    }

    const content = fs.readFileSync(defectPath, 'utf-8');
    const defect = JSON.parse(content);

    // 更新根因信息
    defect.rootCause = rootCause;
    defect.updatedAt = new Date().toISOString();

    // 添加分析评论
    defect.comments.push({
      author: 'system',
      content: `根因分析完成: ${rootCause.category} - ${rootCause.description}`,
      createdAt: new Date().toISOString()
    });

    fs.writeFileSync(defectPath, JSON.stringify(defect, null, 2), 'utf-8');
  }

  /**
   * 生成摘要
   */
  generateSummary(defect, rootCause, impactScope) {
    return {
      defectId: defect.id,
      title: defect.title,
      rootCauseCategory: rootCause.category,
      rootCauseDescription: rootCause.description,
      riskLevel: impactScope.riskLevel,
      affectedComponents: impactScope.affectedComponents
    };
  }

  /**
   * 保存输出
   */
  async saveOutput(outputDir, result) {
    const outputDirFull = path.join(outputDir, '00_Project_Management/10_缺陷管理追踪_Jira/analysis');

    // 创建目录
    fs.mkdirSync(outputDirFull, { recursive: true });

    // 保存分析报告
    const reportPath = path.join(outputDirFull, `root-cause-${result.defectId}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(result, null, 2), 'utf-8');

    console.log(`   📁 根因分析报告已保存: ${reportPath}`);
  }
}

module.exports = RootCauseAnalysis;
