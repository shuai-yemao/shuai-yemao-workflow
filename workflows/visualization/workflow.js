/**
 * 可视化工作流
 * 用于生成各种图表：思维导图、流程图、架构图、时序图、状态图等
 * 以及 HTML 输出：演示文稿、产品页面、仪表盘、报告
 */

const fs = require('fs');
const path = require('path');
const MindmapGenerator = require('./modules/mindmap-generator');
const FlowchartGenerator = require('./modules/flowchart-generator');
const DiagramConverter = require('./modules/diagram-converter');
const HtmlGenerator = require('./modules/html-generator');
const MermaidGenerator = require('./utils/mermaid-generator');

class VisualizationWorkflow {
  constructor(options = {}) {
    this.options = options;
    this.generator = new MermaidGenerator();

    this.moduleMap = {
      'mindmap': MindmapGenerator,
      'flowchart': FlowchartGenerator,
      'architecture': FlowchartGenerator,
      'sequence': FlowchartGenerator,
      'state': FlowchartGenerator,
      'er': FlowchartGenerator,
      'class': FlowchartGenerator,
      'converter': DiagramConverter,
      'html': HtmlGenerator
    };
  }

  async execute(config) {
    const { mode, outputDir, inputData, projectName } = config;
    console.log(`[Visualization] 开始执行，模式: ${mode}`);

    if (!outputDir) throw new Error('outputDir is required');

    let result;

    switch (mode) {
      // Mermaid 图表
      case 'mindmap':
        result = await this.executeModule('mindmap', outputDir, inputData, projectName);
        break;
      case 'flowchart':
        result = await this.executeModule('flowchart', outputDir, inputData, projectName, 'flowchart');
        break;
      case 'architecture':
        result = await this.executeModule('architecture', outputDir, inputData, projectName, 'architecture');
        break;
      case 'sequence':
        result = await this.executeModule('sequence', outputDir, inputData, projectName, 'sequence');
        break;
      case 'state':
        result = await this.executeModule('state', outputDir, inputData, projectName, 'state');
        break;
      case 'er':
        result = await this.executeModule('er', outputDir, inputData, projectName, 'er');
        break;
      case 'class':
        result = await this.executeModule('class', outputDir, inputData, projectName, 'class');
        break;
      case 'gantt':
        result = this.generateGantt(outputDir, inputData, projectName);
        break;

      // HTML 输出
      case 'presentation':
        result = await this.generateHtml(outputDir, inputData, projectName, 'presentation');
        break;
      case 'product-page':
        result = await this.generateHtml(outputDir, inputData, projectName, 'product');
        break;
      case 'dashboard':
        result = await this.generateHtml(outputDir, inputData, projectName, 'dashboard');
        break;
      case 'report':
        result = await this.generateHtml(outputDir, inputData, projectName, 'report');
        break;

      // 工具模式
      case 'convert':
        result = await this.convertDiagram(outputDir, inputData);
        break;
      case 'generate-all':
        result = await this.generateAllDiagrams(outputDir, inputData, projectName);
        break;
      case 'quick':
        result = await this.quickGenerate(outputDir, inputData, projectName);
        break;
      case 'full-package':
        result = await this.generateFullPackage(outputDir, inputData, projectName);
        break;
      default:
        throw new Error(`Unknown mode: ${mode}`);
    }

    console.log(`[Visualization] 执行完成`);
    return result;
  }

  async executeModule(moduleName, outputDir, inputData, projectName, diagramType) {
    const ModuleClass = this.moduleMap[moduleName];
    if (!ModuleClass) throw new Error(`Unknown module: ${moduleName}`);
    const module = new ModuleClass(this.options);
    return await module.execute({ outputDir, inputData, projectName, diagramType });
  }

  async generateHtml(outputDir, inputData, projectName, type) {
    const module = new HtmlGenerator(this.options);
    return await module.execute({ outputDir, inputData, type, projectName });
  }

