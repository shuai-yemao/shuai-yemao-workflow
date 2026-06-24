# 工厂测试工作流使用指南

## 执行模式

### 1. 完整执行 (full-run)

```javascript
const result = await workflow.execute({
  mode: 'full-run',
  outputDir: 'D:/project/path',
  inputData: {
    product: { id: 'PROD-001', name: '智能传感器模块' },
    testCases: [...],
    testRuns: [...]
  }
});
```

### 2. 测试规划 (plan-tests)

```javascript
const result = await workflow.execute({
  mode: 'plan-tests',
  outputDir: 'D:/project/path',
  inputData: {
    product: { id: 'PROD-001', name: '智能传感器模块' },
    testCases: [
      { name: 'ICT 测试', type: 'ict', duration: 3, equipment: ['ICT 测试机'] },
      { name: 'FCT 测试', type: 'fct', duration: 5, equipment: ['万用表'] }
    ]
  }
});
```

### 3. 测试执行 (execute-tests)

```javascript
const result = await workflow.execute({
  mode: 'execute-tests',
  outputDir: 'D:/project/path',
  inputData: {
    product: { id: 'PROD-001', name: '智能传感器模块' },
    testRuns: [
      { testCaseName: 'ICT 测试', serialNumber: 'SN001', operator: '张三', result: 'pass' },
      { testCaseName: 'FCT 测试', serialNumber: 'SN001', operator: '张三', result: 'fail', defects: [{ description: '电压异常' }] }
    ]
  }
});
```

## 常见问题

### Q: 如何定义测试用例？

A: 每个测试用例包括：
- **name**: 测试名称
- **type**: 测试类型（ict/fct/burn-in 等）
- **duration**: 预计时长（分钟）
- **equipment**: 所需设备
- **passCriteria**: 通过标准

### Q: 如何记录测试结果？

A: 使用 `testRuns` 记录每次测试的执行情况，包括产品序列号、操作员、结果和缺陷信息。

### Q: 可以与生产管理工作流集成吗？

A: 可以。测试结果可以传递给生产管理的质量检查模块。

### Q: 如何追踪产品测试历史？

A: 通过产品序列号（serialNumber）可以查询该产品的所有测试记录。
