// AgentShield 扫描器 — Claude Code 配置安全静态扫描
//
// 独立于 safety-layer 运行，聚焦于配置文件的静态安全分析。
// 遵循 Workflow 引擎规范：所有文件 I/O 通过 agent() 子代理完成。
//
// 使用方式：
//   Workflow({ scriptPath: '.claude/workflows/agentshield-scanner.js', args: { action: 'scan', scope: 'all' } })
//   Workflow({ scriptPath: '.claude/workflows/agentshield-scanner.js', args: { action: 'scan', scope: 'keys' } })
//   Workflow({ scriptPath: '.claude/workflows/agentshield-scanner.js', args: { action: 'scan', scope: 'mcp' } })
//   Workflow({ scriptPath: '.claude/workflows/agentshield-scanner.js', args: { action: 'scan', scope: 'permissions' } })

export const meta = {
  name: 'agentshield-scanner',
  description: 'AgentShield 配置安全扫描：密钥/MCP/权限/Hook/Agent 静态分析',
  phases: [
    { title: '扫描', detail: '子 agent 扫描配置文件' },
    { title: '分析', detail: '计算评分和分级' },
    { title: '输出', detail: '返回结构化扫描报告' },
  ],
}

// ============================================================
// 扫描执行
// ============================================================

const SCOPE_RULES = {
  all:    { total: 102, cats: ['keys','mcp','permissions','hooks','agents','net','data','ops'] },
  keys:   { total: 20,  cats: ['keys'] },
  mcp:    { total: 25,  cats: ['mcp'] },
  permissions: { total: 15, cats: ['permissions'] },
  hooks:  { total: 15,  cats: ['hooks'] },
  agents: { total: 12,  cats: ['agents'] },
  net:    { total: 5,   cats: ['net'] },
  data:   { total: 5,   cats: ['data'] },
  ops:    { total: 5,   cats: ['ops'] },
}

