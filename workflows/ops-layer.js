// Ops 层 Workflow — 系统运维 + 打包分发
// 输入: { action: 'health' | 'backup' | 'restore' | 'package' | 'deploy' | 'doctor' | 'prune', ... }
// 输出: 操作结果 + 结构化数据
//
// 使用方式:
//   Workflow({ scriptPath: '.claude/workflows/ops-layer.js', args: { action: 'health' } })
//   ⚠️ 推荐用 scriptPath 而非 name: 因 name: 使用编译缓存 → 不反映脚本实时编辑
//   Workflow({ scriptPath: '.claude/workflows/ops-layer.js', args: { action: 'backup' } })
//   Workflow({ scriptPath: '.claude/workflows/ops-layer.js', args: { action: 'restore', from: 'path/to/backup.tar.gz' } })
//   Workflow({ name: 'ops-layer', args: { action: 'package' } })
//   Workflow({ name: 'ops-layer', args: { action: 'deploy', target: 'user@host:/path' } })
//   Workflow({ name: 'ops-layer', args: { action: 'doctor' } })
//   Workflow({ name: 'ops-layer', args: { action: 'prune', days: 30 } })
//
// 设计原则:
// 1. 只操作 ~/.claude/ 范围，不涉足系统级配置
// 2. 备份/恢复不可逆 — 先预览再执行
// 3. 所有写操作经安全层 Phase 0.5 预检
// 4. 打包部署走 diff + 确认模式

export const meta = {
  name: 'ops-layer',
  description: 'Ops 层：系统运维 — 健康检查/备份恢复/打包部署/诊断/清理',
  phases: [
    { title: '解析', detail: '解析请求 action 和参数' },
    { title: '扫描', detail: '扫描系统状态' },
    { title: '执行', detail: '执行具体操作' },
    { title: '输出', detail: '格式化输出结果' },
  ],
}

// ============================================================
// Schema 定义
// ============================================================

const HEALTH_SCHEMA = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['ok', 'warning', 'error'] },
    checks: {
      type: 'object',
      properties: {
        proxy: { type: 'object', properties: { status: { type: 'string' }, port: { type: 'number' }, pid: { type: 'number' } }, required: ['status'] },
        env: { type: 'object', properties: { status: { type: 'string' }, missing_vars: { type: 'array', items: { type: 'string' } } }, required: ['status'] },
        hooks: { type: 'object', properties: { status: { type: 'string' }, files: { type: 'array', items: { type: 'string' } } }, required: ['status'] },
        workflows: { type: 'object', properties: { status: { type: 'string' }, count: { type: 'number' }, broken: { type: 'array', items: { type: 'string' } } }, required: ['status'] },
        skills: { type: 'object', properties: { status: { type: 'string' }, count: { type: 'number' }, orphans: { type: 'array', items: { type: 'string' } } }, required: ['status'] },
        memory: { type: 'object', properties: { status: { type: 'string' }, count: { type: 'number' } }, required: ['status'] },
      },
      required: ['proxy', 'env', 'hooks', 'workflows', 'skills', 'memory'],
    },
    summary: { type: 'string' },
  },
  required: ['status', 'checks', 'summary'],
}

const BACKUP_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    path: { type: 'string' },
    size_bytes: { type: 'number' },
    items_count: { type: 'number' },
    items: { type: 'array', items: { type: 'string' } },
    excludes: { type: 'array', items: { type: 'string' } },
    error: { type: 'string' },
  },
  required: ['success'],
}

const PACKAGE_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    path: { type: 'string' },
    size_bytes: { type: 'number' },
    contents: { type: 'array', items: { type: 'string' } },
    setup_script: { type: 'string' },
    requires: { type: 'array', items: { type: 'string' } },
    error: { type: 'string' },
  },
  required: ['success'],
}

