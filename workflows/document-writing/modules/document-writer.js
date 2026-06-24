/**
 * 核心写作引擎模块
 * 根据文档类型选择写作策略，生成高质量文档内容
 */

class DocumentWriter {
  constructor() {
    this.name = 'document-writer';

    // 写作策略映射
    this.strategies = {
      'survey': this.writeSurveyReport.bind(this),
      'guide': this.writeProductGuide.bind(this),
      'business-plan': this.writeBusinessPlan.bind(this),
      'meeting-report': this.writeMeetingReport.bind(this),
      'paper': this.writeAcademicPaper.bind(this),
      'technical': this.writeTechnicalDoc.bind(this),
      'general': this.writeGeneral.bind(this)
    };

    // 文档结构模板
    this.structures = {
      'survey': ['背景', '目的', '方法', '结果', '结论', '建议'],
      'guide': ['概述', '快速开始', '功能详解', '常见问题', '附录'],
      'business-plan': ['执行摘要', '市场分析', '产品/服务', '商业模式', '团队', '财务预测'],
      'meeting-report': ['会议信息', '议程', '讨论要点', '决议', '行动项'],
      'technical': ['概述', '架构', '接口', '实现', '部署', 'FAQ'],
      'general': ['概述', '正文', '总结']
    };
  }

  /**
   * 执行文档写作
   * @param {Object} input - 输入数据
   * @returns {Object} 写作结果
   */
  async execute(input) {
    console.log(`[DocumentWriter] 开始执行文档写作`);

    const { documentType, topic, researchData, outline, requirements, language } = input;

    // 选择写作策略
    const strategy = this.strategies[documentType] || this.strategies['general'];

    // 执行写作
    const result = await strategy({
      topic,
      researchData,
      outline,
      requirements,
      language: language || 'zh-CN'
    });

    // 质量检查
    const qualityCheck = this.qualityCheck(result.content);

    // 生成元数据
    const metadata = this.generateMetadata(documentType, topic, result);

    console.log(`[DocumentWriter] 完成文档写作`);

    return {
      ...result,
      qualityCheck,
      metadata
    };
  }

  /**
   * 撰写调查报告
   */
  async writeSurveyReport({ topic, researchData, language }) {
    const sections = [];

    // 标题
    sections.push(`# ${topic} — 调查报告\n`);

    // 摘要
    sections.push(this.generateAbstract(topic, researchData, '调查报告'));

    // 背景
    sections.push(this.generateSection('调查背景',
      this.generateBackground(topic, researchData)));

    // 目的
    sections.push(this.generateSection('调查目的',
      `本报告旨在深入了解 ${topic} 的现状、发展趋势和关键洞察，为决策提供数据支撑。`));

    // 方法论
    sections.push(this.generateSection('调查方法',
      this.generateMethodology(researchData)));

    // 主要发现
    sections.push(this.generateSection('主要发现',
      this.generateFindings(researchData)));

    // 数据分析
    sections.push(this.generateSection('数据分析',
      this.generateDataAnalysis(researchData)));

    // 结论与建议
    sections.push(this.generateSection('结论与建议',
      this.generateConclusions(researchData)));

    // 参考文献
    if (researchData && researchData.sources) {
      sections.push(this.generateReferences(researchData.sources));
    }

    return {
      content: sections.join('\n\n'),
      title: `${topic} — 调查报告`,
      type: 'survey'
    };
  }

  /**
   * 撰写产品指南
   */
  async writeProductGuide({ topic, researchData, language }) {
    const sections = [];

    sections.push(`# ${topic} — 使用指南\n`);
    sections.push(this.generateAbstract(topic, researchData, '使用指南'));

    sections.push(this.generateSection('概述',
      `本指南将帮助您快速上手并充分利用 ${topic} 的各项功能。`));

    sections.push(this.generateSection('快速开始',
      '### 安装与配置\n\n请按照以下步骤进行安装和初始配置：\n\n1. 下载并安装\n2. 初始配置\n3. 验证安装'));

    sections.push(this.generateSection('功能详解',
      this.generateFeatureGuide(researchData)));

    sections.push(this.generateSection('常见问题',
      this.generateFAQ(researchData)));

    sections.push(this.generateSection('附录',
      '### 术语表\n\n### 联系支持'));

    return {
      content: sections.join('\n\n'),
      title: `${topic} — 使用指南`,
      type: 'guide'
    };
  }

