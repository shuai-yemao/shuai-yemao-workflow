// Homunculus 持续学习系统 — 从会话历史中自动学习编码模式
//
// 设计原则：
// 1. 轻量观察：子 agent 通过工具读取 history.jsonl → 分析模式
// 2. 按需分析：analyze action 调用子 agent 提取本能（instincts）
// 3. 置信度演进：重复出现的模式置信度逐渐增加
// 4. 桥接记忆层：confidence >= 0.7 时使用 memory-layer 写入
//
// 使用方式：
//   Workflow({ scriptPath: '.claude/workflows/homunculus-observer.js', args: { action: 'status' } })
//   Workflow({ scriptPath: '.claude/workflows/homunculus-observer.js', args: { action: 'analyze' } })
//   Workflow({ scriptPath: '.claude/workflows/homunculus-observer.js', args: { action: 'capture' } })
//
// 注意：所有文件访问通过 agent() 子代理完成，不直接使用 fs/process/import。
// ⚠️ 子 agent 的 Glob/Read 工具作用域限制在项目目录，无法访问 ~/.claude/。
//    对 ~/.claude/ 下文件必须使用 Bash 命令（cat/ls/stat/wc -l/head/tail 等）。

export const meta = {
  name: 'homunculus-observer',
  description: 'Homunculus 持续学习系统：分析会话历史提取编码模式',
  phases: [
    { title: '路由', detail: '按 action 路由' },
    { title: '执行', detail: '子 agent 收集/分析' },
    { title: '输出', detail: '本能写入和系统状态' },
  ],
}

// JSON Schema for agent() structured output
const INSTINCT_SCHEMA = {
  type: 'object',
  properties: {
    instincts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          slug: { type: 'string', pattern: '^[a-z0-9-]+$' },
          trigger: { type: 'string' },
          summary: { type: 'string', maxLength: 200 },
          domain: { type: 'string', enum: ['embedded', 'code-style', 'workflow', 'tooling', 'general'] },
          confidence: { type: 'number', minimum: 0.1, maximum: 0.95 },
          tags: { type: 'array', items: { type: 'string' } },
        },
        required: ['slug', 'trigger', 'summary', 'domain', 'confidence'],
      },
    },
  },
  required: ['instincts'],
}

// 项目级作用域默认值（在路由阶段由 git 检测覆盖）
let projectContext = { slug: null, remote: null, isRepo: false }

// ============================================================
// Action Handlers
// ============================================================

async function handleStatus() {
  log('正在收集 Homunculus 系统状态...')

  const proj = projectContext?.isRepo ? projectContext.slug : null
  const projPrefix = proj ? `【项目: ${proj}】` : ''

  const result = await agent({
    prompt: `你是 Homunculus 持续学习系统的状态报告 agent。${projPrefix}

请执行以下操作：
1. 用 Bash "ls -la C:/Users/zhang/.claude/homunculus/observations/" 查找观察文件，再对每个文件用 Bash "wc -l" 统计行数
2. 用 Bash "cat C:/Users/zhang/.claude/homunculus/instincts/INDEX.md 2>&1 || echo NOT_FOUND" 统计本能总数（按 domain 分组统计行数）
3. 用 Bash "cat C:/Users/zhang/.claude/homunculus/checkpoints/last-analysis-timestamp 2>&1 || echo NOT_FOUND" 获取最后分析时间
4. 用 Bash "test -f C:/Users/zhang/.claude/homunculus/checkpoints/.analysis-lock && echo EXISTS || echo NOT_FOUND" 检查锁文件
${proj ? `5. 用 Bash "ls -la C:/Users/zhang/.claude/homunculus/instincts/project/${proj}/ 2>&1 || echo NO_PROJECT_DIR" 检查项目级本能目录
6. 用 Bash "cat C:/Users/zhang/.claude/homunculus/instincts/project/${proj}/INDEX.md 2>&1 || echo NOT_FOUND" 读取项目本能索引` : ''}

返回如下 JSON（不要 markdown 包裹）：
{ "observation_count": 100, "observation_files": 3, "instincts_total": 5, "instincts_by_domain": {"embedded": 3, "code-style": 2}, "last_analysis": "2026-06-12T...", "lock_active": false${proj ? ', "project_instincts": 2, "project_slug": "' + proj + '"' : ', "project_instincts": 0, "project_slug": null'} }`,
    schema: {
      type: 'object',
      properties: {
        observation_count: { type: 'number' },
        observation_files: { type: 'number' },
        instincts_total: { type: 'number' },
        instincts_by_domain: { type: 'object' },
        last_analysis: { type: 'string' },
        lock_active: { type: 'boolean' },
      },
      required: ['observation_count', 'observation_files', 'instincts_total', 'instincts_by_domain', 'last_analysis', 'lock_active'],
    },
    label: 'homunculus-status',
  })

  return {
    enabled: true,
    observation_count: result?.observation_count || 0,
    observation_files: result?.observation_files || 0,
    instincts_total: result?.instincts_total || 0,
    instincts_by_domain: result?.instincts_by_domain || {},
    last_analysis: result?.last_analysis || null,
    lock_active: result?.lock_active || false,
  }
}

