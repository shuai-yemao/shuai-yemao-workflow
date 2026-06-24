// embedded-security.test.js — 嵌入式域安全配置测试
// 验证 embedded domain 加载时安全开关生效，generic domain 差异化配置

export const meta = {
  name: '__tests__/embedded-security.test',
  description: '嵌入式域安全配置测试 — domain switch + 规则差异化',
  phases: [
    { title: 'embedded domain', detail: '验证 embedded.js security 开关标记' },
    { title: 'generic domain', detail: '验证 generic.js security 差异化配置' },
    { title: '汇总', detail: '测试结果汇总' },
  ],
}

phase('embedded domain')

let passed = 0, failed = 0
const P = []

function check(desc, condition) {
  if (condition) { passed++; P.push(`  ✅ ${desc}`) }
  else { failed++; P.push(`  ❌ ${desc}`) }
}

// ── embedded domain: preflight 启用增强检查 ──
const e1 = await workflow('safety-layer', {
  action: 'preflight',
  task: { name: '擦除 Flash', description: '全片擦除 mass erase', files: [] },
  domain: 'embedded',
})
check('embedded preflight 可调用', e1 && e1.result)
check('embedded flash erase 标记高风险', e1.result.verdict !== 'allow')
check('embedded 含 constraints', Array.isArray(e1.result.constraints) && e1.result.constraints.length > 0)
check('embedded constraints 含 EC-001', e1.result.constraints.some(c => c.id === 'EC-001'))
check('embedded constraints 含 EC-010', e1.result.constraints.some(c => c.id === 'EC-010'))

// ── embedded domain: 芯片 UID 过滤 ──
const uidText = '芯片 UID: A1B2C3D4E5F6'
const ef1 = await workflow('safety-layer', { action: 'filter', text: uidText })
check('embedded filter 脱敏 UID', ef1.result.safe_text !== uidText)
check('embedded filter 含 replacement 记录', ef1.result.replacements.length > 0)

// ── embedded domain: startup_*.s 文件权限 ──
const startupPerm = await workflow('safety-layer', {
  action: 'check_permission', path: 'startup_stm32f411.s', operation: 'write',
})
check('startup_*.s write 禁止', startupPerm.result.allowed === false)
check('startup_*.s level = deny', startupPerm.result.level === 'deny')

// ── embedded domain: linker script ──
const ldPerm = await workflow('safety-layer', {
  action: 'check_permission', path: 'STM32F411CEUx.ld', operation: 'write',
})
check('.ld write 需确认', ldPerm.result.level === 'confirm')

const ldDel = await workflow('safety-layer', {
  action: 'check_permission', path: 'STM32F411CEUx.ld', operation: 'del',
})
check('.ld del 禁止', ldDel.result.allowed === false)

// ── embedded domain: .hex 文件 ──
const hexPerm = await workflow('safety-layer', {
  action: 'check_permission', path: 'build/firmware.hex', operation: 'read',
})
check('.hex read 禁止', hexPerm.result.allowed === false)

const hexDel = await workflow('safety-layer', {
  action: 'check_permission', path: 'build/firmware.hex', operation: 'del',
})
check('.hex del 禁止', hexDel.result.allowed === false)

for (const l of P) log(l)
log('embedded domain: ' + passed + '/' + (passed+failed) + ' 通过')
const p1 = passed; const t1 = passed+failed; passed = 0; failed = 0; P.length = 0

// ──────────────────────────────────────────────
phase('generic domain')

// ── generic domain: preflight 不启用嵌入式约束 ──
const g1 = await workflow('safety-layer', {
  action: 'preflight',
  task: { name: '读文件', description: '读取配置文件', files: [] },
  domain: 'generic',
})
check('generic preflight 可调用', g1 && g1.result)
// generic domain 不返回嵌入式 constraints
check('generic 无嵌入式 constraints', g1.result.constraints.length === 0)

// ── generic domain: 高风险操作仍标记 ──
const g2 = await workflow('safety-layer', {
  action: 'preflight',
  task: { name: '删除文件', description: '删除文件', files: ['temp.txt'] },
  domain: 'generic',
})
check('generic 高风险仍标记', g2 && g2.result)

// ── generic domain: 普通文件权限 ──
const g3 = await workflow('safety-layer', {
  action: 'check_permission', path: 'src/main.c', operation: 'read',
})
check('generic .c read 允许', g3.result.allowed === true)
check('generic .c level = auto', g3.result.level === 'auto')

// ── generic domain: .env 仍禁止 ──
const g4 = await workflow('safety-layer', {
  action: 'check_permission', path: '.env.production', operation: 'read',
})
check('generic .env* read 禁止', g4.result.allowed === false)

// ── generic domain: inject_rules 无 EC 规则 ──
const g5 = await workflow('safety-layer', { action: 'inject_rules', domain: 'generic' })
check('generic inject 不含 EC-001', !g5.result.rules_block.includes('EC-001'))

const g6 = await workflow('safety-layer', { action: 'inject_rules', domain: 'embedded' })
check('embedded inject 含 EC 规则', g6.result.rules_block.includes('EC-001'))

for (const l of P) log(l)
log('generic domain: ' + passed + '/' + (passed+failed) + ' 通过')
const p2 = passed; const t2 = passed+failed; passed = 0; failed = 0; P.length = 0

// ──────────────────────────────────────────────
phase('汇总')

log('')
log('===== 域安全测试汇总 =====')
log('')
log('embedded domain: ' + p1 + '/' + t1 + ' 通过')
log('generic domain:  ' + p2 + '/' + t2 + ' 通过')
const grandPassed = p1 + p2
const grandTotal = t1 + t2
log('')
log('总计: ' + grandPassed + '/' + grandTotal + ' 通过')
if (grandPassed === grandTotal) log('✅ 全部通过')
else log('❌ ' + (grandTotal - grandPassed) + ' 个测试失败')

return {
  action: 'test_report',
  type: 'domain_switch',
  summary: grandPassed === grandTotal ? '全部通过 ✅' : (grandPassed + '/' + grandTotal + ' 失败'),
  results: {
    embedded_domain: { passed: p1, total: t1 },
    generic_domain: { passed: p2, total: t2 },
  },
  grand_passed: grandPassed,
  grand_total: grandTotal,
}
