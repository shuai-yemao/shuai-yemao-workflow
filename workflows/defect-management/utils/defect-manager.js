/**
 * 缺陷数据管理器
 *
 * 职责：
 * - 管理缺陷数据的持久化
 * - 查询和检索缺陷
 * - 缺陷状态管理
 */

const fs = require('fs');
const path = require('path');

class DefectManager {
  constructor(options = {}) {
    this.options = options;
    this.defectPrefix = options.defectPrefix || 'BUG';
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
   * 加载缺陷
   */
  loadDefect(outputDir, defectId) {
    const defectPath = path.join(outputDir, '00_Project_Management/10_缺陷管理追踪_Jira/defects', `defect-${defectId}.json`);

    if (!fs.existsSync(defectPath)) {
      return null;
    }

    const content = fs.readFileSync(defectPath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * 保存缺陷
   */
  saveDefect(outputDir, defect) {
    const defectsDir = path.join(outputDir, '00_Project_Management/10_缺陷管理追踪_Jira/defects');
    fs.mkdirSync(defectsDir, { recursive: true });

    const defectPath = path.join(defectsDir, `defect-${defect.id}.json`);
    fs.writeFileSync(defectPath, JSON.stringify(defect, null, 2), 'utf-8');

    return defectPath;
  }

  /**
   * 查询缺陷
   */
  queryDefects(outputDir, filters = {}) {
    const defectsDir = path.join(outputDir, '00_Project_Management/10_缺陷管理追踪_Jira/defects');

    if (!fs.existsSync(defectsDir)) {
      return [];
    }

    const files = fs.readdirSync(defectsDir).filter(f => f.startsWith('defect-') && f.endsWith('.json'));
    let defects = [];

    for (const file of files) {
      const content = fs.readFileSync(path.join(defectsDir, file), 'utf-8');
      defects.push(JSON.parse(content));
    }

    // 应用过滤器
    if (filters.status) {
      defects = defects.filter(d => d.status === filters.status);
    }
    if (filters.severity) {
      defects = defects.filter(d => d.severity === filters.severity);
    }
    if (filters.priority) {
      defects = defects.filter(d => d.priority === filters.priority);
    }
    if (filters.source) {
      defects = defects.filter(d => d.source === filters.source);
    }
    if (filters.assignee) {
      defects = defects.filter(d => d.assignee === filters.assignee);
    }
    if (filters.sprintNumber) {
      defects = defects.filter(d => d.sprintNumber === filters.sprintNumber);
    }

    return defects;
  }

  /**
   * 更新缺陷状态
   */
  updateDefectStatus(outputDir, defectId, newStatus, comment = '') {
    const defect = this.loadDefect(outputDir, defectId);

    if (!defect) {
      return null;
    }

    defect.status = newStatus;
    defect.updatedAt = new Date().toISOString();

    if (comment) {
      defect.comments.push({
        author: 'system',
        content: comment,
        createdAt: new Date().toISOString()
      });
    }

    this.saveDefect(outputDir, defect);

    return defect;
  }

  /**
   * 获取缺陷统计
   */
  getDefectStatistics(outputDir) {
    const defects = this.queryDefects(outputDir);

    return {
      total: defects.length,
      byStatus: this.groupBy(defects, 'status'),
      bySeverity: this.groupBy(defects, 'severity'),
      byPriority: this.groupBy(defects, 'priority'),
      bySource: this.groupBy(defects, 'source')
    };
  }

  /**
   * 分组统计
   */
  groupBy(array, key) {
    return array.reduce((result, item) => {
      const group = item[key] || 'unknown';
      result[group] = (result[group] || 0) + 1;
      return result;
    }, {});
  }
}

module.exports = DefectManager;
