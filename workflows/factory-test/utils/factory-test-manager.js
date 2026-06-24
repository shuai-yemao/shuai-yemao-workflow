/**
 * 工厂测试数据管理器
 */

const fs = require('fs');
const path = require('path');

class FactoryTestManager {
  constructor() {
    this.basePath = '00_Project_Management/06_Factory';
  }

  generateId(prefix) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 5);
    return `${prefix}-${timestamp}${random}`.toUpperCase();
  }

  loadRecord(outputDir, recordId) {
    const filePath = path.join(outputDir, this.basePath, 'records', `${recordId}.json`);
    try {
      if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) { console.error(`Failed to load record ${recordId}:`, error.message); }
    return null;
  }

  saveRecord(outputDir, record) {
    const dirPath = path.join(outputDir, this.basePath, 'records');
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    record.metadata.updatedAt = new Date().toISOString();
    fs.writeFileSync(path.join(dirPath, `${record.id}.json`), JSON.stringify(record, null, 2), 'utf8');
  }

  queryRecords(outputDir, filters = {}) {
    const dirPath = path.join(outputDir, this.basePath, 'records');
    const results = [];
    try {
      if (!fs.existsSync(dirPath)) return results;
      for (const file of fs.readdirSync(dirPath).filter(f => f.endsWith('.json'))) {
        const data = JSON.parse(fs.readFileSync(path.join(dirPath, file), 'utf8'));
        if (filters.productId && data.product.id !== filters.productId) continue;
        results.push(data);
      }
    } catch (error) { console.error('Failed to query records:', error.message); }
    return results;
  }

  getStatistics(outputDir, recordId = null) {
    const stats = { totalTestCases: 0, totalTestRuns: 0, passRate: 0, byType: {} };
    const records = recordId ? [this.loadRecord(outputDir, recordId)].filter(Boolean) : this.queryRecords(outputDir);

    for (const record of records) {
      if (record.testCases) {
        stats.totalTestCases += record.testCases.length;
        for (const tc of record.testCases) { stats.byType[tc.type] = (stats.byType[tc.type] || 0) + 1; }
      }
      if (record.testRuns) {
        stats.totalTestRuns += record.testRuns.length;
        const passed = record.testRuns.filter(r => r.result === 'pass').length;
        stats.passRate = record.testRuns.length > 0 ? Math.round((passed / record.testRuns.length) * 100) : 0;
      }
    }
    return stats;
  }
}

module.exports = FactoryTestManager;