const DOCTOR_SCHEMA = {
  type: 'object',
  properties: {
    issues_found: { type: 'number' },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['error', 'warning', 'info'] },
          category: { type: 'string' },
          message: { type: 'string' },
          fixable: { type: 'boolean' },
          auto_fixed: { type: 'boolean' },
        },
        required: ['severity', 'category', 'message'],
      },
    },
    summary: { type: 'string' },
  },
  required: ['issues_found', 'issues', 'summary'],
}

const PRUNE_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    freed_bytes: { type: 'number' },
    removed: { type: 'array', items: { type: 'string' } },
    error: { type: 'string' },
  },
  required: ['success'],
}

// ============================================================
// 常量
// ============================================================

const CLAUDE_DIR = '~/.claude'
const BACKUP_DIR = '~/.claude/backups'
const OPS_DIR = '~/.claude/ops-layer'
const TIMESTAMP = (() => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19))()

// ============================================================
// action_items 生成器
// ============================================================

function getOpsActionItems(act, res) {
  const items = {
    health: [
      { step: 1, action: 'review', title: '审查健康检查结果', skill: null, detail: '状态: ' + (res?.status || 'unknown') + ' | ' + (res?.summary || ''), reason: '确认系统各组件状态正常再执行其他操作', expects: '确认问题已处理', depends_on: [] },
      { step: 2, action: 'workflow', title: '修复问题组件', skill: null, detail: res?.status === 'warning' || res?.status === 'error' ? '调 ops-layer doctor 诊断并修复' : '系统健康', reason: '修复后才进行后续操作', expects: '修复完成', depends_on: ['step_1'] },
    ],
    backup: [
      { step: 1, action: 'verify', title: '验证备份完整性', skill: null, detail: '备份路径: ' + (res?.path || 'N/A') + ', 大小: ' + ((res?.size_bytes || 0) / 1024 / 1024).toFixed(1) + ' MB, 文件: ' + (res?.items_count || 0), reason: '备份是恢复的唯一保障', expects: '确认备份文件可访问', depends_on: [] },
    ],
    restore: [
      { step: 1, action: 'conversation', title: '确认恢复操作', skill: null, detail: '从 ' + (res?.from || args.from || '?') + ' 恢复' + (res?.dry_run ? ' (dry-run 模式，仅预览)' : ''), reason: '恢复覆盖现有配置，操作不可逆', expects: '用户确认', depends_on: [] },
    ],
    package: [
      { step: 1, action: 'verify', title: '验证分发包', skill: null, detail: '包路径: ' + (res?.path || 'N/A') + ', 大小: ' + ((res?.size_bytes || 0) / 1024 / 1024).toFixed(1) + ' MB', reason: '确认包可正常使用再部署', expects: '分发包已验证', depends_on: [] },
      { step: 2, action: 'workflow', title: '部署到目标机器', skill: null, detail: '调 ops-layer deploy 将包部署到目标', reason: '打包目的就是分发', expects: '部署完成', depends_on: ['step_1'] },
    ],
    deploy: [
      { step: 1, action: 'verify', title: '验证部署结果', skill: null, detail: '目标: ' + (res?.target || args.target || 'N/A') + ', 状态: ' + (res?.success ? '成功' : '失败'), reason: '确认远程系统正常运行', expects: '远程验证通过', depends_on: [] },
    ],
    doctor: [
      { step: 1, action: 'review', title: '审查诊断结果', skill: null, detail: '问题数: ' + (res?.issues_found || 0) + ' | ' + (res?.summary || ''), reason: '诊断是系统运维的第一步', expects: '所有 fixable 问题已自动修复', depends_on: [] },
      { step: 2, action: 'manual', title: '处理不可自动修复的问题', skill: null, detail: res?.issues?.filter(i => !i.fixable)?.map(i => '  [' + i.severity + '] ' + i.message).join('\n') || '无不修复问题', reason: '需要人工介入', expects: '问题已手动处理', depends_on: ['step_1'] },
    ],
    prune: [
      { step: 1, action: 'verify', title: '验证清理结果', skill: null, detail: '释放: ' + ((res?.freed_bytes || 0) / 1024 / 1024).toFixed(1) + ' MB' + ', 已删除: ' + (res?.removed?.length || 0) + ' 个文件', reason: '确保没有误删重要数据', expects: '清理完成', depends_on: [] },
    ],
  }
  return items[act] || []
}

