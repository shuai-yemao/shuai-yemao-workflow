# 可视化工作流使用指南

## 执行模式

### Mermaid 图表

#### 1. 思维导图 (mindmap)

```javascript
const result = await workflow.execute({
  mode: 'mindmap',
  outputDir: 'D:/project/path',
  projectName: '项目名称',
  inputData: {
    root: '系统名称',
    children: [
      { name: '模块1', children: [{ name: '子模块1.1' }, { name: '子模块1.2' }] },
      { name: '模块2', children: [{ name: '子模块2.1' }] }
    ]
  }
});
```

#### 2. 流程图 (flowchart)

```javascript
const result = await workflow.execute({
  mode: 'flowchart',
  outputDir: 'D:/project/path',
  projectName: '项目名称',
  inputData: {
    direction: 'TD',
    nodes: [
      { id: 'start', label: '开始', type: 'start' },
      { id: 'decision', label: '判断条件', type: 'decision' },
      { id: 'process1', label: '处理1', type: 'process' },
      { id: 'end', label: '结束', type: 'end' }
    ],
    connections: [
      { from: 'start', to: 'decision' },
      { from: 'decision', to: 'process1', label: '是' },
      { from: 'process1', to: 'end' }
    ]
  }
});
```

#### 3. 架构图 (architecture)

```javascript
const result = await workflow.execute({
  mode: 'architecture',
  outputDir: 'D:/project/path',
  projectName: '项目名称',
  inputData: {
    blocks: [
      { id: 'ui', label: '表现层', type: 'group', columns: 2, children: [
        { id: 'web', label: 'Web UI' },
        { id: 'mobile', label: 'Mobile UI' }
      ]},
      { id: 'service', label: '服务层' },
      { id: 'data', label: '数据层' }
    ],
    connections: [
      { from: 'ui', to: 'service' },
      { from: 'service', to: 'data' }
    ]
  }
});
```

#### 4. 时序图 (sequence)

```javascript
const result = await workflow.execute({
  mode: 'sequence',
  outputDir: 'D:/project/path',
  projectName: '项目名称',
  inputData: {
    participants: [
      { name: '客户端', alias: 'Client' },
      { name: '服务器', alias: 'Server' }
    ],
    messages: [
      { from: 'Client', to: 'Server', text: '请求数据', type: 'sync' },
      { from: 'Server', to: 'Client', text: '返回数据', type: 'return' }
    ]
  }
});
```

#### 5. 状态图 (state)

```javascript
const result = await workflow.execute({
  mode: 'state',
  outputDir: 'D:/project/path',
  projectName: '项目名称',
  inputData: {
    states: [
      { name: '空闲', isInitial: true },
      { name: '运行中' },
      { name: '已完成', isFinal: true }
    ],
    transitions: [
      { from: '空闲', to: '运行中', condition: '启动' },
      { from: '运行中', to: '已完成', condition: '完成' }
    ]
  }
});
```

#### 6. 甘特图 (gantt)

```javascript
const result = await workflow.execute({
  mode: 'gantt',
  outputDir: 'D:/project/path',
  projectName: '项目名称',
  inputData: {
    title: '项目计划',
    sections: [
      {
        name: '需求阶段',
        tasks: [
          { id: 'req1', name: '需求调研', start: '2025-01-01', duration: '5d' }
        ]
      }
    ]
  }
});
```

### HTML 输出

#### 7. 演示文稿 (presentation)

```javascript
const result = await workflow.execute({
  mode: 'presentation',
  outputDir: 'D:/project/path',
  projectName: '项目名称',
  inputData: {
    title: '产品演示',
    author: '研发团队',
    slides: [
      {
        title: '产品概述',
        type: 'bullets',
        bullets: ['高精度测量', '无线传输', '低功耗设计']
      },
      {
        title: '技术优势',
        type: 'bullets',
        bullets: ['精度 ±0.5°C', '续航 2 年', '体积小巧']
      },
      {
        title: '应用场景',
        type: 'bullets',
        bullets: ['工业监控', '智能家居', '医疗设备']
      }
    ]
  }
});
```

**操作方式：**
- 键盘左右箭头：切换幻灯片
- 空格键：下一页
- 底部按钮：上一页/下一页
- 底部进度条：显示当前进度

#### 8. 产品宣传页 (product-page)

```javascript
const result = await workflow.execute({
  mode: 'product-page',
  outputDir: 'D:/project/path',
  projectName: '项目名称',
  inputData: {
    title: 'SmartSensor Pro',
    features: [
      { icon: '🎯', title: '高精度', description: '测量精度达到 ±0.5°C' },
      { icon: '📡', title: '无线传输', description: '支持 WiFi/蓝牙' },
      { icon: '🔋', title: '低功耗', description: '电池续航长达 2 年' },
      { icon: '📱', title: '易集成', description: '提供完整 API' }
    ],
    specs: [
      { label: '测量范围', value: '-40°C ~ +85°C' },
      { label: '精度', value: '±0.5°C' },
      { label: '通信接口', value: 'WiFi / BLE 5.0' },
      { label: '供电', value: 'CR2032 电池' },
      { label: '尺寸', value: '30mm × 20mm × 10mm' }
    ]
  }
});
```

