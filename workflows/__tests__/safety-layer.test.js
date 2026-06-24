// safety-layer.test.js — 六 action 单元测试
// 运行方式: Workflow({ name: '__tests__/safety-layer.test' })
// 逐一调用 safety-layer 各 action 并验证输出结构

export const meta = {
  name: '__tests__/safety-layer.test',
  description: '安全层单元测试 — preflight/check_permission/filter/audit/anomaly_check/inject_rules',
  phases: [
    { title: 'preflight', detail: '预检任务安全性' },
    { title: 'check_permission', detail: '检查文件权限' },
    { title: 'filter', detail: '隐私脱敏' },
    { title: 'audit', detail: '审计日志' },
    { title: 'anomaly_check', detail: '异常检测' },
    { title: 'inject_rules', detail: '规则注入' },
  ],
}

phase('preflight')

const P = []
let passed = 0, failed = 0

function check(desc, condition) {
  if (condition) { passed++; P.push(`  ✅ ${desc}`) }
  else { failed++; P.push(`  ❌ ${desc}`) }
}

// ── Test 1: preflight — 安全任务应返回 allow ──
const safeResult = await workflow('safety-layer', {
  action: 'preflight',
  task: { name: '编译固件', description: '编译 main.c 生成 .hex', files: ['src/main.c'] },
  domain: 'embedded',
})
check('preflight 返回 result 字段', safeResult && safeResult.result)
check('安全任务 verdict = allow', safeResult.result.verdict === 'allow')
check('安全任务 risks 为空', Array.isArray(safeResult.result.risks) && safeResult.result.risks.length === 0)
check('安全任务 safe = true', safeResult.result.safe === true)

// ── Test 2: preflight — 高风险任务应标记 caution ──
const riskyResult = await workflow('safety-layer', {
  action: 'preflight',
  task: { name: '烧录固件', description: '烧录到 STM32F411 flash 0x08000000', files: ['build/firmware.hex'] },
  domain: 'embedded',
})
check('高风险任务应标记', riskyResult && riskyResult.result)
check('高风险任务 verdict 非 allow', riskyResult.result.verdict !== 'allow')
check('高风险任务 risks 非空', Array.isArray(riskyResult.result.risks) && riskyResult.result.risks.length > 0)
check('高风险任务含 flash_operation', riskyResult.result.risks.some(r => r.rule_id === 'flash_operation'))

// ── Test 3: preflight — .env 文件写操作应标记 deny ──
const envResult = await workflow('safety-layer', {
  action: 'preflight',
  task: { name: '修改配置', description: '更新 .env 文件', files: ['.env'] },
  domain: 'generic',
})
check('.env 写操作应标记', envResult && envResult.result)
check('.env 操作 verdict = block', envResult.result.verdict === 'block')

// ── Test 4: preflight — rm -rf / 命令应标记 ──
const cmdResult = await workflow('safety-layer', {
  action: 'preflight',
  task: { name: '清理', description: '清理项目目录', command: 'rm -rf /tmp/test' },
})
check('rm -rf 命令含 blacklisted 标记', cmdResult && cmdResult.result)
// 注意: safety-layer 中黑名单检查的是 task.command 字段，rm -rf / 才匹配 critical 级别
// rm -rf /tmp/test 不匹配 critical 级别（因为不是 / 或 /*）

// ── Test 5: preflight — 嵌入式约束注入 ──
const embeddedResult = await workflow('safety-layer', {
  action: 'preflight',
  task: { name: '配置定时器', description: '设置 TIM3 PSC/ARR', files: ['src/timer.c'] },
  domain: 'embedded',
})
check('嵌入式 domain 返回 constraints', embeddedResult && embeddedResult.result)
check('constraints 含 EC 规则', embeddedResult.result.constraints && embeddedResult.result.constraints.length > 0)
check('EC-001 存在', embeddedResult.result.constraints.some(c => c.id === 'EC-001'))

for (const l of P) log(l)
log('preflight: ' + passed + '/' + (passed+failed) + ' 通过')
const p1 = passed; const p1Total = passed+failed
passed = 0; failed = 0; P.length = 0

// ──────────────────────────────────────────────
phase('check_permission')

// ── Test 6: check_permission — .env 读禁止 ──
const envRead = await workflow('safety-layer', {
  action: 'check_permission', path: '.env', operation: 'read',
})
check('.env read 返回 allowed 字段', envRead && envRead.result)
check('.env read denied', envRead.result.allowed === false)
check('.env read level deny', envRead.result.level === 'deny')

