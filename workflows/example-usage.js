/**
 * 使用示例 - 展示如何使用 WorkflowExecutor 执行工作流
 */

const WorkflowExecutor = require('./workflow-executor');
const FirmwareDevelopmentWorkflow = require('./firmware-development/workflow');
const HardwareDesignWorkflow = require('./hardware-design/workflow');
const SoftwareDevelopmentWorkflow = require('./software-development/workflow');

// 创建执行器
const executor = new WorkflowExecutor();

// 注册工作流
executor.register('firmware-development', new FirmwareDevelopmentWorkflow());
executor.register('hardware-design', new HardwareDesignWorkflow());
executor.register('software-development', new SoftwareDevelopmentWorkflow());

// 示例 1: 执行固件开发工作流（带 Agent Teams）
async function example1() {
  console.log('=== 示例 1: 固件开发工作流 ===\n');

  const result = await executor.execute('firmware-development', {
    mode: 'full-run',
    outputDir: './output/firmware-example',
    inputData: {
      product: 'STM32F411CEU6 开发板',
      layers: [
        { name: 'HAL 层', modules: ['I2C', 'SPI', 'UART'] },
        { name: '中间件层', modules: ['FreeRTOS'] }
      ],
      releases: [
        { version: '1.0.0', features: ['基础驱动'] }
      ]
    }
  });

  console.log('\n执行结果:');
  console.log('- 成功:', result.success);
  console.log('- Agent Reviews:', result.agentReviews?.length || 0);
  console.log('- 摘要:', result.summary?.markdown?.substring(0, 200) + '...');
}

// 示例 2: 执行硬件设计工作流（带 Agent Teams）
async function example2() {
  console.log('\n=== 示例 2: 硬件设计工作流 ===\n');

  const result = await executor.execute('hardware-design', {
    mode: 'full-run',
    outputDir: './output/hardware-example',
    inputData: {
      product: 'IoT 传感器模块',
      components: [
        { name: 'STM32F103', type: 'MCU' },
        { name: 'BME280', type: '传感器' }
      ]
    }
  });

  console.log('\n执行结果:');
  console.log('- 成功:', result.success);
  console.log('- Agent Reviews:', result.agentReviews?.length || 0);
}

// 示例 3: 执行软件开发工作流（带 Agent Teams）
async function example3() {
  console.log('\n=== 示例 3: 软件开发工作流 ===\n');

  const result = await executor.execute('software-development', {
    mode: 'full-run',
    outputDir: './output/software-example',
    inputData: {
      project: 'Web 应用',
      requirements: [
        { id: 'REQ-001', description: '用户登录功能' },
        { id: 'REQ-002', description: '数据展示功能' }
      ]
    }
  });

  console.log('\n执行结果:');
  console.log('- 成功:', result.success);
  console.log('- Agent Reviews:', result.agentReviews?.length || 0);
}

// 示例 4: 获取工作流的 Agent Teams 配置
function example4() {
  console.log('\n=== 示例 4: Agent Teams 配置 ===\n');

  const firmwareConfig = executor.getAgentTeamsConfig('firmware-development');
  console.log('固件开发工作流 Agent Teams 配置:');
  console.log('- 预处理:', firmwareConfig.preProcess?.map(t => t.agent).join(', '));
  console.log('- 后处理:', firmwareConfig.postProcess?.map(t => t.agent).join(', '));

  const hardwareConfig = executor.getAgentTeamsConfig('hardware-design');
  console.log('\n硬件设计工作流 Agent Teams 配置:');
  console.log('- 预处理:', hardwareConfig.preProcess?.map(t => t.agent).join(', '));
  console.log('- 后处理:', hardwareConfig.postProcess?.map(t => t.agent).join(', '));
}

// 示例 5: 列出所有已注册的工作流
function example5() {
  console.log('\n=== 示例 5: 已注册的工作流 ===\n');

  const workflows = executor.getRegisteredWorkflows();
  console.log('已注册的工作流:');
  workflows.forEach(name => {
    console.log(`  - ${name}`);
  });
}

// 运行所有示例
async function runExamples() {
  try {
    await example1();
    await example2();
    await example3();
    example4();
    example5();
  } catch (error) {
    console.error('示例执行出错:', error.message);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runExamples();
}

module.exports = { executor, runExamples };
