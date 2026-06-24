# 机械设计管理工作流使用指南

## 执行模式

### 1. 完整执行 (full-run)

```javascript
const result = await workflow.execute({
  mode: 'full-run',
  outputDir: 'D:/project/path',
  inputData: {
    product: { id: 'PROD-001', name: '智能传感器模块' },
    parts: [...],
    assemblies: [...]
  }
});
```

### 2. 零件设计 (design-parts)

```javascript
const result = await workflow.execute({
  mode: 'design-parts',
  outputDir: 'D:/project/path',
  inputData: {
    product: { id: 'PROD-001', name: '智能传感器模块' },
    parts: [
      { name: '外壳', type: 'enclosure', material: 'ABS', weight: 50 }
    ]
  }
});
```

### 3. 装配管理 (manage-assemblies)

```javascript
const result = await workflow.execute({
  mode: 'manage-assemblies',
  outputDir: 'D:/project/path',
  inputData: {
    product: { id: 'PROD-001', name: '智能传感器模块' },
    assemblies: [
      { name: '总成', parts: [{ partId: 'PART-001', quantity: 1 }] }
    ]
  }
});
```

## 常见问题

### Q: 零件类型有哪些？

A: 支持的类型包括：
- **enclosure**: 外壳
- **bracket**: 支架
- **shaft**: 轴
- **gear**: 齿轮
- **spring**: 弹簧
- **fastener**: 紧固件

### Q: 如何管理材料信息？

A: 在零件设计时指定材料，工作流会记录材料信息并用于成本和重量计算。

### Q: 可以与硬件设计工作流集成吗？

A: 可以。机械设计的零件信息可以传递给硬件设计的 BOM 管理。