async function handleCapture() {
  log('正在捕获历史记录...')

  const proj = projectContext?.isRepo ? projectContext.slug : null

  const result = await agent({
    prompt: `你是 Homunculus 系统的观察捕获 agent。
${proj ? `上下文项目: ${proj}` : ''}
注意：history.jsonl 存储的是用户输入消息（字段：display, pastedContents, timestamp, project, sessionId），不是工具调用日志。你需要从用户消息中推断行为模式。

请执行：
1. 检查 C:/Users/zhang/.claude/history.jsonl 是否存在，获取文件大小
2. 读取 C:/Users/zhang/.claude/homunculus/checkpoints/last-observed 获取上次读取位置（JSON: {"file_size": 0}）。如果文件不存在，默认从 0 开始。
3. 如果 history.jsonl 比上次读取位置大，用 Bash "tail -n +$((SKIP+1))"读取增量内容（Bash 不受路径限制）（新增行）
4. 解析新增的 JSON 行，按 sessionId 分组。对每组：
   a. 统计消息数
   b. 提取项目路径
   c. 分析用户消息中蕴含的工具意图（关键词匹配）
   d. 归类为：install, build, flash, debug-fix, test, workflow-skill, embedded-dev, safety-review, mcp-plugin, hud-theme, requirements, general
5. 每条会话生成一条观察记录，格式：
   {"type": "session", "session_id": "xxx", "project": "xxx", "message_count": N, "tools_inferred": ["tag1", "tag2"], "timestamp": unixts${proj ? ', "project_slug": "' + proj + '"' : ''}}
6. 将提取的观察追加写入 C:/Users/zhang/.claude/homunculus/observations/capture-{timestamp}.jsonl（每行一条 JSON）
7. 更新 C:/Users/zhang/.claude/homunculus/checkpoints/last-observed（格式: JSON {"file_size": 文件字节数, "timestamp": "ISO"}）

如果 history.jsonl 不存在或上次读取后无新内容，返回 { "status": "skipped", "new_observations": 0 }。

返回 JSON:
{ "status": "ok", "new_observations": 5, "reason": "可选说明" }`,
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['ok', 'skipped', 'no_new_data'] },
        new_observations: { type: 'number' },
        reason: { type: 'string' },
      },
      required: ['status', 'new_observations'],
    },
    label: 'homunculus-capture',
  })

  return {
    status: result?.status || 'skipped',
    new_observations: result?.new_observations || 0,
    reason: result?.reason || null,
  }
}

