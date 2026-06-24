// 安全层 Workflow — AGENTS.md 规则即代码
// 可编程安全护栏：预检/权限/过滤/审计/异常检测/规则注入/安全扫描
//
// 设计原则：
// 1. AGENTS.md 中的规则直接编码，不从文件读取（减少 IO 依赖）
// 2. 每个 action 输出结构化结果，编排层可直接消费
// 3. 不自动阻止操作——标记风险等级，由编排层或用户决策
// 4. Override 机制允许用户在知情前提下跳过检查
// 5. scan action 提供静态配置安全扫描（AgentShield 风格）
//
// 使用方式（独立调用）：
//   Workflow({ name: 'safety-layer', args: { action: 'preflight', task: {...}, domain: 'embedded' } })
//   Workflow({ name: 'safety-layer', args: { action: 'check_permission', path: '.env', operation: 'read' } })
//   Workflow({ name: 'safety-layer', args: { action: 'filter', text: '含敏感信息的文本' } })
//   Workflow({ name: 'safety-layer', args: { action: 'audit', entry: {...}, session: '当前会话' } })
//   Workflow({ name: 'safety-layer', args: { action: 'anomaly_check', log: [...], session: '当前会话' } })
//   Workflow({ name: 'safety-layer', args: { action: 'inject_rules', domain: 'embedded' } })
//   Workflow({ name: 'safety-layer', args: { action: 'scan', scope: 'all'|'keys'|'mcp'|'permissions' } })
//
// 调用方式（编排层集成）：
//   Phase 0.5: await workflow('safety-layer', { action: 'preflight', task: t, domain: 'embedded' })
//   Phase 2.5: await workflow('safety-layer', { action: 'audit', entry: { type: 'task_complete', ... }, session })
//   每个 Batch 输出前: text = (await workflow('safety-layer', { action: 'filter', text })).safe_text
//   安全扫描: await workflow('safety-layer', { action: 'scan', scope: 'all' })

export const meta = {
  name: 'safety-layer',
  description: '安全层 — AGENTS.md 可编程安全护栏：预检/权限/过滤/审计/异常检测/规则注入',
  phases: [
    { title: '路由', detail: '按 action 路由到对应安全服务' },
    { title: '执行', detail: '执行安全检查/过滤/记录' },
    { title: '输出', detail: '返回结构化安全评估结果' },
  ],
}

// ============================================================
// 规则数据 — 从 AGENTS.md 编码为可编程常量
// ============================================================

// 文件权限矩阵（AGENTS.md 文件操作边界表）
const FILE_PERMISSIONS = {
  // pattern: { read: 🟢🟡🔴, write: 🟢🟡🔴, del: 🟢🟡🔴, exec: 🟢🟡🔴 }
  // 🟢 = auto, 🟡 = confirm, 🔴 = deny

  // 通用路径
  '*.md':            { read: 'auto',  write: 'confirm', del: 'deny',  exec: 'deny' },
  '.claude/':        { read: 'auto',  write: 'confirm', del: 'deny',  exec: 'deny' },
  'skills/':         { read: 'auto',  write: 'confirm', del: 'deny',  exec: 'deny' },
  'docs/':           { read: 'auto',  write: 'confirm', del: 'deny',  exec: 'deny' },
  '.env*':           { read: 'deny',  write: 'deny',    del: 'deny',  exec: 'deny' },
  '.git/':           { read: 'deny',  write: 'deny',    del: 'deny',  exec: 'deny' },
  'build/':          { read: 'auto',  write: 'deny',    del: 'deny',  exec: 'deny' },
  'dist/':           { read: 'auto',  write: 'deny',    del: 'deny',  exec: 'deny' },
  '~/.ssh/':         { read: 'deny',  write: 'deny',    del: 'deny',  exec: 'deny' },

  // 嵌入式专属
  '*.ld':            { read: 'auto',  write: 'confirm', del: 'deny',  exec: 'deny' },
  '*.icf':           { read: 'auto',  write: 'confirm', del: 'deny',  exec: 'deny' },
  '*.scf':           { read: 'auto',  write: 'confirm', del: 'deny',  exec: 'deny' },
  'startup_*.s':     { read: 'auto',  write: 'deny',    del: 'deny',  exec: 'deny' },
  'system_*.c':      { read: 'auto',  write: 'deny',    del: 'deny',  exec: 'deny' },
  '*.flm':           { read: 'auto',  write: 'deny',    del: 'deny',  exec: 'deny' },
  '*.flash':         { read: 'auto',  write: 'deny',    del: 'deny',  exec: 'deny' },
  '*.dts':           { read: 'auto',  write: 'confirm', del: 'deny',  exec: 'deny' },
  '*.dtsi':          { read: 'auto',  write: 'confirm', del: 'deny',  exec: 'deny' },
  '*.cfg':           { read: 'auto',  write: 'confirm', del: 'deny',  exec: 'deny' },
  '*.tcl':           { read: 'auto',  write: 'confirm', del: 'deny',  exec: 'deny' },
  '*.hex':           { read: 'deny',  write: 'deny',    del: 'deny',  exec: 'deny' },
  '*.bin':           { read: 'deny',  write: 'deny',    del: 'deny',  exec: 'deny' },
  '*.elf':           { read: 'deny',  write: 'deny',    del: 'deny',  exec: 'deny' },
}

