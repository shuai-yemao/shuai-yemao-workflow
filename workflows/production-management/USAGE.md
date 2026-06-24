# 生产管理工作流 - 使用指南

## 快速开始

### 1. 定义产品 BOM

```javascript
const ProductionManagement = require('C:/Users/zhang/.claude/workflows/production-management/workflow');

const pm = new ProductionManagement();

// 创建产品 BOM
const bomResult = await pm.execute({
  mode: 'bom-only',
  outputDir: 'D:/your/project',
  inputData: {
    product: {
      id: 'PROD-001',
      name: '智能传感器模块',
      version: '1.0.0',
      modules: [
        {
          moduleId: 'MOD-PCB',
          name: '主控板',
          quantity: 1,
          materials: [
            {
              materialId: 'MAT-001',
              name: 'STM32F407VGT6',
              quantity: 1,
              unitPrice: 45.00,
              supplier: '供应商A',
              category: 'IC'
            },
            {
              materialId: 'MAT-002',
              name: '100nF 电容',
              quantity: 10,
              unitPrice: 0.05,
              supplier: '供应商B',
              category: '被动元件'
            }
          ]
        },
        {
          moduleId: 'MOD-POWER',
          name: '电源模块',
          quantity: 1,
          materials: [
            {
              materialId: 'MAT-003',
              name: 'AMS1117-3.3',
              quantity: 1,
              unitPrice: 1.50,
              supplier: '供应商A',
              category: 'IC'
            }
          ]
        }
      ]
    }
  }
});

console.log('BOM 创建成功:', bomResult.bom.totalCost);
```

### 2. 检查库存

```javascript
// 检查库存状态
const inventoryResult = await pm.execute({
  mode: 'inventory-check',
  outputDir: 'D:/your/project',
  inputData: {
    bom: bomResult.bom,
    currentStock: [
      { materialId: 'MAT-001', quantity: 50 },
      { materialId: 'MAT-002', quantity: 200 },
      { materialId: 'MAT-003', quantity: 30 }
    ]
  }
});

console.log('库存预警:', inventoryResult.alerts);
```

### 3. 生产排产

```javascript
// 创建生产计划
const planResult = await pm.execute({
  mode: 'plan-production',
  outputDir: 'D:/your/project',
  inputData: {
    orderId: 'ORD-001',
    product: bomResult.bom.product,
    quantity: 50,
    availableMaterials: inventoryResult.materials,
    startDate: '2026-06-25'
  }
});

console.log('生产计划:', planResult.plan.stages);
```

### 4. 质量检查

```javascript
// 执行质量检查
const qualityResult = await pm.execute({
  mode: 'quality-audit',
  outputDir: 'D:/your/project',
  inputData: {
    batchId: 'BATCH-001',
    totalUnits: 50,
    checks: [
      { checkItem: '外观检查', passed: 50 },
      { checkItem: '功能测试', passed: 48 },
      { checkItem: '烧录验证', passed: 50 }
    ],
    defects: [
      { unitId: 'UNIT-023', issue: 'LED 不亮', rootCause: '焊接不良' },
      { unitId: 'UNIT-041', issue: '无法启动', rootCause: '固件错误' }
    ]
  }
});

console.log('通过率:', qualityResult.quality.passRate);
```

### 5. 完整流程

```javascript
// 完整生产管理流程
const fullResult = await pm.execute({
  mode: 'full-run',
  outputDir: 'D:/your/project',
  inputData: {
    product: {
      id: 'PROD-001',
      name: '智能传感器模块',
      modules: [...]
    },
    batchSize: 50,
    startDate: '2026-06-25'
  }
});
```

## 输入数据格式

### 产品信息 (product)

```json
{
  "id": "PROD-001",
  "name": "智能传感器模块",
  "version": "1.0.0",
  "modules": [
    {
      "moduleId": "MOD-PCB",
      "name": "主控板",
      "quantity": 1,
      "materials": [...]
    }
  ]
}
```

### 物料信息 (material)

