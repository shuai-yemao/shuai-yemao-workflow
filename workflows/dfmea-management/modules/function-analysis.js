/**
 * 功能分析模块
 * 用于识别产品功能和失效模式
 */

const fs = require('fs');
const path = require('path');
const DfmeaManager = require('../utils/dfmea-manager');

class FunctionAnalysis {
  constructor(options = {}) {
    this.options = options;
    this.manager = new DfmeaManager();
  }

  /**
   * 执行功能分析
   * @param {object} config - 配置
   * @param {string} config.outputDir - 输出目录
   * @param {object} config.inputData - 输入数据
   * @returns {object} 分析结果
   */
  async execute(config) {
    const { outputDir, inputData } = config;

    console.log('  [FunctionAnalysis] 开始功能分析...');

    // 1. 验证输入
    this.validateInput(inputData);

    // 2. 构建功能和失效模式数据
    const functions = this.buildFunctions(inputData);

    // 3. 计算初始 RPN
    const functionsWithRpn = this.calculateInitialRpn(functions);

    // 4. 生成 Markdown 报告
    const markdown = this.generateMarkdown(functionsWithRpn, inputData.product);

    // 5. 保存输出
    const output = {
      product: inputData.product,
      functions: functionsWithRpn,
      summary: this.generateSummary(functionsWithRpn)
    };

    this.saveOutput(outputDir, output, markdown);

    console.log(`  [FunctionAnalysis] 完成，识别了 ${functionsWithRpn.length} 个功能`);

    return {
      success: true,
      functions: functionsWithRpn,
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
    if (!inputData.functions || !Array.isArray(inputData.functions)) {
      throw new Error('Functions array is required');
    }
  }

  /**
   * 构建功能数据
   */
  buildFunctions(inputData) {
    return inputData.functions.map((func, index) => {
      const functionId = func.id || this.manager.generateFunctionId();

      const failureModes = (func.failureModes || []).map((fm, fmIndex) => {
        const fmId = fm.id || this.manager.generateFailureModeId();
        return {
          id: fmId,
          description: fm.description,
          effects: fm.effects || [],
          causes: fm.causes || [],
          currentControls: fm.currentControls || [],
          rpn: null, // 稍后计算
          actions: [],
          status: 'open'
        };
      });

      return {
        id: functionId,
        name: func.name,
        description: func.description || '',
        failureModes
      };
    });
  }

  /**
   * 计算初始 RPN
   */
  calculateInitialRpn(functions) {
    return functions.map(func => ({
      ...func,
      failureModes: func.failureModes.map(fm => {
        // 如果已有 RPN 值，使用现有值
        if (fm.rpn && fm.rpn.severity && fm.rpn.occurrence && fm.rpn.detection) {
          return {
            ...fm,
            rpn: this.manager.calculateRpn(fm.rpn.severity, fm.rpn.occurrence, fm.rpn.detection)
          };
        }

        // 否则使用默认值（需要用户后续评估）
        const defaultSeverity = 5;
        const defaultOccurrence = 5;
        const defaultDetection = 5;

        return {
          ...fm,
          rpn: this.manager.calculateRpn(defaultSeverity, defaultOccurrence, defaultDetection),
          _needsAssessment: true // 标记需要评估
        };
      })
    }));
  }

  /**
   * 生成摘要
   */
  generateSummary(functions) {
    const totalFailureModes = functions.reduce((sum, f) => sum + f.failureModes.length, 0);
    const highRiskCount = functions.reduce((sum, f) =>
      sum + f.failureModes.filter(fm => fm.rpn.total >= 200).length, 0);
    const mediumRiskCount = functions.reduce((sum, f) =>
      sum + f.failureModes.filter(fm => fm.rpn.total >= 100 && fm.rpn.total < 200).length, 0);

    return {
      totalFunctions: functions.length,
      totalFailureModes,
      highRiskCount,
      mediumRiskCount,
      needsAssessment: functions.reduce((sum, f) =>
        sum + f.failureModes.filter(fm => fm._needsAssessment).length, 0)
    };
  }

  /**
   * 生成 Markdown 报告
   */
  generateMarkdown(functions, product) {
    const summary = this.generateSummary(functions);

    let md = `# DFMEA 功能分析报告\n\n`;
    md += `**产品**: ${product.name} (${product.id})\n`;
    md += `**版本**: ${product.version || 'N/A'}\n`;
    md += `**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;

    md += `## 摘要\n\n`;
    md += `| 指标 | 值 |\n|------|----|\n`;
    md += `| 功能数量 | ${summary.totalFunctions} |\n`;
    md += `| 失效模式数量 | ${summary.totalFailureModes} |\n`;
    md += `| 高风险 (RPN≥200) | ${summary.highRiskCount} |\n`;
    md += `| 中风险 (100≤RPN<200) | ${summary.mediumRiskCount} |\n`;
    md += `| 待评估 | ${summary.needsAssessment} |\n\n`;

    md += `## 功能与失效模式\n\n`;

    for (const func of functions) {
      md += `### ${func.name} (${func.id})\n\n`;
      if (func.description) {
        md += `${func.description}\n\n`;
      }

      if (func.failureModes.length === 0) {
        md += `> 暂无失效模式\n\n`;
        continue;
      }

      md += `| ID | 失效模式 | 严重度 | 发生度 | 检测度 | RPN | 风险等级 |\n`;
      md += `|-----|----------|--------|--------|--------|-----|----------|\n`;

      for (const fm of func.failureModes) {
        const riskLevel = this.manager.getRiskLevel(fm.rpn.total);
        const needsAssessment = fm._needsAssessment ? ' ⚠️' : '';
        md += `| ${fm.id} | ${fm.description}${needsAssessment} | ${fm.rpn.severity} | ${fm.rpn.occurrence} | ${fm.rpn.detection} | ${fm.rpn.total} | ${riskLevel.level} |\n`;
      }
      md += `\n`;

      // 详细信息
      for (const fm of func.failureModes) {
        if (fm.effects.length > 0 || fm.causes.length > 0) {
          md += `**${fm.id} 详细信息:**\n\n`;

          if (fm.effects.length > 0) {
            md += `- **失效影响:**\n`;
            for (const effect of fm.effects) {
              md += `  - [${effect.severity}] ${effect.description}\n`;
            }
          }

          if (fm.causes.length > 0) {
            md += `- **失效原因:**\n`;
            for (const cause of fm.causes) {
              md += `  - [${cause.occurrence}] ${cause.description}\n`;
            }
          }

          if (fm.currentControls.length > 0) {
            md += `- **现有控制:**\n`;
            for (const control of fm.currentControls) {
              md += `  - [${control.detection}] ${control.description}\n`;
            }
          }

          md += `\n`;
        }
      }
    }

    return md;
  }

  /**
   * 保存输出
   */
  saveOutput(outputDir, output, markdown) {
    const dirPath = path.join(outputDir, '00_Project_Management/05_功能风险管控_DFMEA', 'function-analysis');

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // 保存 JSON
    fs.writeFileSync(
      path.join(dirPath, 'function-analysis.json'),
      JSON.stringify(output, null, 2),
      'utf8'
    );

    // 保存 Markdown
    fs.writeFileSync(
      path.join(dirPath, 'function-analysis.md'),
      markdown,
      'utf8'
    );
  }
}

module.exports = FunctionAnalysis;