// 高风险操作正则模式（从 AGENTS.md 高危操作确认表编码）
const HIGH_RISK_PATTERNS = {
  file_delete_single: {
    pattern: /删除文件\s*[:：]?\s*\S+/i,
    level: 'high',
    category: 'file_delete',
    message: '删除文件需明确路径 + 理由',
  },
  file_delete_batch: {
    pattern: /批量删除|删除多个|rm\s+-[rf]/i,
    level: 'high',
    category: 'file_delete',
    message: '批量删除需列出清单 + 总数 + 理由',
  },
  file_delete_recursive: {
    pattern: /递归删除|rm\s+-rf|rimraf/i,
    level: 'high',
    category: 'file_delete',
    message: '递归删除目录需列出内容概览 + 影响范围',
  },
  install_package: {
    pattern: /(apt|brew|pip|npm)\s+install|安装.*(包|库|依赖)|npm\s+install/i,
    level: 'high',
    category: 'system_cmd',
    message: '安装/卸载软件包需确认包名 + 版本 + 来源',
  },
  modify_system_config: {
    pattern: /修改系统配置|更改\s*(注册表|系统设置)|reg\s+(add|delete)/i,
    level: 'high',
    category: 'system_cmd',
    message: '修改系统配置需说明配置项 + 原值 + 目标值',
  },
  network_operation: {
    pattern: /(curl|wget|invoke-webrequest)\s+.*\s*\|/i,
    level: 'high',
    category: 'network',
    message: '管道安装未经审查的远程执行代码',
  },
  api_call: {
    pattern: /(POST|PUT|DELETE)\s+https?:\/\//i,
    level: 'medium',
    category: 'api',
    message: '写操作 API 需确认操作对象 + 数据内容 + 可回滚性',
  },
  // 嵌入式专属高风险操作
  flash_operation: {
    pattern: /烧录|flash|下载到.*(芯片|MCU)|program\s+\S+\.(hex|bin)/i,
    level: 'high',
    category: 'embedded_flash',
    message: '烧录操作需确认 MCU 型号和探针类型',
  },
  erase_operation: {
    pattern: /全片擦除|mass erase|chip erase|清除.*flash/i,
    level: 'high',
    category: 'embedded_flash',
    message: '全片擦除不可逆，请确认',
  },
  option_bytes: {
    pattern: /option byte|读保护|RDP|PCROP|加密.*flash/i,
    level: 'high',
    category: 'embedded_flash',
    message: '修改 Option Bytes 可能锁死芯片',
  },
  linker_script: {
    pattern: /修改.*(链接脚本|linker script|\.ld|\.icf|\.scf)/i,
    level: 'high',
    category: 'embedded_config',
    message: '修改 Linker Script 须同步更新启动文件和中断向量表',
  },
  clock_config: {
    pattern: /修改.*(时钟|PLL|HSE|HSI).*(频率|配置)/i,
    level: 'high',
    category: 'embedded_config',
    message: '修改 MCU 时钟配置须确认当前/目标频率及涉及外设',
  },
  vector_table: {
    pattern: /修改.*(中断向量表|NVIC|向量表)/i,
    level: 'high',
    category: 'embedded_config',
    message: '修改中断向量表/NVIC 须确认优先级变更及影响的中断线',
  },
  bootloader: {
    pattern: /修改.*(Bootloader|启动加载|启动分区)/i,
    level: 'high',
    category: 'embedded_config',
    message: '修改 Bootloader 分区须提供回滚方案',
  },
  watchdog: {
    pattern: /禁用.*(看门狗|Watchdog|IWDG|WWDG)/i,
    level: 'high',
    category: 'embedded_config',
    message: '禁用 Watchdog 须有明确理由并告知影响',
  },
  debugger_operation: {
    pattern: /(JLink|OpenOCD|ST-Link|CMSIS-DAP).*(halt|reset|flash)/i,
    level: 'high',
    category: 'embedded_debug',
    message: '调试器操作须确认目标设备 + 操作类型',
  },
  ota_update: {
    pattern: /(OTA|远程升级|固件升级)/i,
    level: 'high',
    category: 'embedded_ota',
    message: '执行 OTA 升级须确认固件版本 + 升级方式 + 回滚方案',
  },
  mcu_vendor_file: {
    pattern: /修改.*(HAL|SPL|CMSIS|LL).*(库|文件|源码)/i,
    level: 'medium',
    category: 'embedded_config',
    message: '修改 MCU 厂商原始文件须确认理由',
  },
  gpio_definition: {
    pattern: /修改.*BSP.*(GPIO|引脚|Pin).*(定义|重映射)/i,
    level: 'medium',
    category: 'embedded_config',
    message: '修改 BSP 层 GPIO 定义须确认引脚号 + 复用功能 + 连接的硬件',
  },
}

