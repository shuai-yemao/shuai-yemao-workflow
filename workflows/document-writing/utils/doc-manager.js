/**
 * 文档管理工具
 * 负责文档的保存、读取、版本管理
 */

const fs = require('fs').promises;
const path = require('path');

class DocManager {
  constructor(outputDir) {
    this.outputDir = outputDir || process.cwd();
  }

  /**
   * 保存文档
   */
  async saveDocument({ content, format, outputDir, fileName, metadata }) {
    const fullPath = path.join(this.outputDir, outputDir);
    await fs.mkdir(fullPath, { recursive: true });

    const ext = format === 'markdown' ? '.md' : `.${format}`;
    const filePath = path.join(fullPath, `${fileName}${ext}`);

    await fs.writeFile(filePath, content, 'utf-8');

    // 保存元数据
    if (metadata) {
      const metaPath = path.join(fullPath, `${fileName}.meta.json`);
      await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');
    }

    return { outputPath: filePath, format };
  }

  /**
   * 读取文档
   */
  async readDocument(filePath) {
    return await fs.readFile(filePath, 'utf-8');
  }

  /**
   * 列出目录下的文档
   */
  async listDocuments(dirPath) {
    const fullPath = path.join(this.outputDir, dirPath);
    const files = await fs.readdir(fullPath);
    return files.filter(f => f.endsWith('.md') || f.endsWith('.docx') || f.endsWith('.pdf'));
  }
}

module.exports = DocManager;
