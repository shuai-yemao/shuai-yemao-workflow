// Agent 编排层 Workflow（手动 TDD 流程管理）
// 输入：施工包（任务列表 + 依赖关系 + 验收标准）
// 输出：分批次指引 → 手动 TDD → 逐条用户判决 → 汇总写回记忆
//
// 设计原则（来自本次会话验证）：
// 1. 编排层不自动发 agent 写代码——手动 TDD 才是正确流程
// 2. 用户的肉眼和烧录验证才是最终验收标准
// 3. 编排层的角色是：跟踪进度 + 管理验收清单 + 记录判决
// 4. 你（用户）是最终决策者
// 5. 每个任务匹配对应 skill，在对话中加载获取领域指导
//
// 使用方式：
//   Workflow({ scriptPath: '.claude/workflows/agent-orchestration.js', args: { tasks: [...], acceptance: [...] } })
//   ⚠️ 推荐用 scriptPath 而非 name: 因 name: 使用编译缓存 → 不反映脚本实时编辑
//   → 输出 Batch 分组 + skill 推荐 + 每步指引
//   → 我手动 TDD 实现（调推荐 skill 获取指导）→ 你烧录验证 → 逐条判决
//   → 全部完成后写回记忆

export const meta = {
  name: 'agent-orchestration',
  description: 'Agent 编排层（手动 TDD 流程管理）：依赖图分批 + skill 推荐 → 指引手动实现 → 用户逐条判决验收项 → 汇总',
  phases: [
    { title: '解析', detail: '解析施工包，构建依赖图，分批' },
    { title: 'Phase 0.5: 安全预检', detail: '每 Batch 调用 safety-layer preflight 标记风险（非阻塞）' },
    { title: '手动 TDD', detail: '按批次指引 + skill 推荐 → 手动实现 → 烧录验证 → 用户判决' },
    { title: 'Phase 2.5: 审计日志', detail: '每 Batch 调用 safety-layer audit 记录执行摘要' },
    { title: '汇总', detail: '汇总验收结果 + 安全摘要 → 写回记忆' },
  ],
}

// ============================================================
// Schema 定义
// ============================================================

const TASK_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    files: { type: 'array', items: { type: 'string' } },
    depends_on: { type: 'array', items: { type: 'string' } },
    techniques: { type: 'array', items: { type: 'string' } },
    acceptance: { type: 'array', items: { type: 'string' } },
  },
  required: ['id', 'name', 'description', 'files'],
}

// ============================================================
// 领域技能映射（techniques → skill 推荐）
// ============================================================

const SKILL_CATEGORY = {
  'timer-module': { cat: 'driver', tip: '定时器PSC/ARR/中断配置, Cortex-M标准外设' },
  'mcu-peripheral-registers': { cat: 'debug', tip: 'GPIO/RCC/定时器寄存器操作, volatile正确性' },
  'arm-interrupt-exception': { cat: 'arch', tip: '中断/异常/优先级/向量表/EXTI + 咬尾优化/零延迟/临界区策略' },
  'arm-core-registers': { cat: 'debug', tip: 'NVIC/SysTick/BASEPRI/PRIMASK寄存器级操作' },
  'arm-memory-architecture': { cat: 'arch', tip: '内存映射/MPU/位带操作, 链接脚本' },
  'stm32-hal-development': { cat: 'driver', tip: 'STM32 HAL库使用模式, CubeMX配置' },
  'stm32-spl-development': { cat: 'driver', tip: 'STM32标准外设库使用模式' },
  'coding-standards': { cat: 'quality', tip: '嵌入式C编码规范, MISRA, 命名约定' },
  'embedded-reviewer': { cat: 'quality', tip: '中断安全/可重入/DMA缓冲区代码审查' },
  'debug-gdb-openocd': { cat: 'debug', tip: 'GDB+OpenOCD调试, 断点/寄存器/回溯' },
  'cmbacktrace-debug': { cat: 'debug', tip: 'HardFault栈回溯, CFSR/BFSR/UFSR解码' },
  'flash-jlink': { cat: 'build', tip: 'JLink Commander烧录/调试脚本' },
  'build-cmake': { cat: 'build', tip: 'CMake构建系统, 交叉编译配置' },
  'linker-scatter': { cat: 'build', tip: '链接脚本编写, 内存布局, 分散加载' },
  'static-analysis': { cat: 'quality', tip: '静态代码分析工具集成' },
  'i2c-bus': { cat: 'comm', tip: 'I2C协议时序, 9脉冲法/SWRST复位' },
  'spi-bus': { cat: 'comm', tip: 'SPI协议时序, CPOL/CPHA配置' },
  'uart-module': { cat: 'comm', tip: 'UART波特率/数据位/停止位/中断配置' },
  'can-debug': { cat: 'comm', tip: 'CAN协议调试, 位时序/过滤器/错误处理' },
  'peripheral-driver': { cat: 'driver', tip: '外设驱动三层API: init/read_write/irq_callback' },
  'led-module': { cat: 'driver', tip: 'LED驱动设计, GPIO控制, PWM调光' },
  'lowpower-design': { cat: 'system', tip: '低功耗模式(WFI/WFE), 电源管理, 时钟门控' },
  'watchdog-module': { cat: 'system', tip: '独立/窗口看门狗配置, 喂狗策略' },
  'bootloader-design': { cat: 'system', tip: 'Bootloader设计, OTA分区, 跳转协议' },
  'dma-module': { cat: 'driver', tip: 'DMA配置, 传输模式, 中断完成标志' },
  'adc-module': { cat: 'driver', tip: 'ADC采样时间/参考电压/校准, 连续/单次模式' },
  'dsp-module': { cat: 'middleware', tip: 'DSP库使用, FIR/IIR滤波器, FFT' },
  'freertos-module': { cat: 'middleware', tip: 'FreeRTOS任务/队列/信号量/中断安全API' },
}