const RULE_TEXT = {
  keys: `## KEY — 密钥与凭证（20 条）\n检查所有文件：\nKEY-001[critical] Anthropic API Key: sk-ant-\nKEY-002[critical] OpenAI API Key: sk-proj-\nKEY-003[critical] AWS Access Key: AKIA\nKEY-004[high] GitHub PAT: ghp_\nKEY-005[medium] JWT token: eyJ\nKEY-006[critical] 数据库密码明文\nKEY-007[high] 引用私钥文件\nKEY-008[high] .env 含明文密钥\nKEY-009[medium] settings env 直接写 secret\nKEY-010[low] 日志含 API Key\nKEY-011[high] Slack Bot: xoxb-\nKEY-012[high] Discord token\nKEY-013[high] Azure DevOps PAT\nKEY-014[high] GitLab CI token\nKEY-015[high] Docker Hub 凭据\nKEY-016[medium] Twilio 凭据\nKEY-017[medium] SendGrid Key\nKEY-018[critical] Stripe: sk_live_\nKEY-019[high] NPM token\nKEY-020[critical] GCP 密钥`,

  mcp: `## MCP — MCP Server 配置（25 条）\n仅检查 settings.json：\nMCP-001[high] HTTP 非 HTTPS\nMCP-002[medium] npx -y 自动安装\nMCP-003[high] args 引用 .env/.pem\nMCP-004[medium] 绑定 0.0.0.0\nMCP-005[critical] 硬编码密钥\nMCP-006[low] 无 timeout\nMCP-007[medium] autoApprove\nMCP-008[high] Shell 元字符\nMCP-009[medium] 不可信来源\nMCP-010[low] >10 个 server\nMCP-011[low] 无 root 限制\nMCP-012[low] 无 description\nMCP-013[medium] 重复定义\nMCP-014[medium] 弃用 SDK\nMCP-015[high] 禁用安全检查\nMCP-016[high] 路径遍历\nMCP-017[low] 泄露系统信息\nMCP-018[medium] 文件访问过宽\nMCP-019[medium] 未验证 SSL\nMCP-020[high] socket 世界可读\nMCP-021[medium] 无认证\nMCP-022[critical] root 运行\nMCP-023[medium] 弃用传输\nMCP-024[high] command 不在 PATH\nMCP-025[high] 危险工具模式`,

  permissions: `## PERM — 权限配置（15 条）\n仅检查 settings.json：\nPERM-001[medium] allow(*) 全放开\nPERM-002[medium] Bash(*) 全放开\nPERM-003[low] Read/Write 不一致\nPERM-004[medium] defaultMode:auto\nPERM-005[low] Workflow+通配\nPERM-006[medium] Agent(*) 通配\nPERM-007[critical] disableSandbox\nPERM-008[low] 无项目级权限\nPERM-009[medium] MCP 权限过宽\nPERM-010[high] 写超出项目\nPERM-011[medium] 网络无限制\nPERM-012[high] Shell 无路径限制\nPERM-013[low] cron 无审计\nPERM-014[low] allow 重复\nPERM-015[low] 权限分布不平衡`,

  hooks: `## HOOK — Hook 脚本（15 条）\n检查 hooks/ 和 settings.json：\nHOOK-001[critical] 危险命令\nHOOK-002[medium] SessionStart 阻塞\nHOOK-003[low] timeout 超 300s\nHOOK-004[high] 脚本路径不存在\nHOOK-005[low] 禁用 hook 残留\nHOOK-006[high] 在系统目录写文件\nHOOK-007[medium] 网络访问\nHOOK-008[high] 修改关键配置\nHOOK-009[medium] 无 timeout\nHOOK-010[low] 同触发器多 hook\nHOOK-011[critical] 执行未信任脚本\nHOOK-012[medium] 泄露环境变量\nHOOK-013[low] 改变工作目录\nHOOK-014[medium] 空闲副作用\nHOOK-015[critical] 绕过权限系统`,

  agents: `## AGENT — Agent 定义（12 条）\n检查 ~/.claude/agents/：\nAGENT-001[medium] 工具>8 个\nAGENT-002[low] 模型过强\nAGENT-003[medium] 缺关键字段\nAGENT-004[low] 无作用域\nAGENT-005[medium] 重复定义\nAGENT-006[low] 无 description\nAGENT-007[medium] instructions 空\nAGENT-008[high] 循环依赖\nAGENT-009[high] 引用不存在文件\nAGENT-010[low] 名称歧义\nAGENT-011[medium] 无错误处理\nAGENT-012[low] 命名不规范`,

  net: `## NET — 网络安全（5 条）\nNET-001[medium] 未加密本地服务\nNET-002[low] API 无速率限制\nNET-003[high] Webhook 无 secret\nNET-004[medium] 暴露调试端点\nNET-005[medium] MCP localhost 无认证`,

  data: `## DATA — 数据保护（5 条）\nDATA-001[medium] Transcript 持久化\nDATA-002[low] 无保留策略\nDATA-003[high] 配置备份泄露\nDATA-004[low] 缓存含执行历史\nDATA-005[medium] 记忆含敏感信息`,

  ops: `## OPS — 运维安全（5 条）\nOPS-001[low] 无备份策略\nOPS-002[low] Workflow 过旧\nOPS-003[high] 安全配置冲突\nOPS-004[low] 无健康检查\nOPS-005[medium] 无依赖验证`,
}

