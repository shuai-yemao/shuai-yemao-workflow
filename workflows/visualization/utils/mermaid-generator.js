/**
 * Mermaid 图表生成器
 * 用于生成各种类型的 Mermaid 图表
 */

class MermaidGenerator {
  constructor() {
    this.config = {
      theme: 'default',
      direction: 'TD'
    };
  }

  /**
   * 生成思维导图
   * @param {object} data - 思维导图数据
   * @returns {string} Mermaid 语法
   */
  generateMindMap(data) {
    let md = `mindmap\n`;
    md += `  root((${data.root}))\n`;

    const traverse = (node, level = 1) => {
      if (node.children) {
        for (const child of node.children) {
          const indent = '  '.repeat(level + 1);
          md += `${indent}${child.name}\n`;
          if (child.children) {
            traverse(child, level + 1);
          }
        }
      }
    };

    traverse(data);
    return md;
  }

  /**
   * 生成流程图
   * @param {object} data - 流程图数据
   * @returns {string} Mermaid 语法
   */
  generateFlowchart(data) {
    const direction = data.direction || 'TD';
    let md = `flowchart ${direction}\n`;

    // 节点定义
    if (data.nodes) {
      for (const node of data.nodes) {
        const shape = this.getNodeShape(node.type);
        md += `    ${node.id}${shape.start}${node.label}${shape.end}\n`;
      }
    }

    // 连接定义
    if (data.connections) {
      md += `\n`;
      for (const conn of data.connections) {
        const arrow = this.getArrowStyle(conn.style);
        if (conn.label) {
          md += `    ${conn.from} ${arrow}|${conn.label}| ${conn.to}\n`;
        } else {
          md += `    ${conn.from} ${arrow} ${conn.to}\n`;
        }
      }
    }

    // 样式
    if (data.styles) {
      md += `\n`;
      for (const style of data.styles) {
        md += `    style ${style.node} ${style.properties}\n`;
      }
    }

    return md;
  }

  /**
   * 生成架构图
   * @param {object} data - 架构图数据
   * @returns {string} Mermaid 语法
   */
  generateArchitecture(data) {
    let md = `block-beta\n`;
    md += `  columns ${data.columns || 3}\n`;

    // 创建块
    const createBlock = (block, indent = '') => {
      if (block.type === 'group') {
        md += `${indent}block:${block.id}:${block.columns || 1}\n`;
        md += `${indent}  ${block.label}\n`;
        if (block.children) {
          for (const child of block.children) {
            createBlock(child, indent + '  ');
          }
        }
        md += `${indent}end\n`;
      } else {
        md += `${indent}${block.id}["${block.label}"]\n`;
      }
    };

    if (data.blocks) {
      for (const block of data.blocks) {
        createBlock(block);
      }
    }

    // 连接
    if (data.connections) {
      md += `\n`;
      for (const conn of data.connections) {
        md += `${conn.from} --> ${conn.to}\n`;
      }
    }

    return md;
  }

  /**
   * 生成时序图
   * @param {object} data - 时序图数据
   * @returns {string} Mermaid 语法
   */
  generateSequenceDiagram(data) {
    let md = `sequenceDiagram\n`;

    // 参与者
    if (data.participants) {
      for (const p of data.participants) {
        if (p.alias) {
          md += `    participant ${p.alias} as ${p.name}\n`;
        } else {
          md += `    participant ${p.name}\n`;
        }
      }
    }

    // 消息
    if (data.messages) {
      md += `\n`;
      for (const msg of data.messages) {
        const arrow = this.getSequenceArrow(msg.type);
        md += `    ${msg.from} ${arrow} ${msg.to}: ${msg.text}\n`;

        // 激活/取消激活
        if (msg.activate) {
          md += `    activate ${msg.to}\n`;
        }
        if (msg.deactivate) {
          md += `    deactivate ${msg.to}\n`;
        }
      }
    }

    // 注释
    if (data.notes) {
      md += `\n`;
      for (const note of data.notes) {
        md += `    Note over ${note.target}: ${note.text}\n`;
      }
    }

    return md;
  }