function getOpsState(act, res) {
  const base = { action: act }
  if (act === 'health') return { ...base, status: res?.status || 'unknown', checks: res?.checks || {} }
  if (act === 'backup') return { ...base, success: res?.success || false, path: res?.path || null, size: res?.size_bytes || 0 }
  if (act === 'restore') return { ...base, success: res?.success || false, dry_run: res?.dry_run || false, from: res?.from || args?.from || null }
  if (act === 'package') return { ...base, success: res?.success || false, path: res?.path || null }
  if (act === 'deploy') return { ...base, success: res?.success || false, target: args?.target || null }
  if (act === 'doctor') return { ...base, issues_found: res?.issues_found || 0 }
  if (act === 'prune') return { ...base, success: res?.success || false, freed_bytes: res?.freed_bytes || 0 }
  if (act === 'version') return { ...base, skills: res?.skills || 0, workflows: res?.workflows || 0, system_version: res?.system_version || null }
  return base
}

function getOpsVersionItems() {
  return [
    { step: 1, action: 'review', title: '审查系统版本信息', skill: null, detail: '查看 Chip 系统各组件版本号', reason: '了解当前部署版本，判断是否需要升级', expects: '版本信息已确认', depends_on: [] },
  ]
}

// ============================================================
// 主流程
// ============================================================

const { action } = args
log(`Ops 层请求: ${action}`)

// ============================================================
// Action: health — 系统健康检查
// ============================================================

if (action === 'health') {
  phase('扫描')
  log('检查系统各组件状态...')

  const result = await agent(`
    对 ${CLAUDE_DIR}/ 执行系统健康检查，检查以下组件：

    1. **proxy** — DeepSeek API 代理
       - 端口 17999 是否监听
       - 进程 PID（从 hooks/proxy-startup.log 提取）
       - 如果端口不在监听 → status: "down"

    2. **env** — 环境变量
       - 检查 ANTHROPIC_BASE_URL 是否包含 deepseek 或 localhost
       - 检查 ANTHROPIC_BASE_URL 是否指向代理端口
       - 如果缺少关键变量 → 列出到 missing_vars
       - 注意: .env.secrets 存在即算通过

    3. **hooks** — 会话钩子
       - 检查 hooks/session-start 是否存在且可执行
       - 状态 "present" / "missing"

    4. **workflows** — Workflow 脚本
       - 列出 workflows/*.js 数量
       - 检查是否有 .js 文件大小为 0（broken）

    5. **skills** — 技能包
       - 统计 skills/ 下子目录数
       - 检查 skills/_data.json 是否存在（注册标记）
       - 如果有目录但无 SKILL.md → 列为 orphan

    6. **memory** — 记忆层
       - 列出 projects/*/memory/MEMORY.md 中的条目数
       - 如果 projects/ 不存在 → status: "empty"

    返回按照指定 Schema 格式的 JSON 对象。
    全局 status:
      - "ok": 所有组件正常
      - "warning": 1-2 个组件有问题
      - "error": ≥3 个组件有问题
    summary 是一句中文字段，例如 "系统正常" / "代理离线，环境配置有误" 等。
  `, {
    label: '健康检查',
    phase: '扫描',
    schema: HEALTH_SCHEMA,
  })

  phase('输出')
  const statusEmoji = { ok: '✅', warning: '⚠️', error: '❌' }
  log(`${statusEmoji[result.status]} ${result.summary}`)

  for (const [name, check] of Object.entries(result.checks)) {
    const s = check.status === 'ok' || check.status === 'present' || check.status === 'healthy'
      ? '✅' : check.status === 'warning' || check.status === 'empty'
      ? '⚠️' : '❌'
    log(`  ${s} ${name}: ${check.status}`)
  }

  return { ...result, action_items: getOpsActionItems('health', result), state: { produced: getOpsState('health', result) } }
}

