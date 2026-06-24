// 需求对齐层 Workflow — 快速预处理器（异步运行）
// 输入：模糊需求（自然语言）
// 输出：领域预判 + 关键词 + 模糊点 + 追问建议 + 空清单模板
//
// 设计原则：
// 1. 本 workflow 快速完成（<30s），后台异步运行
// 2. 主 Agent 不等待本 workflow，立即开始交互式对话
// 3. Workflow 完成后，结果注入对话作为参考
//
// 使用方式：
//   // 主 Agent 立即开始对话，不等 workflow
//   Workflow({ name: 'requirements-alignment', args: { requirement: '...' } })  // 后台
//   // 同时主 Agent 调用 brainstorming 技能开始第一轮提问
//
// 执行流程：
//   1. 主 Agent 发起需求 → 立即调 brainstorming 开始对话
//   2. 本 Workflow 后台运行，快速完成预处理
//   3. Workflow 完成 → 自动注入记忆层经验到对话
//   4. 主 Agent 可参考领域分析结果调整提问方向

export const meta = {
  name: 'requirements-alignment',
  description: '需求对齐层（快速预处理）：领域预判 + 关键词 + 模糊点 + 空清单模板。异步运行，主 Agent 不等待。',
  phases: [
    { title: '语境检索', detail: '从记忆层获取相关历史经验' },
    { title: '领域预判', detail: '快速分析需求 → 领域/关键词/模糊点/追问建议' },
    { title: '模板生成', detail: '生成 4 张空清单模板' },
    { title: 'PRD 生成', detail: '对话完成后生成产品需求文档' },
    { title: 'Issue 拆解', detail: '将 PRD 拆解为可执行的垂直切片' },
  ],
}

// ============================================================
// Schema 定义
// ============================================================

const INITIAL_ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    detected_domain: { type: 'string', description: '检测到的技术领域' },
    keywords: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          term: { type: 'string' },
          category: { type: 'string', description: '技术/硬件/软件/协议/工具等分类' },
        },
        required: ['term', 'category'],
      },
    },
    possible_ambiguities: {
      type: 'array',
      items: { type: 'string' },
      description: '需求中潜在的模糊点，需要在 grill-me 中澄清',
    },
    grill_me_questions: {
      type: 'array',
      items: { type: 'string' },
      description: '建议主 agent 在对话中追问用户的问题清单',
    },
    suggested_perspectives: {
      type: 'array',
      items: { type: 'string' },
      description: '建议的多源审查视角（如 architecture, timing, debug 等）',
    },
    default_constraints: {
      type: 'array',
      items: { type: 'string' },
      description: '基于领域识别的默认技术约束，供对话中确认',
    },
    suggested_skills: {
      type: 'array',
      items: { type: 'string' },
      description: '建议在审查阶段调用的 domain skill 列表',
    },
  },
  required: ['detected_domain', 'keywords', 'possible_ambiguities', 'grill_me_questions'],
}

// ============================================================
// 实施
// ============================================================

if (!args.requirement) throw new Error('缺少 requirement 参数')

const requirement = args.requirement

log('╔══════════════════════════════════════════════════════╗')
log('║     需求对齐层 — 快速预处理器（异步）               ║')
log('╚══════════════════════════════════════════════════════╝')
log('')
log('收到需求: ' + requirement)
log('')
log('【执行模式】后台异步运行，主 Agent 不等待')
log('')

// ----------------------------------------------------------
// Phase 1: 语境检索 — 从记忆层获取相关历史经验
// ----------------------------------------------------------

phase('语境检索 — 从记忆层获取相关经验')

log('从记忆层检索与需求相关的历史经验: "' + requirement.substring(0, 80) + '..."')

const memoryCtx = await workflow('memory-layer', {
  action: 'context',
  for: requirement,
})

const hasMemoryContext = memoryCtx?.source_count > 0 && memoryCtx?.context?.length > 0

if (hasMemoryContext) {
  log('✅ 从记忆层找到 ' + memoryCtx.source_count + ' 条相关记忆')
} else {
  log('ℹ️ 记忆层未找到与需求直接相关的历史条目')
}

log('')

// ----------------------------------------------------------
// Phase 2: 领域预判（快速分析）
// ----------------------------------------------------------

phase('领域预判 — 快速分析需求')