// ============================================================
// 依赖图构建
// ============================================================

function buildBatches(tasks) {
  const taskMap = {}
  for (const t of tasks) taskMap[t.id] = { ...t, dependents: [], level: 0 }

  for (const t of tasks) {
    for (const dep of t.depends_on || []) {
      if (taskMap[dep]) taskMap[dep].dependents.push(t.id)
    }
  }

  const inDegree = {}
  for (const t of tasks) inDegree[t.id] = (t.depends_on || []).length

  const queue = []
  for (const t of tasks) if (inDegree[t.id] === 0) queue.push(t.id)

  const batches = []
  while (queue.length > 0) {
    const batch = []
    const size = queue.length
    for (let i = 0; i < size; i++) {
      const id = queue.shift()
      batch.push(taskMap[id])
      for (const dep of taskMap[id].dependents) {
        inDegree[dep]--
        if (inDegree[dep] === 0) queue.push(dep)
      }
    }
    batches.push(batch)
  }

  const schedulable = batches.flat().length
  if (schedulable < tasks.length) {
    throw new Error('循环依赖: ' + tasks.length + ' 个任务中只有 ' + schedulable + ' 个可调度')
  }

  return batches
}

// ============================================================
// 获取任务对应的 skill 推荐列表
// ============================================================

function getSkillRecommendations(techniques) {
  if (!techniques || !techniques.length) return []
  return techniques
    .map(s => {
      const info = SKILL_CATEGORY[s]
      if (info) return { name: s, cat: info.cat, tip: info.tip }
      return null
    })
    .filter(Boolean)
}

// ============================================================
// 执行
// ============================================================

phase('解析施工包')

const tasks = args.tasks
if (!tasks || !tasks.length) throw new Error('缺少任务列表')
const acceptance = args.acceptance || []
const domain = args.domain || 'embedded'

const batches = buildBatches(tasks)
const totalBatches = batches.length

log('收到 ' + tasks.length + ' 个任务 | ' + totalBatches + ' 个批次')
for (let i = 0; i < totalBatches; i++) {
  const names = batches[i].map(t => t.name).join(', ')
  log('  Batch ' + (i+1) + ': ' + names)
}
log('')

// ============================================================
// Phase 0.5 — 安全预检（每 Batch 前调用 safety-layer preflight）
// ============================================================

phase('Phase 0.5: 安全预检')

const preflightResults = []
let preflightSummary = []