async function runScan(scope) {
  const scopeInfo = SCOPE_RULES[scope] || SCOPE_RULES.all

  // 按 scope 组装规则文本
  let rulesText = ''
  for (const cat of scopeInfo.cats) {
    if (RULE_TEXT[cat]) rulesText += RULE_TEXT[cat] + '\n\n'
  }

  if (!rulesText) {
    return { summary: '未找到匹配规则', score: 100, grade: 'A', findings: [], categories: [] }
  }

  // 子 agent 读取并扫描配置文件
  const scanText = await agent({
    prompt: `你是 AgentShield 安全扫描器。请用 Bash 读取 ~/.claude/ 下配置文件，然后逐条应用以下 ${scopeInfo.total} 条扫描规则。

需要读取的文件（按存在性读取）：
1. ~/.claude/settings.json
2. ~/.claude/CLAUDE.md
3. ~/.claude/AGENTS.md
4. ~/.claude/.env（如存在）
5. ~/.claude/workflows/*.js
6. ~/.claude/hooks/*.js（如存在）
7. ~/.claude/agents/*.md（如存在）

### 扫描规则（${scopeInfo.total} 条）

${rulesText}
### 输出要求

读取文件后逐条应用规则。最后输出 JSON（不要 markdown 包裹）：
{"files_scanned":["settings.json","..."], "findings":[{"rule_id":"KEY-001","severity":"critical","category":"keys","title":"API Key 硬编码","evidence":"...","file":"...","recommendation":"..."}]}

只输出发现问题才加 findings。`,
    label: 'agentshield-scanner',
  })

  // 解析扫描结果
  let scanData = { files_scanned: [], findings: [] }
  if (scanText) {
    // 匹配 {"files_scanned":...} JSON 结构
    const m = scanText.match(/\{"files_scanned":[\s\S]*?"findings":\[[\s\S]*?\]\}/)
    if (m) {
      try { scanData = JSON.parse(m[0]) } catch {}
    }
  }

  const findings = (scanData.findings || []).map(f => ({
    rule_id: f.rule_id || '',
    severity: f.severity || 'low',
    category: f.category || 'keys',
    title: f.title || '',
    message: f.evidence || '',
    file: f.file || 'unknown',
    line: 0,
    recommendation: f.recommendation || '',
  }))

  // 评分
  const sv = { critical: 25, high: 15, medium: 10, low: 5 }
  let score = 100
  for (const f of findings) score -= sv[f.severity] || 10
  score = Math.max(0, score)
  const grade = score >= 90 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : score >= 30 ? 'D' : 'F'

  // 按类别分组
  const cats = {}
  for (const f of findings) {
    if (!cats[f.category]) cats[f.category] = { name: f.category, findings: [], score: 100, passed: 0, total: 0 }
    cats[f.category].findings.push(f)
    cats[f.category].score = Math.max(0, (cats[f.category].score || 100) - (sv[f.severity] || 10))
  }

  return {
    summary: `发现 ${findings.length} 个问题` +
      `（${findings.filter(f => f.severity === 'critical').length} 严重` +
      `, ${findings.filter(f => f.severity === 'high').length} 高），评分 ${score} 分，等级 ${grade}`,
    grade, score, findings,
    categories: Object.values(cats),
    rules_loaded: scopeInfo.total,
    files_scanned: (scanData.files_scanned || []).length,
    scanned_files: scanData.files_scanned || [],
  }
}

// ============================================================
// 执行
// ============================================================

phase('扫描：加载规则并扫描配置')

const action = args.action || 'scan'
const scope = args.scope || 'all'

if (action !== 'scan') {
  throw new Error(`未知 action: "${action}"。可用: scan`)
}

const validScopes = ['all', 'keys', 'mcp', 'permissions', 'hooks', 'agents', 'net', 'data', 'ops']
if (!validScopes.includes(scope)) {
  throw new Error(`未知 scope: "${scope}"。可用: ${validScopes.join(', ')}`)
}

log(`AgentShield 扫描: scope=${scope}`)

phase('分析：计算评分')

const result = await runScan(scope)

phase('输出：扫描报告')

const output = {
  action,
  status: 'ok',
  timestamp: '__timestamp__',
  result,
  meta: {
    version: '1.0.0',
    source: 'AgentShield 配置安全扫描（独立模式）',
    note: '只读扫描，不修改文件。所有文件 I/O 委托子 agent。',
  },
  action_items: [
    {
      step: 1, action: 'review',
      title: '审查扫描结果',
      detail: result.grade === 'A' || result.grade === 'B'
        ? `扫描完成：等级 ${result.grade}（${result.score} 分），${result.findings.length} 个问题。`
        : `扫描完成：等级 ${result.grade}（${result.score} 分），${result.findings.length} 个问题，需关注。\n` +
          result.findings.map(f => `  [${f.severity}] ${f.title}: ${f.message} — ${f.recommendation}`).join('\n'),
      depends_on: [],
    },
  ],
  state: {
    produced: {
      action: 'scan',
      scope,
      grade: result.grade,
      score: result.score,
      findings_count: result.findings.length,
      critical_count: result.findings.filter(f => f.severity === 'critical').length,
      high_count: result.findings.filter(f => f.severity === 'high').length,
    },
    consumed_by: {
      'ops-layer': { action: 'doctor', scan_result: 'from grade' },
    },
  },
}

log(`[AgentShield] [${scope}] ${result.summary}`)

return output