// ============================================================
// Action: backup — 全量备份
// 参数: { excludes?: string[] }  — 额外排除项
// ============================================================

if (action === 'backup') {
  phase('扫描')
  log('计算备份范围...')

  const result = await agent(`
    生成 ${CLAUDE_DIR} 的备份。

    备份范围 (include):
    - CLAUDE.md, SOUL.md, AGENTS.md, USER.md
    - config.json, settings.json
    - .env.secrets（内容脱敏）
    - hooks/ (全部)
    - workflows/ (全部)
    - skills/ (仅元数据: SKILL.md + registry.json)
    - projects/*/memory/ (全部)
    - ops-layer/ (全部)
    - backups/ 保留最近 3 个，跳过更旧的

    排除项 (exclude):
    - history.jsonl（会话历史，太大）
    - workflows/__tests__/（测试用例）
    - file-history/（文件历史快照）
    - skills/ 下除 SKILL.md 和 registry.json 外的实际内容文件
    - .scheduled_tasks.json
    - .last-cleanup

    额外排除: ${args.excludes ? args.excludes.join(', ') : '无'}

    打包为 tar.gz 到 ${BACKUP_DIR}/ops-backup-${TIMESTAMP}.tar.gz

    返回: { success, path, size_bytes, items_count, items (清单), excludes (排除列表), error }
  `, {
    label: '全量备份',
    phase: '执行',
    schema: BACKUP_SCHEMA,
  })

  phase('输出')
  if (result.success) {
    const sizeMB = (result.size_bytes / 1024 / 1024).toFixed(1)
    log(`备份完成: ${result.path}`)
    log(`大小: ${sizeMB} MB, 文件数: ${result.items_count}`)
  } else {
    log(`备份失败: ${result.error}`)
  }
  return { ...result, action_items: getOpsActionItems('backup', result), state: { produced: getOpsState('backup', result) } }
}

// ============================================================
// Action: restore — 从备份恢复
// 参数: { from: 'path/to/backup.tar.gz', dryRun?: true }
// ============================================================

if (action === 'restore') {
  const { from, dryRun } = args
  if (!from) throw new Error('restore 需要 from 参数')

  phase('扫描')
  log(`检查备份文件: ${from}`)

  // dryRun 模式：预览影响
  if (dryRun) {
    const preview = await agent(`
      预览恢复操作: 从 ${from} 恢复到 ${CLAUDE_DIR}。

      列出备份文件中的内容，并标记每个文件的操作类型:
      - "新增" — 备份有但当前没有
      - "覆盖" — 双方都有
      - "跳过" — 备份没有但当前有（保留现状）

      按目录分组输出，用 markdown 列表。
      最后给出影响评估: 将新增 N 个文件，覆盖 M 个文件，保留 R 个文件。
    `, {
      label: '预览恢复',
      phase: '扫描',
    })

    phase('输出')
    log(`恢复预览 (dry-run): ${from}`)
    log(preview)
    log('确认执行: Workflow({ name: "ops-layer", args: { action: "restore", from: "...", dryRun: false } })')
    return { success: true, dry_run: true, preview, action_items: getOpsActionItems('restore', { ...result, dry_run: true, from: args.from }), state: { produced: getOpsState('restore', { success: true, dry_run: true }) } }
  }

  phase('执行')
  log(`执行恢复: ${from}`)

  const result = await agent(`
    从 ${from} 恢复到 ${CLAUDE_DIR}。

    解除备份 tar.gz 到临时目录，逐文件覆盖替换。
    恢复后验证关键文件:
    - CLAUDE.md, SOUL.md, AGENTS.md 存在且非空
    - config.json 存在且合法 JSON
    - hooks/session-start 存在且可执行

    返回恢复摘要: 总文件数, 恢复成功数, 失败数, 验证结果。
  `, {
    label: '执行恢复',
    phase: '执行',
  })

  phase('输出')
  log(`恢复完成`)
  return { ...result, action_items: getOpsActionItems('restore', result), state: { produced: getOpsState('restore', result) } }
}