for (let b = 0; b < totalBatches; b++) {
  const batch = batches[b]
  log('--- Batch ' + (b+1) + '/' + totalBatches + ' 安全预检 ---')

  for (const task of batch) {
    // 调用 safety-layer preflight
    let result = { safe: true, verdict: 'allow', risks: [], warnings: [], checkedPaths: [], summary: '无检查结果' }
    try {
      result = await workflow('safety-layer', {
        action: 'preflight',
        task: { name: task.name, description: task.description, files: task.files },
        domain: domain,
        overrides: [],
      })
      result = result.result || result
    } catch (e) {
      log('  [!] safety-layer 调用失败（非阻塞）: ' + e.message)
    }

    preflightResults.push({ task_id: task.id, batch: b + 1, result })

    const icon = result.verdict === 'allow' ? '🟢' : (result.verdict === 'caution' ? '🟡' : '🔴')
    log('  ' + icon + ' ' + task.id + ': ' + (result.summary || result.verdict))

    if (result.risks && result.risks.length > 0) {
      for (const risk of result.risks) {
        log('    ⚠️  [' + risk.level + '] ' + (risk.message || risk.type))
        preflightSummary.push({ task_id: task.id, risk: risk.message || risk.type, level: risk.level })
      }
    }
    if (result.warnings && result.warnings.length > 0) {
      for (const w of result.warnings) {
        log('    [?] ' + w)
      }
    }
  }
  log('')
}

const hasRisks = preflightResults.some(r => r.result && r.result.verdict !== 'allow')
if (hasRisks) {
  log('[!] 预检发现 ' + preflightSummary.length + ' 个风险标记（非阻塞 — 仅标记，用户保留决策权）')
} else {
  log('[OK] 全部批次预检通过')
}
log('')

// ============================================================
// 输出分批指引（含 skill 推荐 + 预检结果）
// ============================================================

phase('手动 TDD 分批指引 + Skill 推荐')

log('===== 编排层 = 手动 TDD 流程管理器 =====')
log('')
log('不自动发 agent，不自动写代码')
log('你的眼睛 + 烧录验证 = 最终验收标准')
log('每个任务有推荐 skill，对话中调取获取领域指导')
log('')

for (let b = 0; b < totalBatches; b++) {
  const batch = batches[b]
  const isLast = b === totalBatches - 1

  log('')
  log('--- Batch ' + (b+1) + '/' + totalBatches + ' ---')
  log('')

  // Phase 0.5 预检摘要
  const batchPreflight = preflightResults.filter(r => r.batch === b + 1)
  const batchWarnings = batchPreflight.filter(r => r.result && r.result.verdict !== 'allow')
  if (batchWarnings.length > 0) {
    log('  [Phase 0.5 预检] ' + batchWarnings.length + ' 个风险标记:')
    for (const pw of batchWarnings) {
      const risks = (pw.result.risks || []).map(r => r.message || r.type).join(', ')
      log('    ' + pw.task_id + ': ' + risks)
    }
    log('  note: 安全层仅标记不阻止，由用户决策')
    log('')
  }

  for (const task of batch) {
    log('[TASK] ' + task.id + ': ' + task.name)
    log('  desc: ' + task.description.split('\n')[0])
    log('  files: ' + task.files.join(', '))
    if (task.depends_on && task.depends_on.length) {
      log('  depends_on: ' + task.depends_on.join(', '))
    }

    // Skill 推荐
    const recs = getSkillRecommendations(task.techniques)
    if (recs.length > 0) {
      log('  [SKILLS] 实作前调以下 skill 获取指导:')
      for (const r of recs) {
        log('    Skill({ name: "' + r.name + '" })  -- ' + r.tip)
      }
    }

    // 对应验收项
    const globalIdx = tasks.findIndex(t => t.id === task.id)
    const accItem = acceptance[globalIdx]
    if (accItem) {
      const itemText = typeof accItem === 'string' ? accItem : (accItem.item || JSON.stringify(accItem))
      log('  acceptance: ' + itemText)
    }
    log('')
  }

  log('  work: 调推荐 skill → 手动 TDD → 编译 → 烧录 → 验证')
  if (!isLast) {
    log('  note: Batch ' + (b+2) + ' 依赖此批验收通过')
  }
  log('')
}

// ============================================================
// Phase 2.5 — 审计日志
// ============================================================

phase('Phase 2.5: 审计日志')

