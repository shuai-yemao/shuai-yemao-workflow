/**
 * 流程图生成模块
 */

const fs = require('fs');
const path = require('path');
const MermaidGenerator = require('../utils/mermaid-generator');

class FlowchartGenerator {
  constructor(options = {}) {
    this.options = options;
    this.generator = new MermaidGenerator();
  }

  async execute(config) {
    const { outputDir, inputData, projectName, diagramType } = config;
    console.log('  [FlowchartGenerator] 开始生成流程图...');

    let mermaid;

    // 根据类型生成不同的图表
    switch (diagramType) {
      case 'architecture':
        mermaid = this.generator.generateArchitecture(inputData);
        break;
      case 'sequence':
        mermaid = this.generator.generateSequenceDiagram(inputData);
        break;
      case 'state':
        mermaid = this.generator.generateStateDiagram(inputData);
        break;
      case 'er':
        mermaid = this.generator.generateERDiagram(inputData);
        break;
      case 'class':
        mermaid = this.generator.generateClassDiagram(inputData);
        break;
      default:
        mermaid = this.generator.generateFlowchart(inputData);
    }

    // 生成 Markdown
    const title = this.getTitle(diagramType, inputData);
    const markdown = this.wrapInMarkdown(mermaid, projectName, title, diagramType);

    // 保存输出
    const outputFileName = `${projectName || diagramType || 'flowchart'}-${Date.now()}`;
    this.saveOutput(outputDir, mermaid, markdown, outputFileName, diagramType);

    console.log('  [FlowchartGenerator] 完成');
    return { success: true, mermaid, markdown, fileName: outputFileName };
  }

  getTitle(diagramType, inputData) {
    const titles = {
      'flowchart': inputData.title || '流程图',
      'architecture': inputData.title || '架构图',
      'sequence': inputData.title || '时序图',
      'state': inputData.title || '状态图',
      'er': inputData.title || 'ER 图',
      'class': inputData.title || '类图'
    };
    return titles[diagramType] || '流程图';
  }

  wrapInMarkdown(mermaid, projectName, title, diagramType) {
    let md = `# ${title}\n\n`;
    if (projectName) {
      md += `**项目**: ${projectName}\n`;
    }
    md += `**类型**: ${diagramType || 'flowchart'}\n`;
    md += `**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
    md += `## 图表\n\n`;
    md += '```mermaid\n';
    md += mermaid;
    md += '\n```\n';
    return md;
  }

  saveOutput(outputDir, mermaid, markdown, fileName, diagramType) {
    const dirMap = {
      'flowchart': '03_功能图谱_Function_Map',
      'architecture': '02_Hardware',
      'sequence': '08_持续集成与测试_DevOps',
      'state': '03_Firmware',
      'er': '04_Software',
      'class': '04_Software'
    };

    const dirPath = path.join(outputDir, '00_Project_Management', dirMap[diagramType] || '00_需求导入_QFD');
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    fs.writeFileSync(path.join(dirPath, `${fileName}.mmd`), mermaid, 'utf8');
    fs.writeFileSync(path.join(dirPath, `${fileName}.md`), markdown, 'utf8');
  }
}

module.exports = FlowchartGenerator;