async function handleAnalyze() {
  log('正在分析观察数据，提取编码模式...')

  const proj = projectContext?.isRepo ? projectContext.slug : null
  const projPrefix = proj ? `（项目作用域: ${proj}）` : ''

  // Phase 1+2: 数据收集和模式分析
  const analysis = await agent({
    prompt: `你是 Homunculus 持续学习系统的模式分析 agent。${projPrefix}

## 步骤 1: 收集观察数据
1. 用 Bash "ls -la C:/Users/zhang/.claude/homunculus/observations/" 列出观察文件。然后用 Bash "cat C:/Users/zhang/.claude/homunculus/observations/*.jsonl" 读取全部内容
2. 从 cat 输出中解析 JSON 行。如果有 project_slug 字段，按项目分组统计
3. 取最新的 200 条记录作为样本
${proj ? `4. 筛选属于当前项目 "${proj}" 的观察记录（project_slug 匹配），单独分析` : ''}

## 步骤 2: 分析编码模式
分析工具调用序列，识别以下类型的模式：
- 用户修正：用户说"不，用 X 而不是 Y"
- 重复工作流：相同的工具序列反复出现
- 工具偏好：用户始终偏好某些工具或参数
- 编码风格：特定的代码组织或实现方式

要求：
- 只提取出现至少 2 次的模式
- 模式描述要具体（如"用户偏向使用 HAL 库而非寄存器操作"）
- 置信度评估：0.3=1-2次, 0.5=3-5次, 0.7=6-10次, 0.85=11+次
- domain: embedded | code-style | workflow | tooling | general
- tags：相关标签数组

## 步骤 3: 写入本能文件
对每个提取的模式（最多 5 个）：
1. 读取 C:/Users/zhang/.claude/homunculus/instincts/INDEX.md 检查 slug 是否已存在
2. 如果不存在：
${proj ? `   a. 创建项目级本能到 C:/Users/zhang/.claude/homunculus/instincts/project/${proj}/personal/{slug}.md
      scope: project/${proj}
   b. 确保项目级 INDEX.md 存在并追加索引行` : `   创建 C:/Users/zhang/.claude/homunculus/instincts/personal/{slug}.md`}
   格式：
   ---
   slug: xxx
   trigger: "当...时"
   summary: "模式描述"
   domain: embedded
   scope: ${proj ? 'project/' + proj : 'personal'}
   confidence: 0.45
   tags: [tag1, tag2]
   ---
3. ${proj ? '在项目级 INDEX.md' : '在全局 INDEX.md'} 末尾追加索引行
4. 如果已存在：跳过（本次不处理更新）

返回 JSON:
{
  "new_instincts": 3,
  "updated_instincts": 0,
  "total_instincts": 5,
  "observation_count": 150,
  "bridge_candidates": [{"slug": "xxx", "confidence": 0.75}],
  "project_scope": "${proj || 'global'}"
}`,
    schema: {
      type: 'object',
      properties: {
        new_instincts: { type: 'number' },
        updated_instincts: { type: 'number' },
        total_instincts: { type: 'number' },
        observation_count: { type: 'number' },
        bridge_candidates: {
          type: 'array',
          items: {
            type: 'object',
            properties: { slug: { type: 'string' }, confidence: { type: 'number' } },
            required: ['slug', 'confidence'],
          },
        },
      },
      required: ['new_instincts', 'updated_instincts', 'total_instincts', 'observation_count', 'bridge_candidates'],
    },
    label: 'homunculus-analyze',
  })

  // 分析成功后清理触发标记
  try {
    await agent({
      prompt: '用 Bash "rm -f C:/Users/zhang/.claude/homunculus/checkpoints/.trigger-analyze" 删除触发标记文件',
      label: "cleanup-trigger",
    })
    log("已清理 analyze 触发标记")
  } catch {}

  return {

    status: 'completed',
    new_instincts: analysis?.new_instincts || 0,
    updated_instincts: analysis?.updated_instincts || 0,
    total_instincts: analysis?.total_instincts || 0,
    observation_count: analysis?.observation_count || 0,
    bridge_candidates: analysis?.bridge_candidates || [],
    analysis_timestamp: '__timestamp__',
  }
}

// ============================================================
// Action: evolve — 本能→进化技能管道
// ============================================================