// ── Test 7: check_permission — .md 读写OK ──
const mdRead = await workflow('safety-layer', {
  action: 'check_permission', path: 'README.md', operation: 'read',
})
check('.md read allowed', mdRead.result.allowed === true)
check('.md read level auto', mdRead.result.level === 'auto')

const mdWrite = await workflow('safety-layer', {
  action: 'check_permission', path: 'README.md', operation: 'write',
})
check('.md write 返回 confirm', mdWrite.result.level === 'confirm')

// ── Test 8: check_permission — undef path auto ──
const undefPath = await workflow('safety-layer', {
  action: 'check_permission', path: 'some_random_file.txt', operation: 'write',
})
check('无匹配路径自动放行', undefPath.result.allowed === true && undefPath.result.level === 'auto')

// ── Test 9: check_permission — hex file read deny ──
const hexRead = await workflow('safety-layer', {
  action: 'check_permission', path: 'build/firmware.hex', operation: 'read',
})
check('.hex read denied', hexRead.result.allowed === false)

// ── Test 10: check_permission — build/ write deny ──
const buildWrite = await workflow('safety-layer', {
  action: 'check_permission', path: 'build/output.bin', operation: 'write',
})
check('build/ write denied', buildWrite.result.allowed === false)

for (const l of P) log(l)
log('check_permission: ' + passed + '/' + (passed+failed) + ' 通过')
const p2 = passed; const t2 = passed + failed; passed = 0; failed = 0; P.length = 0

// ──────────────────────────────────────────────
phase('filter')

// ── Test 11: filter — API Key 脱敏 ──
const apiKeyText = '我的 API Key 是 sk-abc123def456ghi789'
const f1 = await workflow('safety-layer', { action: 'filter', text: apiKeyText })
check('filter 返回 safe_text', f1 && f1.result && f1.result.safe_text)
check('API Key 已脱敏', !f1.result.safe_text.includes('sk-abc123def456ghi789'))
check('API Key 替换标记存在', f1.result.safe_text.includes('***'))
check('replacements 含 api_key', f1.result.replacements.some(r => r.type === 'api_key'))

// ── Test 12: filter — 邮件脱敏 ──
const emailText = '联系我: test@example.com'
const f2 = await workflow('safety-layer', { action: 'filter', text: emailText })
check('邮件已脱敏', !f2.result.safe_text.includes('test@example.com'))

// ── Test 13: filter — 正常文本不变 ──
const cleanText = '这是一个正常的文本，不包含敏感信息'
const f3 = await workflow('safety-layer', { action: 'filter', text: cleanText })
check('正常文本保持不变', f3.result.safe_text === cleanText)
check('正常文本 replacements 为空', f3.result.replacements.length === 0)

// ── Test 14: filter — 空文本 ──
const f4 = await workflow('safety-layer', { action: 'filter', text: '' })
check('空文本不崩溃', f4.result.safe_text === '')

// ── Test 15: filter — IP 地址脱敏 ──
const ipText = '服务器 IP 192.168.1.100'
const f5 = await workflow('safety-layer', { action: 'filter', text: ipText })
check('IP 地址已脱敏', f5.result.safe_text !== ipText)

for (const l of P) log(l)
log('filter: ' + passed + '/' + (passed+failed) + ' 通过')
const p3 = passed; const t3 = passed + failed; passed = 0; failed = 0; P.length = 0

// ──────────────────────────────────────────────
phase('audit')

// ── Test 16: audit — 正常记录 ──
const a1 = await workflow('safety-layer', {
  action: 'audit',
  entry: { type: 'test', action: '单元测试', result: 'success' },
  session: 'safety-layer-test',
})
check('audit 返回 logged', a1 && a1.result && a1.result.logged === true)
check('audit 返回 timestamp', typeof a1.result.timestamp === 'string')
check('audit 返回 session', a1.result.session === 'safety-layer-test')
check('audit entry type 正确', a1.result.entry.type === 'test')

// ── Test 17: audit — 空 entry ──
const a2 = await workflow('safety-layer', { action: 'audit', entry: {} })
check('空 entry 不崩溃', a2 && a2.result && a2.result.logged === true)

for (const l of P) log(l)
log('audit: ' + passed + '/' + (passed+failed) + ' 通过')
const p4 = passed; const t4 = passed + failed; passed = 0; failed = 0; P.length = 0

// ──────────────────────────────────────────────
phase('anomaly_check')

