/**
 * 缺陷仪表盘模块
 *
 * 职责：
 * - 生成缺陷统计
 * - 趋势分析
 * - 质量评估
 */

const fs = require('fs');
const path = require('path');

class DefectDashboard {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * 执行仪表盘生成
   */
  async execute(config) {
    const { outputDir, inputData = {} } = config;

    // 1. 加载所有缺陷
    const defects = await this.loadAllDefects(outputDir);

    // 2. 生成统计
    const summary = this.generateSummary(defects, inputData);

    // 3. 生成趋势数据
    const trends = this.generateTrends(defects, inputData);

    // 4. 生成质量评估
    const qualityAssessment = this.assessQuality(summary);

    // 5. 生成输出
    const result = {
      sprintNumber: inputData.sprintNumber || null,
      generatedAt: new Date().toISOString(),
      summary,
      trends,
      qualityAssessment,
      recommendations: this.generateRecommendations(summary, qualityAssessment)
    };

    // 6. 保存到文件
    await this.saveOutput(outputDir, result);

    return result;
  }

  /**
   * 加载所有缺陷
   */
  async loadAllDefects(outputDir) {
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
   * 生成统计
   */
  generateSummary(defects, inputData) {
    const dateRange = inputData.dateRange || {};
    const filteredDefects = this.filterByDateRange(defects, dateRange);

    return {
      total: filteredDefects.length,
      byStatus: this.countByStatus(filteredDefects),
      bySeverity: this.countBySeverity(filteredDefects),
      byPriority: this.countByPriority(filteredDefects),
      bySource: this.countBySource(filteredDefects),
      byRootCause: this.countByRootCause(filteredDefects),
      avgResolutionTime: this.calculateAvgResolutionTime(filteredDefects),
      escapeRate: this.calculateEscapeRate(filteredDefects)
    };
  }

  /**
   * 按日期范围过滤
   */
  filterByDateRange(defects, dateRange) {
    if (!dateRange.start && !dateRange.end) {
      return defects;
    }

    return defects.filter(defect => {
      const created = new Date(defect.createdAt);
      if (dateRange.start && created < new Date(dateRange.start)) return false;
      if (dateRange.end && created > new Date(dateRange.end)) return false;
      return true;
    });
  }

  /**
   * 按状态统计
   */
  countByStatus(defects) {
    const counts = {};
    for (const defect of defects) {
      const status = defect.status || 'unknown';
      counts[status] = (counts[status] || 0) + 1;
    }
    return counts;
  }

  /**
   * 按严重程度统计
   */
  countBySeverity(defects) {
    const counts = {};
    for (const defect of defects) {
      const severity = defect.severity || 'unknown';
      counts[severity] = (counts[severity] || 0) + 1;
    }
    return counts;
  }

  /**
   * 按优先级统计
   */
  countByPriority(defects) {
    const counts = {};
    for (const defect of defects) {
      const priority = defect.priority || 'unknown';
      counts[priority] = (counts[priority] || 0) + 1;
    }
    return counts;
  }

  /**
   * 按来源统计
   */
  countBySource(defects) {
    const counts = {};
    for (const defect of defects) {
      const source = defect.source || 'unknown';
      counts[source] = (counts[source] || 0) + 1;
    }
    return counts;
  }

  /**
   * 按根本原因统计
   */
  countByRootCause(defects) {
    const counts = {};
    for (const defect of defects) {
      const cause = defect.rootCause?.category || 'unknown';
      counts[cause] = (counts[cause] || 0) + 1;
    }
    return counts;
  }

  /**
   * 计算平均解决时间
   */
  calculateAvgResolutionTime(defects) {
    const resolvedDefects = defects.filter(d => d.resolvedAt);

    if (resolvedDefects.length === 0) {
      return 'N/A';
    }

    const totalTime = resolvedDefects.reduce((sum, defect) => {
      const created = new Date(defect.createdAt);
      const resolved = new Date(defect.resolvedAt);
      return sum + (resolved - created);
    }, 0);

    const avgDays = totalTime / resolvedDefects.length / (1000 * 60 * 60 * 24);

    return `${avgDays.toFixed(1)} 天`;
  }

  /**
   * 计算缺陷逃逸率
   */
  calculateEscapeRate(defects) {
    const totalDefects = defects.length;
    const escapedDefects = defects.filter(d => d.source === 'customer').length;

    return totalDefects > 0 ? escapedDefects / totalDefects : 0;
  }

  /**
   * 生成趋势数据
   */
  generateTrends(defects, inputData) {
    const dateRange = inputData.dateRange || {};
    const filteredDefects = this.filterByDateRange(defects, dateRange);

    // 按日期分组
    const dailyData = {};

    for (const defect of filteredDefects) {
      const date = defect.createdAt.split('T')[0];

      if (!dailyData[date]) {
        dailyData[date] = { new: 0, resolved: 0 };
      }

      dailyData[date].new++;

      if (defect.resolvedAt) {
        const resolvedDate = defect.resolvedAt.split('T')[0];
        if (!dailyData[resolvedDate]) {
          dailyData[resolvedDate] = { new: 0, resolved: 0 };
        }
        dailyData[resolvedDate].resolved++;
      }
    }

    // 转换为数组
    const newVsResolved = Object.entries(dailyData)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      newVsResolved,
      cumulative: this.calculateCumulative(newVsResolved)
    };
  }