// 敏感信息模式（用于隐私过滤）
const SENSITIVE_PATTERNS = [
  { pattern: /(?:sk-|pk-|api[_-]?key|apikey)[\w-]{8,}/gi,       replacement: '***API_KEY***',          type: 'api_key' },
  { pattern: /(?:password|passwd|pwd)[=:]\s*\S+/gi,              replacement: 'password=***',           type: 'password' },
  { pattern: /(?:token|secret)[=:]\s*\S+/gi,                     replacement: 'token=***',              type: 'token' },
  { pattern: /(?:AKIA|ASIA)[0-9A-Z]{16}/g,                      replacement: 'AWS_KEY***',             type: 'aws_key' },
  { pattern: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC )?PRIVATE KEY-----/g, replacement: '***PRIVATE KEY***', type: 'private_key' },
  { pattern: /[\w.+-]+@[\w-]+\.[\w.-]+/g,                       replacement: (m) => m[0] + '***@' + m.split('@')[1], type: 'email' },
  { pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,        replacement: (m) => m.replace(/\d+$/, '*').replace(/\.\d+(?=\.)/g, '.*'), type: 'ip' },
  { pattern: /(?:conn|connection)[^;]*?(?:user|uid|pwd|password)=[^;]+/gi, replacement: 'connection_string=***', type: 'connection_string' },
  // 嵌入式专属敏感信息
  { pattern: /\b(?:0x)?[0-9A-Fa-f]{12}\b/g,                     replacement: '***UID***',              type: 'chip_uid', context: 'embedded' },
  { pattern: /(?:encrypt|decrypt)_key[=:]\s*\S+/gi,             replacement: 'encrypt_key=***',        type: 'firmware_key', context: 'embedded' },
]

// 异常行为模式
const ANOMALY_PATTERNS = [
  {
    name: '高频高危操作',
    detect: (entries) => {
      const recent = entries.filter(e => e.type === '高危操作').slice(-5)
      return recent.length >= 5 ? { triggered: true, count: recent.length, window: '最近' } : null
    },
  },
  {
    name: '权限试探',
    detect: (entries) => {
      const denied = entries.filter(e => e.result === 'denied').slice(-3)
      return denied.length >= 3 ? { triggered: true, count: denied.length, window: '最近' } : null
    },
  },
  {
    name: '规则漂移',
    detect: (entries) => {
      const confirms = entries.filter(e => e.type === '确认操作')
      if (confirms.length < 5) return null
      // 检查是否越来越频繁地跳过确认
      const half = Math.floor(confirms.length / 2)
      const firstHalf = confirms.slice(0, half)
      const secondHalf = confirms.slice(half)
      if (firstHalf.length > 0 && secondHalf.length > 0) {
        const firstRate = firstHalf.filter(e => e.need_confirm !== true).length / firstHalf.length
        const secondRate = secondHalf.filter(e => e.need_confirm !== true).length / secondHalf.length
        if (secondRate > firstRate * 1.5) {
          return { triggered: true, firstHalfRate: firstRate, secondHalfRate: secondRate }
        }
      }
      return null
    },
  },
]

// 嵌入式专属约束规则（AGENTS.md 嵌入式嵌入式专属约束）
const EMBEDDED_CONSTRAINTS = [
  { id: 'EC-001', rule: '不修改 MCU 厂商原始文件（HAL/SPL/CMSIS 核心库）' },
  { id: 'EC-002', rule: '不假设寄存器默认值——查阅数据手册或头文件确认复位值' },
  { id: 'EC-003', rule: '不删除未知用途的 BSP/驱动代码' },
  { id: 'EC-004', rule: '不直接烧录未经验证的固件' },
  { id: 'EC-005', rule: '不忽略 Watchdog 定时器' },
  { id: 'EC-006', rule: '不改动 Linker Script 内存布局不同步更新启动文件' },
  { id: 'EC-007', rule: '不假设编译优化选项的安全性（volatile/内存对齐/字节序）' },
  { id: 'EC-008', rule: '不擅自修改 Flash 分区表' },
  { id: 'EC-009', rule: '不使用与目标 MCU 不匹配的 Device Family Pack' },
  { id: 'EC-010', rule: '调试接口操作前确认目标板供电状态' },
]

