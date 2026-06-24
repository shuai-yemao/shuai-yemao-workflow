/**
 * 代码质量模块
 *
 * 职责：
 * - 静态代码分析
 * - 代码风格检查
 * - 复杂度分析
 * - 安全漏洞扫描
 */

const fs = require('fs');
const path = require('path');

class CodeQuality {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * 执行代码质量检查
   */
  async execute(config) {
    const { outputDir, inputData = {} } = config;

    // 1. 静态分析
    const staticAnalysis = this.runStaticAnalysis(inputData);

    // 2. 代码风格检查
    const styleCheck = this.checkCodeStyle(inputData);

    // 3. 复杂度分析
    const complexity = this.analyzeComplexity(inputData);

    // 4. 安全扫描
    const security = this.scanSecurity(inputData);

    // 5. 计算质量评分
    const score = this.calculateScore(staticAnalysis, styleCheck, complexity, security);

    // 6. 生成输出
    const result = {
      summary: {
        score,
        totalIssues: staticAnalysis.issues.length + styleCheck.issues.length + security.issues.length,
        critical: this.countBySeverity([...staticAnalysis.issues, ...security.issues], 'critical'),
        high: this.countBySeverity([...staticAnalysis.issues, ...security.issues], 'high'),
        medium: this.countBySeverity([...staticAnalysis.issues, ...styleCheck.issues], 'medium'),
        low: this.countBySeverity([...styleCheck.issues], 'low')
      },
      staticAnalysis,
      styleCheck,
      complexity,
      security,
      recommendations: this.generateRecommendations(staticAnalysis, styleCheck, complexity, security)
    };

    // 7. 保存到文件
    await this.saveOutput(outputDir, result);

    return result;
  }

  /**
   * 运行静态分析
   */
  runStaticAnalysis(inputData) {
    console.log(`   🔍 运行静态分析 (${this.options.staticAnalyzer || 'cppcheck'})...`);

    const analyzer = this.options.staticAnalyzer || 'cppcheck';
    const standards = this.options.codingStandards || ['misra-c-2012'];

    // 模拟静态分析结果
    const result = {
      tool: analyzer,
      standards,
      issues: [
        {
          severity: 'high',
          file: 'src/auth/login.c',
          line: 78,
          column: 5,
          message: 'Buffer overflow risk - potential out-of-bounds write',
          rule: 'CERT C ARR30-C',
          suggestion: 'Use safe string functions and validate buffer sizes'
        },
        {
          severity: 'medium',
          file: 'src/utils/string.c',
          line: 45,
          column: 10,
          message: 'Unused variable detected',
          rule: 'MISRA Rule 2.2',
          suggestion: 'Remove unused variable'
        },
        {
          severity: 'low',
          file: 'src/network/tcp.c',
          line: 120,
          column: 1,
          message: 'Function too long (> 50 lines)',
          rule: 'Complexity',
          suggestion: 'Consider refactoring into smaller functions'
        }
      ],
      statistics: {
        filesScanned: 45,
        linesScanned: 12000,
        issuesFound: 3,
        scanTime: '2.3s'
      }
    };

    console.log(`   📊 发现 ${result.issues.length} 个问题`);

    return result;
  }

  /**
   * 检查代码风格
   */
  checkCodeStyle(inputData) {
    console.log('   📝 检查代码风格...');

    // 模拟风格检查结果
    const result = {
      tool: 'clang-format',
      config: '.clang-format',
      issues: [
        {
          severity: 'low',
          file: 'src/main.c',
          line: 15,
          message: 'Inconsistent indentation (expected 4, got 2)',
          rule: 'Indentation'
        },
        {
          severity: 'low',
          file: 'src/auth/auth.c',
          line: 88,
          message: 'Line length exceeds 80 characters',
          rule: 'LineLength'
        }
      ],
      statistics: {
        filesChecked: 45,
        issuesFound: 2,
        complianceRate: 95.6
      }
    };

    console.log(`   📊 风格合规率: ${result.statistics.complianceRate}%`);

    return result;
  }

