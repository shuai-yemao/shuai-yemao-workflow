/**
 * 文档审查模块
 * 对生成的文档进行质量审查
 */

class DocumentReviewer {
  constructor() {
    this.name = 'document-reviewer';

    // 审查规则
    this.rules = {
      structure: [
        { id: 'S1', name: 'hasTitle', check: this.checkTitle.bind(this), severity: 'error' },
        { id: 'S2', name: 'hasSections', check: this.checkSections.bind(this), severity: 'warning' },
        { id: 'S3', name: 'sectionBalance', check: this.checkSectionBalance.bind(this), severity: 'info' }
      ],
      content: [
        { id: 'C1', name: 'wordCount', check: this.checkWordCount.bind(this), severity: 'warning' },
        { id: 'C2', name: 'placeholderCheck', check: this.checkPlaceholders.bind(this), severity: 'error' },
        { id: 'C3', name: 'duplicateCheck', check: this.checkDuplicates.bind(this), severity: 'warning' }
      ],
      format: [
        { id: 'F1', name: 'markdownFormat', check: this.checkMarkdownFormat.bind(this), severity: 'warning' },
        { id: 'F2', name: 'headingHierarchy', check: this.checkHeadingHierarchy.bind(this), severity: 'info' }
      ]
    };
  }

  /**
   * 执行文档审查
   * @param {Object} input - 输入数据
   * @returns {Object} 审查结果
   */
  async execute(input) {
    console.log(`[DocumentReviewer] 开始执行文档审查`);

    const { content, documentType, requirements } = input;

    // 执行所有审查规则
    const results = [];

    for (const [category, rules] of Object.entries(this.rules)) {
      for (const rule of rules) {
        const result = rule.check(content, { documentType, requirements });
        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          category,
          severity: rule.severity,
          ...result
        });
      }
    }

    // 统计问题
    const summary = this.generateSummary(results);

    // 生成改进建议
    const suggestions = this.generateSuggestions(results);

    console.log(`[DocumentReviewer] 完成文档审查`);

    return {
      passed: results.filter(r => r.severity === 'error' && !r.passed).length === 0,
      results,
      summary,
      suggestions
    };
  }

  /**
   * 检查标题
   */
  checkTitle(content) {
    const hasTitle = /^#\s+.+$/m.test(content);
    return {
      passed: hasTitle,
      message: hasTitle ? '文档包含一级标题' : '文档缺少一级标题'
    };
  }

  /**
   * 检查章节
   */
  checkSections(content) {
    const sections = (content.match(/^##\s+.+$/gm) || []);
    const passed = sections.length >= 2;
    return {
      passed,
      message: passed ? `文档包含 ${sections.length} 个章节` : '章节较少，建议至少包含2个主要章节',
      details: sections.map(s => s.replace(/^##\s+/, ''))
    };
  }

  /**
   * 检查章节平衡
   */
  checkSectionBalance(content) {
    const sections = content.split(/^##\s+/m).filter(s => s.trim());
    if (sections.length < 2) {
      return { passed: true, message: '章节数量不足，跳过平衡检查' };
    }

    const lengths = sections.map(s => s.split('\n').length);
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const maxDeviation = Math.max(...lengths.map(l => Math.abs(l - avg)));

    const passed = maxDeviation < avg * 2;
    return {
      passed,
      message: passed ? '章节长度较为平衡' : '部分章节长度差异较大',
      details: { averageLength: Math.round(avg), maxDeviation: Math.round(maxDeviation) }
    };
  }

  /**
   * 检查字数
   */
  checkWordCount(content, { documentType }) {
    const wordCount = content.split(/\s+/).length;
    const minWords = {
      'survey': 500,
      'guide': 300,
      'business-plan': 800,
      'meeting-report': 200,
      'paper': 1000,
      'technical': 400,
      'general': 100
    };

    const required = minWords[documentType] || 100;
    const passed = wordCount >= required;

    return {
      passed,
      message: passed ? `字数 ${wordCount}，满足要求` : `字数 ${wordCount}，建议至少 ${required} 字`,
      details: { wordCount, required }
    };
  }

  /**
   * 检查占位符
   */
  checkPlaceholders(content) {
    const placeholders = content.match(/\{\{[^}]+\}\}/g) || [];
    const passed = placeholders.length === 0;

    return {
      passed,
      message: passed ? '无未替换的占位符' : `存在 ${placeholders.length} 个未替换的占位符`,
      details: placeholders
    };
  }

  /**
   * 检查重复内容
   */
  checkDuplicates(content) {
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 50);
    const seen = new Set();
    const duplicates = [];

    for (const p of paragraphs) {
      const normalized = p.trim().toLowerCase();
      if (seen.has(normalized)) {
        duplicates.push(p.substring(0, 50) + '...');
      }
      seen.add(normalized);
    }

    const passed = duplicates.length === 0;
    return {
      passed,
      message: passed ? '无明显重复内容' : `发现 ${duplicates.length} 处可能的重复`,
      details: duplicates
    };
  }

  /**
   * 检查 Markdown 格式
   */
  checkMarkdownFormat(content) {
    const issues = [];

    // 检查标题格式
    if (content.match(/^#+[^#\s]/m)) {
      issues.push('标题符号后缺少空格');
    }

    // 检查列表格式
    if (content.match(/^\s*[-*]\s*\n/m)) {
      issues.push('存在空列表项');
    }

    // 检查代码块
    const codeBlocks = (content.match(/```/g) || []).length;
    if (codeBlocks % 2 !== 0) {
      issues.push('代码块未正确闭合');
    }

    return {
      passed: issues.length === 0,
      message: issues.length === 0 ? 'Markdown 格式正确' : `发现 ${issues.length} 个格式问题`,
      details: issues
    };
  }

  /**
   * 检查标题层级
   */
  checkHeadingHierarchy(content) {
    const headings = [];
    const regex = /^(#+)\s+(.+)$/gm;
    let match;

    while ((match = regex.exec(content)) !== null) {
      headings.push({
        level: match[1].length,
        text: match[2]
      });
    }

    const issues = [];
    for (let i = 1; i < headings.length; i++) {
      if (headings[i].level - headings[i - 1].level > 1) {
        issues.push(`标题层级跳跃: "${headings[i - 1].text}" (H${headings[i - 1].level}) → "${headings[i].text}" (H${headings[i].level})`);
      }
    }

    return {
      passed: issues.length === 0,
      message: issues.length === 0 ? '标题层级正确' : `发现 ${issues.length} 个层级问题`,
      details: issues
    };
  }

  /**
   * 生成审查摘要
   */
  generateSummary(results) {
    const total = results.length;
    const passed = results.filter(r => r.passed).length;
    const failed = total - passed;

    const bySeverity = {
      error: results.filter(r => r.severity === 'error' && !r.passed).length,
      warning: results.filter(r => r.severity === 'warning' && !r.passed).length,
      info: results.filter(r => r.severity === 'info' && !r.passed).length
    };

    return {
      total,
      passed,
      failed,
      passRate: ((passed / total) * 100).toFixed(1) + '%',
      bySeverity,
      grade: bySeverity.error > 0 ? 'C' : bySeverity.warning > 2 ? 'B' : 'A'
    };
  }

  /**
   * 生成改进建议
   */
  generateSuggestions(results) {
    const suggestions = [];

    const failed = results.filter(r => !r.passed);

    for (const r of failed) {
      switch (r.ruleName) {
        case 'hasTitle':
          suggestions.push('添加一级标题，格式: # 文档标题');
          break;
        case 'hasSections':
          suggestions.push('增加更多章节以丰富文档结构');
          break;
        case 'wordCount':
          suggestions.push(`扩充内容至 ${r.details?.required || 500} 字以上`);
          break;
        case 'placeholderCheck':
          suggestions.push('替换所有 {{variable}} 占位符为实际内容');
          break;
        case 'headingHierarchy':
          suggestions.push('调整标题层级，避免跳级');
          break;
        default:
          if (r.message) {
            suggestions.push(r.message);
          }
      }
    }

    return suggestions;
  }
}

module.exports = DocumentReviewer;