  /**
   * 生成状态图
   * @param {object} data - 状态图数据
   * @returns {string} Mermaid 语法
   */
  generateStateDiagram(data) {
    let md = `stateDiagram-v2\n`;

    if (data.states) {
      for (const state of data.states) {
        if (state.isInitial) {
          md += `    [*] --> ${state.name}\n`;
        } else if (state.isFinal) {
          md += `    ${state.name} --> [*]\n`;
        }
      }
    }

    if (data.transitions) {
      md += `\n`;
      for (const t of data.transitions) {
        if (t.condition) {
          md += `    ${t.from} --> ${t.to}: ${t.condition}\n`;
        } else {
          md += `    ${t.from} --> ${t.to}\n`;
        }
      }
    }

    return md;
  }

  /**
   * 生成甘特图
   * @param {object} data - 甘特图数据
   * @returns {string} Mermaid 语法
   */
  generateGanttChart(data) {
    let md = `gantt\n`;
    md += `    title ${data.title || '项目计划'}\n`;
    md += `    dateFormat ${data.dateFormat || 'YYYY-MM-DD'}\n`;

    if (data.sections) {
      for (const section of data.sections) {
        md += `    section ${section.name}\n`;
        for (const task of section.tasks) {
          const deps = task.dependencies ? ` ${task.dependencies}` : '';
          md += `        ${task.name} :${task.id}${deps}, ${task.start}, ${task.duration || task.end}\n`;
        }
      }
    }

    return md;
  }

  /**
   * 生成 ER 图
   * @param {object} data - ER 图数据
   * @returns {string} Mermaid 语法
   */
  generateERDiagram(data) {
    let md = `erDiagram\n`;

    if (data.entities) {
      for (const entity of data.entities) {
        md += `    ${entity.name} {\n`;
        for (const field of entity.fields) {
          md += `        ${field.type} ${field.name}\n`;
        }
        md += `    }\n`;
      }
    }

    if (data.relationships) {
      md += `\n`;
      for (const rel of data.relationships) {
        const cardinality = this.getCardinality(rel.cardinality);
        md += `    ${rel.from} ${cardinality} ${rel.to} : ${rel.label || ''}\n`;
      }
    }

    return md;
  }

  /**
   * 生成类图
   * @param {object} data - 类图数据
   * @returns {string} Mermaid 语法
   */
  generateClassDiagram(data) {
    let md = `classDiagram\n`;

    if (data.classes) {
      for (const cls of data.classes) {
        md += `    class ${cls.name} {\n`;
        if (cls.attributes) {
          for (const attr of cls.attributes) {
            md += `        ${attr.visibility || '+'}${attr.type} ${attr.name}\n`;
          }
        }
        if (cls.methods) {
          for (const method of cls.methods) {
            md += `        ${method.visibility || '+'}${method.name}(${method.params || ''}) ${method.returnType || 'void'}\n`;
          }
        }
        md += `    }\n`;
      }
    }

    if (data.relationships) {
      md += `\n`;
      for (const rel of data.relationships) {
        const arrow = this.getClassArrow(rel.type);
        md += `    ${rel.from} ${arrow} ${rel.to}\n`;
      }
    }

    return md;
  }

  // 辅助方法
  getNodeShape(type) {
    const shapes = {
      'process': { start: '[', end: ']' },
      'decision': { start: '{', end: '}' },
      'start': { start: '([', end: '])' },
      'end': { start: '([', end: '])' },
      'subroutine': { start: '[[', end: ']]' },
      'data': { start: '[/', end: '/]' },
      'database': { start: '[(', end: ')]' },
      'input': { start: '[/', end: '/]' }
    };
    return shapes[type] || shapes['process'];
  }

  getArrowStyle(style) {
    const arrows = {
      'normal': '-->',
      'dotted': '-.->',
      'thick': '==>',
      'bidirectional': '<-->'
    };
    return arrows[style] || arrows['normal'];
  }

  getSequenceArrow(type) {
    const arrows = {
      'sync': '->>',
      'async': '-->>',
      'return': '-->>',
      'activation': 'activate',
      'deactivation': 'deactivate'
    };
    return arrows[type] || '->>';
  }

  getCardinality(type) {
    const cardinalities = {
      'one-to-one': '||--||',
      'one-to-many': '||--|{',
      'many-to-many': '}|--|{'
    };
    return cardinalities[type] || '||--||';
  }

  getClassArrow(type) {
    const arrows = {
      'inheritance': '<|--',
      'composition': '*--',
      'aggregation': 'o--',
      'association': '-->',
      'dependency': '..>'
    };
    return arrows[type] || arrows['association'];
  }
}

module.exports = MermaidGenerator;
