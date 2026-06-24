# 法规认证工作流使用指南

## 执行模式

### 1. 完整执行 (full-run)

```javascript
const result = await workflow.execute({
  mode: 'full-run',
  outputDir: 'D:/project/path',
  inputData: {
    product: { id: 'PROD-001', name: '智能传感器模块', version: '1.0' },
    regions: ['CN', 'EU'],
    hasWireless: true,
    hasBattery: false,
    targetDate: '2025-12-31'
  }
});
```

### 2. 法规识别 (identify-regulations)

```javascript
const result = await workflow.execute({
  mode: 'identify-regulations',
  outputDir: 'D:/project/path',
  inputData: {
    product: { id: 'PROD-001', name: '智能传感器模块' },
    regions: ['CN', 'EU', 'US'],
    hasWireless: true,
    hasBattery: false
  }
});
```

### 3. 合规评估 (assess-compliance)

```javascript
const result = await workflow.execute({
  mode: 'assess-compliance',
  outputDir: 'D:/project/path',
  inputData: {
    product: { id: 'PROD-001', name: '智能传感器模块' },
    regulations: [
      { id: 'REG-001', name: 'CCC 认证', region: 'CN', category: 'safety', requirements: [...] }
    ]
  }
});
```

### 4. 认证规划 (plan-certification)

```javascript
const result = await workflow.execute({
  mode: 'plan-certification',
  outputDir: 'D:/project/path',
  inputData: {
    product: { id: 'PROD-001', name: '智能传感器模块' },
    regulations: [...],
    targetDate: '2025-12-31',
    regions: ['CN', 'EU']
  }
});
```

### 5. 文档准备 (prepare-docs)

```javascript
const result = await workflow.execute({
  mode: 'prepare-docs',
  outputDir: 'D:/project/path',
  inputData: {
    product: { id: 'PROD-001', name: '智能传感器模块' },
    certifications: [
      { id: 'CERT-001', regulationName: 'CCC 认证', region: 'CN', status: 'planned' }
    ]
  }
});
```

### 6. 追踪管理 (track-progress)

```javascript
const result = await workflow.execute({
  mode: 'track-progress',
  outputDir: 'D:/project/path',
  inputData: {
    product: { id: 'PROD-001', name: '智能传感器模块' },
    certifications: [
      { id: 'CERT-001', regulationName: 'CCC 认证', region: 'CN', status: 'in-progress', targetDate: '2025-06-30' }
    ]
  }
});
```

### 7. 获取统计信息 (statistics)

```javascript
const result = await workflow.execute({
  mode: 'statistics',
  outputDir: 'D:/project/path',
  inputData: { recordId: 'CERT-001' } // 可选
});
```

## 输出格式

### JSON 输出

```json
{
  "product": { "id": "PROD-001", "name": "智能传感器模块" },
  "regulations": [
    {
      "id": "REG-CN-001",
      "name": "CCC 认证",
      "region": "CN",
      "category": "safety",
      "status": "pending",
      "applicability": "产品安全要求"
    }
  ],
  "summary": {
    "total": 5,
    "byRegion": { "CN": 2, "EU": 3 },
    "byCategory": { "safety": 2, "emc": 1, "radio": 2 }
  }
}
```

### Markdown 输出

工作流会自动生成 Markdown 格式的报告，包含：
- 法规识别清单
- 合规评估矩阵
- 认证计划时间表
- 文档准备清单
- 追踪状态报告

## 常见问题

### Q: 如何确定产品需要哪些认证？

A: 使用 `identify-regulations` 模式，传入目标市场地区和产品特性（是否有无线功能、电池等），工作流会自动识别适用法规。

### Q: 认证周期一般多长？

A: 取决于认证类型和地区：
- CCC 认证：4-8 周
- CE 认证：3-6 周
- FCC 认证：2-4 周

### Q: 如何追踪多个认证的进度？

A: 使用 `track-progress` 模式，传入所有认证的信息，工作流会生成统一的追踪报告，包括逾期和即将过期的提醒。

### Q: 可以只执行部分阶段吗？

A: 可以。使用对应的模式（如 `identify-regulations`）单独执行某个阶段。
