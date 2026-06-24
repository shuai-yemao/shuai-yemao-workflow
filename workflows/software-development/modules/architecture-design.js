/**
 * 软件架构设计模块
 */

const fs = require('fs');
const path = require('path');
const SoftwareManager = require('../utils/software-manager');

class ArchitectureDesign {
  constructor(options = {}) { this.options = options; this.manager = new SoftwareManager(); }

  async execute(config) {
    const { outputDir, inputData } = config;
    console.log('  [ArchitectureDesign] 开始软件架构设计...');

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
  }

  designArchitecture(inputData) {
    return {
      layers: inputData.layers || [
        { name: 'Presentation', description: '表现层', type: 'ui' },
        { name: 'Business Logic', description: '业务逻辑层', type: 'business' },
        { name: 'Data Access', description: '数据访问层', type: 'data' },
        { name: 'Infrastructure', description: '基础设施层', type: 'infra' }
      ],
      modules: (inputData.modules || []).map(mod => ({
        id: mod.id || this.manager.generateId('MOD'),
        name: mod.name,
        type: mod.type || 'other',
        description: mod.description || '',
        layer: mod.layer || 'business',
        dependencies: mod.dependencies || [],
        status: 'planned',
        language: mod.language || 'unknown',
        framework: mod.framework || ''
      })),
      patterns: inputData.patterns || ['MVC', 'Repository', 'Service'],
      constraints: inputData.constraints || {}
    };
  }

  generateSummary(architecture) {
    return { totalLayers: architecture.layers.length, totalModules: architecture.modules.length, totalPatterns: architecture.patterns.length };
  }

  generateMarkdown(architecture, product) {
    const summary = this.generateSummary(architecture);
    let md = `# 软件架构设计报告\n\n**产品**: ${product.name} (${product.id})\n**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
    md += `## 概览\n\n| 指标 | 值 |\n|------|----|\n| 层级数 | ${summary.totalLayers} |\n| 模块数 | ${summary.totalModules} |\n| 设计模式 | ${summary.totalPatterns} |\n\n`;
    md += `## 架构层级\n\n| 层级 | 名称 | 描述 |\n|------|------|------|\n`;
    for (const layer of architecture.layers) { md += `| ${layer.type} | ${layer.name} | ${layer.description} |\n`; }
    md += `\n## 软件模块\n\n| ID | 名称 | 类型 | 层级 | 语言 | 状态 |\n|-----|------|------|------|------|------|\n`;
    for (const mod of architecture.modules) { md += `| ${mod.id} | ${mod.name} | ${mod.type} | ${mod.layer} | ${mod.language} | ${mod.status} |\n`; }
    md += `\n## 设计模式\n\n`;
    for (const pattern of architecture.patterns) { md += `- ${pattern}\n`; }
    return md;
  }

  saveOutput(outputDir, output, markdown) {
    const dirPath = path.join(outputDir, '00_Project_Management/04_Software', 'architecture-design');
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(path.join(dirPath, 'architecture.json'), JSON.stringify(output, null, 2), 'utf8');
    fs.writeFileSync(path.join(dirPath, 'architecture.md'), markdown, 'utf8');
  }
}

module.exports = ArchitectureDesign;
