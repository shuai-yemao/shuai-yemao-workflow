/**
 * 文档准备模块
 * 用于准备认证所需文档
 */

const fs = require('fs');
const path = require('path');
const CertificationManager = require('../utils/certification-manager');

class DocumentationPreparation {
  constructor(options = {}) {
    this.options = options;
    this.manager = new CertificationManager();
  }

  /**
   * 执行文档准备
   * @param {object} config - 配置
   * @param {string} config.outputDir - 输出目录
   * @param {object} config.inputData - 输入数据
   * @returns {object} 结果
   */
  async execute(config) {
    const { outputDir, inputData } = config;

    console.log('  [DocumentationPreparation] 开始文档准备...');

    // 1. 验证输入
    this.validateInput(inputData);

    // 2. 生成文档清单
    const documentation = this.prepareDocumentation(inputData);

    // 3. 生成 Markdown 报告
    const markdown = this.generateMarkdown(documentation, inputData.product);

    // 4. 保存输出
    const output = {
      product: inputData.product,
      documentation,
      summary: this.generateSummary(documentation)
    };

    this.saveOutput(outputDir, output, markdown);

    console.log(`  [DocumentationPreparation] 完成，准备了 ${documentation.categories.length} 类文档`);

    return {
      success: true,
      documentation,
      summary: output.summary,
      markdown
    };
  }

  /**
   * 验证输入数据
   */
  validateInput(inputData) {
    if (!inputData.product) {
      throw new Error('Product information is required');
    }
    if (!inputData.certifications || !Array.isArray(inputData.certifications)) {
      throw new Error('Certifications array is required');
    }
  }

  /**
   * 准备文档
   */
  prepareDocumentation(inputData) {
    const categories = [
      this.prepareProductDocuments(inputData),
      this.prepareTechnicalDocuments(inputData),
      this.prepareTestDocuments(inputData),
      this.prepareComplianceDocuments(inputData)
    ];

    return {
      categories,
      checklist: this.generateChecklist(categories),
      totalDocuments: this.countDocuments(categories),
      completedDocuments: this.countCompletedDocuments(categories)
    };
  }

  /**
   * 准备产品文档
   */
  prepareProductDocuments(inputData) {
    const documents = [
      { id: 'DOC-001', name: '产品规格书', description: '产品技术规格和功能描述', status: 'pending', required: true },
      { id: 'DOC-002', name: '产品照片', description: '产品外观照片（多角度）', status: 'pending', required: true },
      { id: 'DOC-003', name: '用户手册', description: '产品使用说明书', status: 'pending', required: true },
      { id: 'DOC-004', name: '产品铭牌', description: '产品铭牌设计图', status: 'pending', required: true }
    ];

    return { category: '产品文档', documents, completed: documents.filter(d => d.status === 'completed').length };
  }

  /**
   * 准备技术文档
   */
  prepareTechnicalDocuments(inputData) {
    const documents = [
      { id: 'DOC-101', name: '电路原理图', description: '完整的电路原理图', status: 'pending', required: true },
      { id: 'DOC-102', name: 'PCB 布局图', description: 'PCB 设计文件', status: 'pending', required: true },
      { id: 'DOC-103', name: 'BOM 清单', description: '物料清单', status: 'pending', required: true },
      { id: 'DOC-104', name: '关键元器件规格书', description: '关键元器件的数据手册', status: 'pending', required: true },
      { id: 'DOC-105', name: '软件版本说明', description: '嵌入式软件版本信息', status: 'pending', required: false }
    ];

    return { category: '技术文档', documents, completed: documents.filter(d => d.status === 'completed').length };
  }

  /**
   * 准备测试文档
   */
  prepareTestDocuments(inputData) {
    const documents = [
      { id: 'DOC-201', name: '测试计划', description: '认证测试计划', status: 'pending', required: true },
      { id: 'DOC-202', name: '测试配置', description: '测试设备和配置说明', status: 'pending', required: true },
      { id: 'DOC-203', name: '预测试报告', description: '内部预测试结果', status: 'pending', required: false }
    ];

    return { category: '测试文档', documents, completed: documents.filter(d => d.status === 'completed').length };
  }