  /**
   * 分析复杂度
   */
  analyzeComplexity(inputData) {
    console.log('   📈 分析代码复杂度...');

    // 模拟复杂度分析结果
    const result = {
      metrics: {
        averageCyclomatic: 3.2,
        maxCyclomatic: 15,
        averageCyclomaticFunctions: 2.8,
        totalFunctions: 150,
        highComplexityFunctions: 5
      },
      functions: [
        {
          name: 'process_network_packet',
          file: 'src/network/packet.c',
          cyclomaticComplexity: 15,
          maintainabilityIndex: 45,
          recommendation: 'Consider refactoring - complexity too high'
        },
        {
          name: 'handle_uart_interrupt',
          file: 'src/hal/uart.c',
          cyclomaticComplexity: 12,
          maintainabilityIndex: 55,
          recommendation: 'Consider refactoring - complexity high'
        }
      ],
      summary: {
        grade: this.calculateComplexityGrade(3.2),
        riskLevel: 'medium'
      }
    };

    console.log(`   📊 平均圈复杂度: ${result.metrics.averageCyclomatic}`);

    return result;
  }

  /**
   * 计算复杂度等级
   */
  calculateComplexityGrade(avgComplexity) {
    if (avgComplexity <= 2) return 'A';
    if (avgComplexity <= 4) return 'B';
    if (avgComplexity <= 6) return 'C';
    if (avgComplexity <= 10) return 'D';
    return 'F';
  }

  /**
   * 扫描安全漏洞
   */
  scanSecurity(inputData) {
    console.log('   🔒 扫描安全漏洞...');

    // 模拟安全扫描结果
    const result = {
      tool: 'cppcheck-security',
      issues: [
        {
          severity: 'critical',
          file: 'src/auth/login.c',
          line: 56,
          message: 'Potential SQL injection vulnerability',
          cwe: 'CWE-89',
          suggestion: 'Use parameterized queries'
        },
        {
          severity: 'high',
          file: 'src/utils/buffer.c',
          line: 34,
          message: 'Buffer overflow vulnerability',
          cwe: 'CWE-120',
          suggestion: 'Use safe string functions (strncpy, snprintf)'
        }
      ],
      statistics: {
        filesScanned: 45,
        vulnerabilitiesFound: 2,
        criticalCount: 1,
        highCount: 1
      }
    };

    console.log(`   ⚠️ 发现 ${result.issues.length} 个安全问题`);

    return result;
  }

  /**
   * 计算质量评分
   */
  calculateScore(staticAnalysis, styleCheck, complexity, security) {
    let score = 100;

    // 静态分析扣分
    score -= staticAnalysis.issues.length * 5;

    // 风格问题扣分
    score -= styleCheck.issues.length * 1;

    // 复杂度扣分
    const complexityPenalty = Math.max(0, (complexity.metrics.averageCyclomatic - 3) * 2);
    score -= complexityPenalty;

    // 安全问题扣分
    score -= security.issues.filter(i => i.severity === 'critical').length * 20;
    score -= security.issues.filter(i => i.severity === 'high').length * 10;

    // 确保在 0-100 范围内
    score = Math.max(0, Math.min(100, score));

    // 转换为等级
    return this.scoreToGrade(score);
  }

  /**
   * 分数转等级
   */
  scoreToGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * 按严重程度计数
   */
  countBySeverity(issues, severity) {
    return issues.filter(i => i.severity === severity).length;
  }

  /**
   * 生成建议
   */
  generateRecommendations(staticAnalysis, styleCheck, complexity, security) {
    const recommendations = [];

    // 安全问题优先
    if (security.issues.length > 0) {
      recommendations.push({
        type: 'security',
        severity: 'critical',
        message: `发现 ${security.issues.length} 个安全漏洞`,
        action: '立即修复安全漏洞，特别是 critical 和 high 级别'
      });
    }

    // 静态分析问题
    if (staticAnalysis.issues.length > 0) {
      recommendations.push({
        type: 'static-analysis',
        severity: 'high',
        message: `发现 ${staticAnalysis.issues.length} 个静态分析问题`,
        action: '修复高严重度问题，遵循 MISRA/CERT 标准'
      });
    }

    // 复杂度问题
    if (complexity.metrics.highComplexityFunctions > 0) {
      recommendations.push({
        type: 'complexity',
        severity: 'medium',
        message: `${complexity.metrics.highComplexityFunctions} 个函数复杂度过高`,
        action: '重构高复杂度函数，提高可维护性'
      });
    }

    // 风格问题
    if (styleCheck.issues.length > 0) {
      recommendations.push({
        type: 'style',
        severity: 'low',
        message: `发现 ${styleCheck.issues.length} 个风格问题`,
        action: '使用自动格式化工具修复'
      });
    }

    return recommendations;
  }

