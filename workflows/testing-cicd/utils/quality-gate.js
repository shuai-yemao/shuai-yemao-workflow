/**
 * 质量门禁模块
 *
 * 职责：
 * - 定义质量标准
 * - 检查各项指标
 * - 决定是否阻断流水线
 */

class QualityGate {
  constructor(config = {}) {
    this.config = {
      unitTestCoverage: 80,
      integrationTestPass: 100,
      systemTestPass: 95,
      codeQualityScore: 'A',
      misraViolations: 0,
      securityVulnerabilities: 0,
      buildSuccess: true,
      ...config
    };
  }

  /**
   * 检查测试规划
   */
  checkPlanning(testPlan) {
    if (!testPlan) return false;

    // 检查是否有测试计划
    if (!testPlan.testStrategy) {
      console.log('   ⚠️ 缺少测试策略');
      return false;
    }

    return true;
  }

  /**
   * 检查单元测试
   */
  checkUnitTest(unitTestResult) {
    if (!unitTestResult) return false;

    const { coverage, summary } = unitTestResult;

    // 检查覆盖率
    if (coverage.lines.percentage < this.config.unitTestCoverage) {
      console.log(`   ❌ 单元测试覆盖率 ${coverage.lines.percentage}% 低于目标 ${this.config.unitTestCoverage}%`);
      return false;
    }

    // 检查通过率
    if (summary.passRate < 1) {
      console.log(`   ❌ 单元测试有失败用例`);
      return false;
    }

    console.log(`   ✅ 单元测试通过质量门禁`);
    return true;
  }

  /**
   * 检查代码质量
   */
  checkCodeQuality(qualityResult) {
    if (!qualityResult) return false;

    const { summary } = qualityResult;

    // 检查质量评分
    if (summary.score !== this.config.codeQualityScore) {
      const scoreOrder = ['A', 'B', 'C', 'D', 'F'];
      const targetIndex = scoreOrder.indexOf(this.config.codeQualityScore);
      const actualIndex = scoreOrder.indexOf(summary.score);

      if (actualIndex > targetIndex) {
        console.log(`   ❌ 代码质量评分 ${summary.score} 低于目标 ${this.config.codeQualityScore}`);
        return false;
      }
    }

    // 检查严重问题
    if (summary.critical > 0) {
      console.log(`   ❌ 发现 ${summary.critical} 个 Critical 级别问题`);
      return false;
    }

    // 检查 MISRA 违规
    if (qualityResult.staticAnalysis && qualityResult.staticAnalysis.issues) {
      const misraViolations = qualityResult.staticAnalysis.issues.filter(
        i => i.rule && i.rule.startsWith('MISRA')
      ).length;

      if (misraViolations > this.config.misraViolations) {
        console.log(`   ❌ MISRA 违规数 ${misraViolations} 超过限制 ${this.config.misraViolations}`);
        return false;
      }
    }

    console.log(`   ✅ 代码质量通过质量门禁`);
    return true;
  }

  /**
   * 检查集成测试
   */
  checkIntegrationTest(integrationResult) {
    if (!integrationResult) return false;

    const { summary } = integrationResult;

    // 检查通过率
    if (summary.passRate * 100 < this.config.integrationTestPass) {
      console.log(`   ❌ 集成测试通过率 ${(summary.passRate * 100).toFixed(1)}% 低于目标 ${this.config.integrationTestPass}%`);
      return false;
    }

    console.log(`   ✅ 集成测试通过质量门禁`);
    return true;
  }

  /**
   * 检查构建
   */
  checkBuild(buildResult) {
    if (!buildResult) return false;

    if (!buildResult.success) {
      console.log(`   ❌ 构建失败`);
      return false;
    }

    // 检查警告
    if (buildResult.compilation && buildResult.compilation.warnings > 10) {
      console.log(`   ⚠️ 构建警告过多: ${buildResult.compilation.warnings}`);
    }

    console.log(`   ✅ 构建通过质量门禁`);
    return true;
  }

  /**
   * 检查系统测试
   */
  checkSystemTest(systemResult) {
    if (!systemResult) return false;

    const { summary } = systemResult;

    // 检查通过率
    if (summary.passRate * 100 < this.config.systemTestPass) {
      console.log(`   ❌ 系统测试通过率 ${(summary.passRate * 100).toFixed(1)}% 低于目标 ${this.config.systemTestPass}%`);
      return false;
    }

    console.log(`   ✅ 系统测试通过质量门禁`);
    return true;
  }

  /**
   * 检查所有测试
   */
  checkAllTests(testResults) {
    const { unitTesting, integrationTesting, systemTesting } = testResults;

    return this.checkUnitTest(unitTesting) &&
           this.checkIntegrationTest(integrationTesting) &&
           this.checkSystemTest(systemTesting);
  }

  /**
   * 生成门禁报告
   */
  generateReport(results) {
    const report = {
      timestamp: new Date().toISOString(),
      config: this.config,
      checks: {
        planning: this.checkPlanning(results.testPlanning),
        unitTest: this.checkUnitTest(results.unitTesting),
        codeQuality: this.checkCodeQuality(results.codeQuality),
        integrationTest: this.checkIntegrationTest(results.integrationTesting),
        build: this.checkBuild(results.build),
        systemTest: this.checkSystemTest(results.systemTesting)
      },
      passed: false
    };

    report.passed = Object.values(report.checks).every(v => v === true);

    return report;
  }
}

module.exports = QualityGate;