  /**
   * 准备合规文档
   */
  prepareComplianceDocuments(inputData) {
    const documents = [
      { id: 'DOC-301', name: '合规声明', description: '产品合规声明书', status: 'pending', required: true },
      { id: 'DOC-302', name: 'RoHS 声明', description: '有害物质限制声明', status: 'pending', required: true },
      { id: 'DOC-303', name: '材料成分声明', description: '产品材料成分清单', status: 'pending', required: false }
    ];

    return { category: '合规文档', documents, completed: documents.filter(d => d.status === 'completed').length };
  }

  /**
   * 生成清单
   */
  generateChecklist(categories) {
    const checklist = [];
    for (const category of categories) {
      for (const doc of category.documents) {
        checklist.push({ id: doc.id, category: category.category, name: doc.name, required: doc.required, status: doc.status });
      }
    }
    return checklist;
  }

  countDocuments(categories) { return categories.reduce((sum, cat) => sum + cat.documents.length, 0); }
  countCompletedDocuments(categories) { return categories.reduce((sum, cat) => sum + cat.documents.filter(d => d.status === 'completed').length, 0); }

  generateSummary(documentation) {
    return {
      totalDocuments: documentation.totalDocuments,
      completedDocuments: documentation.completedDocuments,
      completionRate: documentation.totalDocuments > 0 ? Math.round((documentation.completedDocuments / documentation.totalDocuments) * 100) : 0,
      requiredDocuments: documentation.checklist.filter(d => d.required).length,
      categories: documentation.categories.map(cat => ({ name: cat.category, total: cat.documents.length, completed: cat.completed }))
    };
  }

  generateMarkdown(documentation, product) {
    const summary = this.generateSummary(documentation);
    let md = `# 认证文档准备报告\n\n**产品**: ${product.name} (${product.id})\n**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
    md += `## 准备概览\n\n| 指标 | 值 |\n|------|----|\n`;
    md += `| 总文档数 | ${summary.totalDocuments} |\n| 已完成 | ${summary.completedDocuments} |\n| 完成率 | ${summary.completionRate}% |\n| 必需文档 | ${summary.requiredDocuments} |\n\n`;
    md += `### 按类别统计\n\n| 类别 | 总数 | 已完成 |\n|------|------|--------|\n`;
    for (const cat of summary.categories) { md += `| ${cat.name} | ${cat.total} | ${cat.completed} |\n`; }
    md += `\n## 文档清单\n\n`;
    for (const category of documentation.categories) {
      md += `### ${category.category}\n\n| ID | 文档名称 | 必需 | 状态 |\n|-----|----------|------|------|\n`;
      for (const doc of category.documents) { md += `| ${doc.id} | ${doc.name} | ${doc.required ? '✅' : '⬜'} | ⬜ ${doc.status} |\n`; }
      md += `\n`;
    }
    const pendingDocs = documentation.checklist.filter(d => d.status !== 'completed');
    if (pendingDocs.length > 0) {
      md += `## 待办事项\n\n`;
      for (const doc of pendingDocs) { md += `- [ ] ${doc.name} (${doc.category})${doc.required ? ' [必需]' : ''}\n`; }
    }
    return md;
  }

  saveOutput(outputDir, output, markdown) {
    const dirPath = path.join(outputDir, '00_Project_Management/04_法规认证', 'documentation-preparation');
    if (!fs.existsSync(dirPath)) { fs.mkdirSync(dirPath, { recursive: true }); }
    fs.writeFileSync(path.join(dirPath, 'documentation-checklist.json'), JSON.stringify(output, null, 2), 'utf8');
    fs.writeFileSync(path.join(dirPath, 'documentation-preparation.md'), markdown, 'utf8');
  }
}

module.exports = DocumentationPreparation;