const sessionId = args.session || 'orchestration-session'
const auditEntries = []
for (let b = 0; b < totalBatches; b++) {
  const batch = batches[b]
  const batchPreflight = preflightResults.filter(r => r.batch === b + 1)
  const hasRisk = batchPreflight.some(r => r.result && r.result.verdict !== 'allow')

  const entry = {
    type: 'batch_complete',
    batch: b + 1,
    total: totalBatches,
    tasks: batch.map(t => ({ id: t.id, name: t.name })),
    preflight_verdict: hasRisk ? 'caution' : 'allow',
    result: 'guide_generated',
  }

  try {
    await workflow('safety-layer', {
      action: 'audit',
      entry,
      session: sessionId,
    })
    auditEntries.push({ batch: b + 1, status: 'logged' })
  } catch (e) {
    log('  [!] audit 写入失败（非阻塞）: ' + e.message)
    auditEntries.push({ batch: b + 1, status: 'failed' })
  }
}
log('[AUDIT] ' + auditEntries.length + '/' + totalBatches + ' 批次审计已记录')
log('')

// ============================================================
// 输出进度状态表
// ============================================================

log('===== 进度跟踪表 =====')
log('')
log('ID'.padEnd(5) + ' 任务'.padEnd(22) + ' 验收'.padEnd(20) + ' 安全预检'.padEnd(16) + ' 状态')
log(''.padEnd(75, '-'))

for (let i = 0; i < tasks.length; i++) {
  const t = tasks[i]
  const pf = preflightResults.find(r => r.task_id === t.id)
  const pfIcon = !pf ? '—' : (pf.result && pf.result.verdict === 'allow' ? '🟢' : '🟡')
  const accText = typeof acceptance[i] === 'string'
    ? acceptance[i].substring(0, 16)
    : '(验收项' + (i+1) + ')'
  log(t.id.padEnd(5) + ' ' + t.name.padEnd(18) + ' ' + (accText||'').padEnd(16) + ' ' + pfIcon.padEnd(14) + ' 待执行')
}
log('')
log('每完成一批，更新状态为 通过 或 不通过')
log('')

// ============================================================
// 汇总输出
// ============================================================

phase('施工包已就绪')

