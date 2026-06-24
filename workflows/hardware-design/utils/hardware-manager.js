/**
 * 硬件数据管理器
 */

const fs = require('fs');
const path = require('path');

class HardwareManager {
  constructor() {
    this.basePath = '00_Project_Management/02_Hardware';
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
    const stats = { totalComponents: 0, totalSchematics: 0, totalPcbs: 0, totalBomItems: 0, byComponentType: {}, bySchematicStatus: {}, byPcbStatus: {}, totalBomCost: 0 };
    const records = recordId ? [this.loadRecord(outputDir, recordId)].filter(Boolean) : this.queryRecords(outputDir);

    for (const record of records) {
      if (record.architecture?.components) {
        stats.totalComponents += record.architecture.components.length;
        for (const comp of record.architecture.components) { stats.byComponentType[comp.type] = (stats.byComponentType[comp.type] || 0) + 1; }
      }
      if (record.schematics) {
        stats.totalSchematics += record.schematics.length;
        for (const sch of record.schematics) { stats.bySchematicStatus[sch.status] = (stats.bySchematicStatus[sch.status] || 0) + 1; }
      }
      if (record.pcbs) {
        stats.totalPcbs += record.pcbs.length;
        for (const pcb of record.pcbs) { stats.byPcbStatus[pcb.status] = (stats.byPcbStatus[pcb.status] || 0) + 1; }
      }
      if (record.bom) {
        stats.totalBomItems += record.bom.length;
        stats.totalBomCost += record.bom.reduce((sum, item) => sum + (item.unitPrice || 0) * (item.quantity || 0), 0);
      }
    }
    return stats;
  }
}

module.exports = HardwareManager;