// ============================================================
// Action: package — 打包分发
// 生成一个可移植的最小化安装包，用于新机器快速部署
// ============================================================

if (action === 'package') {
  phase('扫描')
  log('构建可分发包...')

  const result = await agent(`
    生成可移植分发包到 ${OPS_DIR}/ops-pack-${TIMESTAMP}.tar.gz

    包含内容（最小化可运行集）:
    1. 核心配置: settings.json, config.json
    2. 人格系统: SOUL.md, AGENTS.md, USER.md
    3. Workflow 引擎: workflows/*.js（不含 __tests__）
    4. hooks: hooks/session-start
    5. 技能注册表: skills/_data.json（不含实际技能内容，仅元数据）
    6. 域配置: workflows/domains/
    7. 代理脚本: bin/deepseek-proxy.js（如果存在）
    8. 记忆索引: projects/*/memory/（仅索引 MEMORY.md，不含内容文件）
    9. 安装脚本: 生成一个 setup.sh，内容如下:

    \`\`\`bash
    #!/usr/bin/env bash
    # Ops Layer — 自动安装脚本
    # 解压此包到 ~/.claude/
    # 用法: bash setup.sh [target-dir]

    TARGET="\${1:-$HOME/.claude}"
    SCRIPT_DIR="\$(cd "\$(dirname "\${BASH_SOURCE[0]}")" && pwd)"

    echo "安装到 \$TARGET ..."
    mkdir -p "\$TARGET"

    # 备份现有配置
    if [ -f "\$TARGET/CLAUDE.md" ]; then
      cp "\$TARGET/CLAUDE.md" "\$TARGET/CLAUDE.md.bak.\$(date +%s)"
      echo "已有 CLAUDE.md 已备份"
    fi

    # 复制文件（不覆盖已有 skills/ 内容）
    for dir in workflows hooks bin; do
      [ -d "\$SCRIPT_DIR/\$dir" ] && cp -r "\$SCRIPT_DIR/\$dir" "\$TARGET/"
    done
    for f in CLAUDE.md SOUL.md AGENTS.md USER.md config.json settings.json; do
      [ -f "\$SCRIPT_DIR/\$f" ] && cp "\$SCRIPT_DIR/\$f" "\$TARGET/"
    done

    echo "安装完成！"
    echo ""
    echo "后续步骤:"
    echo "  1. 编辑 \$TARGET/settings.json 更新 ANTHROPIC_AUTH_TOKEN"
    echo "  2. 编辑 \$TARGET/.env.secrets 配置密钥"
    echo "  3. 运行 Workflow({ name: 'ops-layer', args: { action: 'doctor' } }) 检查系统状态"
    \`\`\`

    返回: { success, path, size_bytes, contents (文件清单), setup_script (setup.sh 路径), requires (依赖项列表), error }

    requires 字段列出新机器需要的系统依赖: ["git", "node", "bash"]
  `, {
    label: '打包分发',
    phase: '执行',
    schema: PACKAGE_SCHEMA,
  })

  phase('输出')
  if (result.success) {
    const sizeMB = (result.size_bytes / 1024 / 1024).toFixed(1)
    log(`分发包: ${result.path}`)
    log(`大小: ${sizeMB} MB, 文件数: ${result.contents?.length || 0}`)
    log(`安装命令: bash ${result.setup_script}`)
    log(`依赖项: ${result.requires?.join(', ') || '无'}`)
  } else {
    log(`打包失败: ${result.error}`)
  }
  return { ...result, action_items: getOpsActionItems('package', result), state: { produced: getOpsState('package', result) } }
}

// ============================================================
// Action: deploy — 部署到远程机器
// 参数: { target: 'user@host:/path' }
// ============================================================

