/**
 * BaseWorkflow - 工作流基类
 * 提供 Agent Teams 集成能力
 */
class BaseWorkflow {
  constructor(options = {}) {
    this.options = options;
    this.agentTeams = options.agentTeams || [];
    this.moduleMap = {};
  }

  /**
   * 调用单个 Agent
   */
  async invokeAgent(agentName, task, context = {}) {
    return await this.executeAgent(agentName, task, context);
  }

  /**
   * 调用 Agent Teams（并行执行）
   */
  async invokeAgentTeams(teams, context = {}) {
    const results = await Promise.all(
      teams.map(team => this.invokeAgent(team.agent, team.task, context))
    );
    return results;
  }

  /**
   * 执行 Agent（需要子类实现或由 Claude Code 调用）
   */
  async executeAgent(agentName, task, context) {
    // 这个方法会被 Claude Code 拦截并调用实际的 Agent
    console.log(`[Agent Teams] Invoking agent: ${agentName} - ${task}`);
    return {
      agent: agentName,
      task: task,
      status: 'invoked',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 执行工作流（带 Agent Teams）
   */
  async executeWithAgentTeams(config) {
    const { mode, outputDir, inputData, agentTeamsConfig } = config;

    // Phase 1: 预处理（可并行）
    if (agentTeamsConfig?.preProcess) {
      console.log(`[Agent Teams] Running pre-process: ${agentTeamsConfig.preProcess.map(t => t.agent).join(', ')}`);
      const preResults = await this.invokeAgentTeams(
        agentTeamsConfig.preProcess,
        { inputData }
      );
      // 合并预处理结果
      Object.assign(inputData, { preProcessResults: preResults });
    }

    // Phase 2: 执行工作流
    const result = await this.execute(config);

    // Phase 3: 后处理（可并行）
    if (agentTeamsConfig?.postProcess) {
      console.log(`[Agent Teams] Running post-process: ${agentTeamsConfig.postProcess.map(t => t.agent).join(', ')}`);
      const postResults = await this.invokeAgentTeams(
        agentTeamsConfig.postProcess,
        { result }
      );
      result.agentReviews = postResults;
    }

    return result;
  }

  /**
   * 生成 Agent Teams 配置
   */
  generateAgentTeamsConfig(workflowType) {
    const configs = {
      'code-review': [
        { agent: 'code-reviewer', task: '代码质量审查' },
        { agent: 'security-reviewer', task: '安全漏洞检查' }
      ],
      'full-review': [
        { agent: 'code-reviewer', task: '代码质量审查' },
        { agent: 'security-reviewer', task: '安全漏洞检查' },
        { agent: 'performance-optimizer', task: '性能优化建议' }
      ],
      'testing': [
        { agent: 'tdd-guide', task: '测试用例编写' },
        { agent: 'code-reviewer', task: '测试代码审查' }
      ],
      'documentation': [
        { agent: 'doc-updater', task: '文档更新' },
        { agent: 'code-reviewer', task: '文档准确性审查' }
      ]
    };

    return configs[workflowType] || configs['code-review'];
  }

  /**
   * 执行工作流（保持向后兼容）
   */
  async execute(config) {
    // 子类需要实现这个方法
    throw new Error('execute method must be implemented by subclass');
  }
}

module.exports = BaseWorkflow;
