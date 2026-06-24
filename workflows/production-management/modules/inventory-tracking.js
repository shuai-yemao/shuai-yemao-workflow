/**
 * 库存追踪模块
 *
 * 职责：
 * - 追踪原材料、在制品、成品库存
 * - 生成预警信息
 * - 提供采购建议
 */

const fs = require('fs');
const path = require('path');

class InventoryTracking {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * 执行库存追踪
   */
  async execute(config) {
    const { outputDir, inputData = {} } = config;

    // 1. 解析库存数据
    const inventory = this.parseInventory(inputData);

    // 2. 检查库存状态
    const materials = this.checkInventoryStatus(inventory, inputData.bom);

    // 3. 生成预警
    const alerts = this.generateAlerts(materials);

    // 4. 生成采购建议
    const purchaseSuggestions = this.generatePurchaseSuggestions(materials, inputData.bom);

    // 5. 计算库存价值
    const inventoryValue = this.calculateInventoryValue(materials);

    // 6. 生成输出
    const result = {
      lastUpdated: new Date().toISOString(),
      materials,
      alerts,
      purchaseSuggestions,
      inventoryValue,
      summary: this.generateSummary(materials, alerts, inventoryValue)
    };

    // 7. 保存到文件
    await this.saveOutput(outputDir, result);

    return result;
  }

  /**
   * 解析库存数据
   */
  parseInventory(inputData) {
    const currentStock = inputData.currentStock || [];

    return currentStock.map(item => ({
      materialId: item.materialId,
      quantity: item.quantity || 0,
      location: item.location || '默认仓库',
      lastUpdated: item.lastUpdated || new Date().toISOString()
    }));
  }

  /**
   * 检查库存状态
   */
  checkInventoryStatus(inventory, bom) {
    const materials = [];
    const materialRequirements = bom?.materialRequirements || [];

    for (const req of materialRequirements) {
      const stock = inventory.find(s => s.materialId === req.materialId);
      const currentStock = stock?.quantity || 0;
      const minimumStock = Math.ceil(req.quantityPerUnit * 1.5); // 最低库存 = 1.5 倍单次需求

      let status = 'normal';
      if (currentStock < minimumStock) {
        status = 'low';
      }
      if (currentStock === 0) {
        status = 'out-of-stock';
      }

      materials.push({
        materialId: req.materialId,
        name: req.name,
        category: req.category,
        currentStock,
        reserved: 0,
        available: currentStock,
        minimumStock,
        status,
        unitPrice: req.unitPrice,
        supplier: req.supplier,
        location: stock?.location || '默认仓库'
      });
    }

    return materials;
  }

  /**
   * 生成预警
   */
  generateAlerts(materials) {
    const alerts = [];

    for (const material of materials) {
      if (material.status === 'out-of-stock') {
        alerts.push({
          type: 'out-of-stock',
          severity: 'critical',
          materialId: material.materialId,
          name: material.name,
          message: `${material.name} 已缺货`,
          action: '立即采购'
        });
      } else if (material.status === 'low') {
        alerts.push({
          type: 'low-stock',
          severity: 'warning',
          materialId: material.materialId,
          name: material.name,
          message: `${material.name} 库存低于最低库存`,
          action: '建议采购'
        });
      }
    }

    return alerts;
  }

  /**
   * 生成采购建议
   */
  generatePurchaseSuggestions(materials, bom) {
    const suggestions = [];

    for (const material of materials) {
      if (material.status !== 'normal') {
        const suggestedQuantity = material.minimumStock * 2; // 采购量 = 2 倍最低库存
        const estimatedCost = suggestedQuantity * material.unitPrice;

        suggestions.push({
          materialId: material.materialId,
          name: material.name,
          currentStock: material.currentStock,
          suggestedQuantity,
          estimatedCost,
          supplier: material.supplier,
          priority: material.status === 'out-of-stock' ? 'high' : 'medium'
        });
      }
    }

    return suggestions;
  }