const memoryInjection = hasMemoryContext
  ? '\n\n=== 相关历史经验（从长期记忆中检索）===\n' + memoryCtx.context + '\n'
  : ''

const analysis = await agent(
  '快速分析下面的模糊需求，输出结构化预判结果。\n\n' +
  '用户需求: "' + requirement + '"\n\n' +
  '任务（快速完成）：\n' +
  '1. 检测技术领域（嵌入式/Web/后端/工具/库/其他）\n' +
  '2. 提取 5-10 个关键词\n' +
  '3. 识别 3-5 个模糊点\n' +
  '4. 建议 3-5 个追问问题（供主 Agent 在对话中使用）\n' +
  '5. 建议 3-5 个审查视角\n' +
  '6. 列出 3-5 个默认技术约束' +
  memoryInjection,
  { schema: INITIAL_ANALYSIS_SCHEMA }
)

if (!analysis) {
  throw new Error('初始分析失败，请重试')
}

const domain = analysis.detected_domain || '通用'
const keywords = analysis.keywords || []
const ambiguities = analysis.possible_ambiguities || []
const grillQuestions = analysis.grill_me_questions || []
const perspectives = analysis.suggested_perspectives || ['architecture', 'implementation', 'debug', 'quality']
const defaultConstraints = analysis.default_constraints || []
const suggestedSkills = analysis.suggested_skills || []

log('检测领域: ' + domain)
log('')
log('关键词 (' + keywords.length + ' 个):')
for (const kw of keywords) log('  ' + kw.term + ' (' + kw.category + ')')
log('')
log('模糊点 (' + ambiguities.length + ' 个):')
for (const amb of ambiguities) log('  ⚠️ ' + amb)
log('')
log('建议追问问题 (' + grillQuestions.length + ' 个):')
for (const q of grillQuestions) log('  ❓ ' + q)
log('')
log('建议审查视角: ' + perspectives.join(', '))
log('建议 domain skill: ' + suggestedSkills.join(', '))
log('')

// ----------------------------------------------------------
// Phase 3: 模板生成（快速生成）
// ----------------------------------------------------------

phase('模板生成 — 快速生成清单模板')

const templates = {
  status: [
    { dimension: '项目目标', question: '要解决什么问题？', status: '待确认' },
    { dimension: '已有资产', question: '有哪些现有代码/文档/配置？', status: '待确认' },
    { dimension: '依赖关系', question: '依赖其他模块/系统/外部资源？', status: '待确认' },
    { dimension: '风险点', question: '哪些地方可能出问题？', status: '待确认' },
  ],
  constraints: defaultConstraints.length
    ? defaultConstraints.map(c => ({ category: '默认', description: c, confirm_with: '用户' }))
    : [{ category: '待补充', description: '约束需在对话中确认', confirm_with: '用户' }],
  files: [{ path: '待确认', operation: '新增', current: '待确认', target: '待确认' }],
  acceptance: [{ item: '功能正确性', method: '测试/用户验证', pass_criteria: '待确认', judge: '用户判决' }],
}

log('✅ 4 张清单模板已生成（全部待确认）')

// ============================================================
// 交付 — 快速输出
// ============================================================

phase('输出 — 预处理完成')

log('✅ 快速预处理完成（后台异步）')
log('')
log('领域: ' + domain)
log('关键词: ' + keywords.length + ' 个')
log('模糊点: ' + ambiguities.length + ' 个')
log('追问建议: ' + grillQuestions.length + ' 条')
if (hasMemoryContext) {
  log('记忆层: ' + memoryCtx.source_count + ' 条相关经验已检索')
}
log('')

