/**
 * 法规识别模块
 * 用于识别产品适用的法规和标准
 */

const fs = require('fs');
const path = require('path');
const CertificationManager = require('../utils/certification-manager');

class RegulationIdentification {
  constructor(options = {}) {
    this.options = options;
    this.manager = new CertificationManager();

    // 常见法规数据库
    this.regulationDatabase = this.initRegulationDatabase();
  }

  /**
   * 初始化法规数据库
   */
  initRegulationDatabase() {
    return {
      'CN': [
        { id: 'REG-CN-001', name: 'CCC 认证', category: 'safety', description: '中国强制性产品认证' },
        { id: 'REG-CN-002', name: 'SRRC 认证', category: 'radio', description: '无线电发射设备型号核准' },
        { id: 'REG-CN-003', name: 'NAL 认证', category: 'radio', description: '电信设备进网许可' },
        { id: 'REG-CN-004', name: 'CQC 认证', category: 'safety', description: '中国自愿性产品认证' },
        { id: 'REG-CN-005', name: '节能认证', category: 'environmental', description: '中国节能产品认证' }
      ],
      'EU': [
        { id: 'REG-EU-001', name: 'CE 认证', category: 'safety', description: '欧盟强制性安全认证' },
        { id: 'REG-EU-002', name: 'RED 认证', category: 'radio', description: '欧盟无线设备指令' },
        { id: 'REG-EU-003', name: 'RoHS', category: 'environmental', description: '有害物质限制指令' },
        { id: 'REG-EU-004', name: 'REACH', category: 'environmental', description: '化学品注册、评估、许可和限制' },
        { id: 'REG-EU-005', name: 'WEEE', category: 'environmental', description: '废弃电子电气设备指令' }
      ],
      'US': [
        { id: 'REG-US-001', name: 'FCC 认证', category: 'emc', description: '美国联邦通信委员会认证' },
        { id: 'REG-US-002', name: 'UL 认证', category: 'safety', description: '美国保险商实验室认证' },
        { id: 'REG-US-003', name: 'ETL 认证', category: 'safety', description: '美国电子测试实验室认证' },
        { id: 'REG-US-004', name: 'DOE 能效', category: 'environmental', description: '美国能源部能效要求' }
      ],
      'JP': [
        { id: 'REG-JP-001', name: 'PSE 认证', category: 'safety', description: '日本电气安全认证' },
        { id: 'REG-JP-002', name: 'TELEC 认证', category: 'radio', description: '日本无线设备认证' },
        { id: 'REG-JP-003', name: 'VCCI 认证', category: 'emc', description: '日本电磁兼容认证' }
      ],
      'KR': [
        { id: 'REG-KR-001', name: 'KC 认证', category: 'safety', description: '韩国强制性安全认证' },
        { id: 'REG-KR-002', name: 'KCC 认证', category: 'radio', description: '韩国无线设备认证' }
      ]
    };
  }

