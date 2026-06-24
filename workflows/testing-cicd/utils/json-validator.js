/**
 * JSON 验证器
 *
 * 职责：
 * - 验证输入数据格式
 * - 验证输出数据格式
 * - 数据清洗
 */

class JsonValidator {
  /**
   * 验证测试计划输入
   */
  validateTestPlanInput(data) {
    const errors = [];

    if (data.acceptanceCriteria && !Array.isArray(data.acceptanceCriteria)) {
      errors.push('acceptanceCriteria 必须是数组');
    }

    if (data.codeStructure && typeof data.codeStructure !== 'object') {
      errors.push('codeStructure 必须是对象');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证单元测试结果
   */
  validateUnitTestResult(result) {
    const errors = [];

    if (!result.summary) {
      errors.push('缺少 summary 字段');
    } else {
      if (typeof result.summary.total !== 'number') {
        errors.push('summary.total 必须是数字');
      }
      if (typeof result.summary.passed !== 'number') {
        errors.push('summary.passed 必须是数字');
      }
      if (typeof result.summary.failed !== 'number') {
        errors.push('summary.failed 必须是数字');
      }
    }

    if (!result.coverage) {
      errors.push('缺少 coverage 字段');
    } else {
      if (typeof result.coverage.lines !== 'object') {
        errors.push('coverage.lines 必须是对象');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证代码质量结果
   */
  validateCodeQualityResult(result) {
    const errors = [];

    if (!result.summary) {
      errors.push('缺少 summary 字段');
    } else {
      const validScores = ['A', 'B', 'C', 'D', 'F'];
      if (!validScores.includes(result.summary.score)) {
        errors.push('summary.score 必须是 A-F 之间的等级');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证构建结果
   */
  validateBuildResult(result) {
    const errors = [];

    if (typeof result.success !== 'boolean') {
      errors.push('success 必须是布尔值');
    }

    if (!result.compilation) {
      errors.push('缺少 compilation 字段');
    }

    if (!result.memoryAnalysis) {
      errors.push('缺少 memoryAnalysis 字段');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 清洗测试用例
   */
  sanitizeTestCase(testCase) {
    return {
      id: testCase.id || `TC-${Date.now()}`,
      name: testCase.name || 'Unnamed Test',
      type: testCase.type || 'unit',
      status: testCase.status || 'pending',
      input: testCase.input || null,
      expected: testCase.expected || null,
      actual: testCase.actual || null,
      duration: testCase.duration || null,
      message: testCase.message || null
    };
  }

  /**
   * 清洗覆盖率数据
   */
  sanitizeCoverage(coverage) {
    return {
      lines: {
        total: coverage.lines?.total || 0,
        covered: coverage.lines?.covered || 0,
        percentage: coverage.lines?.percentage || 0
      },
      functions: {
        total: coverage.functions?.total || 0,
        covered: coverage.functions?.covered || 0,
        percentage: coverage.functions?.percentage || 0
      },
      branches: {
        total: coverage.branches?.total || 0,
        covered: coverage.branches?.covered || 0,
        percentage: coverage.branches?.percentage || 0
      },
      statements: {
        total: coverage.statements?.total || 0,
        covered: coverage.statements?.covered || 0,
        percentage: coverage.statements?.percentage || 0
      }
    };
  }
}

module.exports = JsonValidator;
