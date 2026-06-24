/**
 * DFMEA 数据管理器
 * 用于管理 DFMEA 记录的读写和查询
 */

const fs = require('fs');
const path = require('path');

class DfmeaManager {
  constructor() {
    this.basePath = '00_Project_Management/05_功能风险管控_DFMEA';
  }

  /**
   * 生成 DFMEA ID
   * @returns {string} DFMEA-XXX 格式的 ID
   */
  generateDfmeaId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 5);
    return `DFMEA-${timestamp}${random}`.toUpperCase();
  }

  /**
   * 生成功能 ID
   * @returns {string} FUNC-XXX 格式的 ID
   */
  generateFunctionId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 5);
    return `FUNC-${timestamp}${random}`.toUpperCase();
  }

  /**
   * 生成失效模式 ID
   * @returns {string} FM-XXX 格式的 ID
   */
  generateFailureModeId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 5);
    return `FM-${timestamp}${random}`.toUpperCase();
  }

  /**
   * 生成行动 ID
   * @returns {string} ACT-XXX 格式的 ID
   */
  generateActionId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 5);
    return `ACT-${timestamp}${random}`.toUpperCase();
  }

  /**
   * 计算 RPN（风险优先数）
   * @param {number} severity - 严重度 (1-10)
   * @param {number} occurrence - 发生度 (1-10)
   * @param {number} detection - 检测度 (1-10)
   * @returns {{ severity, occurrence, detection, total }}
   */
  calculateRpn(severity, occurrence, detection) {
    const s = Math.max(1, Math.min(10, severity));
    const o = Math.max(1, Math.min(10, occurrence));
    const d = Math.max(1, Math.min(10, detection));

    return {
      severity: s,
      occurrence: o,
      detection: d,
      total: s * o * d
    };
  }

  /**
   * 获取风险等级
   * @param {number} rpn - RPN 值
   * @returns {{ level: string, color: string, action: string }}
   */
  getRiskLevel(rpn) {
    if (rpn >= 200) {
      return { level: '高', color: 'red', action: '必须立即采取措施' };
    } else if (rpn >= 100) {
      return { level: '中', color: 'orange', action: '应采取措施降低风险' };
    } else if (rpn >= 50) {
      return { level: '低', color: 'yellow', action: '可考虑采取措施' };
    } else {
      return { level: '极低', color: 'green', action: '接受风险' };
    }
  }

  /**
   * 加载 DFMEA 记录
   * @param {string} outputDir - 输出目录
   * @param {string} dfmeaId - DFMEA ID
   * @returns {object|null}
   */
  loadDfmea(outputDir, dfmeaId) {
    const filePath = path.join(outputDir, this.basePath, 'records', `${dfmeaId}.json`);
    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error(`Failed to load DFMEA ${dfmeaId}:`, error.message);
    }
    return null;
  }

  /**
   * 保存 DFMEA 记录
   * @param {string} outputDir - 输出目录
   * @param {object} dfmea - DFMEA 数据
   */
  saveDfmea(outputDir, dfmea) {
    const dirPath = path.join(outputDir, this.basePath, 'records');
    const filePath = path.join(dirPath, `${dfmea.id}.json`);

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    dfmea.metadata.updatedAt = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(dfmea, null, 2), 'utf8');
  }

  /**
   * 查询 DFMEA 记录
   * @param {string} outputDir - 输出目录
   * @param {object} filters - 过滤条件
   * @returns {object[]}
   */
  queryDfmeas(outputDir, filters = {}) {
    const dirPath = path.join(outputDir, this.basePath, 'records');
    const results = [];

    try {
      if (!fs.existsSync(dirPath)) {
        return results;
      }

      const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // 应用过滤条件
        if (filters.productId && data.product.id !== filters.productId) {
          continue;
        }
        if (filters.status) {
          const hasMatchingStatus = data.functions.some(func =>
            func.failureModes.some(fm => fm.status === filters.status)
          );
          if (!hasMatchingStatus) continue;
        }
        if (filters.minRpn) {
          const hasHighRpn = data.functions.some(func =>
            func.failureModes.some(fm => fm.rpn.total >= filters.minRpn)
          );
          if (!hasHighRpn) continue;
        }

        results.push(data);
      }
    } catch (error) {
      console.error('Failed to query DFMEAs:', error.message);
    }

    return results;
  }

  /**
   * 获取统计信息
   * @param {string} outputDir - 输出目录
   * @param {string} dfmeaId - DFMEA ID（可选）
   * @returns {object}
   */
  getStatistics(outputDir, dfmeaId = null) {
    const stats = {
      totalFunctions: 0,
      totalFailureModes: 0,
      byStatus: { open: 0, 'in-progress': 0, completed: 0 },
      byRiskLevel: { high: 0, medium: 0, low: 0, veryLow: 0 },
      averageRpn: 0,
      maxRpn: 0,
      topRisks: []
    };

    let allRpns = [];

    const loadDfmeas = (dfmeaId)
      ? [this.loadDfmea(outputDir, dfmeaId)].filter(Boolean)
      : this.queryDfmeas(outputDir);

    for (const dfmea of loadDfmeas) {
      for (const func of dfmea.functions) {
        stats.totalFunctions++;

        for (const fm of func.failureModes) {
          stats.totalFailureModes++;
          stats.byStatus[fm.status] = (stats.byStatus[fm.status] || 0) + 1;

          const riskLevel = this.getRiskLevel(fm.rpn.total);
          if (riskLevel.level === '高') stats.byRiskLevel.high++;
          else if (riskLevel.level === '中') stats.byRiskLevel.medium++;
          else if (riskLevel.level === '低') stats.byRiskLevel.low++;
          else stats.byRiskLevel.veryLow++;

          allRpns.push(fm.rpn.total);

          if (fm.rpn.total > stats.maxRpn) {
            stats.maxRpn = fm.rpn.total;
          }

          if (fm.rpn.total >= 100) {
            stats.topRisks.push({
              functionId: func.id,
              functionName: func.name,
              failureModeId: fm.id,
              failureMode: fm.description,
              rpn: fm.rpn.total,
              riskLevel: riskLevel.level
            });
          }
        }
      }
    }

    if (allRpns.length > 0) {
      stats.averageRpn = Math.round(allRpns.reduce((a, b) => a + b, 0) / allRpns.length);
    }

    // 按 RPN 降序排序
    stats.topRisks.sort((a, b) => b.rpn - a.rpn);
    stats.topRisks = stats.topRisks.slice(0, 10);

    return stats;
  }

  /**
   * 分组统计
   * @param {Array} array - 数据数组
   * @param {string} key - 分组键
   * @returns {object}
   */
  groupBy(array, key) {
    return array.reduce((result, item) => {
      const groupKey = item[key];
      if (!result[groupKey]) {
        result[groupKey] = [];
      }
      result[groupKey].push(item);
      return result;
    }, {});
  }
}

module.exports = DfmeaManager;