```json
{
  "materialId": "MAT-001",
  "name": "STM32F407VGT6",
  "quantity": 1,
  "unitPrice": 45.00,
  "supplier": "供应商A",
  "category": "IC",
  "leadTime": "7天",
  "moq": 10
}
```

### 库存信息 (currentStock)

```json
[
  {
    "materialId": "MAT-001",
    "quantity": 50,
    "location": "仓库A",
    "lastUpdated": "2026-06-20"
  }
]
```

## 输出文件说明

### BOM 清单 (bom.json)

```json
{
  "productId": "PROD-001",
  "productName": "智能传感器模块",
  "version": "1.0.0",
  "modules": [
    {
      "moduleId": "MOD-PCB",
      "name": "主控板",
      "quantity": 1,
      "materials": [...],
      "subtotal": 45.50
    }
  ],
  "totalCost": 47.00,
  "currency": "CNY",
  "lastUpdated": "2026-06-20T10:00:00Z"
}
```

### 库存状态 (inventory-status.json)

```json
{
  "lastUpdated": "2026-06-20T10:00:00Z",
  "materials": [
    {
      "materialId": "MAT-001",
      "name": "STM32F407VGT6",
      "currentStock": 50,
      "reserved": 20,
      "available": 30,
      "minimumStock": 10,
      "status": "normal"
    }
  ],
  "alerts": [],
  "summary": {
    "totalMaterials": 3,
    "totalValue": 2350.00,
    "lowStockItems": 0
  }
}
```

### 生产计划 (production-plan.json)

```json
{
  "planId": "PLAN-2026-001",
  "orderId": "ORD-001",
  "product": "智能传感器模块",
  "batchSize": 50,
  "startDate": "2026-06-25",
  "endDate": "2026-06-30",
  "stages": [
    {
      "stage": "物料准备",
      "duration": "1天",
      "status": "pending",
      "dependencies": []
    },
    {
      "stage": "PCB 组装",
      "duration": "2天",
      "status": "pending",
      "dependencies": ["物料准备"]
    }
  ],
  "totalDuration": "5天",
  "estimatedCost": 2350.00
}
```

### 质量报告 (quality-report.json)

```json
{
  "batchId": "BATCH-001",
  "inspectionDate": "2026-06-30",
  "totalUnits": 50,
  "passedUnits": 48,
  "failedUnits": 2,
  "passRate": 0.96,
  "checks": [
    {
      "checkItem": "外观检查",
      "result": "pass",
      "passed": 50,
      "total": 50
    }
  ],
  "defects": [
    {
      "unitId": "UNIT-023",
      "issue": "LED 不亮",
      "rootCause": "焊接不良",
      "action": "返工"
    }
  ],
  "summary": {
    "qualityScore": "A",
    "recommendations": ["加强焊接工艺控制"]
  }
}
```

## 高级用法

### 自定义质量检查项

```javascript
await pm.execute({
  mode: 'quality-audit',
  inputData: {
    customChecks: [
      { checkItem: '功耗测试', threshold: '<100mA' },
      { checkItem: '温度测试', threshold: '<45°C' },
      { checkItem: 'EMC 测试', threshold: 'Class B' }
    ]
  }
});
```

### 生成甘特图

```javascript
// 生产计划会自动生成 Mermaid 甘特图数据
const plan = await pm.execute({
  mode: 'plan-production',
  inputData: {...}
});

// 可以直接在 Markdown 中使用
console.log(plan.ganttChart);
```

## 常见问题

### Q: 如何添加新的物料类别？

A: 在 BOM 管理模块中，物料的 `category` 字段可以自定义，系统会自动分类统计。

### Q: 如何处理物料缺货？

A: 库存检查模块会自动生成缺货预警和采购建议，你可以根据建议进行采购。

### Q: 如何调整生产周期？

A: 在生产排产模块中，可以通过 `stages` 参数自定义每个阶段的持续时间。

### Q: 如何追踪不良品？

A: 质量检查模块会记录每个不良品的详细信息，包括问题、原因和处理方式。

### Q: 如何与其他系统集成？

A: 工作流输出标准 JSON 格式，可以轻松导入到 ERP、MES 等系统。