// 命令执行黑名单
const BLACKLISTED_COMMANDS = [
  { pattern: /rm\s+-rf\s+\/\s*$/, level: 'critical', message: 'rm -rf / 破坏性删除' },
  { pattern: /rm\s+-rf\s+\/\*/, level: 'critical', message: 'rm -rf /* 破坏性删除' },
  { pattern: /dd\s+if=.*\s+of=\/dev\/(sda|sdb|sdc|nvme)/, level: 'critical', message: 'dd 直接写块设备可能破坏磁盘' },
  { pattern: /chmod\s+-R\s+777\s+/, level: 'high', message: 'chmod -R 777 权限过于开放' },
  { pattern: />\s*\/dev\/(sda|sdb|nvme)/, level: 'critical', message: '块设备重定向可破坏设备' },
  { pattern: /curl\s+.*\s*\|\s*(bash|sh|powershell)/i, level: 'critical', message: '管道安装未经审查的远程执行代码' },
]

// ============================================================
// 工具函数
// ============================================================

function matchPath(path, operation) {
  /** 匹配路径到 FILE_PERMISSIONS，返回 { level, matchedRule }
   *  多模式匹配时取最严格权限：deny > confirm > auto */
  if (!path || typeof path !== 'string') return { level: 'auto', matchedRule: null }
  const norm = path.replace(/\\/g, '/')
  const LEVEL_RANK = { deny: 3, confirm: 2, auto: 1 }
  let best = { level: 'auto', matchedRule: null, rank: 0 }

  for (const [pattern, perms] of Object.entries(FILE_PERMISSIONS)) {
    // 先转义字面点号，再替换 * 为 .*（避免污染 .* 中的点号）
    const escaped = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*')
    const glob = new RegExp('^' + escaped + '(/|$)')
    if (glob.test(norm)) {
      const level = perms[operation] || 'deny'
      const rank = LEVEL_RANK[level] || 0
      if (rank > best.rank) {
        best = { level, matchedRule: pattern, rank }
      }
    }
  }
  return { level: best.level, matchedRule: best.matchedRule }
}

function checkHighRisk(description) {
  /** 检查操作描述是否匹配高风险模式 */
  if (!description) return []
  const matches = []
  for (const [key, rule] of Object.entries(HIGH_RISK_PATTERNS)) {
    if (rule.pattern.test(description)) {
      matches.push({ rule_id: key, level: rule.level, category: rule.category, message: rule.message })
    }
  }
  return matches
}

function checkBlacklistedCommands(command) {
  /** 检查命令是否在黑名单中 */
  if (!command) return []
  const matches = []
  for (const item of BLACKLISTED_COMMANDS) {
    if (item.pattern.test(command)) {
      matches.push({ level: item.level, message: item.message })
    }
  }
  return matches
}

function filterSensitive(text) {
  /** 脱敏处理：替换敏感信息 */
  if (!text) return { safe_text: text || '', replacements: [] }
  let safe = text
  const replacements = []
  for (const rule of SENSITIVE_PATTERNS) {
    const matches = safe.match(rule.pattern)
    if (matches) {
      const replacer = typeof rule.replacement === 'function' ? rule.replacement : () => rule.replacement
      const count = (safe.match(rule.pattern) || []).length
      safe = safe.replace(rule.pattern, replacer)
      replacements.push({ type: rule.type, count, context: rule.context || '通用' })
    }
  }
  return { safe_text: safe, replacements }
}

function detectAnomalies(logEntries) {
  /** 异常行为检测 */
  if (!logEntries || !logEntries.length) return { anomalies: [], summary: '无审计数据，跳过检测' }
  const anomalies = []
  for (const detector of ANOMALY_PATTERNS) {
    try {
      const result = detector.detect(logEntries)
      if (result) {
        anomalies.push({ name: detector.name, detail: result })
      }
    } catch (e) {
      // 检测器失败不中断流程
    }
  }
  return {
    anomalies,
    summary: anomalies.length > 0
      ? `检测到 ${anomalies.length} 个异常模式`
      : '未检测到异常模式',
  }
}

// ============================================================
// Action Handlers
// ============================================================

// -- SecurityState (内存态，单次调用内保持) --
let _securityState = {
  overrides: {},       // { 'path_or_rule': true }
  hash: null,          // AGENTS.md hash
  session: null,
}

