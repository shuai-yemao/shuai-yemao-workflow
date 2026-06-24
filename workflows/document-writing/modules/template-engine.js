/**
 * 模板引擎模块
 * 基于 Markdown 模板生成结构化文档
 */

const fs = require('fs').promises;
const path = require('path');

class TemplateEngine {
  constructor() {
    this.name = 'template-engine';
    this.templateDir = path.join(__dirname, '..', 'templates');
    this.templates = {};
  }

  /**
   * 执行模板渲染
   * @param {Object} input - 输入数据
   * @returns {Object} 渲染结果
   */
  async execute(input) {
    console.log(`[TemplateEngine] 开始执行模板渲染`);

    const { templateName, variables, customTemplate } = input;

    let template;

    // 加载模板
    if (customTemplate) {
      // 使用自定义模板
      template = customTemplate;
    } else if (templateName) {
      // 从文件加载模板
      template = await this.loadTemplate(templateName);
    } else {
      // 根据文档类型选择默认模板
      template = await this.getDefaultTemplate(input.documentType || 'general');
    }

    // 渲染模板
    const rendered = this.render(template, variables || {});

    // 提取元数据
    const metadata = this.extractMetadata(rendered);

    console.log(`[TemplateEngine] 完成模板渲染`);

    return {
      content: rendered,
      metadata,
      templateName: templateName || 'default',
      variables: variables || {}
    };
  }

  /**
   * 加载模板文件
   */
  async loadTemplate(templateName) {
    const templatePath = path.join(this.templateDir, `${templateName}.md`);

    try {
      const content = await fs.readFile(templatePath, 'utf-8');
      this.templates[templateName] = content;
      return content;
    } catch (error) {
      console.warn(`[TemplateEngine] 模板 ${templateName} 不存在，使用默认模板`);
      return this.getDefaultTemplateContent();
    }
  }

  /**
   * 获取默认模板
   */
  async getDefaultTemplate(documentType) {
    const templateMap = {
      'survey': 'survey-report',
      'guide': 'product-guide',
      'business-plan': 'business-plan',
      'meeting-report': 'meeting-report',
      'weekly-report': 'weekly-report',
      'general': 'general'
    };

    const templateName = templateMap[documentType] || 'general';
    return await this.loadTemplate(templateName);
  }

  /**
   * 获取默认模板内容
   */
  getDefaultTemplateContent() {
    return `# {{title}}

> {{documentType}} | {{date}} | {{author}}

## 概述

{{overview}}

## 正文

{{content}}

## 总结

{{summary}}

---

*由文档写作工作流生成*`;
  }

  /**
   * 渲染模板
   * 支持 {{variable}} 语法
   */
  render(template, variables) {
    let result = template;

    // 替换所有 {{variable}} 占位符
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value || '');
    }

    // 处理条件渲染 {{#if condition}} ... {{/if}}
    result = this.processConditionals(result, variables);

    // 处理循环 {{#each items}} ... {{/each}}
    result = this.processLoops(result, variables);

    // 清理未替换的占位符
    result = result.replace(/\{\{#[\s\S]*?\}\}/g, '');
    result = result.replace(/\{\{\/[\s\S]*?\}\}/g, '');

    return result;
  }

  /**
   * 处理条件渲染
   */
  processConditionals(template, variables) {
    const conditionalRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;

    return template.replace(conditionalRegex, (match, condition, content) => {
      return variables[condition] ? content : '';
    });
  }

  /**
   * 处理循环渲染
   */
  processLoops(template, variables) {
    const loopRegex = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;

    return template.replace(loopRegex, (match, arrayName, itemTemplate) => {
      const array = variables[arrayName];
      if (!Array.isArray(array)) return '';

      return array.map(item => {
        let result = itemTemplate;
        for (const [key, value] of Object.entries(item)) {
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
          result = result.replace(regex, value || '');
        }
        return result;
      }).join('\n');
    });
  }

  /**
   * 提取元数据
   */
  extractMetadata(content) {
    const metadata = {
      title: '',
      sections: [],
      wordCount: 0,
      lineCount: 0
    };

    // 提取标题
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      metadata.title = titleMatch[1];
    }

    // 提取章节
    const sectionRegex = /^##\s+(.+)$/gm;
    let match;
    while ((match = sectionRegex.exec(content)) !== null) {
      metadata.sections.push(match[1]);
    }

    // 统计字数
    metadata.wordCount = content.split(/\s+/).length;
    metadata.lineCount = content.split('\n').length;

    return metadata;
  }

  /**
   * 列出可用模板
   */
  async listTemplates() {
    try {
      const files = await fs.readdir(this.templateDir);
      return files
        .filter(f => f.endsWith('.md'))
        .map(f => ({
          name: f.replace('.md', ''),
          path: path.join(this.templateDir, f)
        }));
    } catch (error) {
      return [];
    }
  }

  /**
   * 创建自定义模板
   */
  async createTemplate(name, content) {
    const templatePath = path.join(this.templateDir, `${name}.md`);
    await fs.writeFile(templatePath, content, 'utf-8');
    console.log(`[TemplateEngine] 创建模板: ${name}`);
  }
}

module.exports = TemplateEngine;
