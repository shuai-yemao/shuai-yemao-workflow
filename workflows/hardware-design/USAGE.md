# 硬件设计管理工作流使用指南

## 执行模式

### 1. 完整执行 (full-run)

```javascript
const result = await workflow.execute({
  mode: 'full-run',
  outputDir: 'D:/project/path',
  inputData: {
    product: { id: 'PROD-001', name: '智能传感器模块', version: '1.0' },
    requirements: { voltage: '3.3V', temperature: '-40°C to +85°C' },
    components: [...],
    schematics: [...],
    pcbs: [...],
    bomItems: [...],
    reviews: [...]
  }
});
```

### 2. 设计规划 (plan-design)

```javascript
const result = await workflow.execute({
  mode: 'plan-design',
  outputDir: 'D:/project/path',
  inputData: {
    product: { id: 'PROD-001', name: '智能传感器模块' },
    requirements: { voltage: '3.3V' },
    components: [
      { name: 'MCU', type: 'mcu', partNumber: 'STM32F103', cost: 15 }
    ]
  }
});
```

### 3. 原理图管理 (manage-schematic)

```javascript
const result = await workflow.execute({
  mode: 'manage-schematic',
  outputDir: 'D:/project/path',
  inputData: {
    product: { id: 'PROD-001', name: '智能传感器模块' },
    schematics: [
      { name: '主控板', version: '1.0', pages: 2, status: 'draft' }
    ]
  }
});
```

### 4. PCB 管理 (manage-pcb)

```javascript
const result = await workflow.execute({
  mode: 'manage-pcb',
  outputDir: 'D:/project/path',
  inputData: {
    product: { id: 'PROD-001', name: '智能传感器模块' },
    pcbs: [
      { name: '主控板 PCB', version: '1.0', layers: 4, material: 'FR-4' }
    ]
  }
});
```

### 5. BOM 管理 (manage-bom)

```javascript
const result = await workflow.execute({
  mode: 'manage-bom',
  outputDir: 'D:/project/path',
  inputData: {
    product: { id: 'PROD-001', name: '智能传感器模块' },
    bomItems: [
      { componentName: 'STM32F103', partNumber: 'STM32F103C8T6', quantity: 1, unitPrice: 15 }
    ]
  }
});
```

### 6. 评审管理 (manage-reviews)

```javascript
const result = await workflow.execute({
  mode: 'manage-reviews',
  outputDir: 'D:/project/path',
  inputData: {
    product: { id: 'PROD-001', name: '智能传感器模块' },
    reviews: [
      { type: 'design', target: '主控板原理图', reviewer: '张三', result: 'passed', issues: [] }
    ]
  }
});
```

### 7. 获取统计信息 (statistics)

```javascript
const result = await workflow.execute({
  mode: 'statistics',
  outputDir: 'D:/project/path',
  inputData: { recordId: 'HW-001' } // 可选
});
```

## 输出格式

### JSON 输出

```json
{
  "product": { "id": "PROD-001", "name": "智能传感器模块" },
  "plan": {
    "architecture": {
      "components": [
        { "id": "COMP-001", "name": "MCU", "type": "mcu", "partNumber": "STM32F103" }
      ]
    },
    "interfaces": [...],
    "constraints": {...}
  }
}
```

### Markdown 输出

工作流会自动生成 Markdown 格式的报告，包含：
- 组件清单和规格
- 接口定义
- 原理图和 PCB 状态
- BOM 成本分析
- 评审记录

## 常见问题

### Q: 如何选择合适的组件？

A: 在设计规划阶段，根据产品需求（电压、温度、接口等）选择合适的组件。工作流会记录组件选型过程。

### Q: BOM 成本如何计算？

A: BOM 模块会自动计算每个物料的总价（数量 × 单价），并汇总总成本。

### Q: 如何追踪设计评审的问题？

A: 评审管理模块会记录每个评审的问题列表，包括严重度和状态，方便追踪和关闭。

### Q: 可以只执行部分阶段吗？

A: 可以。使用对应的模式（如 `plan-design`）单独执行某个阶段。
