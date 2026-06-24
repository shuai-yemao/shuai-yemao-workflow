/**
 * 缺陷记录模块
 *
 * 职责：
 * - 记录和创建缺陷
 * - 生成缺陷 ID
 * - 保存缺陷信息
 */

const fs = require('fs');
const path = require('path');

class DefectLogging {
  constructor(options = {}) {
    this.options = options;
    this.defectPrefix = options.defectPrefix || 'BUG';
  }

  /**
   * 执行缺陷记录
   */
  async execute(config) {
    const { outputDir, inputData = {} } = config;

    // 1. 生成缺陷 ID
    const defectId = this.generateDefectId();

    // 2. 创建缺陷记录
    const defect = this.createDefect(defectId, inputData);

    // 3. 保存到文件
    await this.saveOutput(outputDir, defect);

    return { defect };
  }

  /**
   * 生成缺陷 ID
   */
  generateDefectId() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${this.defectPrefix}-${timestamp}${random}`;
  }

  /**
   * 创建缺陷记录
   */
  createDefect(defectId, inputData) {
    const now = new Date().toISOString();

    return {
      id: defectId,
      title: inputData.title || '未命名缺陷',
      description: inputData.description || '',
      type: inputData.type || 'defect',
      severity: inputData.severity || 'major',
      priority: inputData.priority || 'high',
      status: 'open',
      source: inputData.source || 'unknown',
      reporter: inputData.reporter || 'unknown',
      assignee: inputData.assignee || null,
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
      closedAt: null,
      sprintNumber: inputData.sprintNumber || null,
      storyId: inputData.storyId || null,
      taskId: inputData.taskId || null,
      jiraTicket: inputData.jiraTicket || null,
      reproduction: inputData.reproduction || {
        steps: [],
        expected: '',
        actual: '',
        environment: '',
        buildVersion: ''
      },
      rootCause: null,
      resolution: null,
      links: {
        duplicateOf: inputData.links?.duplicateOf || null,
        blocks: inputData.links?.blocks || [],
        blockedBy: inputData.links?.blockedBy || [],
        relatedRequirements: inputData.links?.relatedRequirements || [],
        relatedTests: inputData.links?.relatedTests || []
      },
      comments: inputData.comments || [],
      acceptanceCriteria: inputData.acceptanceCriteria || []
    };
  }

  /**
   * 保存输出
   */
  async saveOutput(outputDir, defect) {
    const outputDirFull = path.join(outputDir, '00_Project_Management/10_缺陷管理追踪_Jira/defects');

    // 创建目录
    fs.mkdirSync(outputDirFull, { recursive: true });

    // 保存缺陷记录
    const defectPath = path.join(outputDirFull, `defect-${defect.id}.json`);
    fs.writeFileSync(defectPath, JSON.stringify(defect, null, 2), 'utf-8');

    // 更新索引
    await this.updateIndex(outputDirFull, defect);

    console.log(`   📁 缺陷记录已保存: ${defectPath}`);
  }

  /**
   * 更新缺陷索引
   */
  async updateIndex(outputDirFull, defect) {
    const indexPath = path.join(outputDirFull, 'defects-index.json');
    let index = { defects: [], lastUpdated: null };

    if (fs.existsSync(indexPath)) {
      const content = fs.readFileSync(indexPath, 'utf-8');
      index = JSON.parse(content);
    }

    // 添加新缺陷到索引
    index.defects.push({
      id: defect.id,
      title: defect.title,
      severity: defect.severity,
      priority: defect.priority,
      status: defect.status,
      source: defect.source,
      createdAt: defect.createdAt
    });

    index.lastUpdated = new Date().toISOString();

    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
  }
}

module.exports = DefectLogging;
