#!/usr/bin/env node
/**
 * Homunculus 持续学习系统测试运行器 v1
 *
 * 使用 vm.Script 加载 ESM 格式的 workflow 文件，mock Workflow 引擎内置函数。
 * 测试 handleStatus / handleCapture / handleAnalyze 三个核心 handler。
 *
 * 运行方式: node run-homunculus-test.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ============================================================
// 加载 workflow 并提取 handler 函数
// ============================================================
function loadWorkflow() {
  const workflowCode = fs.readFileSync(
    path.join(__dirname, '..', 'homunculus-observer.js'),
    'utf-8'
  );

  // 解析：找到 execution block 起始行（phase('路由')），保留之前的所有定义
  const lines = workflowCode.split('\n');
  const execStartIdx = lines.findIndex(
    l => l.includes("phase('路由')") || l.includes('phase("路由")')
  );
  if (execStartIdx < 0) {
    throw new Error('无法定位 execution block（phase(\'路由\')）');
  }

  // 保留 handler + 常量定义，去掉 execution block 和 export
  let cleaned = lines.slice(0, execStartIdx).join('\n');
  cleaned = cleaned.replace(/export\s+/g, '');

  // 去掉顶层的 phase()/log() 调用（如果有）
  cleaned = cleaned.replace(/^\s*phase\([^)]*\)\s*$/gm, '');
  cleaned = cleaned.replace(/^\s*log\([^)]*\)\s*$/gm, '');

  // 构建 sandbox：mock 所有 Workflow 引擎内置函数
  let agentCallLog = [];

  const sandbox = {
    // mock agent: 根据 label 返回对应测试数据
    agent: async function (opts) {
      const label = opts && opts.label;
      agentCallLog.push(label || 'unknown');

      if (label === 'homunculus-status') {
        return {
          observation_count: 42,
          observation_files: 3,
          instincts_total: 5,
          instincts_by_domain: { embedded: 3, code_style: 2 },
          last_analysis: '2026-06-12T10:00:00.000Z',
          lock_active: false,
        };
      }
      if (label === 'homunculus-capture') {
        return { status: 'no_new_data', new_observations: 0, reason: 'no new history entries' };
      }
      if (label === 'homunculus-analyze') {
        return {
          new_instincts: 2,
          updated_instincts: 0,
          total_instincts: 5,
          observation_count: 42,
          bridge_candidates: [
            { slug: 'hal-preference', confidence: 0.75 },
            { slug: 'i2c-initialization', confidence: 0.70 },
          ],
        };
      }
      // default mock
      return {};
    },
    log: function () {},
    phase: function () {},
    args: {},
    console: console,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    Promise: Promise,
    // 让 sandbox 追踪 agent 调用
    _getAgentCallLog: function () { return agentCallLog; },
    _resetAgentCallLog: function () { agentCallLog = []; },
  };

  const context = vm.createContext(sandbox);
  const script = new vm.Script(cleaned, {
    filename: 'homunculus-observer.js',
    timeout: 10000,
  });

  try {
    script.runInContext(context);
  } catch (e) {
    // 定义阶段的错误不应阻塞（const/function 定义失败才会报错）
    if (e.message && !e.message.includes('is not defined')) {
      throw e;
    }
  }

  // 检查 handler 是否可用
  const handlers = {};
  if (typeof context.handleStatus === 'function') handlers.handleStatus = context.handleStatus;
  if (typeof context.handleCapture === 'function') handlers.handleCapture = context.handleCapture;
  if (typeof context.handleAnalyze === 'function') handlers.handleAnalyze = context.handleAnalyze;

  return { handlers, context, getAgentCallLog: () => agentCallLog, resetAgentCallLog: () => { agentCallLog = []; } };
}

// ============================================================
// 测试框架
// ============================================================
let passed = 0;
let failed = 0;
const results = [];

function check(desc, condition) {
  if (condition) {
    passed++;
    results.push('  PASS: ' + desc);
  } else {
    failed++;
    results.push('  FAIL: ' + desc);
  }
}

function phase(title) {
  results.push('\n=== ' + title + ' ===');
}

function printResults() {
  results.forEach(function (l) { console.log(l); });
  console.log('\n' + '='.repeat(50));
  console.log('测试结果: ' + passed + ' 通过, ' + failed + ' 失败');
  console.log('='.repeat(50));
}

// ============================================================
// 加载 workflow
// ============================================================
console.log('加载 Homunculus workflow...');
let wf;
try {
  wf = loadWorkflow();
  console.log('  可用 handler:', Object.keys(wf.handlers).join(', '));

  if (typeof wf.handlers.handleStatus !== 'function') {
    console.error('ERROR: handleStatus 函数未找到');
    process.exit(1);
  }
  if (typeof wf.handlers.handleCapture !== 'function') {
    console.error('ERROR: handleCapture 函数未找到');
    process.exit(1);
  }
  if (typeof wf.handlers.handleAnalyze !== 'function') {
    console.error('ERROR: handleAnalyze 函数未找到');
    process.exit(1);
  }
} catch (e) {
  console.error('加载 workflow 失败:', e.message);
  process.exit(1);
}

// ============================================================
// 测试执行（异步）
// ============================================================
async function runTests() {
  const handleStatus = wf.handlers.handleStatus;
  const handleCapture = wf.handlers.handleCapture;
  const handleAnalyze = wf.handlers.handleAnalyze;

  // ── Test 1: status ──
  phase('status');
  var statusResult = await handleStatus();
  check('handleStatus 返回对象', typeof statusResult === 'object');
  check('status 含 enabled 字段', statusResult.enabled !== undefined);
  check('status.enabled === true', statusResult.enabled === true);
  check('status 含 instincts_total 数字', typeof statusResult.instincts_total === 'number');
  check('status 含 observation_count 数字', typeof statusResult.observation_count === 'number');
  check('instincts_total === 5（mock 返回值）', statusResult.instincts_total === 5);
  check('observation_count === 42（mock 返回值）', statusResult.observation_count === 42);

  // ── Test 2: capture ──
  phase('capture');
  wf.resetAgentCallLog();
  var captureResult = await handleCapture();
  check('handleCapture 返回对象', typeof captureResult === 'object');
  check('capture 含 status 字段', captureResult.status !== undefined);
  check('capture 状态为 ok/skipped/no_new_data',
    ['ok', 'skipped', 'no_new_data'].indexOf(captureResult.status || '') >= 0);
  check('capture.new_observations === 0（mock 返回 no_new_data）', captureResult.new_observations === 0);

  // ── Test 3: analyze ──
  phase('analyze');
  wf.resetAgentCallLog();
  var analyzeResult = await handleAnalyze();
  check('handleAnalyze 返回对象', typeof analyzeResult === 'object');
  check('analyze 含 status 字段', analyzeResult.status !== undefined);
  check('analyze.status === "completed"', analyzeResult.status === 'completed');
  check('analyze 含 new_instincts 数字', typeof analyzeResult.new_instincts === 'number');
  check('analyze 含 total_instincts 数字', typeof analyzeResult.total_instincts === 'number');
  check('analyze.new_instincts === 2', analyzeResult.new_instincts === 2);
  check('analyze.total_instincts === 5', analyzeResult.total_instincts === 5);
  check('analyze 含 bridge_candidates 数组', Array.isArray(analyzeResult.bridge_candidates));
  check('analyze 不会崩溃（空数据也返回结构）', analyzeResult !== null);
  check('bridge_candidates 长度 === 2', analyzeResult.bridge_candidates.length === 2);

  // ── 打印 ──
  printResults();

  if (failed > 0) {
    console.error('\n失败: ' + failed + ' 个测试未通过');
    process.exit(1);
  } else {
    console.log('\n✅ Homunculus 全部 ' + passed + ' 个测试通过');
    process.exit(0);
  }
}

runTests().catch(function (err) {
  console.error('测试执行异常:', err.message);
  console.error(err.stack);
  process.exit(1);
});