function handlePreflight(args) {
  /**
   * 预检任务安全性
   * args: { task: { name, description, files?, command? }, domain?: string, overrides?: string[] }
   * returns: { safe: boolean, risks: [], warnings: [], constraints: [], domain_rules: [] }
   */
  const task = args.task || {}
  const domain = args.domain || 'generic'
  const overrides = args.overrides || []

  const risks = []
  const warnings = []
  const checkedPaths = []

  // 1. 文件权限检查
  if (task.files && Array.isArray(task.files)) {
    for (const f of task.files) {
      const { level: readLvl } = matchPath(f, 'read')
      const { level: writeLvl } = matchPath(f, 'write')
      const { level: delLvl } = matchPath(f, 'del')
      checkedPaths.push({ path: f, read: readLvl, write: writeLvl, del: delLvl })
      if (writeLvl === 'deny' && !overrides.includes(f)) {
        risks.push({ type: 'file_denied', path: f, operation: 'write', level: 'deny' })
      }
      if (delLvl === 'deny' && !overrides.includes(f)) {
        risks.push({ type: 'file_denied', path: f, operation: 'delete', level: 'deny' })
      }
    }
  }

  // 2. 高风险操作检查
  const desc = `${task.name || ''} ${task.description || ''}`
  const highRiskMatches = checkHighRisk(desc)
  for (const match of highRiskMatches) {
    risks.push({
      type: 'high_risk_operation',
      rule_id: match.rule_id,
      level: match.level,
      category: match.category,
      message: match.message,
    })
  }

  // 3. 命令黑名单检查
  if (task.command) {
    const blacklisted = checkBlacklistedCommands(task.command)
    for (const b of blacklisted) {
      risks.push({ type: 'blacklisted_command', level: b.level, message: b.message })
    }
  }

  // 4. 嵌入式专属约束
  let domainRules = []
  if (domain === 'embedded') {
    domainRules = EMBEDDED_CONSTRAINTS.map(c => ({ id: c.id, rule: c.rule }))
  }

  // 5. 覆盖标记
  const activeOverrides = overrides.filter(o => o)

  // 决策逻辑
  const hasDeny = risks.some(r => r.level === 'deny' || r.level === 'critical')
  const hasHigh = risks.some(r => r.level === 'high')

  return {
    safe: !hasDeny,
    verdict: hasDeny ? 'block' : (hasHigh ? 'caution' : 'allow'),
    risks,
    warnings,
    constraints: domainRules,
    checkedPaths,
    activeOverrides,
    summary: hasDeny
      ? '发现被禁止的操作，需要用户确认'
      : (hasHigh
        ? `发现 ${highRiskMatches.length} 个高风险操作标记`
        : '预检通过，无安全风险'),
  }
}

function handleCheckPermission(args) {
  /**
   * 检查文件/目录权限
   * args: { path: string, operation: 'read'|'write'|'del'|'exec' }
   * returns: { allowed: boolean, level: string, matchedRule: string|null, reason: string }
   */
  const targetPath = args.path || ''
  const operation = args.operation || 'read'

  const { level, matchedRule } = matchPath(targetPath, operation)

  const levelMap = { auto: '自动放行', confirm: '需确认', deny: '禁止' }

  return {
    allowed: level !== 'deny',
    level,
    matchedRule,
    reason: matchedRule
      ? `路径 "${targetPath}" 匹配规则 "${matchedRule}": ${levelMap[level] || level}`
      : `路径 "${targetPath}" 未匹配特殊规则，自动放行`,
  }
}

function handleFilter(args) {
  /**
   * 隐私脱敏
   * args: { text: string }
   * returns: { safe_text: string, replacements: [{type, count, context}] }
   */
  return filterSensitive(args.text || '')
}

function handleAudit(args) {
  /**
   * 审计日志
   * args: { entry: { type: string, path?: string, action?: string, result?: string, detail?: any }, session?: string }
   * returns: { logged: boolean, timestamp: string, session: string }
   */
  const entry = args.entry || {}
  const session = args.session || 'default'
  const timestamp = args.timestamp || '__timestamp__'

  // 构造审计条目
  const auditEntry = {
    timestamp,
    session,
    type: entry.type || 'unknown',
    path: entry.path || null,
    action: entry.action || null,
    result: entry.result || 'pending',
    detail: entry.detail || null,
  }

  // 更新 SecurityState
  _securityState.session = session

  log(`[AUDIT] [${session}] ${entry.type}: ${entry.action || entry.path || 'N/A'} → ${entry.result || 'pending'}`)

  return {
    logged: true,
    timestamp,
    session,
    entry: auditEntry,
  }
}

function handleAnomalyCheck(args) {
  /**
   * 异常检测
   * args: { log: Array, session?: string }
   * returns: { anomalies: [], summary: string }
   */
  const logEntries = args.log || []
  return detectAnomalies(logEntries)
}

