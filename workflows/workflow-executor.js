/**
 * WorkflowExecutor - 工作流执行器
 * 集成 Agent Teams 的工作流执行器
 */
const agentTeamsConfig = require('./agent-teams-config');

class WorkflowExecutor {
  constructor() {
    this.workflows = new Map();
    this.agentTeamsConfig = agentTeamsConfig;
  }

  /**
   * 注册工作流
   */
  register(name, workflow) {
    this.workflows.set(name, workflow);
    console.log(`[WorkflowExecutor] Registered workflow: ${name}`);
  }

  /**
   * 执行工作流（带 Agent Teams）
   */
  async execute(workflowName, config) {
    const workflow = this.workflows.get(workflowName);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowName}`);
    }

    // 获取 Agent Teams 配置
    const teamsConfig = this.agentTeamsConfig[workflowName]
      || this.agentTeamsConfig['default'];

    console.log(`[WorkflowExecutor] Executing workflow: ${workflowName}`);
    console.log(`[WorkflowExecutor] Agent Teams config:`, teamsConfig);

    // 创建带 Agent Teams 的工作流
    const workflowWithTeams = this.wrapWithAgentTeams(workflow, teamsConfig);

    // 执行
    return await workflowWithTeams.execute(config);
  }

  /**
   * 包装工作流，添加 Agent Teams 能力
   */
  wrapWithAgentTeams(workflow, teamsConfig) {
    const originalExecute = workflow.execute.bind(workflow);

    workflow.execute = async (config) => {
      const startTime = Date.now();
      console.log(`[Agent Teams] Starting workflow execution...`);

      // 1. 预处理 Agent Teams
      if (teamsConfig.preProcess) {
        console.log(`[Agent Teams] Running pre-process: ${teamsConfig.preProcess.map(t => t.agent).join(', ')}`);
        const preResults = await this.runAgentTeams(teamsConfig.preProcess, config);
        config.inputData = { ...config.inputData, preProcessResults: preResults };
        console.log(`[Agent Teams] Pre-process completed`);
      }

      // 2. 执行原始工作流
      console.log(`[Agent Teams] Executing original workflow...`);
      const result = await originalExecute(config);

      // 3. 后处理 Agent Teams
      if (teamsConfig.postProcess) {
        console.log(`[Agent Teams] Running post-process: ${teamsConfig.postProcess.map(t => t.agent).join(', ')}`);
        const postResults = await this.runAgentTeams(teamsConfig.postProcess, { result });
        result.agentReviews = postResults;
        console.log(`[Agent Teams] Post-process completed`);
      }

      const endTime = Date.now();
      console.log(`[Agent Teams] Workflow execution completed in ${endTime - startTime}ms`);

      return result;
    };

    return workflow;
  }

  /**
   * 运行 Agent Teams
   */
  async runAgentTeams(teams, context) {
    const results = await Promise.all(
      teams.map(async (team) => {
        try {
          const result = await this.invokeAgent(team.agent, team.task, context);
          return { agent: team.agent, task: team.task, status: 'completed', result };
        } catch (error) {
          console.error(`[Agent Teams] Error invoking agent ${team.agent}:`, error.message);
          return { agent: team.agent, task: team.task, status: 'failed', error: error.message };
        }
      })
    );
    return results;
  }

  /**
   * 调用 Agent
   */
  async invokeAgent(agentName, task, context) {
    // 这个方法会被 Claude Code 运行时拦截
    // 实际调用 Claude Code 的 Agent 系统
    console.log(`[Agent Teams] Invoking agent: ${agentName} - ${task}`);

    // 返回占位结果（实际由 Claude Code 执行）
    return {
      agent: agentName,
      task: task,
      status: 'invoked',
      timestamp: new Date().toISOString(),
      context: context
    };
  }

  /**
   * 获取所有已注册的工作流
   */
  getRegisteredWorkflows() {
    return Array.from(this.workflows.keys());
  }

  /**
   * 获取工作流的 Agent Teams 配置
   */
  getAgentTeamsConfig(workflowName) {
    return this.agentTeamsConfig[workflowName] || this.agentTeamsConfig['default'];
  }
}

module.exports = WorkflowExecutor;
