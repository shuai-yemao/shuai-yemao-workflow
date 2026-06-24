# 可视化工作流

## 概述

可视化工作流用于生成各种输出，包括 Mermaid 图表和 HTML 页面。既可以独立使用，也可以被其他工作流调用。

## 目录结构

```
visualization/
├── workflow.js                    # 工作流入口
├── README.md                      # 说明文档
├── USAGE.md                       # 使用指南
├── modules/
│   ├── mindmap-generator.js       # 思维导图生成
│   ├── flowchart-generator.js     # 流程图/架构图生成
│   ├── diagram-converter.js       # 图表格式转换
│   └── html-generator.js          # HTML 页面生成
└── utils/
    ├── mermaid-generator.js       # Mermaid 语法生成器
    └── json-validator.js          # JSON 验证
```

## 支持的输出类型

### Mermaid 图表

| 类型 | 用途 | Mermaid 类型 |
|------|------|--------------|
| mindmap | 需求分解、功能划分 | mindmap |
| flowchart | 业务流程、控制逻辑 | flowchart |
| architecture | 系统分层、模块依赖 | block-beta |
| sequence | 接口调用、数据交互 | sequenceDiagram |
| state | 状态机、生命周期 | stateDiagram-v2 |
| er | 数据库设计、实体关系 | erDiagram |
| class | 面向对象设计、类关系 | classDiagram |
| gantt | 项目计划、时间安排 | gantt |

### HTML 页面

| 类型 | 用途 | 特点 |
|------|------|------|
| presentation | 产品演示、汇报 | 键盘导航、进度条、幻灯片切换 |
| product-page | 产品宣传、展示 | 响应式、卡片式、现代设计 |
| dashboard | 数据展示、监控 | 统计卡片、图表区域 |
| report | 项目报告、文档 | 章节结构、专业排版 |

## 输出位置

| 输出类型 | 输出目录 |
|----------|----------|
| mindmap | `00_需求导入_QFD/` |
| flowchart | `03_功能图谱_Function_Map/` |
| architecture | `02_Hardware/` |
| sequence | `08_持续集成与测试_DevOps/` |
| state | `03_Firmware/` |
| er/class | `04_Software/` |
| gantt | `07_敏捷开发_Scrum/` |
| HTML | `00_需求导入_QFD/` |

## 快速开始

### 生成思维导图

```javascript
await workflow.execute({
  mode: 'mindmap',
  outputDir: 'D:/project/path',
  projectName: '智能传感器',
  inputData: {
    root: '智能传感器系统',
    children: [
      { name: '硬件', children: [{ name: 'MCU' }, { name: '传感器' }] },
      { name: '固件', children: [{ name: '驱动层' }, { name: '应用层' }] }
    ]
  }
});
```

### 生成演示文稿

```javascript
await workflow.execute({
  mode: 'presentation',
  outputDir: 'D:/project/path',
  projectName: '智能传感器',
  inputData: {
    title: '智能传感器产品介绍',
    author: '研发团队',
    slides: [
      { title: '产品概述', type: 'bullets', bullets: ['高精度温度测量', '无线数据传输', '低功耗设计'] },
      { title: '技术规格', type: 'bullets', bullets: ['精度: ±0.5°C', '范围: -40~85°C', '功耗: <1mW'] },
      { title: '应用场景', type: 'bullets', bullets: ['工业监控', '智能家居', '医疗设备'] }
    ]
  }
});
```

### 生成产品页面

```javascript
await workflow.execute({
  mode: 'product-page',
  outputDir: 'D:/project/path',
  projectName: '智能传感器',
  inputData: {
    title: 'SmartSensor Pro',
    features: [
      { icon: '🎯', title: '高精度', description: '测量精度达到 ±0.5°C' },
      { icon: '📡', title: '无线传输', description: '支持 WiFi/蓝牙' },
      { icon: '🔋', title: '低功耗', description: '电池续航长达 2 年' }
    ],
    specs: [
      { label: '测量范围', value: '-40°C ~ +85°C' },
      { label: '精度', value: '±0.5°C' },
      { label: '通信接口', value: 'WiFi / BLE 5.0' }
    ]
  }
});
```

### 生成完整包

```javascript
await workflow.execute({
  mode: 'full-package',
  outputDir: 'D:/project/path',
  projectName: '智能传感器',
  inputData: {
    mindmap: { root: '产品架构', children: [...] },
    presentation: { title: '产品介绍', slides: [...] },
    productPage: { title: 'SmartSensor', features: [...] }
  }
});
```

## 渲染图表

### Mermaid 图表

#### 在 Obsidian 中
直接打开 .md 文件即可渲染

#### 在 VS Code 中
安装 Mermaid 插件，预览 .md 文件

#### 命令行渲染
```bash
npm install -g @mermaid-js/mermaid-cli
mmdc -i input.mmd -o output.svg
mmdc -i input.mmd -o output.png -t dark -b white
```

### HTML 页面
直接在浏览器中打开 .html 文件

## 与其他工作流集成

```
需求工程 → 调用可视化 → 思维导图、演示文稿
硬件设计 → 调用可视化 → 架构图、产品页面
固件开发 → 调用可视化 → 状态图、时序图
软件开发 → 调用可视化 → 类图、ER图
Scrum    → 调用可视化 → 甘特图、仪表盘
生产管理 → 调用可视化 → 报告、产品页面
```

## 详细文档

- [使用指南](USAGE.md) - 详细的 API 调用示例
