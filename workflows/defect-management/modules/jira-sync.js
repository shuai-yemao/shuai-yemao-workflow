/**
 * Jira 同步模块
 *
 * 职责：
 * - 与 Jira 系统同步缺陷数据
 * - 创建/更新 Jira 工单
 */

const fs = require('fs');
const path = require('path');

class JiraSync {
  constructor(options = {}) {
    this.options = options;
    this.apiEndpoint = options.jiraEndpoint || 'https://your-domain.atlassian.net';
    this.projectKey = options.projectKey || 'PROJ';
  }

  /**
   * 执行同步
   */
  async execute(config) {
    const { outputDir, inputData = {} } = config;

    // 1. 加载本地缺陷
    const localDefects = await this.loadLocalDefects(outputDir);

    // 2. 同步到 Jira
    const syncResults = await this.syncToJira(localDefects, inputData);

    // 3. 生成同步日志
    const syncLog = this.generateSyncLog(syncResults);

    // 4. 保存同步日志
    await this.saveOutput(outputDir, syncLog);

    return {
      syncedCount: syncResults.filter(r => r.success).length,
      failedCount: syncResults.filter(r => !r.success).length,
      syncLog
    };
  }

  /**
   * 加载本地缺陷
   */
  async loadLocalDefects(outputDir) {
    const defectsDir = path.join(outputDir, '00_Project_Management/10_缺陷管理追踪_Jira/defects');

    if (!fs.existsSync(defectsDir)) {
      return [];
    }

    const files = fs.readdirSync(defectsDir).filter(f => f.startsWith('defect-') && f.endsWith('.json'));
    const defects = [];

    for (const file of files) {
      const content = fs.readFileSync(path.join(defectsDir, file), 'utf-8');
      defects.push(JSON.parse(content));
    }

    return defects;
  }

  /**
   * 同步到 Jira
   */
  async syncToJira(localDefects, inputData) {
    const results = [];

    for (const defect of localDefects) {
      try {
        // 模拟同步到 Jira
        const result = await this.syncDefect(defect, inputData);
        results.push({
          defectId: defect.id,
          jiraTicket: result.ticketId,
          success: true,
          syncedAt: new Date().toISOString()
        });
      } catch (error) {
        results.push({
          defectId: defect.id,
          success: false,
          error: error.message,
          failedAt: new Date().toISOString()
        });
      }
    }

    return results;
  }

  /**
   * 同步单个缺陷
   */
  async syncDefect(defect, inputData) {
    // 模拟 Jira API 调用
    // 实际实现中会调用 Jira REST API

    const ticketData = {
      fields: {
        project: { key: this.projectKey },
        issuetype: { name: 'Bug' },
        summary: defect.title,
        description: defect.description,
        priority: { name: this.mapPriorityToJira(defect.priority) },
        labels: [defect.source, defect.severity],
        customfield_10001: defect.id // 自定义字段存储本地 ID
      }
    };

    // 模拟 API 响应
    return {
      ticketId: `${this.projectKey}-${Math.floor(Math.random() * 10000)}`,
      self: `${this.apiEndpoint}/rest/api/2/issue/${this.projectKey}-1234`
    };
  }

  /**
   * 映射优先级到 Jira
   */
  mapPriorityToJira(priority) {
    const mapping = {
      critical: 'Highest',
      high: 'High',
      medium: 'Medium',
      low: 'Low'
    };
    return mapping[priority] || 'Medium';
  }

  /**
   * 生成同步日志
   */
  generateSyncLog(syncResults) {
    return {
      syncTime: new Date().toISOString(),
      totalDefects: syncResults.length,
      successfulSyncs: syncResults.filter(r => r.success).length,
      failedSyncs: syncResults.filter(r => !r.success).length,
      details: syncResults
    };
  }

  /**
   * 保存输出
   */
  async saveOutput(outputDir, syncLog) {
    const outputDirFull = path.join(outputDir, '00_Project_Management/10_缺陷管理追踪_Jira/jira-sync');

    // 创建目录
    fs.mkdirSync(outputDirFull, { recursive: true });

    // 保存同步日志
    const logPath = path.join(outputDirFull, 'sync-log.json');
    fs.writeFileSync(logPath, JSON.stringify(syncLog, null, 2), 'utf-8');

    console.log(`   📁 同步日志已保存: ${outputDirFull}`);
  }
}

module.exports = JiraSync;
