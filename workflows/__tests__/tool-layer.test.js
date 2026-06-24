// tool-layer.test.js — 工具层单元测试
// 运行方式: Workflow({ scriptPath: '.claude/workflows/__tests__/tool-layer.test.js' })
// 测试 tool-layer 各 action 的基本功能和错误处理
//

export const meta = {
  name: '__tests__/tool-layer.test',
  description: '工具层单元测试 — list/adopt/install/remove/update/deps-tree',
  phases: [
    { title: 'list', detail: '扫描并列出所有 Skill' },
    { title: 'adopt', detail: '收养已有 Skill' },
    { title: 'remove', detail: '卸载 Skill（含错误处理）' },
    { title: 'install', detail: '安装 Skill（含参数校验）' },
    { title: 'update', detail: '检查更新' },
    { title: 'deps-tree', detail: '依赖关系分析' },
  ],
}

// tool-layer 通过 scriptPath 调用（引擎注册名缓存限制）
const TL = { scriptPath: 'C:/Users/zhang/.claude/workflows/tool-layer.js' }

let passed = 0, failed = 0
const results = []

function check(desc, condition) {
  if (condition) { passed++; results.push(`  ✅ ${desc}`) }
  else { failed++; results.push(`  ❌ ${desc}`) }
}

// ── Test 1: list — 扫描所有技能 ──
phase('list')
log('Test: list—扫描所有技能')

const listResult = await workflow(TL, { action: 'list' })
check('list 返回 total', listResult && typeof listResult.total === 'number')
check('list total >= 100', listResult && listResult.total >= 100)
check('list 返回 skills 数组', listResult && Array.isArray(listResult.skills))
check('list skills 非空', listResult && listResult.skills.length > 0)
check('list 每项有 name', listResult.skills.every(s => s.name))
check('list 每项有 category', listResult.skills.every(s => s.category))
check('list 每项有 status', listResult.skills.every(s => s.status))

// ── Test 2: adopt — 收养已有技能 ──
phase('adopt')
log('Test: adopt—收养已有技能')

// 收养一个不存在的技能应报错
const adoptMissing = await workflow(TL, { action: 'adopt', name: 'non-existent-test-skill' })
check('adopt 不存在的技能返回 success=false', adoptMissing && adoptMissing.success === false)
check('adopt 不存在的技能返回 error', adoptMissing && adoptMissing.error)

// 收养一个真实技能
const adoptReal = await workflow(TL, { action: 'adopt', name: 'spi-bus', source: 'unit-test' })
check('adopt 真实技能返回 success=true', adoptReal && adoptReal.success === true)
check('adopt 返回 name', adoptReal && adoptReal.name === 'spi-bus')
check('adopt 返回 version', adoptReal && typeof adoptReal.version === 'string')

// ── Test 3: remove — 卸载技能 ──
phase('remove')
log('Test: remove')

const removeMissing = await workflow(TL, { action: 'remove', name: 'non-existent-skill' })
check('remove 不存在的技能返回 success=false', removeMissing && removeMissing.success === false)
check('remove 不存在的技能返回 error', removeMissing && removeMissing.error)

const removeNoName = await workflow(TL, { action: 'remove' }).catch(e => ({ error: e.message }))
check('remove 缺 name 参数抛错', removeNoName && removeNoName.error)

// ── Test 4: install — 参数校验 ──
phase('install')
log('Test: install')

const installNoSource = await workflow(TL, { action: 'install' }).catch(e => ({ error: e.message }))
check('install 缺 source 参数抛错', installNoSource && installNoSource.error)

// ── Test 5: update — 检查更新（无来源的 skill） ──
phase('update')
log('Test: update')

const updateNoSource = await workflow(TL, { action: 'update', name: 'uart-module' })
check('update 无来源返回 error=no_source', updateNoSource && updateNoSource.error === 'no_source')
check('update 返回 name', updateNoSource && updateNoSource.name === 'uart-module')

const updateNoName = await workflow(TL, { action: 'update' }).catch(e => ({ error: e.message }))
check('update 缺 name 参数抛错', updateNoName && updateNoName.error)

// ── Test 6: deps-tree — 依赖分析 ──
phase('deps-tree')
log('Test: deps-tree')

const depsResult = await workflow(TL, { action: 'deps-tree' })
check('deps-tree 返回结果', depsResult && typeof depsResult === 'object' || typeof depsResult === 'string')

// ── Test 7: list — 验证收养后注册表更新 ──
phase('list')
log('Test: list after adopt')

const listAfter = await workflow(TL, { action: 'list' })
const registeredSkills = listAfter.skills.filter(s => s.status === 'registered')
const spiBus = listAfter.skills.find(s => s.name === 'spi-bus')
check('spi-bus 状态为 registered', spiBus && spiBus.status === 'registered')
check('已注册技能数 >= 3', registeredSkills.length >= 3)
check('orphaned + registered + archived = total',
  listAfter.registered + listAfter.orphaned + listAfter.archived === listAfter.total)

// ── 输出汇总 ──
log('')
log('═'.repeat(40))
log(`结果: ${passed} passed, ${failed} failed, ${passed + failed} total`)
log('')
for (const r of results) log(r)

return { passed, failed, total: passed + failed }