  /**
   * 计算库存价值
   */
  calculateInventoryValue(materials) {
    let totalValue = 0;
    const byCategory = {};

    for (const material of materials) {
      const value = material.currentStock * material.unitPrice;
      totalValue += value;

      if (!byCategory[material.category]) {
        byCategory[material.category] = 0;
      }
      byCategory[material.category] += value;
    }

    return {
      total: totalValue,
      byCategory,
      currency: this.options.currency || 'CNY'
    };
  }

  /**
   * 生成摘要
   */
  generateSummary(materials, alerts, inventoryValue) {
    const normalCount = materials.filter(m => m.status === 'normal').length;
    const lowCount = materials.filter(m => m.status === 'low').length;
    const outOfStockCount = materials.filter(m => m.status === 'out-of-stock').length;

    return {
      totalMaterials: materials.length,
      normalStock: normalCount,
      lowStock: lowCount,
      outOfStock: outOfStockCount,
      totalAlerts: alerts.length,
      totalValue: inventoryValue.total,
      currency: inventoryValue.currency
    };
  }

  /**
   * 保存输出
   */
  async saveOutput(outputDir, result) {
    const outputDirFull = path.join(outputDir, '00_Project_Management/09_产品生产管理_Six_Sigma/inventory');

    // 创建目录
    fs.mkdirSync(outputDirFull, { recursive: true });

    // 保存 JSON
    const jsonPath = path.join(outputDirFull, 'inventory-status.json');
    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf-8');

    // 保存 Markdown
    const mdPath = path.join(outputDirFull, 'inventory-status.md');
    const mdContent = this.generateMarkdown(result);
    fs.writeFileSync(mdPath, mdContent, 'utf-8');

    console.log(`   📁 库存状态已保存: ${outputDirFull}`);
  }

  /**
   * 生成 Markdown 文档
   */
  generateMarkdown(result) {
    const lines = [
      '# 库存状态报告',
      '',
      `**更新时间**: ${result.lastUpdated}`,
      '',
      '---',
      '',
      '## 库存摘要',
      '',
      `- **物料总数**: ${result.summary.totalMaterials}`,
      `- **正常库存**: ${result.summary.normalStock}`,
      `- **低库存**: ${result.summary.lowStock}`,
      `- **缺货**: ${result.summary.outOfStock}`,
      `- **库存总值**: ${result.summary.currency} ${result.summary.totalValue.toFixed(2)}`,
      ''
    ];

    // 预警信息
    if (result.alerts.length > 0) {
      lines.push('## ⚠️ 预警信息', '');

      for (const alert of result.alerts) {
        lines.push(`- **[${alert.severity.toUpperCase()}]** ${alert.message}`);
        lines.push(`  - 操作: ${alert.action}`);
        lines.push('');
      }
    }

    // 库存详情
    lines.push('## 库存详情', '');
    lines.push('| 物料 ID | 名称 | 当前库存 | 最低库存 | 状态 | 供应商 |', '|---------|------|----------|----------|------|--------|');

    for (const material of result.materials) {
      const statusIcon = material.status === 'normal' ? '✅' :
                         material.status === 'low' ? '⚠️' : '❌';
      lines.push(`| ${material.materialId} | ${material.name} | ${material.currentStock} | ${material.minimumStock} | ${statusIcon} ${material.status} | ${material.supplier} |`);
    }
    lines.push('');

    // 采购建议
    if (result.purchaseSuggestions.length > 0) {
      lines.push('## 采购建议', '');
      lines.push('| 物料 ID | 名称 | 当前库存 | 建议采购量 | 预估成本 | 优先级 |', '|---------|------|----------|------------|----------|--------|');

      for (const suggestion of result.purchaseSuggestions) {
        lines.push(`| ${suggestion.materialId} | ${suggestion.name} | ${suggestion.currentStock} | ${suggestion.suggestedQuantity} | ${suggestion.estimatedCost.toFixed(2)} | ${suggestion.priority} |`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}

module.exports = InventoryTracking;
