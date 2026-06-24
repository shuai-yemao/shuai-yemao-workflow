/**
 * 知识产权数据管理器
 */

const fs = require('fs');
const path = require('path');

class IpManager {
  constructor() {
    this.basePath = '00_Project_Management/06_知识产权';
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
    const stats = { totalPatents: 0, totalTrademarks: 0, totalCopyrights: 0, byPatentStatus: {}, byTrademarkStatus: {}, totalCost: 0 };
    const records = recordId ? [this.loadRecord(outputDir, recordId)].filter(Boolean) : this.queryRecords(outputDir);

    for (const record of records) {
      if (record.patents) {
        stats.totalPatents += record.patents.length;
        for (const p of record.patents) { stats.byPatentStatus[p.status] = (stats.byPatentStatus[p.status] || 0) + 1; if (p.cost) stats.totalCost += p.cost; }
      }
      if (record.trademarks) {
        stats.totalTrademarks += record.trademarks.length;
        for (const t of record.trademarks) { stats.byTrademarkStatus[t.status] = (stats.byTrademarkStatus[t.status] || 0) + 1; if (t.cost) stats.totalCost += t.cost; }
      }
      if (record.copyrights) { stats.totalCopyrights += record.copyrights.length; }
    }
    return stats;
  }
}

module.exports = IpManager;
