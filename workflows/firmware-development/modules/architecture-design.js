/**
 * 架构设计模块
 */

const fs = require('fs');
const path = require('path');
const FirmwareManager = require('../utils/firmware-manager');

class ArchitectureDesign {
  constructor(options = {}) { this.options = options; this.manager = new FirmwareManager(); }

  async execute(config) {
    const { outputDir, inputData } = config;
    console.log('  [ArchitectureDesign] 开始架构设计...');

    this.validateInput(inputData);
    const architecture = this.designArchitecture(inputData);
    const markdown = this.generateMarkdown(architecture, inputData.product);

    const output = { product: inputData.product, architecture, summary: this.generateSummary(architecture) };
    this.saveOutput(outputDir, output, markdown);

    console.log(`  [ArchitectureDesign] 完成，设计了 ${architecture.layers.length} 个层级`);
    return { success: true, architecture, summary: output.summary, markdown };
  }

  validateInput(inputData) {
    if (!inputData.product) throw new Error('Product information is required');
    if (!inputData.requirements) throw new Error('Requirements are required');
  }

  designArchitecture(inputData) {
    const layers = this.defineLayers(inputData);
    const modules = this.defineModules(inputData);
    const interfaces = this.defineInterfaces(modules);
    const constraints = this.defineConstraints(inputData);

    return { layers, modules, interfaces, constraints, bootSequence: this.defineBootSequence(modules) };
  }

  defineLayers(inputData) {
    return inputData.layers || [
      { name: 'Hardware Abstraction Layer', description: '硬件抽象层', type: 'hal' },
      { name: 'Driver Layer', description: '驱动层', type: 'driver' },
      { name: 'Middleware Layer', description: '中间件层', type: 'middleware' },
      { name: 'Application Layer', description: '应用层', type: 'application' }
    ];
  }

  defineModules(inputData) {
    return (inputData.modules || []).map((mod, index) => ({
      id: mod.id || this.manager.generateId('MOD'),
      name: mod.name,
      type: mod.type || 'application',
      description: mod.description || '',
      layer: mod.layer || 'application',
      dependencies: mod.dependencies || [],
      status: 'planned',
      version: '1.0.0'
    }));
  }

  defineInterfaces(modules) {
    const interfaces = [];
    for (const mod of modules) {
      for (const dep of mod.dependencies) {
        const target = modules.find(m => m.name === dep);
        if (target) {
          interfaces.push({ id: this.manager.generateId('IF'), source: mod.id, target: target.id, type: 'api', description: `${mod.name} → ${target.name}` });
        }
      }
    }
    return interfaces;
  }

  defineConstraints(inputData) {
    return { mcu: inputData.mcu || '待定', clockSpeed: inputData.clockSpeed || '待定', ram: inputData.ram || '待定', flash: inputData.flash || '待定', rtos: inputData.rtos || 'bare-metal' };
  }

  defineBootSequence(modules) {
    const bootloader = modules.find(m => m.type === 'bootloader');
    const drivers = modules.filter(m => m.type === 'driver');
    return { steps: [bootloader ? `Bootloader (${bootloader.name})` : 'Hardware Init', ...drivers.map(d => `Init ${d.name}`), 'Application Start'] };
  }

  generateSummary(architecture) {
    return { totalLayers: architecture.layers.length, totalModules: architecture.modules.length, totalInterfaces: architecture.interfaces.length };
  }

  generateMarkdown(architecture, product) {
    const summary = this.generateSummary(architecture);
    let md = `# 固件架构设计报告\n\n**产品**: ${product.name} (${product.id})\n**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
    md += `## 架构概览\n\n| 指标 | 值 |\n|------|----|\n| 层级数 | ${summary.totalLayers} |\n| 模块数 | ${summary.totalModules} |\n| 接口数 | ${summary.totalInterfaces} |\n\n`;
    md += `## 架构层级\n\n| 层级 | 名称 | 描述 |\n|------|------|------|\n`;
    for (const layer of architecture.layers) { md += `| ${layer.type} | ${layer.name} | ${layer.description} |\n`; }
    md += `\n## 固件模块\n\n| ID | 名称 | 类型 | 层级 | 状态 |\n|-----|------|------|------|------|\n`;
    for (const mod of architecture.modules) { md += `| ${mod.id} | ${mod.name} | ${mod.type} | ${mod.layer} | ${mod.status} |\n`; }
    md += `\n## 启动序列\n\n`;
    for (let i = 0; i < architecture.bootSequence.steps.length; i++) { md += `${i + 1}. ${architecture.bootSequence.steps[i]}\n`; }
    md += `\n## 硬件约束\n\n| 参数 | 值 |\n|------|----|\n`;
    md += `| MCU | ${architecture.constraints.mcu} |\n| 时钟频率 | ${architecture.constraints.clockSpeed} |\n| RAM | ${architecture.constraints.ram} |\n| Flash | ${architecture.constraints.flash} |\n| RTOS | ${architecture.constraints.rtos} |\n`;
    return md;
  }

  saveOutput(outputDir, output, markdown) {
    const dirPath = path.join(outputDir, '00_Project_Management/03_Firmware', 'architecture-design');
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(path.join(dirPath, 'architecture.json'), JSON.stringify(output, null, 2), 'utf8');
    fs.writeFileSync(path.join(dirPath, 'architecture.md'), markdown, 'utf8');
  }
}

module.exports = ArchitectureDesign;
