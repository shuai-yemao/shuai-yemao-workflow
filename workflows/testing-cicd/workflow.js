/**
 * 嵌入式 C/C++ 测试与 CI/CD 工作流
 *
 * 完整的 CI/CD 流水线支持：
 * - 测试规划
 * - 单元测试
 * - 代码质量
 * - 集成测试
 * - 构建
 * - 系统测试
 * - 部署
 * - 监控
 */

const path = require('path');
const TestPlanning = require('./modules/test-planning');
const UnitTesting = require('./modules/unit-testing');
const IntegrationTesting = require('./modules/integration-testing');
const SystemTesting = require('./modules/system-testing');
const CodeQuality = require('./modules/code-quality');
const Build = require('./modules/build');
const Deploy = require('./modules/deploy');
const Monitor = require('./modules/monitor');
const QualityGate = require('./utils/quality-gate');
const ConfigGenerator = require('./utils/config-generator');
const JsonValidator = require('./utils/json-validator');

class TestingCICD {
  constructor(options = {}) {
    this.options = {
      testFramework: options.testFramework || 'unity',
      coverageTool: options.coverageTool || 'gcov',
      mockFramework: options.mockFramework || 'cmock',
      staticAnalyzer: options.staticAnalyzer || 'cppcheck',
      codingStandard: options.codingStandard || 'misra-c-2012',
      qualityGate: {
        unitTestCoverage: 80,
        integrationTestPass: 100,
        systemTestPass: 95,
        codeQualityScore: 'A',
        misraViolations: 0,
        securityVulnerabilities: 0,
        ...options.qualityGate
      },
      ...options
    };

    this.qualityGate = new QualityGate(this.options.qualityGate);
    this.configGenerator = new ConfigGenerator();
    this.validator = new JsonValidator();
  }

  /**
   * 执行工作流
   */
  async execute(config) {
    const {
      mode,
      module: moduleName,
      outputDir,
      inputData = {}
    } = config;

    // 验证输入
    this.validateInput(mode, inputData);

    let result;

    switch (mode) {
      case 'full-pipeline':
        result = await this.executeFullPipeline(outputDir, inputData);
        break;

      case 'test-only':
        result = await this.executeTestOnly(outputDir, inputData);
        break;

      case 'build-only':
        result = await this.executeBuildOnly(outputDir, inputData);
        break;

      case 'quality-check':
        result = await this.executeQualityCheck(outputDir, inputData);
        break;

      case 'single':
        result = await this.executeSingleModule(moduleName, outputDir, inputData);
        break;

      case 'incremental':
        result = await this.executeIncremental(outputDir, inputData);
        break;

      case 'generate-config':
        result = await this.generateConfig(outputDir, inputData);
        break;

      default:
        throw new Error(`未知的执行模式: ${mode}`);
    }

    return result;
  }

  /**
   * 执行完整 CI/CD 流水线
   */
  async executeFullPipeline(outputDir, inputData) {
    console.log('\n🚀 开始执行完整 CI/CD 流水线...\n');

    const results = {};

    // 1. 测试规划
    console.log('📋 阶段 1/8: 测试规划...');
    results.testPlanning = await this.executeModule('test-planning', outputDir, inputData);

    // 检查质量门禁
    if (!this.qualityGate.checkPlanning(results.testPlanning)) {
      console.log('❌ 测试规划未通过质量门禁');
      return { success: false, stage: 'test-planning', results };
    }

    // 2. 单元测试
    console.log('🧪 阶段 2/8: 单元测试...');
    results.unitTesting = await this.executeModule('unit-testing', outputDir, inputData);

    if (!this.qualityGate.checkUnitTest(results.unitTesting)) {
      console.log('❌ 单元测试未通过质量门禁');
      return { success: false, stage: 'unit-testing', results };
    }

    // 3. 代码质量
    console.log('📊 阶段 3/8: 代码质量检查...');
    results.codeQuality = await this.executeModule('code-quality', outputDir, inputData);

    if (!this.qualityGate.checkCodeQuality(results.codeQuality)) {
      console.log('❌ 代码质量未通过质量门禁');
      return { success: false, stage: 'code-quality', results };
    }

    // 4. 集成测试
    console.log('🔗 阶段 4/8: 集成测试...');
    results.integrationTesting = await this.executeModule('integration-testing', outputDir, inputData);

    if (!this.qualityGate.checkIntegrationTest(results.integrationTesting)) {
      console.log('❌ 集成测试未通过质量门禁');
      return { success: false, stage: 'integration-testing', results };
    }

    // 5. 构建
    console.log('🔨 阶段 5/8: 构建...');
    results.build = await this.executeModule('build', outputDir, inputData);

    if (!this.qualityGate.checkBuild(results.build)) {
      console.log('❌ 构建未通过质量门禁');
      return { success: false, stage: 'build', results };
    }

    // 6. 系统测试
    console.log('🎯 阶段 6/8: 系统测试...');
    results.systemTesting = await this.executeModule('system-testing', outputDir, inputData);

    if (!this.qualityGate.checkSystemTest(results.systemTesting)) {
      console.log('❌ 系统测试未通过质量门禁');
      return { success: false, stage: 'system-testing', results };
    }

    // 7. 部署
    console.log('📦 阶段 7/8: 部署...');
    results.deploy = await this.executeModule('deploy', outputDir, inputData);

    // 8. 监控
    console.log('📈 阶段 8/8: 监控配置...');
    results.monitor = await this.executeModule('monitor', outputDir, inputData);

    console.log('\n✅ 完整 CI/CD 流水线执行完成\n');

    return {
      success: true,
      results,
      summary: this.generatePipelineSummary(results)
    };
  }

