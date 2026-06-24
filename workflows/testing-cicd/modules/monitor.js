/**
 * 监控模块
 *
 * 职责：
 * - 运行时监控配置
 * - 日志收集配置
 * - 告警设置
 */

const fs = require('fs');
const path = require('path');

class Monitor {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * 配置监控
   */
  async execute(config) {
    const { outputDir, inputData = {} } = config;

    // 1. 设计监控方案
    const monitoringPlan = this.designMonitoringPlan(inputData);

    // 2. 配置日志收集
    const logging = this.configureLogging(inputData);

    // 3. 配置告警
    const alerting = this.configureAlerting(inputData);

    // 4. 生成输出
    const result = {
      monitoringPlan,
      logging,
      alerting,
      dashboard: this.generateDashboardConfig(monitoringPlan),
      summary: this.generateSummary(monitoringPlan, logging, alerting)
    };

    // 5. 保存到文件
    await this.saveOutput(outputDir, result);

    return result;
  }

  /**
   * 设计监控方案
   */
  designMonitoringPlan(inputData) {
    console.log('   📊 设计监控方案...');

    return {
      metrics: [
        { name: 'cpu_usage', type: 'gauge', description: 'CPU 使用率', unit: '%' },
        { name: 'memory_usage', type: 'gauge', description: '内存使用率', unit: '%' },
        { name: 'stack_usage', type: 'gauge', description: '栈使用率', unit: '%' },
        { name: 'heap_usage', type: 'gauge', description: '堆使用率', unit: '%' },
        { name: 'task_count', type: 'gauge', description: '任务数量', unit: 'count' },
        { name: 'interrupt_count', type: 'counter', description: '中断计数', unit: 'count' },
        { name: 'error_count', type: 'counter', description: '错误计数', unit: 'count' },
        { name: 'uptime', type: 'counter', description: '运行时间', unit: 'seconds' }
      ],
      intervals: {
        metrics: '5s',
        healthCheck: '30s',
        logSync: '60s'
      },
      retention: {
        metrics: '7 days',
        logs: '30 days',
        alerts: '90 days'
      }
    };
  }

  /**
   * 配置日志收集
   */
  configureLogging(inputData) {
    console.log('   📝 配置日志收集...');

    return {
      levels: ['ERROR', 'WARN', 'INFO', 'DEBUG'],
      defaultLevel: 'INFO',
      outputs: [
        { type: 'serial', enabled: true, baudRate: 115200 },
        { type: 'file', enabled: true, path: '/sd/logs/', maxSize: '10 MB' },
        { type: 'network', enabled: false, host: '192.168.1.100', port: 514 }
      ],
      format: {
        timestamp: true,
        level: true,
        module: true,
        message: true
      },
      filters: [
        { module: 'auth', level: 'DEBUG' },
        { module: 'network', level: 'INFO' },
        { module: 'hal', level: 'WARN' }
      ]
    };
  }

  /**
   * 配置告警
   */
  configureAlerting(inputData) {
    console.log('   🚨 配置告警规则...');

    return {
      rules: [
        {
          name: 'High CPU Usage',
          condition: 'cpu_usage > 80',
          severity: 'warning',
          action: 'log'
        },
        {
          name: 'Critical Memory Usage',
          condition: 'memory_usage > 90',
          severity: 'critical',
          action: 'log+notify'
        },
        {
          name: 'Stack Overflow Risk',
          condition: 'stack_usage > 85',
          severity: 'critical',
          action: 'log+notify+restart'
        },
        {
          name: 'Watchdog Reset',
          condition: 'watchdog_triggered == true',
          severity: 'critical',
          action: 'log+notify+reboot'
        }
      ],
      notifications: [
        { type: 'serial', enabled: true },
        { type: 'email', enabled: false, address: 'admin@example.com' },
        { type: 'sms', enabled: false, number: '+1234567890' }
      ]
    };
  }

  /**
   * 生成仪表板配置
   */
  generateDashboardConfig(monitoringPlan) {
    return {
      panels: [
        { title: 'CPU Usage', type: 'gauge', metric: 'cpu_usage', thresholds: [50, 80] },
        { title: 'Memory Usage', type: 'gauge', metric: 'memory_usage', thresholds: [60, 90] },
        { title: 'Task Status', type: 'table', metrics: ['task_count', 'task_state'] },
        { title: 'Error Log', type: 'log', level: 'ERROR' },
        { title: 'Uptime', type: 'stat', metric: 'uptime', format: 'duration' }
      ],
      refreshInterval: '5s',
      timeRange: '1h'
    };
  }

  /**
   * 生成摘要
   */
  generateSummary(monitoringPlan, logging, alerting) {
    return {
      totalMetrics: monitoringPlan.metrics.length,
      logOutputs: logging.outputs.filter(o => o.enabled).length,
      alertRules: alerting.rules.length,
      monitoringEnabled: true
    };
  }

  /**
   * 保存输出
   */
  async saveOutput(outputDir, result) {
    const outputDirFull = path.join(outputDir, '00_Project_Management/08_持续集成与测试_DevOps/monitor');

    fs.mkdirSync(outputDirFull, { recursive: true });

    const jsonPath = path.join(outputDirFull, 'report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf-8');

    const mdPath = path.join(outputDirFull, 'report.md');
    const mdContent = this.generateMarkdown(result);
    fs.writeFileSync(mdPath, mdContent, 'utf-8');

    console.log(`   📁 监控配置已保存: ${outputDirFull}`);
  }

  /**
   * 生成 Markdown 文档
   */
  generateMarkdown(result) {
    const lines = [
      '# 监控配置报告',
      '',
      `**生成时间**: ${new Date().toISOString()}`,
      '',
      '---',
      '',
      '## 监控摘要',
      '',
      `- 监控指标: ${result.summary.totalMetrics}`,
      `- 日志输出: ${result.summary.logOutputs}`,
      `- 告警规则: ${result.summary.alertRules}`,
      ''
    ];

    lines.push('## 监控指标', '', '| 指标名称 | 类型 | 描述 | 单位 |', '|----------|------|------|------|');

    for (const metric of result.monitoringPlan.metrics) {
      lines.push(`| ${metric.name} | ${metric.type} | ${metric.description} | ${metric.unit} |`);
    }
    lines.push('');

    lines.push('## 日志配置', '', `**默认级别**: ${result.logging.defaultLevel}`, '', `### 输出方式`, '', `| 类型 | 启用 | 配置 |`, `|------|------|------|`);

    for (const output of result.logging.outputs) {
      const config = output.baudRate ? `波特率: ${output.baudRate}` :
                     output.path ? `路径: ${output.path}` :
                     `${output.host}:${output.port}`;
      lines.push(`| ${output.type} | ${output.enabled ? '✅' : '❌'} | ${config} |`);
    }
    lines.push('');

    lines.push('## 告警规则', '', `| 规则名称 | 条件 | 严重级别 | 操作 |`, `|----------|------|----------|------|`);

    for (const rule of result.alerting.rules) {
      lines.push(`| ${rule.name} | ${rule.condition} | ${rule.severity} | ${rule.action} |`);
    }
    lines.push('');

    return lines.join('\n');
  }
}

module.exports = Monitor;
