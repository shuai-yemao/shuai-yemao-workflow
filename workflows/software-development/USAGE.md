# 应用软件开发管理工作流使用指南

## 执行模式

### 1. 完整执行 (full-run)

```javascript
const result = await workflow.execute({
  mode: 'full-run',
  outputDir: 'D:/project/path',
  inputData: {
    product: { id: 'PROD-001', name: '智能传感器上位机' },
    layers: [...],
    modules: [...],
    requirements: [...],
    releases: [...],
    issues: [...]
  }
});
```

### 2. 架构设计 (design-architecture)

```javascript
const result = await workflow.execute({
  mode: 'design-architecture',
  outputDir: 'D:/project/path',
  inputData: {
    product: { id: 'PROD-001', name: '智能传感器上位机' },
    layers: [
      { name: 'UI', description: '用户界面', type: 'ui' },
      { name: 'Service', description: '业务逻辑', type: 'business' }
    ],
    modules: [
      { name: 'DataPanel', type: 'frontend', layer: 'ui', language: 'TypeScript' }
    ]
  }
});
```

### 3. 需求管理 (manage-requirements)

```javascript
const result = await workflow.execute({
  mode: 'manage-requirements',
  outputDir: 'D:/project/path',
  inputData: {
    product: { id: 'PROD-001', name: '智能传感器上位机' },
    requirements: [
      { title: '实时数据展示', type: 'functional', priority: 'high' },
      { title: '响应时间 < 100ms', type: 'non-functional', priority: 'medium' }
    ]
  }
});
```

### 4. 发布管理 (manage-releases)

```javascript
const result = await workflow.execute({
  mode: 'manage-releases',
  outputDir: 'D:/project/path',
  inputData: {
    product: { id: 'PROD-001', name: '智能传感器上位机' },
    releases: [
      { version: '1.0.0', status: 'released', releaseDate: '2025-01-01' }
    ]
  }
});
```

### 5. 问题追踪 (track-issues)

```javascript
const result = await workflow.execute({
  mode: 'track-issues',
  outputDir: 'D:/project/path',
  inputData: {
    product: { id: 'PROD-001', name: '智能传感器上位机' },
    issues: [
      { title: '数据延迟', type: 'bug', priority: 'high', status: 'open' }
    ]
  }
});
```

## 常见问题

### Q: 与固件开发工作流有什么区别？

A: 
- **固件开发** (03_Firmware): 嵌入式固件、MCU 程序、驱动开发
- **软件开发** (04_Software): 上位机软件、应用软件、Web 应用

### Q: 如何管理软件版本？

A: 使用 `manage-releases` 模式，记录版本号、变更日志和发布状态。

### Q: 可以与测试 CI/CD 集成吗？

A: 可以。软件测试结果可以传递给测试 CI/CD 工作流。

### Q: 如何追踪软件问题？

A: 使用 `track-issues` 模式，记录 Bug、功能请求和改进建议。
