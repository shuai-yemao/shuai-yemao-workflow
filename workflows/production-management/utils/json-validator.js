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
   * 验证产品信息
   */
  validateProduct(product) {
    const errors = [];

    if (!product.id || typeof product.id !== 'string') {
      errors.push('product.id 必须是非空字符串');
    }

    if (!product.name || typeof product.name !== 'string') {
      errors.push('product.name 必须是非空字符串');
    }

    if (!product.modules || !Array.isArray(product.modules)) {
      errors.push('product.modules 必须是数组');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证物料信息
   */
  validateMaterial(material) {
    const errors = [];

    if (!material.materialId || typeof material.materialId !== 'string') {
      errors.push('material.materialId 必须是非空字符串');
    }

    if (!material.name || typeof material.name !== 'string') {
      errors.push('material.name 必须是非空字符串');
    }

    if (typeof material.quantity !== 'number' || material.quantity < 0) {
      errors.push('material.quantity 必须是非负数');
    }

    if (typeof material.unitPrice !== 'number' || material.unitPrice < 0) {
      errors.push('material.unitPrice 必须是非负数');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证 BOM 数据
   */
  validateBom(bom) {
    const errors = [];

    if (!bom.productId || typeof bom.productId !== 'string') {
      errors.push('bom.productId 必须是非空字符串');
    }

    if (!bom.productName || typeof bom.productName !== 'string') {
      errors.push('bom.productName 必须是非空字符串');
    }

    if (!bom.modules || !Array.isArray(bom.modules)) {
      errors.push('bom.modules 必须是数组');
    }

    if (typeof bom.totalCost !== 'number') {
      errors.push('bom.totalCost 必须是数字');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证库存数据
   */
  validateInventory(inventory) {
    const errors = [];

    if (!Array.isArray(inventory)) {
      errors.push('inventory 必须是数组');
    }

    for (const item of inventory) {
      if (!item.materialId) {
        errors.push('库存项必须包含 materialId');
      }
      if (typeof item.quantity !== 'number') {
        errors.push(`库存项 ${item.materialId} 的 quantity 必须是数字`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证生产计划
   */
  validateProductionPlan(plan) {
    const errors = [];

    if (!plan.orderId || typeof plan.orderId !== 'string') {
      errors.push('plan.orderId 必须是非空字符串');
    }

    if (!plan.product || typeof plan.product !== 'string') {
      errors.push('plan.product 必须是非空字符串');
    }

    if (typeof plan.quantity !== 'number' || plan.quantity <= 0) {
      errors.push('plan.quantity 必须是正数');
    }

    if (!plan.stages || !Array.isArray(plan.stages)) {
      errors.push('plan.stages 必须是数组');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证质量检查数据
   */
  validateQualityInspection(inspection) {
    const errors = [];

    if (!inspection.batchId || typeof inspection.batchId !== 'string') {
      errors.push('inspection.batchId 必须是非空字符串');
    }

    if (typeof inspection.totalUnits !== 'number' || inspection.totalUnits <= 0) {
      errors.push('inspection.totalUnits 必须是正数');
    }

    if (!Array.isArray(inspection.checks)) {
      errors.push('inspection.checks 必须是数组');
    }

    if (!Array.isArray(inspection.defects)) {
      errors.push('inspection.defects 必须是数组');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 清洗产品数据
   */
  sanitizeProduct(product) {
    return {
      id: product.id || `PROD-${Date.now()}`,
      name: product.name || '未命名产品',
      version: product.version || '1.0.0',
      modules: (product.modules || []).map(m => this.sanitizeModule(m))
    };
  }

  /**
   * 清洗模块数据
   */
  sanitizeModule(module) {
    return {
      moduleId: module.moduleId || `MOD-${Date.now()}`,
      name: module.name || '未命名模块',
      quantity: module.quantity || 1,
      materials: (module.materials || []).map(m => this.sanitizeMaterial(m))
    };
  }

  /**
   * 清洗物料数据
   */
  sanitizeMaterial(material) {
    return {
      materialId: material.materialId || `MAT-${Date.now()}`,
      name: material.name || '未命名物料',
      quantity: material.quantity || 1,
      unitPrice: material.unitPrice || 0,
      supplier: material.supplier || '未指定',
      category: material.category || '其他'
    };
  }
}

module.exports = JsonValidator;