async function handleEvolve() {
  log('正在进化高置信度本能为技能...')

  const proj = projectContext?.isRepo ? projectContext.slug : null

  const result = await agent({
    prompt: `你是 Homunculus 进化引擎。你将高置信度本能（confidence >= 0.7）进化为可复用技能。
${proj ? `当前项目: ${proj}（同时检查全局和项目级本能）` : ''}

## 步骤 1: 读取本能
1. 用 Bash "ls -la C:/Users/zhang/.claude/homunculus/instincts/personal/" 列出本能文件。然后用 Bash "cat" 读取每个本能文件的内容
2. 从 cat 输出中解析 frontmatter（--- 之间的 YAML）
3. 筛选出 confidence >= 0.7 的本能
${proj ? `4. 用 Bash "ls -la C:/Users/zhang/.claude/homunculus/instincts/project/${proj}/personal/ 2>&1 || echo NO_PROJECT_INSTINCTS" 列出项目级本能文件
5. 如果存在，同样读取并筛选` : ''}

## 步骤 2: 生成进化技能
对每个高置信度本能：

1. 读取本能内容
2. 创建一个进化技能文件到 C:/Users/zhang/.claude/homunculus/evolved/
   文件名: evolved-{slug}.md${proj ? `\n   如果本能 scope 为 project/${proj}，注明项目来源` : ''}
   内容格式:
   ---
   slug: evolved-{slug}
   source_instinct: {slug}
   confidence: {原置信度}
   evolved_at: {当前时间}
   ---
   # {本能标题}（进化技能）

   ## 触发条件
   {本能.trigger}

   ## 能力摘要
   {本能.summary}

   ## 应用规则
   {本能中 "How to apply" 的内容}

   ## 进化历史
   - 源本能: {slug} (confidence: {原置信度})
   - 进化时间: {当前时间}

3. 更新 INDEX.md（追加索引行）

## 步骤 3: 记录进化
返回 JSON:
{
  "evolved": 3,
  "skipped": 2,
  "total_candidates": 5,
  "evolved_list": ["evolved-install-configure", "evolved-workflow-skill"],
  "skipped_reasons": {"slug": "原因"}
}`,
    schema: {
      type: 'object',
      properties: {
        evolved: { type: 'number' },
        skipped: { type: 'number' },
        total_candidates: { type: 'number' },
        evolved_list: { type: 'array', items: { type: 'string' } },
        skipped_reasons: { type: 'object' },
      },
      required: ['evolved', 'skipped', 'total_candidates', 'evolved_list'],
    },
    label: 'homunculus-evolve',
  })

  return {
    status: 'completed',
    evolved: result?.evolved || 0,
    skipped: result?.skipped || 0,
    total_candidates: result?.total_candidates || 0,
    evolved_list: result?.evolved_list || [],
    skipped_reasons: result?.skipped_reasons || {},
    evolve_timestamp: '__timestamp__',
  }
}

// ============================================================
// 执行
// ============================================================

phase('路由')

const action = (typeof args === 'string' ? args : args?.action) || 'status'

// 自动检查 analyze 触发标记（PostCompact hook 写入）
const triggerFlagFile = 'C:/Users/zhang/.claude/homunculus/checkpoints/.trigger-analyze'
let triggerInfo = null
try {
  const exists = await agent({
    prompt: `检查文件是否存在: ${triggerFlagFile}。存在用 Bash "cat" 读取内容后返回 JSON，不存在返回 {"exists": false}`,
    schema: { type: 'object', properties: { exists: { type: 'boolean' }, triggered: { type: 'number' }, observations_total: { type: 'number' }, timestamp: { type: 'string' } }, required: ['exists'] },
    label: 'check-analyze-trigger',
  })
  if (exists?.exists) {
    triggerInfo = exists
    log(`⚠️ 检测到 analyze 触发标记: ${exists.observations_total || '?'} 条观察待分析`)
    log('运行 Workflow({ scriptPath: ".claude/workflows/homunculus-observer.js", args: { action: "analyze" } }) 消耗触发')
  }
} catch {}

log(`Homunculus action: ${action}`)