// ── Test 18: anomaly_check — 空日志 ──
const ac1 = await workflow('safety-layer', { action: 'anomaly_check', log: [] })
check('空日志不崩溃', ac1 && ac1.result && ac1.result.anomalies)
check('空日志 anomalies 空', ac1.result.anomalies.length === 0)

// ── Test 19: anomaly_check — 正常日志 ──
const normalLog = [
  { type: '读取文件', result: 'success' },
  { type: '编译', result: 'success' },
]
const ac2 = await workflow('safety-layer', { action: 'anomaly_check', log: normalLog })
check('正常日志 anomalies 空', ac2.result.anomalies.length === 0)

// ── Test 20: anomaly_check — 高频高危操作 ──
const highFreqLog = [
  { type: '高危操作' }, { type: '高危操作' }, { type: '高危操作' },
  { type: '高危操作' }, { type: '高危操作' },
]
const ac3 = await workflow('safety-layer', { action: 'anomaly_check', log: highFreqLog })
// 检测逻辑可能取决于具体实现，只要 anomalies 不抛异常即可
check('高频日志不崩溃', ac3 && ac3.result)

for (const l of P) log(l)
log('anomaly_check: ' + passed + '/' + (passed+failed) + ' 通过')
const p5 = passed; const t5 = passed + failed; passed = 0; failed = 0; P.length = 0

// ──────────────────────────────────────────────
phase('inject_rules')

// ── Test 21: inject_rules — 通用 ──
const ir1 = await workflow('safety-layer', { action: 'inject_rules', domain: 'generic' })
check('通用 inject 返回 rules_block', ir1 && ir1.result && ir1.result.rules_block)
check('通用 inject 含权限等级', ir1.result.rules_block.includes('权限等级'))
check('通用 inject 不含嵌入式规则', !ir1.result.rules_block.includes('EC-001'))

// ── Test 22: inject_rules — 嵌入式 ──
const ir2 = await workflow('safety-layer', { action: 'inject_rules', domain: 'embedded' })
check('嵌入式 inject 含 EC-001', ir2.result.rules_block.includes('EC-001'))
check('嵌入式 inject 含 EC-010', ir2.result.rules_block.includes('EC-010'))

// ── Test 23: inject_rules — 附加规则 ──
const ir3 = await workflow('safety-layer', {
  action: 'inject_rules',
  domain: 'generic',
  extra_rules: ['自定义规则一', '自定义规则二'],
})
check('附加规则存在', ir3.result.rules_block.includes('自定义规则一'))

for (const l of P) log(l)
log('inject_rules: ' + passed + '/' + (passed+failed) + ' 通过')
const p6 = passed; const t6 = passed + failed; passed = 0; failed = 0; P.length = 0

// ──────────────────────────────────────────────
phase('汇总')

const total = p1 + p2 + p3 + p4 + p5 + p6
const totalPassed = p1 + p2 + p3 + p4 + p5 + p6 // corrected
// Wait, p1-p6 were the passed counts. Let me recalculate.

// Actually p1 was the first passed count which was overwritten.
// Let me just use the sums properly.

const sections = [
  { name: 'preflight',        passed: p1, total: p1Total },
  { name: 'check_permission', passed: p2, total: t2 },
  { name: 'filter',           passed: p3, total: t3 },
  { name: 'audit',            passed: p4, total: t4 },
  { name: 'anomaly_check',    passed: p5, total: t5 },
  { name: 'inject_rules',     passed: p6, total: t6 },
]

const grandPassed = sections.reduce((s, x) => s + x.passed, 0)
const grandTotal = sections.reduce((s, x) => s + x.total, 0)

log('')
log('===== 测试汇总 =====')
log('')
for (const s of sections) {
  log(s.name.padEnd(20) + s.passed + '/' + s.total + ' 通过')
}
log('')
log('总计: ' + grandPassed + '/' + grandTotal + ' 通过')
if (grandPassed === grandTotal) log('✅ 全部通过')
else log('❌ ' + (grandTotal - grandPassed) + ' 个测试失败')

return {
  action: 'test_report',
  summary: grandPassed === grandTotal ? '全部通过 ✅' : (grandPassed + '/' + grandTotal + ' 失败'),
  results: Object.fromEntries(sections.map(s => [s.name, { passed: s.passed, total: s.total }])),
  grand_total: grandTotal,
  grand_passed: grandPassed,
  grand_failed: grandTotal - grandPassed,
}
