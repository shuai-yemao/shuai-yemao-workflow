// orchestration-security.test.js — 编排层安全集成测试
// 验证 agent-orchestration 的 Phase 0.5/2.5 正确触发

export const meta = {
  name: '__tests__/orchestration-security.test',
  description: '编排层安全集成测试 — Phase 0.5 preflight + Phase 2.5 audit',
  phases: [
    { title: 'Phase 0.5', detail: '编排层预检集成验证' },
    { title: 'Phase 2.5', detail: '编排层审计集成验证' },
    { title: '汇总', detail: '测试结果汇总' },
  ],
}

phase('Phase 0.5: 预检集成')

let passed = 0, failed = 0
const P = []

function check(desc, condition) {
  if (condition) { passed++; P.push(`  ✅ ${desc}`) }
  else { failed++; P.push(`  ❌ ${desc}`) }
}

// ── Test 1: safety-layer 可作为 workflow("safety-layer", ...) 调用 ──
const slCheck = await workflow('safety-layer', { action: 'status' })
check('safety-layer status 可调用', slCheck && slCheck.action === 'status')
check('safety-layer 返回 result', slCheck && slCheck.result)

// ── Test 2: 编排层可调用 agent-orchestration ──
const orchCheck = await workflow('agent-orchestration', {
  tasks: [
    { id: 'TEST', name: '验证任务', description: '仅用于测试编排层响应结构', files: ['test.c'] },
  ],
  acceptance: [{ item: '测试验收', method: '查看' }],
  domain: 'embedded',
})
check('agent-orchestration 返回 guide', orchCheck && orchCheck.status === 'guide_ready')
check('编排层含 preflight 结果', orchCheck && orchCheck.security && orchCheck.security.phase_0_5)
check('编排层含 audit 结果', orchCheck && orchCheck.security && orchCheck.security.phase_2_5)
check('编排层返回 tasks 数组', Array.isArray(orchCheck.tasks))
check('编排层返回 batches 数组', Array.isArray(orchCheck.batches))

// ── Test 3: 编排层返回的任务含 preflight 字段 ──
const task0 = orchCheck.tasks[0]
check('task 含 preflight 字段', task0 && task0.preflight)
if (task0 && task0.preflight) {
  check('preflight 含 verdict', task0.preflight.verdict)
  check('preflight 含 risk_count', task0.preflight.risk_count !== undefined)
}

// ── Test 4: 编排层返回的 next_steps 含 Phase 0.5/2.5 说明 ──
check('next_steps 含 Phase 0.5 说明', orchCheck.next_steps.some(s => s.includes('Phase 0.5')))
check('next_steps 含 Phase 2.5 说明', orchCheck.next_steps.some(s => s.includes('Phase 2.5')))

for (const l of P) log(l)
log('Phase 0.5: ' + passed + '/' + (passed+failed) + ' 通过')
const p1 = passed; const t1 = passed+failed; passed = 0; failed = 0; P.length = 0

// ──────────────────────────────────────────────
phase('Phase 2.5: 审计集成')

// ── Test 5: 编排层报告含 security 阶段统计 ──
check('phase_0_5 enabled', orchCheck.security.phase_0_5.enabled === true)
check('phase_0_5 有 preflight_count', orchCheck.security.phase_0_5.preflight_count > 0)
check('phase_2_5 enabled', orchCheck.security.phase_2_5.enabled === true)
check('phase_2_5 有 session', typeof orchCheck.security.phase_2_5.session === 'string')

// ── Test 6: safety-layer audit action 可通过 name 引用 ──
const auditCheck = await workflow('safety-layer', {
  action: 'audit',
  entry: { type: 'integration_test', action: 'orchestration_test', result: 'success' },
  session: 'integration-test',
})
check('audit 集成可调用', auditCheck && auditCheck.result && auditCheck.result.logged === true)
check('audit 含 session 标记', auditCheck.result.session === 'integration-test')

for (const l of P) log(l)
log('Phase 2.5: ' + passed + '/' + (passed+failed) + ' 通过')
const p2 = passed; const t2 = passed+failed; passed = 0; failed = 0; P.length = 0

// ──────────────────────────────────────────────
phase('汇总')

log('')
log('===== 集成测试汇总 =====')
log('')
log('Phase 0.5:    ' + p1 + '/' + t1 + ' 通过')
log('Phase 2.5:    ' + p2 + '/' + t2 + ' 通过')
const grandPassed = p1 + p2
const grandTotal = t1 + t2
log('')
log('总计: ' + grandPassed + '/' + grandTotal + ' 通过')
if (grandPassed === grandTotal) log('✅ 全部通过')
else log('❌ ' + (grandTotal - grandPassed) + ' 个测试失败')

return {
  action: 'test_report',
  type: 'integration',
  summary: grandPassed === grandTotal ? '全部通过 ✅' : (grandPassed + '/' + grandTotal + ' 失败'),
  results: {
    phase_0_5: { passed: p1, total: t1 },
    phase_2_5: { passed: p2, total: t2 },
  },
  grand_passed: grandPassed,
  grand_total: grandTotal,
}