  /**
   * 撰写商业计划书
   */
  async writeBusinessPlan({ topic, researchData, language }) {
    const sections = [];

    sections.push(`# ${topic} — 商业计划书\n`);
    sections.push(this.generateAbstract(topic, researchData, '商业计划书'));

    sections.push(this.generateSection('执行摘要',
      this.generateExecutiveSummary(topic, researchData)));

    sections.push(this.generateSection('市场分析',
      this.generateMarketAnalysis(researchData)));

    sections.push(this.generateSection('产品/服务',
      `### 核心价值主张\n\n### 功能特性\n\n### 技术优势`));

    sections.push(this.generateSection('商业模式',
      '### 盈利模式\n\n### 定价策略\n\n### 销售渠道'));

    sections.push(this.generateSection('团队介绍',
      '### 核心成员\n\n### 顾问团队'));

    sections.push(this.generateSection('财务预测',
      '### 收入预测\n\n### 成本结构\n\n### 盈亏平衡分析'));

    return {
      content: sections.join('\n\n'),
      title: `${topic} — 商业计划书`,
      type: 'business-plan'
    };
  }

  /**
   * 撰写会议报告
   */
  async writeMeetingReport({ topic, researchData, language }) {
    const sections = [];

    sections.push(`# ${topic} — 会议纪要\n`);

    sections.push(this.generateSection('会议信息',
      `- **会议主题**: ${topic}\n- **会议时间**: {{date}}\n- **会议地点**: {{location}}\n- **参会人员**: {{attendees}}\n- **记录人**: {{recorder}}`));

    sections.push(this.generateSection('议程',
      '1. 议题一\n2. 议题二\n3. 议题三'));

    sections.push(this.generateSection('讨论要点',
      '### 议题一\n\n### 议题二\n\n### 议题三'));

    sections.push(this.generateSection('决议',
      '- 决议一\n- 决议二'));

    sections.push(this.generateSection('行动项',
      '| 行动项 | 负责人 | 截止日期 | 状态 |\n|--------|--------|----------|------|\n| 任务一 | 张三 | 2024-01-15 | 待完成 |'));

    return {
      content: sections.join('\n\n'),
      title: `${topic} — 会议纪要`,
      type: 'meeting-report'
    };
  }

  /**
   * 撰写学术论文（简化版，完整版调用 academic-pipeline）
   */
  async writeAcademicPaper({ topic, researchData, language }) {
    console.log(`[DocumentWriter] 学术论文模式 - 建议使用 academic-pipeline skill`);

    const sections = [];

    sections.push(`# ${topic}\n`);

    sections.push(this.generateSection('摘要',
      this.generateAbstract(topic, researchData, '学术论文')));

    sections.push(this.generateSection('引言',
      `## 研究背景\n\n## 研究目的\n\n## 研究意义`));

    sections.push(this.generateSection('文献综述',
      '### 国内外研究现状\n\n### 研究述评'));

    sections.push(this.generateSection('研究方法',
      '### 研究设计\n\n### 数据收集\n\n### 分析方法'));

    sections.push(this.generateSection('结果与讨论',
      '### 研究结果\n\n### 结果讨论'));

    sections.push(this.generateSection('结论',
      '### 主要结论\n\n### 研究局限\n\n### 未来展望'));

    sections.push(this.generateReferences([]));

    return {
      content: sections.join('\n\n'),
      title: topic,
      type: 'paper',
      note: '建议使用 /academic-pipeline 获取完整的 12-agent 论文写作流水线'
    };
  }

  /**
   * 撰写技术文档
   */
  async writeTechnicalDoc({ topic, researchData, language }) {
    const sections = [];

    sections.push(`# ${topic} — 技术文档\n`);

    sections.push(this.generateSection('概述',
      `### 文档目的\n\n### 适用范围\n\n### 术语定义`));

    sections.push(this.generateSection('系统架构',
      '### 整体架构\n\n### 模块划分\n\n### 技术选型'));

    sections.push(this.generateSection('接口说明',
      '### API 接口\n\n### 数据结构\n\n### 错误码'));

    sections.push(this.generateSection('实现细节',
      '### 核心算法\n\n### 关键流程\n\n### 性能优化'));

    sections.push(this.generateSection('部署指南',
      '### 环境要求\n\n### 部署步骤\n\n### 配置说明'));

    sections.push(this.generateSection('常见问题',
      '### FAQ\n\n### 故障排除'));

    return {
      content: sections.join('\n\n'),
      title: `${topic} — 技术文档`,
      type: 'technical'
    };
  }

  /**
   * 撰写通用文档
   */
  async writeGeneral({ topic, researchData, language }) {
    const sections = [];

    sections.push(`# ${topic}\n`);

    sections.push(this.generateSection('概述',
      `本文档介绍了 ${topic} 的相关内容。`));

    sections.push(this.generateSection('正文',
      '（请在此处添加具体内容）'));

    sections.push(this.generateSection('总结',
      '（请在此处添加总结内容）'));

    return {
      content: sections.join('\n\n'),
      title: topic,
      type: 'general'
    };
  }