  /**
   * 执行法规识别
   * @param {object} config - 配置
   * @param {string} config.outputDir - 输出目录
   * @param {object} config.inputData - 输入数据
   * @returns {object} 识别结果
   */
  async execute(config) {
    const { outputDir, inputData } = config;

    console.log('  [RegulationIdentification] 开始法规识别...');

    // 1. 验证输入
    this.validateInput(inputData);

    // 2. 识别适用法规
    const regulations = this.identifyRegulations(inputData);

    // 3. 生成 Markdown 报告
    const markdown = this.generateMarkdown(regulations, inputData.product);

    // 4. 保存输出
    const output = {
      product: inputData.product,
      regulations,
      summary: this.generateSummary(regulations)
    };

    this.saveOutput(outputDir, output, markdown);

    console.log(`  [RegulationIdentification] 完成，识别了 ${regulations.length} 个法规`);

    return {
      success: true,
      regulations,
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
    if (!inputData.product.id || !inputData.product.name) {
      throw new Error('Product id and name are required');
    }
    if (!inputData.regions || !Array.isArray(inputData.regions)) {
      throw new Error('Target regions array is required');
    }
  }

  /**
   * 识别适用法规
   */
  identifyRegulations(inputData) {
    const regulations = [];
    const { regions, productType, hasWireless, hasBattery } = inputData;

    for (const region of regions) {
      const regionRegulations = this.regulationDatabase[region] || [];

      for (const reg of regionRegulations) {
        // 根据产品特性筛选法规
        if (this.isApplicable(reg, inputData)) {
          regulations.push({
            ...reg,
            region,
            status: 'pending',
            requirements: [],
            applicability: this.getApplicabilityReason(reg, inputData)
          });
        }
      }
    }

    return regulations;
  }

  /**
   * 检查法规是否适用
   */
  isApplicable(regulation, inputData) {
    const { hasWireless, hasBattery, productType } = inputData;

    // 无线设备相关法规
    if (['radio'].includes(regulation.category) && !hasWireless) {
      return false;
    }

    // 电池相关法规
    if (regulation.name.includes('电池') && !hasBattery) {
      return false;
    }

    // 所有电子产品都需要安全认证
    return true;
  }

  /**
   * 获取适用性原因
   */
  getApplicabilityReason(regulation, inputData) {
    const reasons = [];

    if (regulation.category === 'safety') {
      reasons.push('产品安全要求');
    }
    if (regulation.category === 'radio' && inputData.hasWireless) {
      reasons.push('产品包含无线功能');
    }
    if (regulation.category === 'emc') {
      reasons.push('电磁兼容性要求');
    }
    if (regulation.category === 'environmental') {
      reasons.push('环保要求');
    }

    return reasons.join('；') || '市场准入要求';
  }

  /**
   * 生成摘要
   */
  generateSummary(regulations) {
    const byRegion = {};
    const byCategory = {};

    for (const reg of regulations) {
      byRegion[reg.region] = (byRegion[reg.region] || 0) + 1;
      byCategory[reg.category] = (byCategory[reg.category] || 0) + 1;
    }

    return {
      total: regulations.length,
      byRegion,
      byCategory
    };
  }

  /**
   * 生成 Markdown 报告
   */
  generateMarkdown(regulations, product) {
    const summary = this.generateSummary(regulations);

    let md = `# 法规识别报告\n\n`;
    md += `**产品**: ${product.name} (${product.id})\n`;
    md += `**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;

    md += `## 识别概览\n\n`;
    md += `| 指标 | 值 |\n|------|----|\n`;
    md += `| 总法规数 | ${summary.total} |\n`;

    md += `### 按地区分布\n\n`;
    md += `| 地区 | 法规数量 |\n|------|----------|\n`;
    for (const [region, count] of Object.entries(summary.byRegion)) {
      md += `| ${region} | ${count} |\n`;
    }
    md += `\n`;

    md += `### 按类别分布\n\n`;
    md += `| 类别 | 法规数量 |\n|------|----------|\n`;
    for (const [category, count] of Object.entries(summary.byCategory)) {
      md += `| ${category} | ${count} |\n`;
    }
    md += `\n`;

    // 按地区列出法规
    const groupedByRegion = this.groupBy(regulations, 'region');

    for (const [region, regs] of Object.entries(groupedByRegion)) {
      md += `## ${region} 地区法规\n\n`;
      md += `| ID | 法规名称 | 类别 | 适用性 |\n`;
      md += `|-----|----------|------|--------|\n`;

      for (const reg of regs) {
        md += `| ${reg.id} | ${reg.name} | ${reg.category} | ${reg.applicability} |\n`;
      }
      md += `\n`;

      // 详细信息
      for (const reg of regs) {
        md += `### ${reg.name}\n\n`;
        md += `- **ID**: ${reg.id}\n`;
        md += `- **类别**: ${reg.category}\n`;
        md += `- **描述**: ${reg.description}\n`;
        md += `- **适用性**: ${reg.applicability}\n\n`;
      }
    }

    return md;
  }

  /**
   * 分组统计
   */
  groupBy(array, key) {
    return array.reduce((result, item) => {
      const groupKey = item[key];
      if (!result[groupKey]) {
        result[groupKey] = [];
      }
      result[groupKey].push(item);
      return result;
    }, {});
  }

  /**
   * 保存输出
   */
  saveOutput(outputDir, output, markdown) {
    const dirPath = path.join(outputDir, '00_Project_Management/04_法规认证', 'regulation-identification');

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    fs.writeFileSync(
      path.join(dirPath, 'regulation-identification.json'),
      JSON.stringify(output, null, 2),
      'utf8'
    );

    fs.writeFileSync(
      path.join(dirPath, 'regulation-identification.md'),
      markdown,
      'utf8'
    );
  }
}

module.exports = RegulationIdentification;
