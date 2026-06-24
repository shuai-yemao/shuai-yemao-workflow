/**
 * BOM 管理模块
 *
 * 职责：
 * - 管理产品物料清单
 * - 计算成本汇总
 * - 生成物料需求
 */

const fs = require('fs');
const path = require('path');

class BomManagement {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * 执行 BOM 管理
   */
  async execute(config) {
    const { outputDir, inputData = {} } = config;

    // 1. 解析产品信息
    const product = this.parseProduct(inputData.product);

    // 2. 计算物料成本
    const costSummary = this.calculateCost(product);

    // 3. 生成物料需求
    const materialRequirements = this.generateMaterialRequirements(product, inputData.batchSize || 1);

    // 4. 生成 BOM
    const bom = {
      productId: product.id,
      productName: product.name,
      version: product.version || '1.0.0',
      modules: product.modules,
      totalCost: costSummary.total,
      currency: this.options.currency || 'CNY',
      costSummary,
      materialRequirements,
      lastUpdated: new Date().toISOString()
    };

    // 5. 生成输出
    const result = {
      bom,
      summary: this.generateSummary(bom)
    };

    // 6. 保存到文件
    await this.saveOutput(outputDir, result, product.id);

    return result;
  }

  /**
   * 解析产品信息
   */
  parseProduct(product) {
    if (!product) {
      throw new Error('产品信息不能为空');
    }

    return {
      id: product.id || `PROD-${Date.now()}`,
      name: product.name || '未命名产品',
      version: product.version || '1.0.0',
      modules: product.modules || []
    };
  }

  /**
   * 计算成本
   */
  calculateCost(product) {
    const moduleCosts = [];
    let totalCost = 0;

    for (const module of product.modules) {
      let moduleCost = 0;
      const materialCosts = [];

      for (const material of module.materials || []) {
        const cost = material.quantity * material.unitPrice;
        materialCosts.push({
          materialId: material.materialId,
          name: material.name,
          quantity: material.quantity,
          unitPrice: material.unitPrice,
          totalCost: cost
        });
        moduleCost += cost;
      }

      moduleCosts.push({
        moduleId: module.moduleId,
        name: module.name,
        quantity: module.quantity,
        materialCosts,
        subtotal: moduleCost * module.quantity
      });

      totalCost += moduleCost * module.quantity;
    }

    return {
      total: totalCost,
      byModule: moduleCosts,
      currency: this.options.currency || 'CNY'
    };
  }

  /**
   * 生成物料需求
   */
  generateMaterialRequirements(product, batchSize) {
    const requirements = [];

    for (const module of product.modules) {
      for (const material of module.materials || []) {
        const existing = requirements.find(r => r.materialId === material.materialId);

        if (existing) {
          existing.totalQuantity += material.quantity * module.quantity * batchSize;
        } else {
          requirements.push({
            materialId: material.materialId,
            name: material.name,
            category: material.category || '其他',
            unitPrice: material.unitPrice,
            quantityPerUnit: material.quantity * module.quantity,
            totalQuantity: material.quantity * module.quantity * batchSize,
            totalCost: material.quantity * module.quantity * batchSize * material.unitPrice,
            supplier: material.supplier || '未指定'
          });
        }
      }
    }

    return requirements;
  }

  /**
   * 生成摘要
   */
  generateSummary(bom) {
    return {
      productId: bom.productId,
      productName: bom.productName,
      version: bom.version,
      totalModules: bom.modules.length,
      totalMaterials: bom.materialRequirements.length,
      totalCost: bom.totalCost,
      currency: bom.currency
    };
  }

  /**
   * 保存输出
   */
  async saveOutput(outputDir, result, productId) {
    const outputDirFull = path.join(outputDir, '00_Project_Management/09_产品生产管理_Six_Sigma/bom');

    // 创建目录
    fs.mkdirSync(outputDirFull, { recursive: true });

    // 保存 JSON
    const jsonPath = path.join(outputDirFull, `bom-${productId}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(result.bom, null, 2), 'utf-8');

    // 保存 Markdown
    const mdPath = path.join(outputDirFull, `bom-${productId}.md`);
    const mdContent = this.generateMarkdown(result);
    fs.writeFileSync(mdPath, mdContent, 'utf-8');

    console.log(`   📁 BOM 已保存: ${outputDirFull}`);
  }

  /**
   * 生成 Markdown 文档
   */
  generateMarkdown(result) {
    const { bom, summary } = result;

    const lines = [
      `# BOM 清单 - ${bom.productName}`,
      '',
      `**产品 ID**: ${bom.productId}`,
      `**版本**: ${bom.version}`,
      `**生成时间**: ${bom.lastUpdated}`,
      '',
      '---',
      '',
      '## 成本汇总',
      '',
      `- **总成本**: ${bom.currency} ${bom.totalCost.toFixed(2)}`,
      `- **模块数量**: ${summary.totalModules}`,
      `- **物料种类**: ${summary.totalMaterials}`,
      ''
    ];

    // 模块详情
    lines.push('## 模块详情', '');

    for (const module of bom.modules) {
      lines.push(`### ${module.name} (${module.moduleId})`, '');
      lines.push(`- 数量: ${module.quantity}`, '');

      if (module.materials && module.materials.length > 0) {
        lines.push('**物料清单:**', '');
        lines.push('| 物料 ID | 名称 | 数量 | 单价 | 小计 |', '|---------|------|------|------|------|');

        for (const material of module.materials) {
          const subtotal = material.quantity * material.unitPrice;
          lines.push(`| ${material.materialId} | ${material.name} | ${material.quantity} | ${material.unitPrice} | ${subtotal.toFixed(2)} |`);
        }
        lines.push('');
      }
    }

    // 物料需求
    lines.push('## 物料需求汇总', '');
    lines.push('| 物料 ID | 名称 | 类别 | 单价 | 总数量 | 总成本 | 供应商 |', '|---------|------|------|------|--------|--------|--------|');

    for (const req of bom.materialRequirements) {
      lines.push(`| ${req.materialId} | ${req.name} | ${req.category} | ${req.unitPrice} | ${req.totalQuantity} | ${req.totalCost.toFixed(2)} | ${req.supplier} |`);
    }
    lines.push('');

    return lines.join('\n');
  }
}

module.exports = BomManagement;