const timestamp = '__timestamp__'
const output = {
  status: 'guide_ready',
  total_tasks: tasks.length,
  total_batches: totalBatches,
  domain: domain,
  batches: batches.map((b, i) => ({
    batch: i + 1,
    tasks: b.map(t => ({
      id: t.id,
      name: t.name,
      files: t.files,
      depends_on: t.depends_on || [],
      techniques: t.techniques || [],
    })),
  })),
  tasks: tasks.map((t, i) => {
    const recs = getSkillRecommendations(t.techniques)
    const pf = preflightResults.find(r => r.task_id === t.id)
    return {
      id: t.id,
      name: t.name,
      acceptance: typeof acceptance[i] === 'string' ? acceptance[i] : (acceptance[i]?.item || ''),
      skills: recs.map(r => r.name),
      preflight: pf ? { verdict: pf.result.verdict, risk_count: (pf.result.risks || []).length } : null,
      status: 'pending',   // 待 main agent 在执行中更新
      verdict: 'pending',   // 待用户判决后更新
    }
  }),
  acceptance_check: acceptance.map((a, i) => ({
    index: i,
    task_id: tasks[i]?.id,
    item: typeof a === 'string' ? a : (a.item || ''),
    verdict: 'pending',
    judge: '用户判决',
  })),
  security: {
    phase_0_5: {
      enabled: true,
      preflight_count: preflightResults.length,
      risk_count: preflightSummary.length,
      has_risks: hasRisks,
    },
    phase_2_5: {
      enabled: true,
      session: sessionId,
      audit_count: auditEntries.filter(a => a.status === 'logged').length,
    },
  },
  next_steps: [
    '按 Batch 顺序执行',
    '每个任务前调推荐 skill 获取领域指导',
    '手动 TDD → 编译 → 烧录 → 验证',
    'Phase 0.5 预检结果已标记（非阻塞 — 用户决策）',
    '每批完成后由你判决验收项',
    'Phase 2.5 审计日志已记录',
    '全部通过后写回记忆',
  ],

  // ============================================================
  // 链式触发元数据 — 引导主 agent 跟踪执行进度 + 完成链路
  // ============================================================
  chain: {
    status: 'guide_ready',       // guide_ready → executing → completed / failed
    type: 'manual_tdd',          // 当前编排模式（手动 TDD）

    // 执行阶段指引：主 agent 按此跟踪进度
    executing: {
      // 每个任务的执行状态模板，主 agent 在对话中逐条填充
      task_trackers: tasks.map((t, i) => ({
        id: t.id,
        name: t.name,
        status: 'pending',
        verdict: 'pending',
        skills_used: [],
        notes: '',
      })),
      // 验收项状态模板
      acceptance_trackers: acceptance.map((a, i) => ({
        index: i,
        task_id: tasks[i]?.id,
        item: typeof a === 'string' ? a : (a.item || ''),
        verdict: 'pending',
      })),
    },

    // 完成后链路 — 所有任务验收通过后的自动操作
    on_completion: {
      when: 'all_tasks_approved',  // 所有 verdict === 'pass'
      description: '全部任务验证通过 → 保存执行摘要到记忆层',
      chain: [
        {
          type: 'save_memory',
          workflow: 'memory-layer',
          args_template: {
            action: 'save',
            name: `orchestration-summary-${timestamp}`,
            description: `编排层执行摘要 — ${tasks.length} 个任务, ${totalBatches} 个批次`,
            // 以下由 main agent 根据实际执行结果填充：
            // $$content: 执行摘要（含所有任务的 verdict + 用户判决记录）
            // $$type: 'project'
          },
          depends_on: [],
        },
        {
          type: 'audit',
          workflow: 'safety-layer',
          action: 'audit',
          args_template: {
            action: 'audit',
            entry: { type: 'orchestration_complete' },
            session: sessionId,
          },
          depends_on: ['save_memory'],
        },
      ],
    },

    // 部分完成链路 — 即使未全部通过，也保存中间状态
    on_partial: {
      when: 'some_tasks_done',
      description: '部分任务完成 → 保存进度到记忆层',
      chain: [
        {
          type: 'save_memory',
          workflow: 'memory-layer',
          args_template: {
            action: 'save',
            name: `orchestration-progress-${timestamp}`,
            description: `编排层执行进度 — ${tasks.length} 个任务`,
            // $$content: 进度摘要
            // $$type: 'project'
          },
        },
      ],
    },

    // 中止/错误链路
    on_cancel: {
      description: '编排中止 → 记录审计日志',
      chain: [
        {
          type: 'audit',
          workflow: 'safety-layer',
          action: 'audit',
          args_template: {
            action: 'audit',
            entry: { type: 'orchestration_cancelled' },
            session: sessionId,
          },
        },
      ],
    },

    // 执行指引（给 main agent 的结构化步骤）
    execution_guide: {
      per_task_pattern: [
        '1. 调 Skill({ name: "<skill>" }) 获取领域指导',
        '2. 手动 TDD 实现（主 agent + 用户协作）',
        '3. 编译 → 烧录 → 验证',
        '4. 用户判决验收项 → 更新 task.verdict',
        '5. 更新 chain.executing.task_trackers 状态',
      ],
      batch_progress: '每完成一个 Batch，通知用户下一个 Batch 的依赖关系',
      completion_check: {
        all_approved: '所有 task.verdict === "pass" → 执行 on_completion',
        some_failed: '有 task.verdict === "fail" → 记录失败原因 → 决策是否继续',
        user_stopped: '用户说停 → 执行 on_cancel → 保存进度',
      },
    },
  },

  // ============================================================
  // AI 推理步骤清单 — 按批次执行指引
  // ============================================================
  action_items: batches.flatMap((batch, bi) => [
    // Batch 头部指引
    {
      step: bi * 10 + 1,
      action: 'manual',
      title: 'Batch ' + (bi + 1) + ' — 开始执行',
      skill: null,
      detail: '检查 Batch ' + (bi + 1) + '/' + totalBatches + ' 的依赖关系' +
        (bi > 0 ? '，确认 Batch ' + bi + ' 的验收项已全部通过' : '（无前置依赖）') +
        '。通知用户开始此批次的 ' + batch.length + ' 个任务。',
      reason: '批次间存在依赖关系，前一批次验收不通过不能执行下一批',
      expects: '用户确认开始此批次',
      depends_on: bi > 0 ? ['batch_' + bi + '_done'] : [],
    },
    // 每个任务的执行指引
    ...batch.map((task, ti) => {
      const recs = getSkillRecommendations(task.techniques)
      const skillNames = recs.map(r => r.name).filter(Boolean)
      return {
        step: bi * 10 + ti + 2,
        action: 'skill',
        title: task.id + ': ' + task.name,
        skill: skillNames.length > 0 ? skillNames.join(', ') : null,
        detail: '实现 ' + task.name + '。\n  files: ' + task.files.join(', ') + '\n' +
          (task.depends_on && task.depends_on.length ? '  depends_on: ' + task.depends_on.join(', ') + '\n' : '') +
          (skillNames.length > 0 ? '  [SKILLS] 实作前调以下 skill 获取指导: ' + skillNames.join(', ') : '') +
          '\n  模式: 主 agent + 用户手动 TDD → 编译 → 烧录 → 验证',
        reason: '用户是最终执行者和判决者，主 agent 提供 skill 领域指导',
        expects: '任务通过验收，verdict 更新为 pass 或 fail',
        depends_on: task.depends_on && task.depends_on.length > 0
          ? task.depends_on.map(d => 'task_' + d)
          : (ti > 0 ? ['task_' + batch[ti - 1].id + '_done'] : []),
        output_key: 'task_' + task.id,
      }
    }),
    // Batch 收尾
    {
      step: bi * 10 + batch.length + 2,
      action: 'conversation',
      title: 'Batch ' + (bi + 1) + ' — 验收判决',
      skill: null,
      detail: 'Batch ' + (bi + 1) + ' 全部任务执行完毕，逐条向用户展示验收项，获取判决（通过/不通过）。\n' +
        '记录每个验收项的 verdict 到 acceptance_check[]，记录每个任务的 verdict 到 chain.executing.task_trackers[]。\n' +
        (bi < totalBatches - 1 ? '全部通过后才进入下一个 Batch。' : '全部通过则进入完成链路。'),
      reason: '用户判决是编排层唯一的验收标准',
      expects: '所有验收项 verdict 填完，任务状态更新',
      depends_on: batch.map(t => 'task_' + t.id + '_done'),
    },
  ]).concat([
    // 全部完成后的链路
    {
      step: totalBatches * 10 + 1,
      action: 'workflow',
      title: '全部完成 — 执行完成链路',
      skill: null,
      detail: '所有 Batch 验收通过。按 chain.on_completion 执行：\n' +
        '  1. 调 memory-layer save 保存执行摘要\n' +
        '  2. 调 safety-layer audit 记录完成日志\n' +
        '  3. 向用户输出最终验收汇总',
      reason: '执行摘要保存到记忆层后可供后续项目检索参考',
      expects: '记忆层已保存 + 审计日志已写入',
      depends_on: batches.map((b, i) => 'batch_' + (i + 1) + '_done'),
    },
  ]),

  state: {
    produced: {
      batches: batches.map((b, i) => ({ batch: i + 1, task_ids: b.map(t => t.id) })),
      task_count: tasks.length,
      batch_count: totalBatches,
      domain: domain,
      task_results: null,
      acceptance_verdicts: null,
      completion_summary: null,
    },
    consumed_by: {
      'memory-layer': { action: 'save', name: 'orchestration-summary', content: 'completion_summary', type: 'project' },
      'safety-layer': { action: 'audit', entry: 'task_results', session: sessionId },
    },
  },
}

log('')
log('===== 施工包已就绪 =====')
log(tasks.length + ' 个任务, ' + totalBatches + ' 个批次')
for (let i = 0; i < tasks.length; i++) {
  log(tasks[i].id + ': ' + tasks[i].name + ' -- 待执行')
}
log('')
log('执行方式: 手动 TDD (调推荐 skill 获取指导)')
log('验收判决: 你最终判决')
log('')
log('链式触发已就绪:')
log('  - 全部完成 → 自动保存到记忆层 + 审计日志')
log('  - 部分完成 → 保存进度')
log('  - 中止 → 审计日志')

return output
