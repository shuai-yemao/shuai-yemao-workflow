# 知识产权管理工作流使用指南

## 执行模式

### 1. 完整执行 (full-run)

```javascript
const result = await workflow.execute({
  mode: 'full-run',
  outputDir: 'D:/project/path',
  inputData: {
    product: { id: 'PROD-001', name: '智能传感器模块' },
    patents: [...],
    trademarks: [...],
    copyrights: [...]
  }
});
```

### 2. 专利管理 (manage-patents)

```javascript
const result = await workflow.execute({
  mode: 'manage-patents',
  outputDir: 'D:/project/path',
  inputData: {
    product: { id: 'PROD-001', name: '智能传感器模块' },
    patents: [
      { title: '一种传感器数据采集方法', type: 'invention', inventors: ['张三'], cost: 5000 }
    ]
  }
});
```

### 3. 商标管理 (manage-trademarks)

```javascript
const result = await workflow.execute({
  mode: 'manage-trademarks',
  outputDir: 'D:/project/path',
  inputData: {
    product: { id: 'PROD-001', name: '智能传感器模块' },
    trademarks: [
      { name: 'SmartSensor', category: 'text', classes: ['09'] }
    ]
  }
});
```

### 4. 版权管理 (manage-copyrights)

```javascript
const result = await workflow.execute({
  mode: 'manage-copyrights',
  outputDir: 'D:/project/path',
  inputData: {
    product: { id: 'PROD-001', name: '智能传感器模块' },
    copyrights: [
      { title: 'SmartSensor 软件 V1.0', type: 'software', author: '公司' }
    ]
  }
});
```

## 常见问题

### Q: 专利类型如何选择？

A: 根据保护对象选择：
- **invention（发明）**: 方法、工艺、配方等
- **utility-model（实用新型）**: 产品形状、结构
- **design（外观设计）**: 产品外观

### Q: 商标类别如何确定？

A: 根据产品/服务选择尼斯分类：
- **09类**: 电子产品、软件
- **42类**: 技术服务、软件开发

### Q: 软件是否需要登记版权？

A: 软件版权自开发完成即自动产生，但登记后便于维权和证明权属。

### Q: 知识产权费用包括哪些？

A: 包括申请费、代理费、审查费、年费等。
