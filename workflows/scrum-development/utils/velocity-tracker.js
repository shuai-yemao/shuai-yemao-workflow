/**
 * 速率追踪器
 *
 * 职责：
 * - 记录每个 Sprint 的速率
 * - 计算平均速率
 * - 预测下一个 Sprint 的速率
 * - 提供速率趋势分析
 */

const fs = require('fs');
const path = require('path');

class VelocityTracker {
  constructor(storageDir = null) {
    this.storageDir = storageDir || path.join(process.env.HOME || process.env.USERPROFILE, '.claude', 'scrum-data');
    this.dataFile = path.join(this.storageDir, 'velocity-history.json');
    this.ensureStorageDir();
    this.history = this.loadHistory();
  }

  /**
   * 确保存储目录存在
   */
  ensureStorageDir() {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  /**
   * 加载历史数据
   */
  loadHistory() {
    if (!fs.existsSync(this.dataFile)) {
      return { sprints: [], averageVelocity: 0 };
    }

    const content = fs.readFileSync(this.dataFile, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * 保存历史数据
   */
  saveHistory() {
    fs.writeFileSync(this.dataFile, JSON.stringify(this.history, null, 2), 'utf-8');
  }

  /**
   * 记录 Sprint 数据
   */
  recordSprint(sprintNumber, data) {
    const existingIndex = this.history.sprints.findIndex(s => s.sprintNumber === sprintNumber);

    const sprintRecord = {
      sprintNumber,
      planned: data.planned,
      completed: data.completed,
      completionRate: data.completionRate,
      velocity: data.completed, // 速率 = 完成的故事点数
      date: new Date().toISOString(),
      duration: data.duration || 10 // 默认 10 天
    };

    if (existingIndex >= 0) {
      this.history.sprints[existingIndex] = sprintRecord;
    } else {
      this.history.sprints.push(sprintRecord);
    }

    // 按 Sprint 号排序
    this.history.sprints.sort((a, b) => a.sprintNumber - b.sprintNumber);

    // 重新计算平均速率
    this.recalculateAverage();

    // 保存
    this.saveHistory();

    console.log(`   📊 速率已记录: Sprint ${sprintNumber} - ${data.completed} 故事点`);
  }

  /**
   * 重新计算平均速率
   */
  recalculateAverage() {
    if (this.history.sprints.length === 0) {
      this.history.averageVelocity = 0;
      return;
    }

    // 使用最近 5 个 Sprint 计算平均值（如果有的话）
    const recentSprints = this.history.sprints.slice(-5);
    const totalVelocity = recentSprints.reduce((sum, s) => sum + s.velocity, 0);

    this.history.averageVelocity = Math.round(totalVelocity / recentSprints.length);
  }

  /**
   * 获取最新速率
   */
  getLatestVelocity() {
    if (this.history.sprints.length === 0) {
      return 30; // 默认值
    }

    return this.history.sprints[this.history.sprints.length - 1].velocity;
  }

  /**
   * 获取平均速率
   */
  getAverageVelocity() {
    return this.history.averageVelocity || 30;
  }

  /**
   * 获取历史记录
   */
  getHistory() {
    return this.history;
  }

  /**
   * 获取特定 Sprint 的数据
   */
  getSprintData(sprintNumber) {
    return this.history.sprints.find(s => s.sprintNumber === sprintNumber) || null;
  }

  /**
   * 计算下一个 Sprint 的预测速率
   */
  calculateNextVelocity(currentVelocity, completionRate) {
    const trend = this.getVelocityTrend();

    // 基础预测：当前速率
    let predicted = currentVelocity;

    // 根据完成率调整
    if (completionRate >= 0.9) {
      // 完成率高，可以稍微增加
      predicted = Math.ceil(currentVelocity * 1.1);
    } else if (completionRate < 0.7) {
      // 完成率低，需要减少
      predicted = Math.floor(currentVelocity * 0.9);
    }

    // 根据趋势调整
    if (trend === 'increasing') {
      predicted = Math.ceil(predicted * 1.05);
    } else if (trend === 'decreasing') {
      predicted = Math.floor(predicted * 0.95);
    }

    // 限制在合理范围内（平均速率的 50%-150%）
    const avg = this.getAverageVelocity();
    const minVelocity = Math.max(1, Math.floor(avg * 0.5));
    const maxVelocity = Math.ceil(avg * 1.5);

    return Math.max(minVelocity, Math.min(maxVelocity, predicted));
  }

  /**
   * 获取速率趋势
   */
  getVelocityTrend() {
    if (this.history.sprints.length < 3) {
      return 'stable';
    }

    const recent = this.history.sprints.slice(-3);
    const velocities = recent.map(s => s.velocity);

    // 简单线性回归
    const n = velocities.length;
    const sumX = velocities.reduce((sum, _, i) => sum + i, 0);
    const sumY = velocities.reduce((sum, v) => sum + v, 0);
    const sumXY = velocities.reduce((sum, v, i) => sum + i * v, 0);
    const sumX2 = velocities.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    if (slope > 1) {
      return 'increasing';
    } else if (slope < -1) {
      return 'decreasing';
    } else {
      return 'stable';
    }
  }

  /**
   * 生成速率报告
   */
  generateReport() {
    const sprints = this.history.sprints;

    if (sprints.length === 0) {
      return {
        totalSprints: 0,
        averageVelocity: 0,
        trend: 'stable',
        minVelocity: 0,
        maxVelocity: 0
      };
    }

    const velocities = sprints.map(s => s.velocity);

    return {
      totalSprints: sprints.length,
      averageVelocity: this.history.averageVelocity,
      trend: this.getVelocityTrend(),
      minVelocity: Math.min(...velocities),
      maxVelocity: Math.max(...velocities),
      lastSprintVelocity: velocities[velocities.length - 1],
      completionRates: sprints.map(s => ({
        sprint: s.sprintNumber,
        rate: s.completionRate
      }))
    };
  }

  /**
   * 清除历史数据
   */
  clearHistory() {
    this.history = { sprints: [], averageVelocity: 0 };
    this.saveHistory();
  }

  /**
   * 删除特定 Sprint 记录
   */
  deleteSprintRecord(sprintNumber) {
    const initialLength = this.history.sprints.length;
    this.history.sprints = this.history.sprints.filter(s => s.sprintNumber !== sprintNumber);

    if (this.history.sprints.length < initialLength) {
      this.recalculateAverage();
      this.saveHistory();
      return true;
    }

    return false;
  }
}

module.exports = VelocityTracker;