if (action === 'deploy') {
  const { target } = args
  if (!target) throw new Error('deploy 需要 target 参数')

  phase('执行')
  log(`部署到: ${target}`)

  const result = await agent(`
    将当前 Agent 系统部署到 ${target}。

    部署步骤:
    1. 先创建分发包（调用 package 逻辑）
    2. 通过 scp 将分发包传到 ${target}
    3. 在远程执行 setup.sh
    4. 验证远程环境:
       - 远程 node 版本
       - 远程 git 可用
       - 远程 ~/.claude/ 已创建
       - 关键文件存在

    如果远程已有配置，先备份再覆盖。

    要求:
    - 不要明文传输 .env.secrets 中的密钥
    - 不要传输 history.jsonl 等大型历史数据
    - 部署完成后输出远程摘要

    返回部署结果，包含: success, target, files_copied, remote_status, warnings
  `, {
    label: '远程部署',
    phase: '执行',
  })

  phase('输出')
  if (result.success) {
    log(`部署完成: ${target}`)
  } else {
    log(`部署失败: ${result.warnings || result.error}`)
  }
  return { ...result, action_items: getOpsActionItems('deploy', result), state: { produced: getOpsState('deploy', result) } }
}

// ============================================================
// Action: doctor — 系统诊断 + 自动修复常见问题
// ============================================================

if (action === 'doctor') {
  phase('扫描')
  log('诊断系统问题...')

  const result = await agent(`
    对 ${CLAUDE_DIR}/ 执行全面诊断，检查并尽可能自动修复常见问题。

    诊断项目:

    1. **代理问题** — 检查端口 17999 是否监听
       - 未运行但脚本存在 → 标记 fixable, 描述启动方式

    2. **Workflow 语法错误** — 检查 workflows/*.js
       - 对每个文件运行 node -c 检查语法
       - 语法错误 → 标记 fixable: false（需要人工修复）

    3. **Skills 元数据缺失**
       - 检查 skills/_data.json 是否存在
       - 缺失 → fixable: true（可重建）

    4. **文件权限**
       - hooks/session-start 是否可执行
       - 不可执行 → fixable: true（自动 chmod +x）

    5. **记忆层索引完整性**
       - 检查 projects/*/memory/MEMORY.md 引用的文件是否存在
       - 发现死链 → 列出但不修复（可能有客观原因）

    6. **环境变量一致性**
       - 检查 settings.json 中的 env 与实际环境是否匹配
       - 不匹配 → 标记 warning

    7. **AgentShield 安全扫描** — 快速安全审计
       - 检查 settings.json 权限（通配符、defaultMode）
       - 检查 MCP server 安全（autoApprove、HTTP、npx -y）
       - 检查 env 字段密钥是否用 ${VAR} 引用
       - 检查 .env 文件是否有明文凭据
       - 发现安全问题 → severity 按严重程度
       - 可自动修复的标记 fixable: true

    8. **Homunculus 系统状态**
       - 检查 ~/.claude/homunculus/config.yml 是否存在
       - 统计 observations/ 文件数和行数
       - 统计 instincts/personal/ 本能文件数
       - 检查 checkpoints/last-observed 是否正常
       - 系统异常 → warning; 缺失 → error; 正常 → info

    每个 issue 包含:
    - severity: "error" | "warning" | "info"
    - category: 分类
    - message: 中文描述
    - fixable: true/false
    - auto_fixed: true（如果已经自动修复）

    自动修复只会执行安全操作（chmod、重建索引），不自动修改代码或配置内容。
  `, {
    label: '系统诊断',
    phase: '扫描',
    schema: DOCTOR_SCHEMA,
  })

  phase('输出')
  const severityEmoji = { error: '❌', warning: '⚠️', info: 'ℹ️' }
  log(`诊断完成: ${result.issues_found} 个问题`)
  log(result.summary)

  for (const issue of result.issues) {
    const emoji = severityEmoji[issue.severe] || '❓'
    const fixed = issue.auto_fixed ? ' ✅ 已自动修复' : issue.fixable ? ' 🔧 可修复' : ''
    log(`  ${emoji} [${issue.category}] ${issue.message}${fixed}`)
  }

  return { ...result, action_items: getOpsActionItems('doctor', result), state: { produced: getOpsState('doctor', result) } }
}

