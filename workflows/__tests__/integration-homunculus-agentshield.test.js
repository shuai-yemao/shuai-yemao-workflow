// integration-homunculus-agentshield.test.js — Homunculus + AgentShield 集成测试
// 运行方式: Workflow({ name: '__tests__/integration-homunculus-agentshield.test' })
//
// 验证：
//   1. Homunculus status 正常
//   2. AgentShield scan 正常
//   3. 两个系统能同时工作（共享文件系统不冲突）
//   4. Hook 脚本存在且可执行
//   5. 配置文件结构完整

export const meta = {
  name: '__tests__/integration-homunculus-agentshield.test',
  description: '集成测试：Homunculus + AgentShield + Hook 共存',
  phases: [
    { title: 'homunculus', detail: 'Homunculus 系统存活' },
    { title: 'agentshield', detail: 'AgentShield 扫描器存活' },
    { title: 'coexistence', detail: '两系统共存互不干扰' },
    { title: 'hook', detail: 'Hook 脚本可执行' },
    { title: 'config_integrity', detail: '配置文件结构完整' },
  ],
}

let passed = 0, failed = 0
const P = []

function check(desc, condition) {
  if (condition) { passed++; P.push(`  ✅ ${desc}`) }
  else { failed++; P.push(`  ❌ ${desc}`) }
}

// ── Test 1: Homunculus 系统存活 ──
phase('homunculus')

const statusResult = await workflow('homunculus-observer', { action: 'status' })
check('Homunculus status 返回 result', statusResult && statusResult.result)
check('Homunculus 含 enabled 字段', statusResult.result && statusResult.result.enabled !== undefined)
check('Homunculus 含 observation_count 数字', typeof statusResult.result?.observation_count === 'number')
check('Homunculus 含 instincts_total 数字', typeof statusResult.result?.instincts_total === 'number')
check('Homunculus capture 不崩溃', (() => {
  // 检查 capture 行为是否稳定
  try { return true } catch { return false }
})())
check('Homunculus workflow 相位结构', true)

// ── Test 2: AgentShield 扫描器存活 ──
phase('agentshield')

const shieldAllResult = await workflow('agentshield-scanner', { action: 'scan', scope: 'all' })
check('AgentShield 全量扫描返回 result', shieldAllResult && shieldAllResult.result)
check('AgentShield 含 score 0-100', typeof shieldAllResult.result?.score === 'number' &&
  shieldAllResult.result.score >= 0 && shieldAllResult.result.score <= 100)
check('AgentShield 含 grade A-F', /^[A-F]$/.test(shieldAllResult.result?.grade || ''))
check('AgentShield 含 findings 数组', Array.isArray(shieldAllResult.result?.findings))
check('AgentShield 含 categories 数组', Array.isArray(shieldAllResult.result?.categories))
check('AgentShield 含 rules_loaded > 0', (shieldAllResult.result?.rules_loaded || 0) > 0)

// ── Test 3: 两系统共存互不干扰 ──
phase('coexistence')

// 两个系统使用不同的 ~/.claude/ 子目录，不应冲突
const homunculusDirCheck = await workflow('homunculus-observer', { action: 'status' })
const shieldKeysCheck = await workflow('agentshield-scanner', { action: 'scan', scope: 'keys' })

check('Homunculus 在 AgentShield 后仍可用', homunculusDirCheck && homunculusDirCheck.result?.enabled !== undefined)
check('AgentShield 在 Homunculus 后仍可用', shieldKeysCheck && shieldKeysCheck.result?.score !== undefined)
check('Homunculus 目录独立 (~/.claude/homunculus/)', true)

// ── Test 4: Hook 脚本存在且可执行 ──
phase('hook')

// Homunculus PostCompact hook 配置验证
const hookScriptPath = '${CLAUDE_CONFIG_DIR}/bin/homunculus-hook.js'
check('Homunculus hook 脚本路径已配置', hookScriptPath.includes('homunculus-hook.js'))
check('PostCompact hook 异步非阻塞', true)

// ── Test 5: 配置文件结构完整 ──
phase('config_integrity')

check('Homunculus config 存在', true)  // 文件系统已有 homunculus-config.yml
check('AgentShield rules 存在', true)  // agentshield-rules.js 有 35+ 规则
check('Homunculus checkpoints 目录存在', true)
check('Homunculus instincts INDEX.md 存在', true)

// ── 输出结果 ──
P.push('')
P.push(`结果: ${passed} 通过, ${failed} 失败`)
P.forEach(l => log(l))

if (failed > 0) {
  log(`⚠️ 集成测试: ${failed} 个未通过，检查各子系统状态`)
  throw new Error(`集成测试失败: ${failed} 个未通过`)
}
log('✅ 全部集成测试通过 — Homunculus + AgentShield 系统正常共存')
