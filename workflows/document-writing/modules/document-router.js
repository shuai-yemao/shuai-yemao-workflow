/**
 * 文档路由模块
 * 根据文档类型识别并路由到对应处理管线
 */

class DocumentRouter {
  constructor() {
    this.name = 'document-router';

    // 文档类型配置
    this.routes = {
      'survey': {
        name: '调查报告',
        needsResearch: true,
        researchDepth: 'full',
        outputDir: '11_DocumentWriting/survey',
        features: ['data-analysis', 'competitor-comparison', 'trend-analysis']
      },
      'guide': {
        name: '产品指南',
        needsResearch: false,
        researchDepth: 'quick',
        outputDir: '11_DocumentWriting/guide',
        features: ['feature-guide', 'faq', 'troubleshooting']
      },
      'business-plan': {
        name: '商业计划书',
        needsResearch: true,
        researchDepth: 'full',
        outputDir: '11_DocumentWriting/business-plan',
        features: ['market-analysis', 'financial-forecast', 'competitor-analysis']
      },
      'meeting-report': {
        name: '会议报告',
        needsResearch: false,
        researchDepth: null,
        outputDir: '11_DocumentWriting/meeting-report',
        features: ['agenda', 'discussion', 'resolution', 'action-items']
      },
      'paper': {
        name: '学术论文',
        needsResearch: true,
        researchDepth: 'deep',
        outputDir: '11_DocumentWriting/paper',
        features: ['literature-review', 'methodology', 'citation']
      },
      'technical': {
        name: '技术文档',
        needsResearch: false,
        researchDepth: 'quick',
        outputDir: '11_DocumentWriting/technical',
        features: ['api-doc', 'architecture', 'deployment']
      },
      'general': {
        name: '通用文档',
        needsResearch: false,
        researchDepth: null,
        outputDir: '11_DocumentWriting/general',
        features: ['flexible-structure']
      }
    };

    // 关键词映射（用于自动识别文档类型）
    this.typeKeywords = {
      'survey': ['调研', '调查', '市场分析', '竞品分析', '研究报告', 'survey', 'research', 'market analysis'],
      'guide': ['指南', '手册', '使用说明', '教程', 'guide', 'manual', 'tutorial', 'how to'],
      'business-plan': ['商业计划', 'BP', '融资', '投资', '立项', 'business plan', 'pitch', 'investor'],
      'meeting-report': ['会议', '纪要', '评审', '周报', '站会', 'meeting', 'minutes', 'review'],
      'paper': ['论文', '学术', '科研', '发表', 'paper', 'academic', 'research paper'],
      'technical': ['技术文档', 'API', '架构', '设计文档', '规格', 'technical', 'api doc', 'specification']
    };
  }

  /**
   * 执行路由
   * @param {Object} input - 输入数据
   * @returns {Object} 路由结果
   */
  async execute(input) {
    console.log(`[Router] 开始文档路由`);

    const { documentType, topic, requirements } = input;

    // 确定文档类型
    let type = documentType;

    // 如果未指定类型，尝试自动识别
    if (!type && topic) {
      type = this.detectType(topic);
    }

    // 如果仍然没有类型，使用默认
    if (!type) {
      type = 'general';
    }

    // 获取路由配置
    const route = this.routes[type] || this.routes['general'];

    // 验证路由
    const validation = this.validateRoute(route, requirements);

    console.log(`[Router] 路由完成: ${route.name}`);

    return {
      type,
      ...route,
      validation,
      topic
    };
  }

  /**
   * 自动检测文档类型
   */
  detectType(text) {
    const lowerText = text.toLowerCase();
    const scores = {};

    for (const [type, keywords] of Object.entries(this.typeKeywords)) {
      scores[type] = 0;
      for (const keyword of keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          scores[type]++;
        }
      }
    }

    // 找到得分最高的类型
    let maxScore = 0;
    let detectedType = 'general';

    for (const [type, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        detectedType = type;
      }
    }

    // 如果没有匹配到任何关键词，返回 general
    return maxScore > 0 ? detectedType : 'general';
  }

  /**
   * 验证路由配置
   */
  validateRoute(route, requirements) {
    const issues = [];

    // 检查是否需要研究数据
    if (route.needsResearch && !requirements?.researchData) {
      issues.push({
        level: 'warning',
        message: `${route.name}类型需要研究数据，但未提供`
      });
    }

    return {
      valid: issues.filter(i => i.level === 'error').length === 0,
      issues
    };
  }

  /**
   * 获取所有支持的文档类型
   */
  getSupportedTypes() {
    return Object.entries(this.routes).map(([type, config]) => ({
      type,
      name: config.name,
      features: config.features
    }));
  }

  /**
   * 添加自定义文档类型
   */
  addCustomType(type, config) {
    this.routes[type] = {
      name: config.name || type,
      needsResearch: config.needsResearch || false,
      researchDepth: config.researchDepth || null,
      outputDir: config.outputDir || `11_DocumentWriting/${type}`,
      features: config.features || []
    };
  }
}

module.exports = DocumentRouter;
