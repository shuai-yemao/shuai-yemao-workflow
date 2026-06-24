/**
 * 设计规划模块
 * 用于硬件架构和组件选型
 */

const fs = require('fs');
const path = require('path');
const HardwareManager = require('../utils/hardware-manager');

class DesignPlanning {
  constructor(options = {}) {
    this.options = options;
    this.manager = new HardwareManager();
  }

  async execute(config) {
    const { outputDir, inputData } = config;
    console.log('  [DesignPlanning] 开始设计规划...');

    this.validateInput(inputData);
    const plan = this.createPlan(inputData);
    const markdown = this.generateMarkdown(plan, inputData.product);

    const output = { product: inputData.product, plan, summary: this.generateSummary(plan) };
    this.saveOutput(outputDir, output, markdown);

    console.log(`  [DesignPlanning] 完成，规划了 ${plan.architecture.components.length} 个组件`);
    return { success: true, plan, summary: output.summary, markdown };
  }

  validateInput(inputData) {
    if (!inputData.product) throw new Error('Product information is required');
    if (!inputData.requirements) throw new Error('Design requirements are required');
  }

  createPlan(inputData) {
    const architecture = this.defineArchitecture(inputData);
    const components = this.selectComponents(inputData);
    const interfaces = this.defineInterfaces(components);
    const constraints = this.defineConstraints(inputData);

    return { architecture: { ...architecture, components }, interfaces, constraints, powerBudget: this.calculatePowerBudget(components) };
  }

  defineArchitecture(inputData) {
    return {
      name: inputData.product.name + ' 硬件架构',
      description: inputData.architectureDescription || '待补充',
      blocks: inputData.architectureBlocks || ['MCU', '传感器', '电源', '通信', '存储']
    };
  }

  selectComponents(inputData) {
    return (inputData.components || []).map((comp, index) => ({
      id: comp.id || this.manager.generateId('COMP'),
      name: comp.name,
      type: comp.type || 'other',
      partNumber: comp.partNumber || '',
      supplier: comp.supplier || '',
      status: comp.status || 'selected',
      specifications: comp.specifications || {},
      cost: comp.cost || 0,
      selected: true
    }));
  }

  defineInterfaces(components) {
    const interfaces = [];
    for (let i = 0; i < components.length; i++) {
      for (let j = i + 1; j < components.length; j++) {
        if (this.needsInterface(components[i], components[j])) {
          interfaces.push({ id: this.manager.generateId('IF'), name: `${components[i].name} ↔ ${components[j].name}`, type: this.determineInterfaceType(components[i], components[j]), components: [components[i].id, components[j].id] });
        }
      }
    }
    return interfaces;
  }

  needsInterface(comp1, comp2) { return comp1.type === 'mcu' && ['sensor', 'communication', 'memory'].includes(comp2.type); }
  determineInterfaceType(comp1, comp2) {
    if (comp2.type === 'sensor') return 'I2C/SPI';
    if (comp2.type === 'communication') return 'UART/SPI';
    if (comp2.type === 'memory') return 'SPI/QSPI';
    return 'GPIO';
  }

  defineConstraints(inputData) {
    return { voltage: inputData.voltage || '3.3V', temperature: inputData.temperatureRange || '-40°C to +85°C', size: inputData.sizeConstraints || '待定', power: inputData.powerBudget || '待定' };
  }

  calculatePowerBudget(components) {
    const totalPower = components.reduce((sum, comp) => sum + (comp.powerConsumption || 0), 0);
    return { totalPower, components: components.map(c => ({ name: c.name, power: c.powerConsumption || 0 })) };
  }

  generateSummary(plan) {
    return { totalComponents: plan.architecture.components.length, totalInterfaces: plan.interfaces.length, totalCost: plan.architecture.components.reduce((sum, c) => sum + (c.cost || 0), 0) };
  }

  generateMarkdown(plan, product) {
    const summary = this.generateSummary(plan);
    let md = `# 硬件设计规划报告\n\n**产品**: ${product.name} (${product.id})\n**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
    md += `## 规划概览\n\n| 指标 | 值 |\n|------|----|\n| 组件数量 | ${summary.totalComponents} |\n| 接口数量 | ${summary.totalInterfaces} |\n| 预估成本 | ¥${summary.totalCost.toFixed(2)} |\n\n`;
    md += `## 组件清单\n\n| ID | 名称 | 类型 | 型号 | 供应商 | 状态 |\n|-----|------|------|------|--------|------|\n`;
    for (const comp of plan.architecture.components) { md += `| ${comp.id} | ${comp.name} | ${comp.type} | ${comp.partNumber || '-'} | ${comp.supplier || '-'} | ${comp.status} |\n`; }
    md += `\n## 接口定义\n\n| ID | 名称 | 类型 |\n|-----|------|------|\n`;
    for (const iface of plan.interfaces) { md += `| ${iface.id} | ${iface.name} | ${iface.type} |\n`; }
    md += `\n## 设计约束\n\n| 约束 | 值 |\n|------|----|\n`;
    md += `| 工作电压 | ${plan.constraints.voltage} |\n| 工作温度 | ${plan.constraints.temperature} |\n| 尺寸限制 | ${plan.constraints.size} |\n| 功耗预算 | ${plan.constraints.power} |\n`;
    return md;
  }

  saveOutput(outputDir, output, markdown) {
    const dirPath = path.join(outputDir, '00_Project_Management/02_Hardware', 'design-planning');
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(path.join(dirPath, 'design-plan.json'), JSON.stringify(output, null, 2), 'utf8');
    fs.writeFileSync(path.join(dirPath, 'design-plan.md'), markdown, 'utf8');
  }
}

module.exports = DesignPlanning;