function handleInjectRules(args) {
  /**
   * 安全规则注入 prompt
   * args: { domain?: string, extra_rules?: string[] }
   * returns: { rules_block: string, domain: string }
   */
  const domain = args.domain || 'generic'
  const extra = args.extra_rules || []

  // 通用规则（来自 AGENTS.md 权限等级 + 通信协议）
  const commonRules = [
    '- 🟢 读/查/问：自动执行，无需确认',
    '- 🟡 写/改/删/执行：先问再干',
    '- 🔴 不可逆操作（git push、rm -rf、API key）：必须用户批准',
  ]

  // 嵌入式专属规则
  let embeddedRules = []
  if (domain === 'embedded') {
    embeddedRules = EMBEDDED_CONSTRAINTS.map(c => `- ${c.id}: ${c.rule}`)
  }

  // 附加规则
  const extraRules = extra.map(r => `- ${r}`)

  const rulesBlock = [
    '=== 安全规则（安全层注入） ===',
    '## 权限等级',
    ...commonRules,
    '',
    ...(embeddedRules.length > 0 ? [
      '## 🔧 嵌入式专属约束',
      ...embeddedRules,
      '',
    ] : []),
    ...(extraRules.length > 0 ? [
      '## 附加规则',
      ...extraRules,
      '',
    ] : []),
    '## 高危操作',
    '匹配以下模式的操作须用户确认：',
    '- 文件删除（rm -rf、批量删除）',
    '- 系统配置修改（注册表、系统设置）',
    '- 烧录/擦除 Flash（全片擦除不可逆）',
    '- 修改 Option Bytes / 读保护（可能锁死芯片）',
    '- 修改 Linker Script / 时钟配置 / 中断向量表',
    '- 配置/禁用 Watchdog',
    '- 调试器操作（JLink/OpenOCD）',
    '- OTA 升级流程',
    '============================',
  ].join('\n')

  return { rules_block: rulesBlock, domain, rulesCount: commonRules.length + embeddedRules.length + extraRules.length }
}

function handleStatus() {
  /** 返回当前 SecurityState */
  return { state: _securityState }
}

// ============================================================
// Action: scan — 安全配置扫描（AgentShield 集成）
// ============================================================

async function handleScan(args) {
  /**
   * 扫描 ~/.claude/ 下配置文件安全性
   * args: { scope?: 'all'|'keys'|'mcp'|'permissions'|'hooks'|'agents' }
   * returns: { grade, score, findings, summary, scanned_files }
   *
   * 调用子 agent 执行 AgentShield 规则扫描。
   * 完整 102 规则扫描请直接调用 agentshield-scanner。
   */
  const scope = args.scope || 'all'

  const SCOPE_RULES = {
    all:    { total: 15, cats: ['keys', 'mcp', 'permissions', 'hooks'] },
    keys:   { total: 5,  cats: ['keys'] },
    mcp:    { total: 5,  cats: ['mcp'] },
    permissions: { total: 3, cats: ['permissions'] },
    hooks:  { total: 2,  cats: ['hooks'] },
  }

  const scopeInfo = SCOPE_RULES[scope] || SCOPE_RULES.all

  const RULES_TEXT = {
    keys: `## KEY — 密钥检查（${scopeInfo.total} 条）\n检查 settings.json / .env：\nKEY-001[critical] 硬编码 API Key (sk-ant-)\nKEY-002[critical] 硬编码 OpenAI Key\nKEY-003[high] 凭据文件引用\nKEY-004[medium] 环境变量直接写 secret\nKEY-005[low] 日志含 API Key`,
    mcp: `## MCP — MCP Server 安全（${scopeInfo.total} 条）\n检查 settings.json mcpServers：\nMCP-001[high] HTTP 非 HTTPS\nMCP-002[medium] npx -y 自动安装\nMCP-003[high] args 引用 .env/.pem\nMCP-004[medium] 绑定 0.0.0.0\nMCP-005[critical] 硬编码密钥`,
    permissions: `## PERM — 权限配置（${scopeInfo.total} 条）\n检查 settings.json permissions：\nPERM-001[medium] allow(*) 全放开\nPERM-002[medium] Bash(*) 全放开\nPERM-003[medium] defaultMode:auto`,
    hooks: `## HOOK — Hook 安全（${scopeInfo.total} 条）\n检查 settings.json hooks：\nHOOK-001[critical] 危险命令\nHOOK-002[medium] SessionStart 阻塞`,
  }

  let rulesText = ''
  for (const cat of scopeInfo.cats) {
    if (RULES_TEXT[cat]) rulesText += RULES_TEXT[cat] + '\n\n'
  }

  log(`[安全层/scan] scope=${scope}, rules=${scopeInfo.total}`)

  const scanResult = await agent({
    prompt: `你是安全配置扫描器，请扫描 ~/.claude/ 下配置文件的安全性。

需要读取的文件：
1. ~/.claude/settings.json
2. ~/.claude/.env（如存在）
3. ~/.claude/CLAUDE.md
4. ~/.claude/AGENTS.md

### 扫描规则（${scopeInfo.total} 条）

${rulesText}
### 输出要求

返回 JSON（不要 markdown 包裹）：
{"files_scanned":[], "findings":[{"rule_id":"KEY-001","severity":"critical","category":"keys","title":"API Key","evidence":"...","file":"...","recommendation":"..."}]}`,
    label: 'safety-scan',
  })

  // 解析结果
  let scanData = { files_scanned: [], findings: [] }
  if (scanResult) {
    const m = scanResult.match(/\{"files_scanned":[\s\S]*?"findings":\[[\s\S]*?\]\}/)
    if (m) { try { scanData = JSON.parse(m[0]) } catch {} }
  }

  const findings = (scanData.findings || []).map(f => ({
    rule_id: f.rule_id || '', severity: f.severity || 'low',
    category: f.category || 'keys', title: f.title || '',
    message: f.evidence || '', file: f.file || 'unknown',
    recommendation: f.recommendation || '',
  }))

  // 评分
  const sv = { critical: 25, high: 15, medium: 10, low: 5 }
  let score = 100
  for (const f of findings) score -= sv[f.severity] || 10
  score = Math.max(0, score)
  const grade = score >= 90 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : 'D'

  return {
    grade, score, findings,
    summary: `发现 ${findings.length} 个问题` +
      `（${findings.filter(f => f.severity === 'critical').length} 严重` +
      `, ${findings.filter(f => f.severity === 'high').length} 高），评分 ${score} 分，等级 ${grade}`,
    scanned_files: scanData.files_scanned || [],
    scope,
    rules_loaded: scopeInfo.total,
    note: '安全层内置扫描（15 条核心规则）。完整扫描请用 agentshield-scanner（102 条规则）。',
  }
}