  /**
   * 计算累积数据
   */
  calculateCumulative(dailyData) {
    let cumulativeNew = 0;
    let cumulativeResolved = 0;

    return dailyData.map(day => {
      cumulativeNew += day.new;
      cumulativeResolved += day.resolved;
      return {
        date: day.date,
        cumulativeNew,
        cumulativeResolved,
        open: cumulativeNew - cumulativeResolved
      };
    });
  }

  /**
   * 评估质量
   */
  assessQuality(summary) {
    let score = 100;

    // 基于逃逸率扣分
    score -= summary.escapeRate * 50;

    // 基于未解决缺陷数扣分
    const openDefects = summary.byStatus.open || 0;
    if (openDefects > 10) score -= 20;
    else if (openDefects > 5) score -= 10;

    // 基于严重缺陷扣分
    const criticalDefects = summary.bySeverity.critical || 0;
    score -= criticalDefects * 10;

    score = Math.max(0, Math.min(100, score));

    let grade;
    if (score >= 90) grade = 'A';
    else if (score >= 80) grade = 'B';
    else if (score >= 70) grade = 'C';
    else if (score >= 60) grade = 'D';
    else grade = 'F';

    return {
      score,
      grade,
      factors: {
        escapeRate: summary.escapeRate,
        openDefects,
        criticalDefects
      }
    };
  }

  /**
   * 生成建议
   */
  generateRecommendations(summary, qualityAssessment) {
    const recommendations = [];

    if (summary.escapeRate > 0.1) {
      recommendations.push({
        type: 'testing',
        priority: 'high',
        message: `缺陷逃逸率 ${(summary.escapeRate * 100).toFixed(1)}% 过高，需要加强测试`,
        action: '增加测试覆盖率，完善测试用例'
      });
    }

    if ((summary.byStatus.open || 0) > 5) {
      recommendations.push({
        type: 'process',
        priority: 'medium',
        message: '未解决缺陷过多，需要集中处理',
        action: '安排专门的缺陷修复时间'
      });
    }

    if ((summary.bySeverity.critical || 0) > 0) {
      recommendations.push({
        type: 'priority',
        priority: 'high',
        message: '存在严重缺陷，需要立即处理',
        action: '优先修复严重缺陷'
      });
    }

    return recommendations;
  }

  /**
   * 保存输出
   */
  async saveOutput(outputDir, result) {
    const outputDirFull = path.join(outputDir, '00_Project_Management/10_缺陷管理追踪_Jira/dashboard');

    // 创建目录
    fs.mkdirSync(outputDirFull, { recursive: true });

    // 保存 JSON
    const jsonPath = path.join(outputDirFull, 'defect-dashboard.json');
    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf-8');

    // 保存趋势数据
    const trendsPath = path.join(outputDirFull, 'defect-trends.json');
    fs.writeFileSync(trendsPath, JSON.stringify(result.trends, null, 2), 'utf-8');

    console.log(`   📁 仪表盘已保存: ${outputDirFull}`);
  }
}

module.exports = DefectDashboard;
