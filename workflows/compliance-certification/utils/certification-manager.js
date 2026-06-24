/**
 * 认证数据管理器
 * 用于管理法规和认证记录的读写和查询
 */

const fs = require('fs');
const path = require('path');

class CertificationManager {
  constructor() {
    this.basePath = '00_Project_Management/04_法规认证';
  }

  /**
   * 生成认证记录 ID
   * @returns {string} CERT-XXX 格式的 ID
   */
  generateRecordId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 5);
    return `CERT-${timestamp}${random}`.toUpperCase();
  }

  /**
   * 生成法规 ID
   * @returns {string} REG-XXX 格式的 ID
   */
  generateRegulationId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 5);
    return `REG-${timestamp}${random}`.toUpperCase();
  }

  /**
   * 加载认证记录
   * @param {string} outputDir - 输出目录
   * @param {string} recordId - 记录 ID
   * @returns {object|null}
   */
  loadRecord(outputDir, recordId) {
    const filePath = path.join(outputDir, this.basePath, 'records', `${recordId}.json`);
    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error(`Failed to load record ${recordId}:`, error.message);
    }
    return null;
  }

  /**
   * 保存认证记录
   * @param {string} outputDir - 输出目录
   * @param {object} record - 记录数据
   */
  saveRecord(outputDir, record) {
    const dirPath = path.join(outputDir, this.basePath, 'records');
    const filePath = path.join(dirPath, `${record.id}.json`);

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    record.metadata.updatedAt = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(record, null, 2), 'utf8');
  }

  /**
   * 查询认证记录
   * @param {string} outputDir - 输出目录
   * @param {object} filters - 过滤条件
   * @returns {object[]}
   */
  queryRecords(outputDir, filters = {}) {
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

        if (filters.productId && data.product.id !== filters.productId) {
          continue;
        }
        if (filters.region) {
          const hasMatchingRegion = data.regulations.some(r => r.region === filters.region);
          if (!hasMatchingRegion) continue;
        }
        if (filters.status) {
          const hasMatchingStatus = data.certifications.some(c => c.status === filters.status);
          if (!hasMatchingStatus) continue;
        }

        results.push(data);
      }
    } catch (error) {
      console.error('Failed to query records:', error.message);
    }

    return results;
  }

  /**
   * 获取证书统计信息
   * @param {string} outputDir - 输出目录
   * @param {string} recordId - 记录 ID（可选）
   * @returns {object}
   */
  getStatistics(outputDir, recordId = null) {
    const stats = {
      totalRegulations: 0,
      totalCertifications: 0,
      byStatus: { planned: 0, 'in-progress': 0, obtained: 0, expired: 0, suspended: 0 },
      byRegion: {},
      byCategory: {},
      expiringSoon: [],
      totalCost: 0
    };

    const records = recordId
      ? [this.loadRecord(outputDir, recordId)].filter(Boolean)
      : this.queryRecords(outputDir);

    for (const record of records) {
      stats.totalRegulations += record.regulations.length;

      for (const reg of record.regulations) {
        stats.byRegion[reg.region] = (stats.byRegion[reg.region] || 0) + 1;
        stats.byCategory[reg.category] = (stats.byCategory[reg.category] || 0) + 1;
      }

      for (const cert of record.certifications) {
        stats.totalCertifications++;
        stats.byStatus[cert.status] = (stats.byStatus[cert.status] || 0) + 1;

        if (cert.cost) {
          stats.totalCost += cert.cost;
        }

        // 检查即将过期的证书
        if (cert.expiryDate && cert.status === 'obtained') {
          const expiryDate = new Date(cert.expiryDate);
          const now = new Date();
          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          if (daysUntilExpiry <= 90 && daysUntilExpiry > 0) {
            stats.expiringSoon.push({
              certificationId: cert.id,
              name: cert.name,
              authority: cert.authority,
              expiryDate: cert.expiryDate,
              daysRemaining: daysUntilExpiry
            });
          } else if (daysUntilExpiry <= 0) {
            stats.byStatus.expired++;
            stats.byStatus.obtained--;
          }
        }
      }
    }

    // 按剩余天数排序
    stats.expiringSoon.sort((a, b) => a.daysRemaining - b.daysRemaining);

    return stats;
  }

  /**
   * 检查合规状态
   * @param {string} outputDir - 输出目录
   * @param {string} recordId - 记录 ID
   * @returns {object}
   */
  checkCompliance(outputDir, recordId) {
    const record = this.loadRecord(outputDir, recordId);
    if (!record) {
      return { compliant: false, errors: ['Record not found'] };
    }

    const results = {
      recordId,
      product: record.product,
      regulations: [],
      overallCompliance: true
    };

    for (const reg of record.regulations) {
      const regResult = {
        id: reg.id,
        name: reg.name,
        region: reg.region,
        category: reg.category,
        requirements: [],
        compliant: true
      };

      for (const req of (reg.requirements || [])) {
        const reqResult = {
          id: req.id,
          description: req.description,
          status: req.status || 'pending',
          compliant: req.status === 'compliant'
        };

        if (!reqResult.compliant) {
          regResult.compliant = false;
        }

        regResult.requirements.push(reqResult);
      }

      if (!regResult.compliant) {
        results.overallCompliance = false;
      }

      results.regulations.push(regResult);
    }

    return results;
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

module.exports = CertificationManager;