// ============================================================
// Action Router
// ============================================================

const ACTION_HANDLERS = {
  preflight:        { handler: handlePreflight,        needs: ['task'],                    desc: '预检任务安全性',      isAsync: false },
  check_permission: { handler: handleCheckPermission,  needs: ['path', 'operation'],       desc: '检查文件权限',        isAsync: false },
  filter:           { handler: handleFilter,            needs: ['text'],                    desc: '隐私脱敏',            isAsync: false },
  audit:            { handler: handleAudit,             needs: ['entry'],                   desc: '审计日志',            isAsync: false },
  anomaly_check:    { handler: handleAnomalyCheck,      needs: ['log'],                     desc: '异常检测',            isAsync: false },
  inject_rules:     { handler: handleInjectRules,       needs: [],                          desc: '安全规则注入',        isAsync: false },
  status:           { handler: handleStatus,            needs: [],                          desc: '安全状态查询',        isAsync: false },
  scan:             { handler: handleScan,              needs: [],                          desc: '安全配置扫描',        isAsync: true },
}

// ============================================================
// 执行
// ============================================================

phase('路由：定位安全服务')

const action = args.action || 'status'
const handlerDef = ACTION_HANDLERS[action]

if (!handlerDef) {
  throw new Error(`未知 action: "${action}"。可用: ${Object.keys(ACTION_HANDLERS).join(', ')}`)
}

// 参数检查
for (const need of handlerDef.needs) {
  if (args[need] === undefined || args[need] === null) {
    throw new Error(`action "${action}" 缺少必需参数: "${need}"`)
  }
}

log(`安全层 action: ${action} — ${handlerDef.desc}`)

phase('执行安全检查')

let result
try {
  result = handlerDef.isAsync ? await handlerDef.handler(args) : handlerDef.handler(args)
} catch (e) {
  throw new Error(`安全层执行失败 [${action}]: ${e.message}`)
}

phase('输出安全评估')

