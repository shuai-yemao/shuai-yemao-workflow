/**
 * 产品生产管理工作流
 *
 * 简洁实用的生产管理，专为小批量试产场景设计
 */

const path = require('path');
const BomManagement = require('./modules/bom-management');
const InventoryTracking = require('./modules/inventory-tracking');
const ProductionPlanning = require('./modules/production-planning');
const QualityControl = require('./modules/quality-control');
const JsonValidator = require('./utils/json-validator');

class ProductionManagement {
  constructor(options = {}) {
    this.options = {
      currency: options.currency || 'CNY',
      ...options
    };

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
      case 'full-run':
        result = await this.executeFullRun(outputDir, inputData);
        break;

      case 'bom-only':
        result = await this.executeBomOnly(outputDir, inputData);
        break;

      case 'inventory-check':
        result = await this.executeInventoryCheck(outputDir, inputData);
        break;

      case 'plan-production':
        result = await this.executePlanProduction(outputDir, inputData);
        break;

      case 'quality-audit':
        result = await this.executeQualityAudit(outputDir, inputData);
        break;

      case 'daily-report':
        result = await this.executeDailyReport(outputDir, inputData);
        break;

      case 'single':
        result = await this.executeSingleModule(moduleName, outputDir, inputData);
        break;

      default:
        throw new Error(`未知的执行模式: ${mode}`);
    }

    return result;
  }

  /**
   * 完整执行
   */
  async executeFullRun(outputDir, inputData) {
    console.log('\n🏭 开始执行完整生产管理流程...\n');

    const results = {};

    // 1. BOM 管理
    console.log('📋 阶段 1/4: BOM 管理...');
    results.bom = await this.executeModule('bom-management', outputDir, inputData);

    // 2. 库存检查
    console.log('📦 阶段 2/4: 库存检查...');
    results.inventory = await this.executeModule('inventory-tracking', outputDir, {
      ...inputData,
      bom: results.bom.bom
    });

    // 3. 生产排产
    console.log('📅 阶段 3/4: 生产排产...');
    results.planning = await this.executeModule('production-planning', outputDir, {
      ...inputData,
      bom: results.bom.bom,
      inventory: results.inventory
    });

    // 4. 质量检查准备
    console.log('✅ 阶段 4/4: 质量检查准备...');
    results.quality = await this.executeModule('quality-control', outputDir, {
      ...inputData,
      bom: results.bom.bom,
      planning: results.planning
    });

    console.log('\n✅ 完整生产管理流程执行完成\n');

    return {
      success: true,
      results,
      summary: this.generateSummary(results)
    };
  }

  /**
   * 仅 BOM 管理
   */
  async executeBomOnly(outputDir, inputData) {
    console.log('\n📋 执行 BOM 管理...\n');

    const result = await this.executeModule('bom-management', outputDir, inputData);

    return {
      success: true,
      result
    };
  }

  /**
   * 库存检查
   */
  async executeInventoryCheck(outputDir, inputData) {
    console.log('\n📦 执行库存检查...\n');

    const result = await this.executeModule('inventory-tracking', outputDir, inputData);

    return {
      success: true,
      result
    };
  }

  /**
   * 生产排产
   */
  async executePlanProduction(outputDir, inputData) {
    console.log('\n📅 执行生产排产...\n');

    const result = await this.executeModule('production-planning', outputDir, inputData);

    return {
      success: true,
      result
    };
  }

  /**
   * 质量审计
   */
  async executeQualityAudit(outputDir, inputData) {
    console.log('\n✅ 执行质量审计...\n');

    const result = await this.executeModule('quality-control', outputDir, inputData);

    return {
      success: true,
      result
    };
  }

  /**
   * 每日报告
   */
  async executeDailyReport(outputDir, inputData) {
    console.log('\n📊 生成每日生产报告...\n');

    // 合并所有模块的今日数据
    const result = {
      date: new Date().toISOString().split('T')[0],
      production: inputData.production || {},
      inventory: inputData.inventory || {},
      quality: inputData.quality || {},
      summary: this.generateDailySummary(inputData)
    };

    // 保存报告
    const fs = require('fs');
    const reportDir = path.join(outputDir, '00_Project_Management/09_产品生产管理_Six_Sigma/reports');
    fs.mkdirSync(reportDir, { recursive: true });

    const reportPath = path.join(reportDir, `daily-report-${result.date}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(result, null, 2), 'utf-8');

    console.log(`   📁 每日报告已保存: ${reportPath}`);

    return {
      success: true,
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
   * 执行模块
   */
  async executeModule(moduleName, outputDir, inputData) {
    const moduleMap = {
      'bom-management': BomManagement,
      'inventory-tracking': InventoryTracking,
      'production-planning': ProductionPlanning,
      'quality-control': QualityControl
    };

    const ModuleClass = moduleMap[moduleName];
    if (!ModuleClass) {
      throw new Error(`未知的模块: ${moduleName}`);
    }

    const module = new ModuleClass(this.options);
    return await module.execute({
      outputDir,
      inputData
    });
  }

  /**
   * 验证输入
   */
  validateInput(mode, inputData) {
    const requiredFields = {
      'full-run': ['product'],
      'bom-only': ['product'],
      'inventory-check': ['bom'],
      'plan-production': ['product', 'quantity'],
      'quality-audit': ['batchId', 'totalUnits'],
      'daily-report': [],
      'single': []
    };

    const required = requiredFields[mode] || [];
    const missing = required.filter(field => !inputData[field]);

    if (missing.length > 0) {
      throw new Error(`缺少必需的输入字段: ${missing.join(', ')}`);
    }
  }

  /**
   * 生成摘要
   */
  generateSummary(results) {
    return {
      totalModules: 4,
      completedModules: Object.keys(results).length,
      bomCost: results.bom?.bom?.totalCost || 0,
      inventoryStatus: results.inventory?.summary?.lowStockItems === 0 ? '正常' : '有预警',
      productionDuration: results.planning?.plan?.totalDuration || '未知',
      qualityPassRate: results.quality?.quality?.passRate || 0
    };
  }

  /**
   * 生成每日摘要
   */
  function generateDailySummary(inputData) {
    return {
      productionOutput: inputData.production?.output || 0,
      qualityPassRate: inputData.quality?.passRate || 0,
      inventoryAlerts: inputData.inventory?.alerts?.length || 0,
      issues: inputData.issues || []
    };
  }
}

module.exports = ProductionManagement;