  generateGantt(outputDir, inputData, projectName) {
    const mermaid = this.generator.generateGanttChart(inputData);
    const fileName = `${projectName || 'gantt'}-${Date.now()}`;

    const dirPath = path.join(outputDir, '00_Project_Management', '07_敏捷开发_Scrum');
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    fs.writeFileSync(path.join(dirPath, `${fileName}.mmd`), mermaid, 'utf8');

    const markdown = `# ${inputData.title || '项目计划'}\n\n\`\`\`mermaid\n${mermaid}\n\`\`\`\n`;
    fs.writeFileSync(path.join(dirPath, `${fileName}.md`), markdown, 'utf8');

    return { success: true, mermaid, markdown, fileName };
  }

  async convertDiagram(outputDir, inputData) {
    const module = new DiagramConverter(this.options);
    return await module.execute({ outputDir, inputData, format: inputData.format || 'html' });
  }

  async generateAllDiagrams(outputDir, inputData, projectName) {
    const results = {};

    if (inputData.mindmap) {
      results.mindmap = await this.executeModule('mindmap', outputDir, inputData.mindmap, projectName);
    }
    if (inputData.flowchart) {
      results.flowchart = await this.executeModule('flowchart', outputDir, inputData.flowchart, projectName, 'flowchart');
    }
    if (inputData.architecture) {
      results.architecture = await this.executeModule('architecture', outputDir, inputData.architecture, projectName, 'architecture');
    }
    if (inputData.sequence) {
      results.sequence = await this.executeModule('sequence', outputDir, inputData.sequence, projectName, 'sequence');
    }
    if (inputData.state) {
      results.state = await this.executeModule('state', outputDir, inputData.state, projectName, 'state');
    }

    return { success: true, results, summary: this.generateSummary(results) };
  }

  async quickGenerate(outputDir, inputData, projectName) {
    const { title, items, steps, states, participants } = inputData;

    if (items && items.length > 0) {
      const mindmapData = {
        root: title || '思维导图',
        children: items.map(item => ({
          name: item.name || item,
          children: item.children || []
        }))
      };
      return await this.executeModule('mindmap', outputDir, mindmapData, projectName);
    }

    if (steps && steps.length > 0) {
      const flowData = {
        nodes: steps.map((step, i) => ({
          id: `node${i}`,
          label: step.name || step,
          type: i === 0 ? 'start' : i === steps.length - 1 ? 'end' : 'process'
        })),
        connections: steps.slice(0, -1).map((_, i) => ({
          from: `node${i}`,
          to: `node${i + 1}`
        }))
      };
      return await this.executeModule('flowchart', outputDir, flowData, projectName, 'flowchart');
    }

    if (states && states.length > 0) {
      const stateData = {
        states: states.map((s, i) => ({
          name: s.name || s,
          isInitial: i === 0
        })),
        transitions: states.slice(0, -1).map((s, i) => ({
          from: s.name || s,
          to: states[i + 1].name || states[i + 1]
        }))
      };
      return await this.executeModule('state', outputDir, stateData, projectName, 'state');
    }

    return await this.executeModule('mindmap', outputDir, { root: title || '图表', children: [] }, projectName);
  }

  /**
   * 生成完整包：思维导图 + 演示文稿 + 产品页面
   */
  async generateFullPackage(outputDir, inputData, projectName) {
    const results = {};

    // 1. 生成思维导图
    if (inputData.mindmap) {
      results.mindmap = await this.executeModule('mindmap', outputDir, inputData.mindmap, projectName);
    }

    // 2. 生成演示文稿
    if (inputData.presentation) {
      results.presentation = await this.generateHtml(outputDir, inputData.presentation, projectName, 'presentation');
    }

    // 3. 生成产品页面
    if (inputData.productPage) {
      results.productPage = await this.generateHtml(outputDir, inputData.productPage, projectName, 'product');
    }

    // 4. 生成仪表盘
    if (inputData.dashboard) {
      results.dashboard = await this.generateHtml(outputDir, inputData.dashboard, projectName, 'dashboard');
    }

    return {
      success: true,
      results,
      summary: {
        generated: Object.keys(results).length,
        types: Object.keys(results),
        files: Object.values(results).map(r => r.fileName).filter(Boolean)
      }
    };
  }

  generateSummary(results) {
    return {
      diagramsGenerated: Object.keys(results).length,
      types: Object.keys(results)
    };
  }
}

module.exports = VisualizationWorkflow;