// --- 根据 action 给出下一步指引 ---
function getActionItems(act, res) {
  const items = {
    preflight: [
      {
        step: 1, action: 'review',
        title: '审查预检结果 — 决定是否继续',
        skill: null,
        detail: '预检 verdict: ' + (res?.verdict || 'unknown') +
          '. 风险数: ' + (res?.risks?.length || 0) + ', 警告数: ' + (res?.warnings?.length || 0) +
          (res?.risks?.length > 0 ? '\n风险清单:\n' + res.risks.map(r => '  [' + r.level + '] ' + (r.message || r.type)).join('\n') : ''),
        reason: '安全层不阻止操作，但高风险项需用户知情决策',
        expects: '用户确认风险可接受，或提供 overrides 跳过特定检查',
        depends_on: [],
      },
      {
        step: 2, action: 'manual',
        title: '处理被阻止的操作',
        skill: null,
        detail: '如果 verdict 为 "block"，有以下选项：\n' +
          '  1. 修改操作避免高风险路径\n' +
          '  2. 提供 overrides 数组跳过特定检查（需用户确认）\n' +
          '  3. 更换操作方式',
        reason: 'block 级风险如不改将影响后续执行',
        expects: '操作方案调整完成',
        depends_on: ['step_1'],
      },
    ],
    check_permission: [
      {
        step: 1, action: 'manual',
        title: '按权限判断处理',
        skill: null,
        detail: '权限检查结果: ' + (res?.level || 'auto') +
          (res?.matchedRule ? ' (匹配规则: ' + res.matchedRule + ')' : ''),
        reason: '不同等级需要不同的处理方式',
        expects: 'auto → 直接执行, confirm → 问用户, deny → 停止',
        depends_on: [],
      },
    ],
    filter: [
      {
        step: 1, action: 'manual',
        title: '使用脱敏后的文本',
        skill: null,
        detail: '脱敏替换数: ' + (res?.replacements?.length || 0) +
          (res?.replacements?.length > 0 ? '\n替换类型: ' + res.replacements.map(r => r.type + '(' + r.count + ')').join(', ') : ''),
        reason: '敏感信息已脱敏，可用安全文本替代原文',
        expects: '使用 safe_text 替代原始文本',
        depends_on: [],
      },
    ],
    audit: [
      {
        step: 1, action: 'review',
        title: '确认审计日志已记录',
        skill: null,
        detail: '审计记录状态: ' + (res?.logged ? '已记录' : '失败') +
          ' | 会话: ' + (res?.session || 'N/A'),
        reason: '审计日志是后续排查和回溯的依据',
        expects: '审计条目已持久化',
        depends_on: [],
      },
    ],
    anomaly_check: [
      {
        step: 1, action: 'review',
        title: '审查异常检测结果',
        skill: null,
        detail: res?.summary || '无检测结果' +
          (res?.anomalies?.length > 0 ? '\n异常模式:\n' + res.anomalies.map(a => '  ' + a.name + ': ' + JSON.stringify(a.detail)).join('\n') : ''),
        reason: '异常模式可能指示安全风险或操作偏差',
        expects: res?.anomalies?.length > 0 ? '用户评估异常严重性并决定是否继续' : '无异常，继续执行',
        depends_on: [],
      },
    ],
    inject_rules: [
      {
        step: 1, action: 'manual',
        title: '将安全规则注入上下文',
        skill: null,
        detail: '规则数: ' + (res?.rulesCount || 0) + ' | 领域: ' + (res?.domain || 'generic') +
          '\n以下是注入的规则块，请在对话中作为安全约束引用：',
        reason: '规则注入确保后续操作在安全边界内执行',
        expects: '规则已应用到当前对话上下文',
        depends_on: [],
      },
    ],
    scan: [
      {
        step: 1, action: 'review',
        title: '审查安全配置扫描结果',
        skill: null,
        detail: (res?.findings?.length || 0) > 0
          ? `等级 ${res.grade}（${res.score} 分），${res.findings.length} 个问题\n` +
            res.findings.map(f => `  [${f.severity}] ${f.title}: ${f.message} — ${f.recommendation}`).join('\n')
          : `等级 ${res.grade}（${res.score} 分），无安全问题`,
        reason: '安全配置问题应优先修复',
        expects: '确认扫描结果并决定是否修复',
        depends_on: [],
      },
    ],
  }
  return items[act] || [{ step: 1, action: 'manual', title: '安全层执行完成', skill: null, detail: 'action=' + act + ' 执行完毕', reason: '', expects: '', depends_on: [] }]
}

// 结果附加元数据
const output = {
  action,
  status: 'ok',
  timestamp: '__timestamp__',
  result,
  meta: {
    version: '1.0.0',
    source: 'AGENTS.md 规则即代码',
    note: '安全层不自动阻止操作——标记风险等级，由编排层或用户决策',
  },

  // ============================================================
  // AI 推理步骤清单
  // ============================================================
  action_items: getActionItems(action, result),

  state: {
    produced: {
      action: action,
      verdict: result?.verdict || null,
      risk_count: result?.risks?.length || 0,
      warning_count: result?.warnings?.length || 0,
      anomaly_count: result?.anomalies?.length || 0,
      safe_text: result?.safe_text || null,
      rules: result?.rules_block || null,
      // scan action specific
      scan_grade: result?.grade || null,
      scan_score: result?.score ?? null,
      scan_findings: result?.findings?.length ?? null,
      scan_rules_loaded: result?.rules_loaded ?? null,
    },
  },
}

log(`[安全层] ${action}: ${result.summary || '执行完成'}`)

return output