// 项目级作用域检测 — 基于 git remote 识别当前项目
projectContext = { slug: null, remote: null, isRepo: false }
try {
  const projInfo = await agent({
    prompt: `检测当前 git 项目信息。执行 Bash 命令:
1. git rev-parse --is-inside-work-tree 2>/dev/null || echo "false"
2. 如果是 git 仓库，执行: git remote get-url origin 2>/dev/null || echo "no_remote"
3. 如果是 git 仓库，执行: basename "$(git rev-parse --show-toplevel)" 2>/dev/null || echo "unknown"

返回 JSON:
{"isRepo": true, "remote": "https://github.com/user/repo.git", "slug": "repo-name"}`,
    schema: { type: 'object', properties: { isRepo: { type: 'boolean' }, remote: { type: 'string' }, slug: { type: 'string' } }, required: ['isRepo'] },
    label: 'detect-project',
  })
  if (projInfo?.isRepo) {
    projectContext = {
      slug: projInfo.slug || 'unknown',
      remote: projInfo.remote || 'no_remote',
      isRepo: true,
    }
    log(`[项目作用域] ${projectContext.slug}`)
  }
} catch {}

phase('执行')

let result
switch (action) {
  case 'status':
    result = await handleStatus()
    break
  case 'capture':
    result = await handleCapture()
    break
  case 'analyze':
    result = await handleAnalyze()
    break
  case 'evolve':
    result = await handleEvolve()
    break
  default:
    throw new Error(`未知 action: "${action}"。可用: status, capture, analyze, evolve`)
}

phase('输出')

// action_items
let actionItems = []
if (action === 'analyze') {
  actionItems = [{
    step: 1, action: 'review',
    title: '审查新本能',
    detail: `分析完成: ${result.new_instincts} 新本能, ${result.updated_instincts} 更新\n` +
      `本能总数: ${result.total_instincts}\n观察记录数: ${result.observation_count}` +
      (result.bridge_candidates?.length > 0
        ? `\n高置信度本能（可桥接记忆层）: ${result.bridge_candidates.map(c => `${c.slug}(${c.confidence})`).join(', ')}`
        : ''),
    depends_on: [],
  }]
  if (result.bridge_candidates?.length > 0) {
    actionItems.push({
      step: 2, action: 'skill', title: '桥接到记忆层',
      skill: 'memory-layer',
      detail: '执行 memory-layer write 将高置信度本能写入记忆层',
      depends_on: ['step_1'],
    })
  }
} else if (action === 'capture') {
  actionItems = [{
    step: 1, action: 'manual',
    title: '捕获观察数据',
    detail: `新增 ${result.new_observations} 条观察记录` +
      (result.status === 'skipped' ? ` (${result.reason || '跳过'})` : ''),
    depends_on: [],
  }]
} else if (action === 'evolve') {
  actionItems = [{
    step: 1, action: 'review',
    title: '审查进化结果',
    detail: `进化: ${result.evolved} 个技能 | 跳过: ${result.skipped} 个 | 候选: ${result.total_candidates} 个\n` +
      (result.evolved_list?.length > 0
        ? `进化技能: ${result.evolved_list.join(', ')}`
        : '无高置信度本能可进化'),
    depends_on: [],
  }]
  if (result.evolved > 0) {
    actionItems.push({
      step: 2, action: 'skill', title: '注册进化技能',
      skill: 'tool-layer',
      detail: '执行 tool-layer adopt 注册新进化技能',
      depends_on: ['step_1'],
    })
  }
} else {
  actionItems = [{
    step: 1, action: 'manual',
    title: '查看 Homunculus 状态',
    detail: `观察: ${result.observation_count} 条 | 本能: ${result.instincts_total} 个 | 最后分析: ${result.last_analysis || '从未'}`,
    depends_on: [],
  }]
}

const output = {
  action,
  status: 'ok',
  timestamp: '__timestamp__',
  result,
  meta: {
    version: '1.0.0',
    source: 'Homunculus 持续学习系统',
    note: '所有文件 I/O 委托给子 agent 完成',
  },
  action_items: actionItems,
  state: {
    produced: {
      homunculus_status: result.enabled !== false ? 'active' : 'idle',
      instincts_count: result.total_instincts || result.instincts_total || result.evolved || 0,
      last_analysis: result.analysis_timestamp || result.evolve_timestamp || result.last_analysis || null,
      observation_count: result.observation_count || 0,
      evolved_count: result.evolved || 0,
    },
  },
}

log(`[Homunculus] ${action}: ok` +
  (result.new_instincts ? ` | 新本能: ${result.new_instincts}` : '') +
  (result.updated_instincts ? ` | 更新: ${result.updated_instincts}` : ''))

return output
