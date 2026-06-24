/**
 * 缺陷验证模块
 *
 * 职责：
 * - 验证修复效果
 * - 关闭/重开决策
 */

const fs = require('fs');
const path = require('path');

class DefectVerification {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * 执行缺陷验证
   */
  async execute(config) {
    const { outputDir, inputData = {} } = config;

    // 1. 获取缺陷记录
    const defect = await this.getDefect(outputDir, inputData.defectId);

    // 2. 执行验证
    const verificationResult = this.verifyFix(defect, inputData);

    // 3. 更新缺陷状态
    await this.updateDefect(outputDir, defect.id, verificationResult);

    // 4. 生成输出
    const result = {
      defectId: defect.id,
      verifiedBy: inputData.verifiedBy || 'unknown',
      verifiedAt: new Date().toISOString(),
      result: verificationResult.passed ? 'verified' : 'rejected',
      verificationResults: inputData.verificationResults || [],
      summary: this.generateSummary(defect, verificationResult)
    };

    // 5. 保存验证报告
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
   * 验证修复
   */
  verifyFix(defect, inputData) {
    const verificationResults = inputData.verificationResults || [];

    // 检查所有验证项是否通过
    const allPassed = verificationResults.every(v => v.result === 'pass');

    return {
      passed: allPassed,
      results: verificationResults,
      issues: verificationResults.filter(v => v.result === 'fail')
    };
  }

  /**
   * 更新缺陷记录
   */
  async updateDefect(outputDir, defectId, verificationResult) {
    const defectPath = path.join(outputDir, '00_Project_Management/10_缺陷管理追踪_Jira/defects', `defect-${defectId}.json`);

    if (!fs.existsSync(defectPath)) {
      return;
    }

    const content = fs.readFileSync(defectPath, 'utf-8');
    const defect = JSON.parse(content);

    const now = new Date().toISOString();

    if (verificationResult.passed) {
      // 验证通过，关闭缺陷
      defect.status = 'closed';
      defect.closedAt = now;
      defect.resolution.verifiedBy = inputData.verifiedBy;
      defect.resolution.verifiedAt = now;
    } else {
      // 验证失败，重新打开
      defect.status = 'reopened';
      defect.resolution = null;
    }

    defect.updatedAt = now;

    // 添加验证评论
    defect.comments.push({
      author: inputData.verifiedBy || 'system',
      content: verificationResult.passed ? '验证通过，缺陷已关闭' : '验证失败，缺陷重新打开',
      createdAt: now
    });

    fs.writeFileSync(defectPath, JSON.stringify(defect, null, 2), 'utf-8');
  }

  /**
   * 生成摘要
   */
  generateSummary(defect, verificationResult) {
    return {
      defectId: defect.id,
      title: defect.title,
      result: verificationResult.passed ? 'verified' : 'rejected',
      passedChecks: verificationResult.results.filter(v => v.result === 'pass').length,
      failedChecks: verificationResult.results.filter(v => v.result === 'fail').length
    };
  }

  /**
   * 保存输出
   */
  async saveOutput(outputDir, result) {
    const outputDirFull = path.join(outputDir, '00_Project_Management/10_缺陷管理追踪_Jira/verification');

    // 创建目录
    fs.mkdirSync(outputDirFull, { recursive: true });

    // 保存验证报告
    const reportPath = path.join(outputDirFull, `verification-${result.defectId}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(result, null, 2), 'utf-8');

    console.log(`   📁 验证报告已保存: ${reportPath}`);
  }
}

module.exports = DefectVerification;
