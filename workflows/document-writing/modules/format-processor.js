/**
 * 格式转换处理器模块
 * 支持 Markdown ↔ DOCX ↔ PDF ↔ XLSX 格式转换
 */

const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class FormatProcessor {
  constructor() {
    this.name = 'format-processor';

    // 支持的转换路径
    this.conversions = {
      'markdown-docx': { tool: 'pandoc', available: null },
      'markdown-pdf': { tool: 'pandoc', available: null },
      'markdown-html': { tool: 'pandoc', available: null },
      'xlsx-markdown': { tool: 'python', available: null },
      'docx-markdown': { tool: 'pandoc', available: null }
    };

    // 工具路径缓存
    this.toolPaths = {
      pandoc: null,
      python: null
    };
  }

  /**
   * 执行格式转换
   * @param {Object} input - 输入数据
   * @returns {Object} 转换结果
   */
  async execute(input) {
    console.log(`[FormatProcessor] 开始格式转换`);

    const { content, sourceFormat = 'markdown', outputFormat, outputPath, fileName } = input;

    // 检查工具可用性
    await this.checkTools();

    // 执行转换
    let result;

    if (sourceFormat === 'markdown' && outputFormat === 'docx') {
      result = await this.markdownToDocx(content, outputPath, fileName);
    } else if (sourceFormat === 'markdown' && outputFormat === 'pdf') {
      result = await this.markdownToPdf(content, outputPath, fileName);
    } else if (sourceFormat === 'markdown' && outputFormat === 'html') {
      result = await this.markdownToHtml(content, outputPath, fileName);
    } else if (sourceFormat === 'xlsx' && outputFormat === 'markdown') {
      result = await this.xlsxToMarkdown(content, outputPath, fileName);
    } else if (sourceFormat === 'docx' && outputFormat === 'markdown') {
      result = await this.docxToMarkdown(content, outputPath, fileName);
    } else {
      throw new Error(`不支持的转换: ${sourceFormat} → ${outputFormat}`);
    }

    console.log(`[FormatProcessor] 格式转换完成`);

    return result;
  }

  /**
   * 检查工具可用性
   */
  async checkTools() {
    // 检查 Pandoc
    if (this.conversions['markdown-docx'].available === null) {
      try {
        await this.execCommand('pandoc --version');
        this.conversions['markdown-docx'].available = true;
        this.conversions['markdown-pdf'].available = true;
        this.conversions['markdown-html'].available = true;
        this.conversions['docx-markdown'].available = true;
        console.log(`[FormatProcessor] Pandoc 可用`);
      } catch (error) {
        this.conversions['markdown-docx'].available = false;
        this.conversions['markdown-pdf'].available = false;
        this.conversions['markdown-html'].available = false;
        this.conversions['docx-markdown'].available = false;
        console.warn(`[FormatProcessor] Pandoc 不可用，部分转换功能受限`);
      }
    }

    // 检查 Python
    if (this.conversions['xlsx-markdown'].available === null) {
      try {
        await this.execCommand('python --version');
        this.conversions['xlsx-markdown'].available = true;
        console.log(`[FormatProcessor] Python 可用`);
      } catch (error) {
        try {
          await this.execCommand('python3 --version');
          this.conversions['xlsx-markdown'].available = true;
          this.toolPaths.python = 'python3';
          console.log(`[FormatProcessor] Python3 可用`);
        } catch (e) {
          this.conversions['xlsx-markdown'].available = false;
          console.warn(`[FormatProcessor] Python 不可用，Excel 处理功能受限`);
        }
      }
    }
  }

  /**
   * Markdown → DOCX
   */
  async markdownToDocx(content, outputPath, fileName) {
    if (!this.conversions['markdown-docx'].available) {
      throw new Error('Pandoc 未安装，无法转换为 DOCX');
    }

    const mdPath = path.join(outputPath, `${fileName}.md`);
    const docxPath = path.join(outputPath, `${fileName}.docx`);

    // 确保目录存在
    await fs.mkdir(outputPath, { recursive: true });

    // 保存 Markdown 文件
    await fs.writeFile(mdPath, content, 'utf-8');

    // 转换为 DOCX
    await this.execCommand(`pandoc "${mdPath}" -o "${docxPath}" --from markdown --to docx`);

    return {
      success: true,
      inputPath: mdPath,
      outputPath: docxPath,
      format: 'docx'
    };
  }

  /**
   * Markdown → PDF
   */
  async markdownToPdf(content, outputPath, fileName) {
    if (!this.conversions['markdown-pdf'].available) {
      throw new Error('Pandoc 未安装，无法转换为 PDF');
    }

    const mdPath = path.join(outputPath, `${fileName}.md`);
    const pdfPath = path.join(outputPath, `${fileName}.pdf`);

    // 确保目录存在
    await fs.mkdir(outputPath, { recursive: true });

    // 保存 Markdown 文件
    await fs.writeFile(mdPath, content, 'utf-8');

    // 转换为 PDF（需要 LaTeX）
    try {
      await this.execCommand(`pandoc "${mdPath}" -o "${pdfPath}" --from markdown --pdf-engine=xelatex -V mainfont="SimSun"`);
    } catch (error) {
      // 如果 LaTeX 不可用，尝试使用其他方式
      console.warn(`[FormatProcessor] LaTeX 不可用，尝试使用 wkhtmltopdf`);
      try {
        // 先转 HTML，再转 PDF
        const htmlPath = path.join(outputPath, `${fileName}.html`);
        await this.execCommand(`pandoc "${mdPath}" -o "${htmlPath}" --from markdown --to html`);
        await this.execCommand(`wkhtmltopdf "${htmlPath}" "${pdfPath}"`);
      } catch (e) {
        throw new Error('无法转换为 PDF：需要安装 LaTeX 或 wkhtmltopdf');
      }
    }

    return {
      success: true,
      inputPath: mdPath,
      outputPath: pdfPath,
      format: 'pdf'
    };
  }

  /**
   * Markdown → HTML
   */
  async markdownToHtml(content, outputPath, fileName) {
    if (!this.conversions['markdown-html'].available) {
      throw new Error('Pandoc 未安装，无法转换为 HTML');
    }

    const mdPath = path.join(outputPath, `${fileName}.md`);
    const htmlPath = path.join(outputPath, `${fileName}.html`);

    // 确保目录存在
    await fs.mkdir(outputPath, { recursive: true });

    // 保存 Markdown 文件
    await fs.writeFile(mdPath, content, 'utf-8');

    // 转换为 HTML
    await this.execCommand(`pandoc "${mdPath}" -o "${htmlPath}" --from markdown --to html --standalone`);

    return {
      success: true,
      inputPath: mdPath,
      outputPath: htmlPath,
      format: 'html'
    };
  }

  /**
   * XLSX → Markdown
   */
  async xlsxToMarkdown(content, outputPath, fileName) {
    if (!this.conversions['xlsx-markdown'].available) {
      throw new Error('Python 未安装，无法处理 Excel 文件');
    }

    const xlsxPath = content; // content 作为文件路径
    const mdPath = path.join(outputPath, `${fileName}.md`);

    // 确保目录存在
    await fs.mkdir(outputPath, { recursive: true });

    // 使用 Python 转换
    const pythonCmd = this.toolPaths.python || 'python';
    const script = `
import openpyxl
import sys

wb = openpyxl.load_workbook('${xlsxPath.replace(/\\/g, '\\\\')}')
md_content = ''

for sheet_name in wb.sheetnames:
    ws = wb[sheet_name]
    md_content += f'## {sheet_name}\\n\\n'

    # 表头
    headers = [str(cell.value or '') for cell in ws[1]]
    md_content += '| ' + ' | '.join(headers) + ' |\\n'
    md_content += '| ' + ' | '.join(['---'] * len(headers)) + ' |\\n'

    # 数据行
    for row in ws.iter_rows(min_row=2, values_only=True):
        values = [str(cell or '') for cell in row]
        md_content += '| ' + ' | '.join(values) + ' |\\n'

    md_content += '\\n'

print(md_content)
`;

    const result = await this.execCommand(`${pythonCmd} -c "${script.replace(/"/g, '\\"')}"`);
    await fs.writeFile(mdPath, result, 'utf-8');

    return {
      success: true,
      inputPath: xlsxPath,
      outputPath: mdPath,
      format: 'markdown'
    };
  }

  /**
   * DOCX → Markdown
   */
  async docxToMarkdown(content, outputPath, fileName) {
    if (!this.conversions['docx-markdown'].available) {
      throw new Error('Pandoc 未安装，无法处理 Word 文件');
    }

    const docxPath = content; // content 作为文件路径
    const mdPath = path.join(outputPath, `${fileName}.md`);

    // 确保目录存在
    await fs.mkdir(outputPath, { recursive: true });

    // 使用 Pandoc 转换
    await this.execCommand(`pandoc "${docxPath}" -o "${mdPath}" --from docx --to markdown`);

    return {
      success: true,
      inputPath: docxPath,
      outputPath: mdPath,
      format: 'markdown'
    };
  }

  /**
   * 执行命令
   */
  execCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`命令执行失败: ${error.message}`));
        } else {
          resolve(stdout);
        }
      });
    });
  }

  /**
   * 获取转换能力报告
   */
  getCapabilityReport() {
    return {
      pandoc: this.conversions['markdown-docx'].available,
      python: this.conversions['xlsx-markdown'].available,
      supportedConversions: Object.entries(this.conversions)
        .filter(([_, config]) => config.available)
        .map(([key]) => key)
    };
  }
}

module.exports = FormatProcessor;