  /**
   * 保存输出
   */
  async saveOutput(outputDir, result) {
    const outputDirFull = path.join(outputDir, '00_Project_Management/08_持续集成与测试_DevOps/code-quality');

    // 创建目录
    fs.mkdirSync(outputDirFull, { recursive: true });

    // 保存 JSON
    const jsonPath = path.join(outputDirFull, 'report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf-8');

    // 保存 Markdown
    const mdPath = path.join(outputDirFull, 'report.md');
    const mdContent = this.generateMarkdown(result);
    fs.writeFileSync(mdPath, mdContent, 'utf-8');

    console.log(`   📁 代码质量报告已保存: ${outputDirFull}`);
  }

  /**
   * 生成 Markdown 文档
   */
  generateMarkdown(result) {
    const lines = [
      '# 代码质量报告',
      '',
      `**生成时间**: ${new Date().toISOString()}`,
      '',
      '---',
      '',
      '## 质量摘要',
      '',
      `- **质量评分**: ${result.summary.score}`,
      `- **总问题数**: ${result.summary.totalIssues}`,
      `  - Critical: ${result.summary.critical}`,
      `  - High: ${result.summary.high}`,
      `  - Medium: ${result.summary.medium}`,
      `  - Low: ${result.summary.low}`,
      '',
      '## 静态分析',
      '',
      `- 工具: ${result.staticAnalysis.tool}`,
      `- 扫描文件: ${result.staticAnalysis.statistics.filesScanned}`,
      `- 扫描行数: ${result.staticAnalysis.statistics.linesScanned}`,
      `- 发现问题: ${result.staticAnalysis.statistics.issuesFound}`,
      ''
    ];

    if (result.staticAnalysis.issues.length > 0) {
      lines.push('### 问题列表', '');

      for (const issue of result.staticAnalysis.issues) {
        lines.push(`#### [${issue.severity.toUpperCase()}] ${issue.file}:${issue.line}`, '');
        lines.push(`- **消息**: ${issue.message}`);
        lines.push(`- **规则**: ${issue.rule}`);
        lines.push(`- **建议**: ${issue.suggestion}`);
        lines.push('');
      }
    }

    lines.push('## 代码风格', '', `- 工具: ${result.styleCheck.tool}`, `- 合规率: ${result.styleCheck.statistics.complianceRate}%`, '');

    lines.push('## 复杂度分析', '', `- 平均圈复杂度: ${result.complexity.metrics.averageCyclomatic}`, `- 最大圈复杂度: ${result.complexity.metrics.maxCyclomatic}`, `- 高复杂度函数: ${result.complexity.metrics.highComplexityFunctions}`, `- 复杂度等级: ${result.complexity.summary.grade}`, '');

    lines.push('## 安全扫描', '', `- 扫描工具: ${result.security.tool}`, `- 发现漏洞: ${result.security.statistics.vulnerabilitiesFound}`, '');

    if (result.security.issues.length > 0) {
      lines.push('### 安全问题', '');

      for (const issue of result.security.issues) {
        lines.push(`#### [${issue.severity.toUpperCase()}] ${issue.file}:${issue.line}`, '');
        lines.push(`- **消息**: ${issue.message}`);
        lines.push(`- **CWE**: ${issue.cwe}`);
        lines.push(`- **建议**: ${issue.suggestion}`);
        lines.push('');
      }
    }

    if (result.recommendations.length > 0) {
      lines.push('## 建议', '');

      for (const rec of result.recommendations) {
        lines.push(`- **[${rec.severity}]** ${rec.message}`);
        lines.push(`  - 操作: ${rec.action}`);
        lines.push('');
      }
    }

    return lines.join('\n');
  }
}

module.exports = CodeQuality;
