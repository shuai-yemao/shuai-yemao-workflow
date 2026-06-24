/**
 * 思维导图生成模块
 */

const fs = require('fs');
const path = require('path');
const MermaidGenerator = require('../utils/mermaid-generator');

class MindmapGenerator {
  constructor(options = {}) {
    this.options = options;
    this.generator = new MermaidGenerator();
  }

  async execute(config) {
    const { outputDir, inputData, projectName } = config;
    console.log('  [MindmapGenerator] 开始生成思维导图...');

    // 生成 Mermaid 语法
    const mermaid = this.generator.generateMindMap(inputData);

    // 生成 Markdown 包装
    const markdown = this.wrapInMarkdown(mermaid, projectName, inputData.root);

    // 保存输出
    const outputFileName = `${projectName || 'mindmap'}-${Date.now()}`;
    this.saveOutput(outputDir, mermaid, markdown, outputFileName);

    console.log('  [MindmapGenerator] 完成');
    return { success: true, mermaid, markdown, fileName: outputFileName };
  }

  wrapInMarkdown(mermaid, projectName, title) {
    let md = `# ${title || '思维导图'}\n\n`;
    if (projectName) {
      md += `**项目**: ${projectName}\n`;
    }
    md += `**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
    md += `## 思维导图\n\n`;
    md += '```mermaid\n';
    md += mermaid;
    md += '\n```\n';
    return md;
  }

  saveOutput(outputDir, mermaid, markdown, fileName) {
    const dirPath = path.join(outputDir, '00_Project_Management', '00_需求导入_QFD');
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // 保存 Mermaid 文件
    fs.writeFileSync(path.join(dirPath, `${fileName}.mmd`), mermaid, 'utf8');

    // 保存 Markdown 文件
    fs.writeFileSync(path.join(dirPath, `${fileName}.md`), markdown, 'utf8');
  }
}

module.exports = MindmapGenerator;
