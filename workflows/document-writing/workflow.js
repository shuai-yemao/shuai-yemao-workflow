/**
 * 文档写作与处理工作流入口
 * 支持多种文档类型和格式转换
 *
 * 支持的文档类型:
 * - survey: 调查报告
 * - guide: 产品指南
 * - business-plan: 商业计划书
 * - meeting-report: 会议报告
 * - paper: 学术论文
 * - technical: 技术文档
 * - general: 通用文档
 */

const DocumentRouter = require('./modules/document-router');
const TemplateEngine = require('./modules/template-engine');
const ContentResearch = require('./modules/content-research');
const DocumentWriter = require('./modules/document-writer');
const FormatProcessor = require('./modules/format-processor');
const DocumentReviewer = require('./modules/document-reviewer');
const DocManager = require('./utils/doc-manager');

class DocumentWritingWorkflow {
  constructor(outputDir) {
    this.outputDir = outputDir || process.cwd();
    this.router = new DocumentRouter();
    this.templateEngine = new TemplateEngine();
    this.contentResearch = new ContentResearch();
    this.documentWriter = new DocumentWriter();
    this.formatProcessor = new FormatProcessor();
    this.documentReviewer = new DocumentReviewer();
    this.docManager = new DocManager(this.outputDir);

    // 文档类型与输出目录映射
    this.outputPaths = {
      'survey': '11_DocumentWriting/survey',
      'guide': '11_DocumentWriting/guide',
      'business-plan': '11_DocumentWriting/business-plan',
      'meeting-report': '11_DocumentWriting/meeting-report',
      'paper': '11_DocumentWriting/paper',
      'technical': '11_DocumentWriting/technical',
      'general': '11_DocumentWriting/general'
    };
  }

  /**
   * 执行工作流
   * @param {Object} options - 执行选项
   * @param {string} options.mode - 执行模式：full-run, single, convert, batch
   * @param {string} options.documentType - 文档类型
   * @param {string} options.topic - 文档主题
   * @param {Object} options.researchData - 研究数据
   * @param {string} options.outputFormat - 输出格式：markdown, docx, pdf
   * @param {Object} options.template - 自定义模板
   */
  async execute(options) {
    const {
      mode = 'full-run',
      documentType,
      topic,
      researchData,
      outputFormat = 'markdown',
      template,
      language,
      customTemplate
    } = options;

    console.log(`[Workflow] 开始执行文档写作工作流`);
    console.log(`[Workflow] 模式: ${mode}, 类型: ${documentType}, 主题: ${topic}`);

    try {
      switch (mode) {
        case 'full-run':
          return await this.executeFullRun({
            documentType,
            topic,
            researchData,
            outputFormat,
            language,
            customTemplate
          });
        case 'single':
          return await this.executeSingle(documentType, topic, researchData);
        case 'convert':
          return await this.executeConvert(options);
        case 'batch':
          return await this.executeBatch(options);
        default:
          throw new Error(`未知的执行模式: ${mode}`);
      }
    } catch (error) {
      console.error(`[Workflow] 执行失败:`, error.message);
      throw error;
    }
  }

  /**
   * 完整执行流程
   * 路由 → 研究 → 写作 → 审查 → 格式转换 → 保存
   */
  async executeFullRun(input) {
    const { documentType, topic, researchData, outputFormat, language, customTemplate } = input;

    // 1. 文档路由
    console.log('[Workflow] Step 1: 文档类型路由');
    const route = await this.router.execute({
      documentType,
      topic,
      requirements: input
    });

    // 2. 内容研究（如果需要）
    let research = researchData;
    if (!research && route.needsResearch) {
      console.log('[Workflow] Step 2: 内容研究');
      research = await this.contentResearch.execute({
        topic,
        researchDepth: route.researchDepth || 'quick',
        language
      });
    } else {
      console.log('[Workflow] Step 2: 使用提供的研究数据');
    }

    // 3. 文档写作
    console.log('[Workflow] Step 3: 文档写作');
    const writingResult = await this.documentWriter.execute({
      documentType,
      topic,
      researchData: research,
      language,
      customTemplate
    });

    // 4. 文档审查
    console.log('[Workflow] Step 4: 文档审查');
    const reviewResult = await this.documentReviewer.execute({
      content: writingResult.content,
      documentType
    });

    // 5. 格式转换
    console.log('[Workflow] Step 5: 格式转换');
    const outputDir = this.outputPaths[documentType] || this.outputPaths['general'];
    const formatResult = await this.formatProcessor.execute({
      content: writingResult.content,
      sourceFormat: 'markdown',
      outputFormat,
      outputPath: outputDir,
      fileName: this.sanitizeFileName(topic)
    });

    // 6. 保存文档
    console.log('[Workflow] Step 6: 保存文档');
    const saveResult = await this.docManager.saveDocument({
      content: writingResult.content,
      format: outputFormat,
      outputDir,
      fileName: this.sanitizeFileName(topic),
      metadata: writingResult.metadata
    });

    console.log(`[Workflow] 文档写作完成`);

    return {
      success: true,
      documentType,
      topic,
      outputFormat,
      outputPath: saveResult.outputPath,
      metadata: writingResult.metadata,
      quality: reviewResult.summary,
      suggestions: reviewResult.suggestions,
      formatInfo: formatResult
    };
  }

  /**
   * 单步执行指定模块
   */
  async executeSingle(moduleName, topic, data) {
    console.log(`[Workflow] 单步执行: ${moduleName}`);

    switch (moduleName) {
      case 'template':
        return await this.templateEngine.execute(data);
      case 'research':
        return await this.contentResearch.execute({ topic, ...data });
      case 'write':
        return await this.documentWriter.execute({ topic, ...data });
      case 'review':
        return await this.documentReviewer.execute(data);
      case 'format':
        return await this.formatProcessor.execute(data);
      case 'route':
        return await this.router.execute(data);
      default:
        throw new Error(`未知模块: ${moduleName}`);
    }
  }

  /**
   * 格式转换
   */
  async executeConvert(options) {
    const { content, sourceFormat, outputFormat, outputPath, fileName } = options;

    return await this.formatProcessor.execute({
      content,
      sourceFormat: sourceFormat || 'markdown',
      outputFormat,
      outputPath,
      fileName
    });
  }

  /**
   * 批量生成
   */
  async executeBatch(options) {
    const { documents, outputFormat } = options;
    const results = [];

    for (const doc of documents) {
      console.log(`[Workflow] 批量处理: ${doc.topic}`);
      const result = await this.executeFullRun({
        ...doc,
        outputFormat: outputFormat || doc.format || 'markdown'
      });
      results.push(result);
    }

    return {
      total: documents.length,
      success: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  /**
   * 清理文件名
   */
  sanitizeFileName(name) {
    return name
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 100);
  }
}

module.exports = DocumentWritingWorkflow;