  /**
   * 生成摘要
   */
  generateAbstract(topic, researchData, docType) {
    let abstract = `**摘要**: 本文档是一份关于 ${topic} 的${docType}。`;

    if (researchData && researchData.summary) {
      abstract += ` ${researchData.summary}`;
    } else {
      abstract += ` 旨在提供全面的分析和见解。`;
    }

    return abstract;
  }

  /**
   * 生成章节
   */
  generateSection(title, content) {
    return `## ${title}\n\n${content}`;
  }

  /**
   * 生成背景
   */
  generateBackground(topic, researchData) {
    if (researchData && researchData.background) {
      return researchData.background;
    }
    return `${topic} 是当前领域的重要研究方向/产品/课题，具有广泛的应用前景和研究价值。`;
  }

  /**
   * 生成方法论
   */
  generateMethodology(researchData) {
    if (researchData && researchData.methodology) {
      return researchData.methodology;
    }
    return `### 数据来源\n\n### 分析方法\n\n### 研究范围`;
  }

  /**
   * 生成研究发现
   */
  generateFindings(researchData) {
    if (researchData && researchData.findings) {
      return researchData.findings.map((f, i) => `${i + 1}. ${f}`).join('\n\n');
    }
    return '### 发现一\n\n### 发现二\n\n### 发现三';
  }

  /**
   * 生成数据分析
   */
  generateDataAnalysis(researchData) {
    if (researchData && researchData.dataAnalysis) {
      return researchData.dataAnalysis;
    }
    return `### 关键指标\n\n### 趋势分析\n\n### 对比分析`;
  }

  /**
   * 生成结论
   */
  generateConclusions(researchData) {
    if (researchData && researchData.conclusions) {
      return researchData.conclusions;
    }
    return `### 核心结论\n\n### 行动建议\n\n### 后续研究方向`;
  }

  /**
   * 生成功能指南
   */
  generateFeatureGuide(researchData) {
    if (researchData && researchData.features) {
      return researchData.features.map(f => `### ${f.name}\n\n${f.description}`).join('\n\n');
    }
    return '### 核心功能一\n\n### 核心功能二\n\n### 核心功能三';
  }

  /**
   * 生成 FAQ
   */
  generateFAQ(researchData) {
    if (researchData && researchData.faq) {
      return researchData.faq.map(q => `**Q: ${q.question}**\n\nA: ${q.answer}`).join('\n\n');
    }
    return '**Q: 常见问题一？**\n\nA: 答案一\n\n**Q: 常见问题二？**\n\nA: 答案二';
  }

  /**
   * 生成执行摘要
   */
  generateExecutiveSummary(topic, researchData) {
    if (researchData && researchData.executiveSummary) {
      return researchData.executiveSummary;
    }
    return `### 项目概述\n\n### 市场机会\n\n### 竞争优势\n\n### 融资需求`;
  }

  /**
   * 生成市场分析
   */
  generateMarketAnalysis(researchData) {
    if (researchData && researchData.marketAnalysis) {
      return researchData.marketAnalysis;
    }
    return `### 市场规模\n\n### 目标用户\n\n### 竞争格局\n\n### 市场趋势`;
  }

  /**
   * 生成参考文献
   */
  function generateReferences(sources) {
    if (!sources || sources.length === 0) {
      return '## 参考文献\n\n（暂无参考文献）';
    }

    const refs = sources.map((s, i) => `[${i + 1}] ${s.author || '未知'}. ${s.title}. ${s.year || 'n.d.'}.`).join('\n\n');
    return `## 参考文献\n\n${refs}`;
  }

  /**
   * 质量检查
   */
  qualityCheck(content) {
    const issues = [];

    // 检查标题
    if (!content.match(/^#\s+/m)) {
      issues.push({ level: 'warning', message: '缺少一级标题' });
    }

    // 检查章节
    const sections = content.match(/^##\s+/gm) || [];
    if (sections.length < 2) {
      issues.push({ level: 'info', message: '章节较少，建议增加内容' });
    }

    // 检查占位符
    const placeholders = content.match(/\{\{[^}]+\}\}/g) || [];
    if (placeholders.length > 0) {
      issues.push({ level: 'warning', message: `存在 ${placeholders.length} 个未替换的占位符` });
    }

    // 检查字数
    const wordCount = content.split(/\s+/).length;
    if (wordCount < 100) {
      issues.push({ level: 'warning', message: '内容较少，建议扩充' });
    }

    return {
      passed: issues.filter(i => i.level === 'error').length === 0,
      issues,
      wordCount,
      sectionCount: (content.match(/^##\s+/gm) || []).length
    };
  }

  /**
   * 生成元数据
   */
  generateMetadata(documentType, topic, result) {
    return {
      documentType,
      topic,
      title: result.title,
      type: result.type,
      generatedAt: new Date().toISOString(),
      wordCount: result.content.split(/\s+/).length,
      note: result.note || null
    };
  }
}

module.exports = DocumentWriter;
