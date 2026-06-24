/**
 * 缺陷修复模块
 *
 * 职责：
 * - 跟踪修复过程
 * - 代码变更管理
 * - 回归测试
 */

const fs = require('fs');
const path = require('path');

class DefectFixing {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * 执行缺陷修复
   */
  async execute(config) {
    const { outputDir, inputData = {} } = config;

    // 1. 获取缺陷记录
    const defect = await this.getDefect(outputDir, inputData.defectId);

    // 2. 执行修复
    const fixResult = this.executeFix(defect, inputData);

    // 3. 更新缺陷状态
    await this.updateDefect(outputDir, defect.id, fixResult);

    // 4. 生成输出
    const result = {
      defectId: defect.id,
      fixResult,
      summary: this.generateSummary(defect, fixResult)
    };

    // 5. 保存修复记录
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
   * 执行修复
   */
  executeFix(defect, inputData) {
    const now = new Date().toISOString();

    return {
      method: inputData.fixMethod || 'fix',
      description: inputData.fixDescription || '',
      fixedBy: inputData.fixedBy || 'unknown',
      fixedAt: now,
      status: 'resolved',
      codeChanges: inputData.codeChanges || [],
      regressionTestAdded: inputData.regressionTestAdded || false,
      codeReview: inputData.codeReview || {
        reviewer: null,
        approved: false,
        comments: ''
      },
      linkedTaskId: inputData.linkedTaskId || null,
      relatedCommits: inputData.relatedCommits || []
    };
  }

  /**
   * 更新缺陷记录
   */
  async updateDefect(outputDir, defectId, fixResult) {
    const defectPath = path.join(outputDir, '00_Project_Management/10_缺陷管理追踪_Jira/defects', `defect-${defectId}.json`);

    if (!fs.existsSync(defectPath)) {
      return;
    }

    const content = fs.readFileSync(defectPath, 'utf-8');
    const defect = JSON.parse(content);

    // 更新修复信息
    defect.resolution = {
      method: fixResult.method,
      description: fixResult.description,
      fixedBy: fixResult.fixedBy,
      fixedAt: fixResult.fixedAt,
      regressionTestAdded: fixResult.regressionTestAdded
    };
    defect.status = 'resolved';
    defect.updatedAt = fixResult.fixedAt;

    // 添加修复评论
    defect.comments.push({
      author: fixResult.fixedBy,
      content: `缺陷已修复: ${fixResult.description}`,
      createdAt: fixResult.fixedAt
    });

    fs.writeFileSync(defectPath, JSON.stringify(defect, null, 2), 'utf-8');
  }

  /**
   * 生成摘要
   */
  generateSummary(defect, fixResult) {
    return {
      defectId: defect.id,
      title: defect.title,
      fixMethod: fixResult.method,
      fixedBy: fixResult.fixedBy,
      fixedAt: fixResult.fixedAt,
      regressionTestAdded: fixResult.regressionTestAdded,
      codeReviewApproved: fixResult.codeReview.approved
    };
  }

  /**
   * 保存输出
   */
  async saveOutput(outputDir, result) {
    const outputDirFull = path.join(outputDir, '00_Project_Management/10_缺陷管理追踪_Jira/fixing');

    // 创建目录
    fs.mkdirSync(outputDirFull, { recursive: true });

    // 保存修复记录
    const recordPath = path.join(outputDirFull, `fix-${result.defectId}.json`);
    fs.writeFileSync(recordPath, JSON.stringify(result, null, 2), 'utf-8');

    console.log(`   📁 修复记录已保存: ${recordPath}`);
  }
}

module.exports = DefectFixing;
