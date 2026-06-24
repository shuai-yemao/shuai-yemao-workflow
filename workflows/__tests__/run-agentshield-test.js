#!/usr/bin/env node
/**
 * AgentShield 扫描器测试运行器 v4
 *
 * 使用 vm.Script 加载 ESM 格式的 workflow，移除 execution block，
 * 提取 runScan() 函数，用真实配置数据测试各扫描 scope。
 *
 * 修复: runScan 为 async 函数，需 await 所有调用。
 * 修复: 使用行级分割精准移除 execution block。
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const vm = require('vm');

// ============================================================
// 加载 scanner 函数
// ============================================================
function loadScanner() {
  const scannerCode = fs.readFileSync(
    path.join(__dirname, '..', 'agentshield-scanner.js'), 'utf-8'
  );

  // 行级分割：精准移除 execution block（从 phase 调用行 到文件尾）
  const PHASE_MARKER = "phase('";
  const codeLines = scannerCode.split('\n');
  let execStartIdx = -1;
  for (let i = 0; i < codeLines.length; i++) {
    if (codeLines[i].indexOf(PHASE_MARKER) !== -1) {
      execStartIdx = i;
      break;
    }
  }
  const definitionPart = execStartIdx >= 0
    ? codeLines.slice(0, execStartIdx).join('\n')
    : scannerCode;

  // 清理 ES module 语法
  let cleaned = definitionPart
    .replace(/export\s+const\s+meta\s*=[\s\S]*?(?=\n\/\/|\nfunction|\nconst|\nlet|\nvar)/, 'const meta = {}')
    .replace(/export\s+const\s+/g, 'const ')
    .replace(/export\s+function\s+/g, 'function ')
    .replace(/export\s+default\s+/g, '')
    .replace(/^\s*phase\(.*\)\s*$/gm, '')
    .replace(/^\s*log\(.*\)\s*$/gm, '');

  function mockAgent() {
    return Promise.resolve(JSON.stringify({
      files_scanned: ["settings.json","CLAUDE.md",".env"],
      findings: [{ rule_id: "KEY-001", severity: "critical", category: "keys", title: "Mock Key", evidence: "mock", file: ".env", recommendation: "use env" }, { rule_id: "PERM-001", severity: "medium", category: "permissions", title: "Mock Perm", evidence: "mock", file: "settings.json", recommendation: "tighten" }],
    }));
  }
  const sandbox = {
    agent: mockAgent,
    log: function() {},
    phase: function() {},
    args: { action: 'scan', scope: 'all' },
    require: function(name) {
      if (name === 'fs') return fs;
      if (name === 'path') return path;
      throw new Error('unsupported require: ' + name);
    },
    process: process,
    Buffer: Buffer,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    console: { log: function() {}, error: function() {}, warn: function() {} },
  };

  const context = vm.createContext(sandbox);
  const script = new vm.Script(cleaned, {
    filename: 'agentshield-scanner.js',
    timeout: 10000,
  });

  try {
    script.runInContext(context);
  } catch (e) {
    // ignore top-level errors from removed code artifacts
  }

  const fns = {};
  if (typeof context.runScan === 'function') fns.runScan = context.runScan;
  if (typeof context.collectFiles === 'function') fns.collectFiles = context.collectFiles;
  if (typeof context.loadRules === 'function') fns.loadRules = context.loadRules;
  if (typeof context.getBuiltinRules === 'function') fns.getBuiltinRules = context.getBuiltinRules;

  return fns;
}

const scanner = loadScanner();

if (typeof scanner.runScan !== 'function') {
  console.error('runScan function not found. Available:', Object.keys(scanner));
  process.exit(1);
}

const runScan = scanner.runScan;
const loadRules = scanner.loadRules;
const getBuiltinRules = scanner.getBuiltinRules;

// ============================================================
// 测试框架
// ============================================================
var passed = 0;
var failed = 0;

function check(desc, condition) {
  if (condition) { passed++; console.log('  PASS: ' + desc); }
  else { failed++; console.log('  FAIL: ' + desc); }
}

function phase(title) { console.log('\n=== ' + title + ' ==='); }

// ============================================================
// 设置测试环境
// ============================================================
var tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentshield-test-'));
var claudeDir = path.join(tmpDir, '.claude');
fs.mkdirSync(claudeDir, { recursive: true });

var origHome = process.env.HOME;
process.env.HOME = tmpDir;
process.env.USERPROFILE = tmpDir;

function writeFile(name, content) {
  var fp = path.join(claudeDir, name);
  var dir = path.dirname(fp);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fp, content, 'utf-8');
}

// --- 测试配置文件 ---
writeFile('settings.json', JSON.stringify({
  env: {
    ANTHROPIC_AUTH_TOKEN: '${ANTHROPIC_AUTH_TOKEN}',
    OPENAI_API_KEY: '${OPENAI_API_KEY}',
  },
  permissions: {
    allow: ['Read(*)', 'Write(*)', 'Bash(git)', 'Bash(npm)'],
    defaultMode: 'prompt',
  },
  mcpServers: {
    filesystem: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem'], timeout: 30000 },
    github: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-github'], timeout: 30000 },
  },
  hooks: {
    SessionStart: [{ script: '~/.claude/hooks/session-start.sh', async: true, timeout: 30000 }],
  },
}, null, 2));

writeFile('CLAUDE.md', '# Test Project\n\nTest config for AgentShield.\n');
writeFile('.env', 'DB_PASSWORD=supersecret123\nAPI_KEY=sk-ant-test12345\nSECRET_TOKEN=my-token\n');
writeFile('AGENTS.md', '# Agent Rules\n\n- Safe operations only\n');
writeFile('SOUL.md', '# Chip Personality\n\nTest persona.\n');

fs.mkdirSync(path.join(claudeDir, 'hooks'), { recursive: true });
writeFile(path.join('hooks', 'session-start.sh'), '#!/bin/bash\necho "Starting session..."\n');

// 复制规则文件
var rulesDir = path.join(claudeDir, 'workflows');
fs.mkdirSync(rulesDir, { recursive: true });
fs.copyFileSync(
  path.join(__dirname, '..', 'agentshield-rules.js'),
  path.join(rulesDir, 'agentshield-rules.js')
);

console.log('Test environment: ' + claudeDir);

// ============================================================
// 异步执行所有测试
// ============================================================
async function runTests() {

// ============================================================
// Test 1: scan scope=all
// ============================================================
phase('scan_all');

var allResult = await runScan('all');
check('full scan returns result', !!allResult);
check('has score (number)', typeof allResult.score === 'number');
check('has grade (A-F)', /^[A-F]$/.test(allResult.grade || ''));
check('findings is array', Array.isArray(allResult.findings));
check('categories is array', Array.isArray(allResult.categories));
check('rules_loaded is number', typeof allResult.rules_loaded === 'number');
check('files_scanned is number', typeof allResult.files_scanned === 'number');
check('score in 0-100', allResult.score >= 0 && allResult.score <= 100);
console.log('  Result: grade=' + allResult.grade + ' score=' + allResult.score +
  ' findings=' + allResult.findings.length +
  ' rules=' + allResult.rules_loaded + ' files=' + allResult.files_scanned);

// ============================================================
// Test 2: scan scope=keys
// ============================================================
phase('scan_keys');

var keysResult = await runScan('keys');
check('key scan returns result', !!keysResult);
check('key scan has score', typeof keysResult.score === 'number');
check('findings is array', Array.isArray(keysResult.findings));
check('categories includes keys', keysResult.categories.some(function(c) { return c.name === 'keys'; }));
console.log('  Result: grade=' + keysResult.grade + ' score=' + keysResult.score +
  ' findings=' + keysResult.findings.length);

// ============================================================
// Test 3: scan scope=mcp
// ============================================================
phase('scan_mcp');

var mcpResult = await runScan('mcp');
check('MCP scan returns result', !!mcpResult);
check('MCP scan has score', typeof mcpResult.score === 'number');
console.log('  Result: grade=' + mcpResult.grade + ' score=' + mcpResult.score +
  ' findings=' + mcpResult.findings.length);

// ============================================================
// Test 4: scan scope=permissions
// ============================================================
phase('scan_permissions');

var permResult = await runScan('permissions');
check('perm scan returns result', !!permResult);
check('perm scan has score', typeof permResult.score === 'number');
console.log('  Result: grade=' + permResult.grade + ' score=' + permResult.score +
  ' findings=' + permResult.findings.length);

// ============================================================
// Test 5: scan scope=hooks
// ============================================================
phase('scan_hooks');

var hooksResult = await runScan('hooks');
check('hook scan returns result', !!hooksResult);
check('hook scan has score', typeof hooksResult.score === 'number');
console.log('  Result: grade=' + hooksResult.grade + ' score=' + hooksResult.score +
  ' findings=' + hooksResult.findings.length);

// ============================================================
// Test 6: scan scope=agents
// ============================================================
phase('scan_agents');

var agentsResult = await runScan('agents');
check('agent scan returns result', !!agentsResult);
check('agent scan has score', typeof agentsResult.score === 'number');
console.log('  Result: grade=' + agentsResult.grade + ' score=' + agentsResult.score +
  ' findings=' + agentsResult.findings.length);

// ============================================================
// Test 7: 未知 scope 优雅处理
// ============================================================
phase('edge_cases');

var invalidResult = await runScan('invalid');
check('unknown scope returns result', !!invalidResult);
// unknown scope falls back to 'all' — score matches whatever 'all' returns
check('unknown scope has score', typeof invalidResult.score === 'number');
check('unknown scope returns array', Array.isArray(invalidResult.findings));

// ============================================================
// Test 8: 危险配置场景
// ============================================================
phase('dangerous_config');

var dangerDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentshield-danger-'));
var dangerClaude = path.join(dangerDir, '.claude');
fs.mkdirSync(dangerClaude, { recursive: true });
fs.writeFileSync(path.join(dangerClaude, 'settings.json'), JSON.stringify({
  env: { ANTHROPIC_AUTH_TOKEN: 'sk-ant-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
  permissions: { allow: ['*', 'Bash(*)'], defaultMode: 'auto' },
  mcpServers: { risky: { command: 'npx', args: ['-y', 'some-package'], timeout: 30000 } },
}));
fs.writeFileSync(path.join(dangerClaude, '.env'), 'SECRET_KEY=hardcoded-secret-value\n');

process.env.HOME = dangerDir;
process.env.USERPROFILE = dangerDir;

var dangerResult = await runScan('all');
check('dangerous config returns result', !!dangerResult);
check('dangerous config score < 100', dangerResult.score < 100);
check('has findings', dangerResult.findings.length > 0);

var keyFindings = dangerResult.findings.filter(function(f) {
  return f.category === 'keys' || f.category === 'permissions';
});
check('finds key/perm issues', keyFindings.length > 0);
console.log('  Score: ' + dangerResult.score + ' Grade: ' + dangerResult.grade +
  ' Findings: ' + dangerResult.findings.length);

process.env.HOME = origHome;
process.env.USERPROFILE = origHome;
try { fs.rmSync(dangerDir, { recursive: true }); } catch {}

// ============================================================
// Test 9: 规则数量验证
// ============================================================
phase('rules_validation');

if (typeof loadRules === 'function') {
  var rules = loadRules();
  if (rules) {
    var total = (rules.RULES_KEY_SCANNER && rules.RULES_KEY_SCANNER.length || 0) +
      (rules.RULES_MCP_SCANNER && rules.RULES_MCP_SCANNER.length || 0) +
      (rules.RULES_PERMISSION && rules.RULES_PERMISSION.length || 0) +
      (rules.RULES_HOOK && rules.RULES_HOOK.length || 0) +
      (rules.RULES_AGENT_CONFIG && rules.RULES_AGENT_CONFIG.length || 0);
    check('loaded rules >= 35', total >= 35);
    console.log('  Total rules: ' + total + ' (expected >= 35)');
  } else {
    check('rules loaded non-null', false);
  }
} else {
  if (typeof getBuiltinRules === 'function') {
    var builtin = getBuiltinRules();
    var total = Object.keys(builtin).reduce(function(s, k) { return s + builtin[k].length; }, 0);
    check('builtin rules >= 8', total >= 8);
    console.log('  Builtin rules: ' + total + ' (expected >= 8)');
  }
}

// ============================================================
// 清理
// ============================================================
try { fs.rmSync(tmpDir, { recursive: true }); } catch {}

// ============================================================
// 汇总
// ============================================================
console.log('\n' + '='.repeat(50));
console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
console.log('='.repeat(50));

if (failed > 0) {
  console.error('\nFAILED: ' + failed + ' tests failed');
  process.exit(1);
} else {
  console.log('\nAgentShield scanner: all ' + passed + ' tests passed');
  process.exit(0);
}

}

runTests().catch(function(err) {
  console.error('\nTest execution error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
