/**
 * Agent Teams 配置
 * 为每个工作流定义 Agent Teams
 */
const agentTeamsConfig = {
  // Scrum 开发
  'scrum-development': {
    preProcess: [
      { agent: 'planner', task: 'Sprint 规划' }
    ],
    postProcess: [
      { agent: 'code-reviewer', task: '代码质量审查' },
      { agent: 'security-reviewer', task: '安全检查' }
    ]
  },

  // 测试 CI/CD
  'testing-cicd': {
    preProcess: [
      { agent: 'planner', task: '测试规划' }
    ],
    postProcess: [
      { agent: 'tdd-guide', task: '测试用例审查' },
      { agent: 'code-reviewer', task: '测试代码审查' }
    ]
  },

  // 固件开发
  'firmware-development': {
    preProcess: [
      { agent: 'planner', task: '架构规划' },
      { agent: 'architect', task: '系统设计' }
    ],
    postProcess: [
      { agent: 'cpp-reviewer', task: 'C/C++ 代码审查' },
      { agent: 'security-reviewer', task: '安全检查' },
      { agent: 'embedded-expert', task: '嵌入式最佳实践' }
    ]
  },

  // 硬件设计
  'hardware-design': {
    preProcess: [
      { agent: 'planner', task: '设计规划' }
    ],
    postProcess: [
      { agent: 'code-reviewer', task: '设计规范检查' },
      { agent: 'performance-optimizer', task: '性能评估' }
    ]
  },

  // 软件开发
  'software-development': {
    preProcess: [
      { agent: 'planner', task: '需求分析' },
      { agent: 'architect', task: '架构设计' }
    ],
    postProcess: [
      { agent: 'code-reviewer', task: '代码质量审查' },
      { agent: 'security-reviewer', task: '安全检查' },
      { agent: 'performance-optimizer', task: '性能优化' }
    ]
  },

  // 缺陷管理
  'defect-management': {
    postProcess: [
      { agent: 'security-reviewer', task: '安全影响评估' },
      { agent: 'performance-optimizer', task: '性能影响评估' }
    ]
  },

  // 生产管理
  'production-management': {
    postProcess: [
      { agent: 'code-reviewer', task: '质量检查' },
      { agent: 'security-reviewer', task: '安全合规检查' }
    ]
  },

  // DFMEA 管理
  'dfmea-management': {
    postProcess: [
      { agent: 'security-reviewer', task: '安全风险评估' },
      { agent: 'performance-optimizer', task: '性能风险评估' }
    ]
  },

  // 合规认证
  'compliance-certification': {
    postProcess: [
      { agent: 'security-reviewer', task: '安全合规检查' },
      { agent: 'code-reviewer', task: '代码合规检查' }
    ]
  },

  // IP 管理
  'ip-management': {
    postProcess: [
      { agent: 'code-reviewer', task: 'IP 代码质量' },
      { agent: 'security-reviewer', task: 'IP 安全性' }
    ]
  },

  // 机械设计
  'mechanical-design': {
    postProcess: [
      { agent: 'code-reviewer', task: '设计规范检查' },
      { agent: 'performance-optimizer', task: '性能和可靠性' }
    ]
  },

  // 工厂测试
  'factory-test': {
    postProcess: [
      { agent: 'code-reviewer', task: '测试脚本质量' },
      { agent: 'security-reviewer', task: '测试安全性' }
    ]
  },

  // 工具链管理
  'toolchain-management': {
    postProcess: [
      { agent: 'tdd-guide', task: '工具集成测试' },
      { agent: 'code-reviewer', task: '工具配置审查' }
    ]
  },

  // 文档写作
  'document-writing': {
    postProcess: [
      { agent: 'code-reviewer', task: '技术准确性' },
      { agent: 'security-reviewer', task: '安全信息完整性' }
    ]
  },

  // 可视化
  'visualization': {
    postProcess: [
      { agent: 'code-reviewer', task: '代码质量' },
      { agent: 'performance-optimizer', task: '渲染性能' }
    ]
  },

  // 默认配置
  'default': {
    postProcess: [
      { agent: 'code-reviewer', task: '代码质量审查' }
    ]
  }
};

module.exports = agentTeamsConfig;