  /**
   * 仅执行测试
   */
  async executeTestOnly(outputDir, inputData) {
    console.log('\n🧪 执行测试（单元 + 集成 + 系统）...\n');

    const results = {};

    results.unitTesting = await this.executeModule('unit-testing', outputDir, inputData);
    results.integrationTesting = await this.executeModule('integration-testing', outputDir, inputData);
    results.systemTesting = await this.executeModule('system-testing', outputDir, inputData);

    return {
      success: this.qualityGate.checkAllTests(results),
      results
    };
  }

  /**
   * 仅执行构建
   */
  async executeBuildOnly(outputDir, inputData) {
    console.log('\n🔨 执行构建...\n');

    const result = await this.executeModule('build', outputDir, inputData);

    return {
      success: this.qualityGate.checkBuild(result),
      result
    };
  }

  /**
   * 仅执行代码质量检查
   */
  async executeQualityCheck(outputDir, inputData) {
    console.log('\n📊 执行代码质量检查...\n');

    const result = await this.executeModule('code-quality', outputDir, inputData);

    return {
      success: this.qualityGate.checkCodeQuality(result),
      result
    };
  }

  /**
   * 执行单个模块
   */
  async executeSingleModule(moduleName, outputDir, inputData) {
    console.log(`\n📦 执行模块: ${moduleName}...\n`);

    const result = await this.executeModule(moduleName, outputDir, inputData);

    return {
      success: true,
      module: moduleName,
      result
    };
  }

  /**
   * 执行增量测试
   */
  async executeIncremental(outputDir, inputData) {
    console.log('\n🔄 执行增量测试...\n');

    const { changedFiles = [] } = inputData;

    if (changedFiles.length === 0) {
      console.log('⚠️ 没有变更文件，跳过测试');
      return { success: true, skipped: true };
    }

    // 分析变更影响
    const impact = this.analyzeChangeImpact(changedFiles);

    // 仅测试受影响的模块
    const results = {};

    if (impact.unitTests) {
      results.unitTesting = await this.executeModule('unit-testing', outputDir, {
        ...inputData,
        testFilter: impact.unitTestFiles
      });
    }

    if (impact.integrationTests) {
      results.integrationTesting = await this.executeModule('integration-testing', outputDir, {
        ...inputData,
        testFilter: impact.integrationTestFiles
      });
    }

    return {
      success: true,
      incremental: true,
      impact,
      results
    };
  }

  /**
   * 生成 CI/CD 配置
   */
  async generateConfig(outputDir, inputData) {
    console.log('\n⚙️ 生成 CI/CD 配置...\n');

    const { platform = 'github-actions' } = inputData;

    const config = this.configGenerator.generate(platform, {
      testFramework: this.options.testFramework,
      coverageTool: this.options.coverageTool,
      staticAnalyzer: this.options.staticAnalyzer,
      ...inputData
    });

    // 保存配置
    const fs = require('fs');
    const configDir = path.join(outputDir, '00_Project_Management/08_持续集成与测试_DevOps/cicd-config');
    fs.mkdirSync(configDir, { recursive: true });

    const configPath = path.join(configDir, config.filename);
    fs.writeFileSync(configPath, config.content, 'utf-8');

    console.log(`   📁 配置已保存: ${configPath}`);

    return {
      success: true,
      platform,
      configPath,
      config: config.content
    };
  }

  /**
   * 执行模块
   */
  async executeModule(moduleName, outputDir, inputData) {
    const moduleMap = {
      'test-planning': TestPlanning,
      'unit-testing': UnitTesting,
      'integration-testing': IntegrationTesting,
      'system-testing': SystemTesting,
      'code-quality': CodeQuality,
      'build': Build,
      'deploy': Deploy,
      'monitor': Monitor
    };

    const ModuleClass = moduleMap[moduleName];
    if (!ModuleClass) {
      throw new Error(`未知的模块: ${moduleName}`);
    }

    const module = new ModuleClass(this.options);
    return await module.execute({
      outputDir,
      inputData,
      qualityGate: this.qualityGate
    });
  }

  /**
   * 分析变更影响
   */
  analyzeChangeImpact(changedFiles) {
    const impact = {
      unitTests: false,
      integrationTests: false,
      systemTests: false,
      unitTestFiles: [],
      integrationTestFiles: []
    };

    for (const file of changedFiles) {
      if (file.startsWith('src/') || file.startsWith('include/')) {
        impact.unitTests = true;
        impact.unitTestFiles.push(file);
      }

      if (file.startsWith('test/integration/')) {
        impact.integrationTests = true;
        impact.integrationTestFiles.push(file);
      }

      if (file.startsWith('test/system/')) {
        impact.systemTests = true;
      }
    }

    return impact;
  }

  /**
   * 验证输入
   */
  validateInput(mode, inputData) {
    const requiredFields = {
      'full-pipeline': [],
      'test-only': [],
      'build-only': [],
      'quality-check': [],
      'single': [],
      'incremental': ['changedFiles'],
      'generate-config': ['platform']
    };

    const required = requiredFields[mode] || [];
    const missing = required.filter(field => !inputData[field]);

    if (missing.length > 0) {
      throw new Error(`缺少必需的输入字段: ${missing.join(', ')}`);
    }
  }

  /**
   * 生成流水线摘要
   */
  generatePipelineSummary(results) {
    return {
      totalStages: 8,
      completedStages: Object.keys(results).length,
      success: Object.values(results).every(r => r !== null),
      testCoverage: results.unitTesting?.coverage?.lines || 0,
      codeQualityScore: results.codeQuality?.summary?.score || 'N/A',
      buildSuccess: results.build?.success || false
    };
  }
}

module.exports = TestingCICD;
