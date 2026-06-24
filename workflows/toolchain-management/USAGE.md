# 工具链管理工作流使用指南

## 执行模式

### 1. 完整执行 (full-run)

```javascript
const result = await workflow.execute({
  mode: 'full-run',
  outputDir: 'D:/project/path',
  inputData: {
    project: { id: 'PROJ-001', name: '智能传感器项目' },
    tools: [...],
    configurations: [...],
    records: [...]
  }
});
```

### 2. 工具清单 (manage-inventory)

```javascript
const result = await workflow.execute({
  mode: 'manage-inventory',
  outputDir: 'D:/project/path',
  inputData: {
    project: { id: 'PROJ-001', name: '智能传感器项目' },
    tools: [
      { name: 'VS Code', category: 'ide', version: '1.85.0', vendor: 'Microsoft', license: 'MIT' },
      { name: 'GCC', category: 'compiler', version: '12.2.0', vendor: 'GNU' },
      { name: 'Git', category: 'vcs', version: '2.43.0', vendor: 'GitHub' }
    ]
  }
});
```

### 3. 配置管理 (manage-configurations)

```javascript
const result = await workflow.execute({
  mode: 'manage-configurations',
  outputDir: 'D:/project/path',
  inputData: {
    project: { id: 'PROJ-001', name: '智能传感器项目' },
    configurations: [
      { name: 'VS Code 工作区配置', tool: 'VS Code', type: 'editor', settings: { theme: 'Dark+' } },
      { name: 'Keil 项目配置', tool: 'Keil MDK', type: 'ide', settings: { optimization: 'O2' } }
    ]
  }
});
```

### 4. 版本管理 (manage-versions)

```javascript
const result = await workflow.execute({
  mode: 'manage-versions',
  outputDir: 'D:/project/path',
  inputData: {
    project: { id: 'PROJ-001', name: '智能传感器项目' },
    records: [
      { toolName: 'VS Code', previousVersion: '1.84.0', currentVersion: '1.85.0', upgradedBy: '张三' }
    ]
  }
});
```

## 常见问题

### Q: 为什么要管理工具版本？

A: 确保团队成员使用相同的工具版本，避免因版本差异导致的兼容性问题。

### Q: 如何导出工具配置？

A: 在配置管理模块中记录配置文件路径和关键设置，方便其他成员导入。

### Q: 与测试 CI/CD 工作流有什么关系？

A: 工具链管理记录开发环境信息，测试 CI/CD 工作流记录自动化测试和部署配置。

### Q: 如何审计工具使用情况？

A: 使用 `manage-inventory` 模式记录所有工具，包括版本、许可证和用途。
