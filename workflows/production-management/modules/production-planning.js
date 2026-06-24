/**
 * 生产排产模块
 *
 * 职责：
 * - 根据订单和产能安排生产计划
 * - 生成甘特图数据
 * - 估算生产成本
 */

const fs = require('fs');
const path = require('path');

class ProductionPlanning {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * 执行生产排产
   */
  async execute(config) {
    const { outputDir, inputData = {} } = config;

    // 1. 解析订单信息
    const order = this.parseOrder(inputData);

    // 2. 设计生产阶段
    const stages = this.designProductionStages(order, inputData);

    // 3. 计算时间表
    const schedule = this.calculateSchedule(stages, inputData.startDate);

    // 4. 估算成本
    const costEstimate = this.estimateCost(order, inputData.bom);

    // 5. 生成甘特图数据
    const ganttChart = this.generateGanttChart(stages, schedule);

    // 6. 生成输出
    const result = {
      planId: `PLAN-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
      order,
      stages,
      schedule,
      costEstimate,
      ganttChart,
      summary: this.generateSummary(order, schedule, costEstimate)
    };

    // 7. 保存到文件
    await this.saveOutput(outputDir, result);

    return result;
  }

  /**
   * 解析订单信息
   */
  parseOrder(inputData) {
    return {
      orderId: inputData.orderId || `ORD-${Date.now()}`,
      product: inputData.product || '未指定产品',
      quantity: inputData.quantity || 1,
      priority: inputData.priority || 'normal',
      customer: inputData.customer || '未指定客户'
    };
  }

  /**
   * 设计生产阶段
   */
  designProductionStages(order, inputData) {
    // 默认的生产阶段模板
    const defaultStages = [
      {
        stage: '物料准备',
        description: '采购和准备所需物料',
        duration: '1天',
        dependencies: []
      },
      {
        stage: 'PCB 组装',
        description: 'SMT 贴片和 DIP 插件',
        duration: '2天',
        dependencies: ['物料准备']
      },
      {
        stage: '固件烧录',
        description: '烧录固件和配置',
        duration: '0.5天',
        dependencies: ['PCB 组装']
      },
      {
        stage: '功能测试',
        description: '功能测试和校准',
        duration: '1天',
        dependencies: ['固件烧录']
      },
      {
        stage: '包装出货',
        description: '包装和准备出货',
        duration: '0.5天',
        dependencies: ['功能测试']
      }
    ];

    // 根据订单数量调整时间
    const quantityMultiplier = Math.ceil(order.quantity / 50); // 每 50 台为一批

    return defaultStages.map(s => ({
      ...s,
      adjustedDuration: this.adjustDuration(s.duration, quantityMultiplier),
      status: 'pending'
    }));
  }

  /**
   * 调整持续时间
   */
  adjustDuration(baseDuration, multiplier) {
    const value = parseFloat(baseDuration);
    const unit = baseDuration.replace(/[0-9.]/g, '');

    return `${(value * multiplier).toFixed(1)}${unit}`;
  }

  /**
   * 计算时间表
   */
  calculateSchedule(stages, startDate) {
    const start = new Date(startDate || new Date());
    const schedule = [];
    let currentDate = new Date(start);

    for (const stage of stages) {
      const durationDays = parseFloat(stage.adjustedDuration) || 1;

      const stageStart = new Date(currentDate);
      const stageEnd = new Date(currentDate);
      stageEnd.setDate(stageEnd.getDate() + durationDays);

      schedule.push({
        stage: stage.stage,
        startDate: stageStart.toISOString().split('T')[0],
        endDate: stageEnd.toISOString().split('T')[0],
        duration: stage.adjustedDuration
      });

      currentDate = new Date(stageEnd);
    }

    const totalDays = Math.ceil((currentDate - start) / (1000 * 60 * 60 * 24));

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: currentDate.toISOString().split('T')[0],
      totalDays,
      stages: schedule
    };
  }

  /**
   * 估算成本
   */
  estimateCost(order, bom) {
    const materialCost = bom?.totalCost || 0;
    const laborCost = order.quantity * 5; // 假设每台人工成本 5 元
    const overheadCost = materialCost * 0.1; // 管理费用 10%

    return {
      materialCost,
      laborCost,
      overheadCost,
      totalCost: materialCost + laborCost + overheadCost,
      costPerUnit: (materialCost + laborCost + overheadCost) / order.quantity,
      currency: this.options.currency || 'CNY'
    };
  }

  /**
   * 生成甘特图数据
   */
  generateGanttChart(stages, schedule) {
    const lines = ['gantt', '    title 生产计划甘特图', '    dateFormat  YYYY-MM-DD', '    section 生产阶段'];

    for (const item of schedule.stages) {
      lines.push(`    ${item.stage}    :${item.startDate}, ${item.duration}`);
    }

    return lines.join('\n');
  }

  /**
   * 生成摘要
   */
  generateSummary(order, schedule, costEstimate) {
    return {
      orderId: order.orderId,
      product: order.product,
      quantity: order.quantity,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      totalDays: schedule.totalDays,
      totalCost: costEstimate.totalCost,
      costPerUnit: costEstimate.costPerUnit,
      currency: costEstimate.currency
    };
  }

  /**
   * 保存输出
   */
  async saveOutput(outputDir, result) {
    const outputDirFull = path.join(outputDir, '00_Project_Management/09_产品生产管理_Six_Sigma/planning');

    // 创建目录
    fs.mkdirSync(outputDirFull, { recursive: true });

    // 保存 JSON
    const jsonPath = path.join(outputDirFull, 'production-plan.json');
    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf-8');

    // 保存 Markdown
    const mdPath = path.join(outputDirFull, 'production-plan.md');
    const mdContent = this.generateMarkdown(result);
    fs.writeFileSync(mdPath, mdContent, 'utf-8');

    // 保存甘特图
    const ganttPath = path.join(outputDirFull, 'gantt-data.mmd');
    fs.writeFileSync(ganttPath, result.ganttChart, 'utf-8');

    console.log(`   📁 生产计划已保存: ${outputDirFull}`);
  }

  /**
   * 生成 Markdown 文档
   */
  generateMarkdown(result) {
    const lines = [
      `# 生产计划 - ${result.planId}`,
      '',
      `**订单号**: ${result.order.orderId}`,
      `**产品**: ${result.order.product}`,
      `**数量**: ${result.order.quantity}`,
      `**生成时间**: ${new Date().toISOString()}`,
      '',
      '---',
      '',
      '## 时间安排',
      '',
      `- **开始日期**: ${result.schedule.startDate}`,
      `- **结束日期**: ${result.schedule.endDate}`,
      `- **总工期**: ${result.schedule.totalDays} 天`,
      ''
    ];

    // 生产阶段
    lines.push('## 生产阶段', '');
    lines.push('| 阶段 | 开始日期 | 结束日期 | 持续时间 |', '|------|----------|----------|----------|');

    for (const item of result.schedule.stages) {
      lines.push(`| ${item.stage} | ${item.startDate} | ${item.endDate} | ${item.duration} |`);
    }
    lines.push('');

    // 成本估算
    lines.push('## 成本估算', '');
    lines.push(`- **物料成本**: ${result.costEstimate.currency} ${result.costEstimate.materialCost.toFixed(2)}`);
    lines.push(`- **人工成本**: ${result.costEstimate.currency} ${result.costEstimate.laborCost.toFixed(2)}`);
    lines.push(`- **管理费用**: ${result.costEstimate.currency} ${result.costEstimate.overheadCost.toFixed(2)}`);
    lines.push(`- **总成本**: ${result.costEstimate.currency} ${result.costEstimate.totalCost.toFixed(2)}`);
    lines.push(`- **单台成本**: ${result.costEstimate.currency} ${result.costEstimate.costPerUnit.toFixed(2)}`);
    lines.push('');

    // 甘特图
    lines.push('## 甘特图', '');
    lines.push('```mermaid');
    lines.push(result.ganttChart);
    lines.push('```');
    lines.push('');

    return lines.join('\n');
  }
}

module.exports = ProductionPlanning;