const output = {
  mode: 'preprocess_only',
  status: 'ready',
  requirement,

  // 初始分析
  domain,
  keywords,
  ambiguities,
  grill_questions: grillQuestions,
  suggested_perspectives: perspectives,
  default_constraints: defaultConstraints,
  suggested_skills: suggestedSkills,

  // 4 张空清单模板
  checklist_templates: templates,

  // 记忆层检索结果（六源审查的 KB 来源）
  kb_context: hasMemoryContext
    ? {
        source: 'memory-layer',
        count: memoryCtx.source_count,
        context: memoryCtx.context,
      }
    : { source: 'memory-layer', count: 0, context: '' },

  // 验收清单（独立引用）
  acceptance: templates.acceptance.map(a => ({
    item: a.item,
    method: a.method,
    pass_criteria: a.pass_criteria,
    judge: a.judge,
    verdict: 'pending',
  })),

  // ============================================================
  // 链式触发元数据 — 引导主 Agent 完成后续步骤
  // ============================================================
  chain: {
    status: 'preprocess_complete',   // 当前链路阶段
    mode: 'async_reference',         // 异步参考模式：主 Agent 不等待
    total_steps: 5,                  // 总共 5 步对话 + 1 步编排
    flow: {
      // 对话流程指引（由主 Agent 在对话中执行，使用 grill-me 技能）
      next_conversations: [
        {
          id: 'grill_me',
          step: 1,
          title: '锚定方向',
          description: '使用 grill-me 技能无情追问',
          action: 'grill-me',
          note: '【立即执行，不等待本 Workflow】',
          data_scope: {
            inputs: ['grill_questions', 'ambiguities'],
            input_keys: {
              grill_questions: 'grill_questions',
              ambiguities: 'possible_ambiguities',
            },
            output_key: 'clarity_state',
          },
        },
        {
          id: 'constraint_review',
          step: 2,
          title: '约束梳理',
          description: '在对话中确认技术约束清单',
          action: 'conversation',
          data_scope: {
            inputs: ['constraints_templates'],
            output_key: 'confirmed_constraints',
          },
        },
        {
          id: 'six_source_review',
          step: 3,
          title: '六源对齐审查',
          description: '多源交叉验证（Skills/Web/GitHub/KB/真伪）',
          action: 'multi-source-review',
          data_scope: {
            inputs: ['suggested_perspectives', 'suggested_skills', 'kb_context'],
            output_key: 'verified_approaches',
          },
        },
        {
          id: 'checklist_confirm',
          step: 4,
          title: '清单确认',
          description: '逐条确认 4 张施工清单（现状/约束/文件/验收）',
          action: 'checklist-confirm',
          data_scope: {
            inputs: [
              'checklist_templates.status',
              'checklist_templates.constraints',
              'checklist_templates.files',
              'checklist_templates.acceptance',
            ],
            output_key: 'confirmed_checklists',
          },
        },
        {
          id: 'to_prd',
          step: 5,
          title: '生成 PRD',
          description: '将确认的需求转化为产品需求文档',
          action: 'skill',
          skill: 'to-prd',
          data_scope: {
            inputs: ['confirmed_checklists', 'domain', 'keywords'],
            output_key: 'prd_output',
          },
        },
        {
          id: 'to_issues',
          step: 6,
          title: '拆解执行',
          description: '将 PRD 拆解为可执行的垂直切片 issue',
          action: 'skill',
          skill: 'to-issues',
          data_scope: {
            inputs: ['prd_output', 'confirmed_checklists.acceptance'],
            output_key: 'issues_list',
          },
        },
      ],

      // 所有会话完成后 → 自动生成 PRD → 拆解 issues → 编排层
      next_workflow: {
        name: 'agent-orchestration',
        when: 'after_issues_created',
        description: '需求对齐完成 → 生成 PRD → 拆解 issues → 进入编排层执行',
        args_forwarding: {
          tasks: 'from to-issues output',
          acceptance: 'from confirmed_checklists.acceptance',
          domain: 'domain',
        },
      },

      // 异常链路
      on_error: {
        name: 'safety-layer',
        description: '错误审计',
        args: { action: 'audit', entry: { type: 'alignment_error' } },
      },
    },
  },

  // ============================================================
  // AI 推理步骤清单 — 主 Agent 在对话中执行（不等待本 Workflow）
  // ============================================================
  action_items: [
    {
      step: 1,
      action: 'skill',
      title: '锚定方向 — grill-me 追问澄清需求',
      skill: 'grill-me',
      detail: '【立即执行，不等待本 Workflow】调用 grill-me 技能，无情地追问用户，逐条澄清模糊点。每个问题提供推荐答案，一次问一个。',
      reason: '模糊需求直接执行会导致方向错误，需先对齐理解',
      expects: '确认后的需求边界、硬件上下文、功能范围',
      output_key: 'clarity_state',
      depends_on: [],
      note: '本 Workflow 的分析结果可作为参考，但主 Agent 不应等待',
    },
    {
      step: 2,
      action: 'conversation',
      title: '约束梳理 — 确认技术约束',
      skill: null,
      detail: '在对话中确认约束清单中的每一项（语言/工具链/性能/兼容性/安全/内存等）。逐条获取用户确认。',
      reason: '技术约束在开发阶段更改成本高，需尽早确认',
      expects: '确定的约束清单，排除不适用条目',
      output_key: 'confirmed_constraints',
      depends_on: ['step_1'],
    },
    {
      step: 3,
      action: 'multi',
      title: '六源对齐审查 — 多源交叉验证',
      skill: null,
      detail: '按 suggested_perspectives 逐源审查：\n' +
        '  1. Skills: 调相关 skill 验证技术细节\n' +
        '  2. Web: WebSearch 搜索最新资料/方案对比\n' +
        '  3. GitHub: 搜索参考实现\n' +
        '  4. KB: 已通过 memory-layer 自动检索（见 kb_context），也可手动补充\n' +
        '  5. 真伪验证: 可信度评级',
      reason: '多源交叉验证确保方案可行性，避免单一信源的盲区',
      expects: '已验证的方案对比和选型建议',
      output_key: 'verified_approaches',
      depends_on: ['step_2'],
    },
    {
      step: 4,
      action: 'conversation',
      title: '清单确认 — 逐条确认 4 张施工清单',
      skill: null,
      detail: '逐条向用户展示 4 张清单（现状/约束/文件/验收），逐条获取用户确认、修改或否决。',
      reason: '施工清单是编排层的输入，确认不全会导致执行中断',
      expects: '完整的已确认施工清单',
      output_key: 'confirmed_checklists',
      depends_on: ['step_3'],
    },
    {
      step: 5,
      action: 'skill',
      title: '生成 PRD — to-prd 转化为产品需求文档',
      skill: 'to-prd',
      detail: '调用 to-prd 技能，将已确认的需求内容转化为结构化 PRD（Problem Statement / Solution / User Stories / Implementation Decisions / Testing Decisions / Out of Scope）。',
      reason: 'PRD 是拆解为 issue 的标准输入，确保需求被完整记录',
      expects: '完整的 PRD 文档，包含用户故事和实现决策',
      output_key: 'prd_output',
      depends_on: ['step_4'],
    },
    {
      step: 6,
      action: 'skill',
      title: '拆解执行 — to-issues 拆解为可执行任务',
      skill: 'to-issues',
      detail: '调用 to-issues 技能，将 PRD 拆解为独立的垂直切片 issue（tracer bullets），每个 issue 可独立交付和验证。',
      reason: '结构化任务列表是编排层的标准输入格式',
      expects: '已发布的 issue 列表，包含验收标准和依赖关系',
      output_key: 'orchestration_guide',
      depends_on: ['step_5'],
      next_workflow_args: {
        name: 'agent-orchestration',
        tasks: 'from to-issues output',
        acceptance: 'from confirmed_checklists.acceptance',
        domain: 'domain',
      },
    },
  ],

  // ============================================================
  // WorkflowState 共享状态 — 供链式调用自动装配参数
  // ============================================================
  state: {
    mode: 'async_reference',  // 异步参考模式：主 Agent 不等待本 Workflow
    produced: {
      domain: domain,
      keywords: keywords,
      ambiguities: ambiguities,
      grill_questions: grillQuestions,
      suggested_perspectives: perspectives,
      default_constraints: defaultConstraints,
      suggested_skills: suggestedSkills,
      acceptance_templates: templates.acceptance,
      kb_context: hasMemoryContext ? memoryCtx.context : null,
      // 以下由主 Agent 在对话中填充（经 action_items 指引）
      clarity_state: null,
      confirmed_constraints: null,
      verified_approaches: null,
      confirmed_checklists: null,
      prd_output: null,  // to-prd 生成的 PRD 文档
    },
    consumed_by: {
      'agent-orchestration': {
        tasks: '从 prd_output 经 to-issues 拆解产出',
        acceptance: '从 confirmed_checklists.acceptance 取已确认验收项',
        domain: 'produced.domain',
      },
      'memory-layer': {
        action: 'context',
        for: '原始需求描述 + 分析结果摘要',
      },
    },
  },
}

return output