// ============================================================
// Action: prune — 清理过期数据
// 参数: { days?: number } — 保留最近 N 天的数据，默认 30
// ============================================================

if (action === 'prune') {
  const { days } = args
  const retainDays = days || 30
  const cutoff = new Date(Date.now() - retainDays * 86400000).toISOString().slice(0, 10)

  phase('扫描')
  log(`清理超过 ${retainDays} 天前的数据（截止 ${cutoff}）...`)

  const result = await agent(`
    清理 ${CLAUDE_DIR}/ 下的过期数据。

    清理范围:
    1. backups/ 中前缀为 .claude.json.backup. 的过期备份
       - 解析文件名中的时间戳 (Unix ms)
       - 删除超过 ${retainDays} 天的文件
       - 但始终保留最近 1 个备份

    2. proxy-startup.log
       - 如果超过 1MB 则清空

    3. ops-layer/ 中的旧分发包
       - 删除 ops-pack-*.tar.gz 中超过 ${retainDays} 天的

    4. 不清理:
       - skills/ 下任何文件
       - workflows/ 下任何文件
       - 记忆层文件
       - 配置文件

    返回: { success, freed_bytes, removed (已删除文件路径列表), error }
  `, {
    label: '清理过期数据',
    phase: '执行',
    schema: PRUNE_SCHEMA,
  })

  phase('输出')
  if (result.success) {
    const sizeMB = (result.freed_bytes / 1024 / 1024).toFixed(1)
    log(`清理完成，释放 ${sizeMB} MB`)
    if (result.removed?.length) {
      result.removed.forEach(f => log(`  已删除: ${f}`))
    } else {
      log('  无过期数据')
    }
  } else {
    log(`清理失败: ${result.error}`)
  }
  return { ...result, action_items: getOpsActionItems('prune', result), state: { produced: getOpsState('prune', result) } }
}

// ============================================================
// Action: version — 系统版本信息
// ============================================================

if (action === 'version') {
  phase('扫描')
  log('收集系统版本信息...')
  log('注: ops-layer version = 系统组件版本。tool-layer version = 技能版本。')

  const result = await agent(`
    收集 ${CLAUDE_DIR}/ 下各组件版本信息。

    检查以下组件的版本号:
    1. workflow 脚本版本 — 检查 workflows/*.js 的 meta.version 或 git 提交
    2. 技能版本 — 扫描 skills/ 下所有 SKILL.md 的 version 字段，统计数量
    3. 系统版本 — 从 ${CLAUDE_DIR}/SOUL.md 或 CLAUDE.md 提取版本信息
    4. 钩子版本 — 检查 hooks/session-start 的最后修改时间

    返回: {
      system_version: "x.y.z" 或 "unknown",
      workflows: WORKFLOW_JS文件数量,
      workflow_versions: { 每个workflow脚本名: 版本或"unknown" },
      skills: SKILL_COUNT,
      hooks_status: "present" 或 "missing",
      last_updated: "最近git提交日期" 或 "unknown"
    }
  `, {
    label: '系统版本信息',
    phase: '扫描',
  })

  phase('输出')
  const v = result || {}
  log('Chip 系统版本: ' + (v.system_version || 'unknown'))
  log('Workflow 脚本: ' + (v.workflows || 0) + ' 个')
  log('技能包: ' + (v.skills || 0) + ' 个')
  log('钩子: ' + (v.hooks_status || 'unknown'))
  log('最近更新: ' + (v.last_updated || 'unknown'))
  if (v.workflow_versions) {
    for (const [name, ver] of Object.entries(v.workflow_versions)) {
      log('  ' + name + ': ' + (ver || '?'))
    }
  }

  return { ...v, action_items: getOpsVersionItems(), state: { produced: getOpsState('version', v) } }
}

// ============================================================
// Fallback
// ============================================================

throw new Error('Unknown action: "' + action + '". Supported: health, backup, restore, package, deploy, doctor, prune, version.')