#### 9. 数据仪表盘 (dashboard)

```javascript
const result = await workflow.execute({
  mode: 'dashboard',
  outputDir: 'D:/project/path',
  projectName: '项目名称',
  inputData: {
    title: '项目进度监控',
    stats: [
      { label: '总任务数', value: '128', trend: 12 },
      { label: '已完成', value: '89', trend: 8 },
      { label: '进行中', value: '23', trend: -3 },
      { label: '完成率', value: '69.5%', trend: 5 }
    ]
  }
});
```

#### 10. 项目报告 (report)

```javascript
const result = await workflow.execute({
  mode: 'report',
  outputDir: 'D:/project/path',
  projectName: '项目名称',
  inputData: {
    title: '智能传感器项目报告',
    author: '研发团队',
    date: '2025-01-15',
    sections: [
      { title: '项目概述', content: '<p>本项目旨在开发一款高精度、低功耗的智能温度传感器...</p>' },
      { title: '技术方案', content: '<p>采用 STM32L0 系列 MCU，配合 DS18B20 温度传感器...</p>' },
      { title: '项目进度', content: '<p>目前完成硬件设计，正在进行固件开发...</p>' }
    ]
  }
});
```

### 组合模式

#### 11. 完整包 (full-package)

一次生成多种输出：

```javascript
const result = await workflow.execute({
  mode: 'full-package',
  outputDir: 'D:/project/path',
  projectName: '智能传感器',
  inputData: {
    mindmap: {
      root: '产品架构',
      children: [
        { name: '硬件', children: [{ name: 'MCU' }, { name: '传感器' }] },
        { name: '软件', children: [{ name: '驱动' }, { name: '应用' }] }
      ]
    },
    presentation: {
      title: '产品介绍',
      slides: [
        { title: '产品特点', type: 'bullets', bullets: ['高精度', '低功耗', '易集成'] }
      ]
    },
    productPage: {
      title: 'SmartSensor',
      features: [
        { icon: '🎯', title: '高精度', description: '±0.5°C' }
      ]
    }
  }
});
```

#### 12. 快速生成 (quick)

自动根据输入数据判断类型：

```javascript
const result = await workflow.execute({
  mode: 'quick',
  outputDir: 'D:/project/path',
  projectName: '项目名称',
  inputData: {
    title: '产品功能',
    items: [
      { name: '功能1', children: [{ name: '子功能1.1' }] },
      { name: '功能2' }
    ]
    // 有 items → 思维导图
    // 有 steps → 流程图
    // 有 states → 状态图
  }
});
```

## 与其他工作流集成示例

### 在需求工程中添加可视化

```javascript
const RequirementsWorkflow = require('C:/Users/zhang/.claude/workflows/requirements-engineering/workflow');
const VisualizationWorkflow = require('C:/Users/zhang/.claude/workflows/visualization/workflow');

// 1. 执行需求工程
const reqResult = await new RequirementsWorkflow().execute({ ... });

// 2. 生成需求思维导图
const viz = new VisualizationWorkflow();
await viz.execute({
  mode: 'mindmap',
  outputDir: 'D:/project/path',
  projectName: '项目',
  inputData: {
    root: '产品需求',
    children: reqResult.results.functionMap.functions.map(f => ({
      name: f.name,
      children: f.requirements.map(r => ({ name: r }))
    }))
  }
});

// 3. 生成产品演示
await viz.execute({
  mode: 'presentation',
  outputDir: 'D:/project/path',
  projectName: '项目',
  inputData: {
    title: '产品需求介绍',
    slides: reqResult.results.functionMap.functions.map(f => ({
      title: f.name,
      type: 'bullets',
      bullets: f.requirements
    }))
  }
});
```

## 常见问题

### Q: 如何在 Obsidian 中渲染图表？

A: Obsidian 原生支持 Mermaid，直接打开 .md 文件即可。

### Q: 如何导出为图片？

A: 使用 mermaid-cli：
```bash
npm install -g @mermaid-js/mermaid-cli
mmdc -i input.mmd -o output.png -t dark -b white
```

### Q: HTML 页面如何自定义样式？

A: 可以修改 `html-generator.js` 中的模板，或在生成后手动编辑。

### Q: 演示文稿如何添加动画？

A: 在 HTML 中添加 CSS 动画或使用 JavaScript 库如 reveal.js。

### Q: 可以生成 PDF 吗？

A: 可以使用浏览器的打印功能，或使用 puppeteer 等工具将 HTML 转换为 PDF。
