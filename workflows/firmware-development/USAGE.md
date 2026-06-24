# 固件开发管理工作流使用指南

## 执行模式

### 1. 完整执行 (full-run)

```javascript
const result = await workflow.execute({
  mode: 'full-run',
  outputDir: 'D:/project/path',
  inputData: {
    product: { id: 'PROD-001', name: '智能传感器模块' },
    requirements: { mcu: 'STM32F103' },
    modules: [...],
    releases: [...],
    builds: [...],
    testSuites: [...]
  }
});
```

### 2. 架构设计 (design-architecture)

```javascript
const result = await workflow.execute({
  mode: 'design-architecture',
  outputDir: 'D:/project/path',
  inputData: {
    product: { id: 'PROD-001', name: '智能传感器模块' },
    requirements: { mcu: 'STM32F103', rtos: 'FreeRTOS' },
    modules: [
      { name: 'HAL', type: 'driver', layer: 'hal' },
      { name: 'Application', type: 'application', layer: 'application' }
    ]
  }
});
```

### 3. 版本控制 (manage-versions)

```javascript
const result = await workflow.execute({
  mode: 'manage-versions',
  outputDir: 'D:/project/path',
  inputData: {
    product: { id: 'PROD-001', name: '智能传感器模块' },
    releases: [
      { version: '1.0.0', status: 'released', description: '初始版本' },
      { version: '1.1.0', status: 'planned', description: '新增功能' }
    ]
  }
});
```

### 4. 构建管理 (manage-builds)

```javascript
const result = await workflow.execute({
  mode: 'manage-builds',
  outputDir: 'D:/project/path',
  inputData: {
    product: { id: 'PROD-001', name: '智能传感器模块' },
    builds: [
      { version: '1.0.0', status: 'success', target: 'release', duration: '2m 30s' }
    ]
  }
});
```

### 5. 测试集成 (manage-tests)

```javascript
const result = await workflow.execute({
  mode: 'manage-tests',
  outputDir: 'D:/project/path',
  inputData: {
    product: { id: 'PROD-001', name: '智能传感器模块' },
    testSuites: [
      { name: 'Unit Tests', type: 'unit', tests: [{ name: 'test_init', status: 'passed' }] }
    ]
  }
});
```

### 6. 发布管理 (manage-releases)

```javascript
const result = await workflow.execute({
  mode: 'manage-releases',
  outputDir: 'D:/project/path',
  inputData: {
    product: { id: 'PROD-001', name: '智能传感器模块' },
    releases: [
      { version: '1.0.0', status: 'released', releaseDate: '2025-01-01', approvedBy: '张三' }
    ]
  }
});
```

## 输出格式

### JSON 输出

```json
{
  "product": { "id": "PROD-001", "name": "智能传感器模块" },
  "architecture": {
    "layers": [...],
    "modules": [...],
    "interfaces": [...]
  }
}
```

### Markdown 输出

工作流会自动生成 Markdown 格式的报告，包含：
- 架构设计文档
- 版本历史
- 构建记录
- 测试报告
- 发布记录

## 常见问题

### Q: 如何选择 RTOS？

A: 根据项目需求选择：
- **bare-metal**: 简单应用，无多任务需求
- **FreeRTOS**: 轻量级，资源受限
- **RT-Thread**: 功能丰富，国内支持好

### Q: 版本号如何管理？

A: 建议使用语义化版本号：MAJOR.MINOR.PATCH
- MAJOR: 不兼容的 API 变更
- MINOR: 向下兼容的功能新增
- PATCH: 向下兼容的问题修正

### Q: 如何集成到 CI/CD？

A: 使用 `manage-builds` 和 `manage-releases` 模式，可以与测试 CI/CD 工作流集成。

### Q: 可以只执行部分阶段吗？

A: 可以。使用对应的模式（如 `design-architecture`）单独执行某个阶段。
