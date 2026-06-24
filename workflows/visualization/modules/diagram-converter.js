/**
 * 图表转换模块
 * 用于将 Mermaid 转换为其他格式或进行后处理
 */

const fs = require('fs');
const path = require('path');

class DiagramConverter {
  constructor(options = {}) {
    this.options = options;
  }

  async execute(config) {
    const { outputDir, inputData, format } = config;
    console.log('  [DiagramConverter] 开始转换...');

    let result;

    switch (format) {
      case 'html':
        result = this.convertToHtml(inputData);
        break;
      case 'svg':
        result = this.generateSvgPlaceholder(inputData);
        break;
      case 'png':
        result = this.generatePngPlaceholder(inputData);
        break;
      default:
        result = { content: inputData.mermaid, format: 'mermaid' };
    }

    // 保存输出
    this.saveOutput(outputDir, result, inputData.fileName);

    console.log('  [DiagramConverter] 完成');
    return { success: true, ...result };
  }

  convertToHtml(inputData) {
    const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${inputData.title || 'Diagram'}</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <script>mermaid.initialize({ startOnLoad: true });</script>
</head>
<body>
    <h1>${inputData.title || 'Diagram'}</h1>
    <div class="mermaid">
${inputData.mermaid}
    </div>
</body>
</html>`;

    return { content: html, format: 'html', extension: '.html' };
  }

  generateSvgPlaceholder(inputData) {
    // 注意：实际的 SVG 生成需要 mermaid-cli 或其他工具
    const placeholder = `<!--
  SVG 输出需要 mermaid-cli 工具

  安装：npm install -g @mermaid-js/mermaid-cli

  生成命令：
  mmdc -i input.mmd -o output.svg -t dark -b transparent

  输入内容：
${inputData.mermaid}
-->`;

    return { content: placeholder, format: 'svg-placeholder', extension: '.svg.mmd' };
  }

  generatePngPlaceholder(inputData) {
    const placeholder = `<!--
  PNG 输出需要 mermaid-cli 工具

  安装：npm install -g @mermaid-js/mermaid-cli

  生成命令：
  mmdc -i input.mmd -o output.png -t dark -b white -w 1200 -H 800

  输入内容：
${inputData.mermaid}
-->`;

    return { content: placeholder, format: 'png-placeholder', extension: '.png.mmd' };
  }

  saveOutput(outputDir, result, fileName) {
    const dirPath = path.join(outputDir, '00_Project_Management', '00_需求导入_QFD');
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const filePath = path.join(dirPath, `${fileName}${result.extension}`);
    fs.writeFileSync(filePath, result.content, 'utf8');
  }
}

module.exports = DiagramConverter;
