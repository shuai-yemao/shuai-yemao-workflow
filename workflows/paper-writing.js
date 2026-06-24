// 论文写作 Workflow — 嵌入式/电气工程领域专用
// 输入: { type: 'journal' | 'thesis', language: 'en' | 'zh', topic: string, ... }
// 输出: 论文写作工作流执行结果
//
// 使用方式:
//   Workflow({ scriptPath: '.claude/workflows/paper-writing.js', args: { type: 'journal', language: 'en', topic: 'STM32 低功耗设计' } })
//   Workflow({ scriptPath: '.claude/workflows/paper-writing.js', args: { type: 'thesis', language: 'zh', topic: '嵌入式系统设计' } })

export const meta = {
  name: 'paper-writing',
  description: '论文写作工作流 — 嵌入式/电气工程领域，支持期刊论文和学位论文',
  phases: [
    { title: '规划', detail: '分析需求，制定写作计划' },
    { title: '文献', detail: '文献检索与综述' },
    { title: '写作', detail: '论文内容撰写' },
    { title: '排版', detail: 'LaTeX 排版与格式化' },
    { title: '审查', detail: '质量检查与审稿' },
  ],
}

// ============================================================
// Schema 定义
// ============================================================

const PAPER_PLAN_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: '论文标题' },
    abstract: { type: 'string', description: '摘要要点' },
    keywords: { type: 'array', items: { type: 'string' }, description: '关键词' },
    sections: { type: 'array', items: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '章节名称' },
        content: { type: 'string', description: '内容要点' },
        word_count: { type: 'number', description: '预计字数' },
      },
    }},
    references_count: { type: 'number', description: '参考文献数量' },
    estimated_time: { type: 'string', description: '预计耗时' },
  },
  required: ['title', 'sections'],
}

const LITERATURE_REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    papers: { type: 'array', items: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        authors: { type: 'string' },
        year: { type: 'number' },
        key_findings: { type: 'string' },
        relevance: { type: 'string' },
      },
    }},
    gaps: { type: 'array', items: { type: 'string' }, description: '研究空白' },
    contributions: { type: 'array', items: { type: 'string' }, description: '本文贡献点' },
  },
  required: ['papers', 'gaps'],
}

const DRAFT_SECTION_SCHEMA = {
  type: 'object',
  properties: {
    section_name: { type: 'string' },
    content: { type: 'string', description: 'LaTeX 格式内容' },
    word_count: { type: 'number' },
    figures_tables: { type: 'array', items: { type: 'string' }, description: '图表列表' },
    citations: { type: 'array', items: { type: 'string' }, description: '引用列表' },
  },
  required: ['section_name', 'content'],
}

const REVIEW_RESULT_SCHEMA = {
  type: 'object',
  properties: {
    overall_score: { type: 'number', description: '总体评分 1-10' },
    strengths: { type: 'array', items: { type: 'string' } },
    weaknesses: { type: 'array', items: { type: 'string' } },
    suggestions: { type: 'array', items: { type: 'string' } },
    grammar_issues: { type: 'array', items: { type: 'string' } },
    formatting_issues: { type: 'array', items: { type: 'string' } },
  },
  required: ['overall_score', 'strengths', 'weaknesses'],
}

// ============================================================
// action_items 生成器
// ============================================================

function getPaperActionItems(phase, result, args) {
  const items = {
    plan: [
      { step: 1, action: 'review', title: '审查写作计划', skill: null, detail: '论文类型: ' + (args.type === 'journal' ? '期刊论文' : '学位论文') + '\n语言: ' + (args.language === 'en' ? '英文' : '中文') + '\n主题: ' + (args.topic || '未指定'), reason: '确认写作方向正确', expects: '计划符合预期', depends_on: [] },
      { step: 2, action: 'manual', title: '调整计划细节', skill: null, detail: result?.title ? '标题: ' + result.title : '待生成', reason: '根据反馈调整', expects: '计划定稿', depends_on: ['step_1'] },
    ],
    literature: [
      { step: 1, action: 'review', title: '审查文献综述', skill: null, detail: '找到 ' + (result?.papers?.length || 0) + ' 篇相关文献', reason: '文献覆盖度影响论文质量', expects: '文献覆盖主要方向', depends_on: [] },
      { step: 2, action: 'manual', title: '补充文献检索', skill: null, detail: '研究空白: ' + (result?.gaps?.length || 0) + ' 个', reason: '识别研究空白是创新点来源', expects: '明确本文贡献', depends_on: ['step_1'] },
    ],
    write: [
      { step: 1, action: 'review', title: '审查章节内容', skill: null, detail: '当前章节: ' + (result?.section_name || '未知') + '\n字数: ' + (result?.word_count || 0), reason: '内容质量是论文核心', expects: '内容准确完整', depends_on: [] },
      { step: 2, action: 'verify', title: '检查图表引用', skill: null, detail: '图表: ' + (result?.figures_tables?.length || 0) + ' 个\n引用: ' + (result?.citations?.length || 0) + ' 个', reason: '图表和引用需要完整', expects: '所有引用正确', depends_on: ['step_1'] },
    ],
    format: [
      { step: 1, action: 'review', title: '检查排版格式', skill: null, detail: 'LaTeX 模板: ' + (args.template || '默认'), reason: '格式规范影响投稿', expects: '符合目标期刊/学校要求', depends_on: [] },
    ],
    review: [
      { step: 1, action: 'review', title: '审查审稿结果', skill: null, detail: '总体评分: ' + (result?.overall_score || 0) + '/10', reason: '质量把关', expects: '达到发表/答辩标准', depends_on: [] },
      { step: 2, action: 'manual', title: '修改薄弱环节', skill: null, detail: '优势: ' + (result?.strengths?.length || 0) + '\n不足: ' + (result?.weaknesses?.length || 0), reason: '针对性改进', expects: '所有问题已解决', depends_on: ['step_1'] },
    ],
  }
  return items[phase] || []
}

function getPaperState(phase, result, args) {
  return {
    phase,
    type: args.type,
    language: args.language,
    topic: args.topic,
    progress: phase === 'plan' ? 10 : phase === 'literature' ? 30 : phase === 'write' ? 60 : phase === 'format' ? 80 : 100,
  }
}

// ============================================================
// 主流程
// ============================================================

const { type, language, topic, template } = args
const isJournal = type === 'journal'
const isEnglish = language === 'en'

phase('规划')
log(`论文类型: ${isJournal ? '期刊论文' : '学位论文'}`)
log(`语言: ${isEnglish ? '英文' : '中文'}`)
log(`主题: ${topic || '待指定'}`)

// ============================================================
// Phase 1: 规划
// ============================================================

const plan = await agent(`
  为嵌入式/电气工程领域的论文制定写作计划。

  论文信息:
  - 类型: ${isJournal ? '期刊论文' : '学位论文'}
  - 语言: ${isEnglish ? '英文' : '中文'}
  - 主题: ${topic || '嵌入式系统设计与实现'}

  要求:
  1. 生成论文标题（中英文）
  2. 列出关键词（3-5 个）
  3. 规划论文章节结构:
     - 期刊论文: Abstract, Introduction, Related Work, Methodology, Implementation, Results, Conclusion
     - 学位论文: 摘要, 第一章 绪论, 第二章 相关技术, 第三章 系统设计, 第四章 实现与测试, 第五章 总结与展望, 参考文献
  4. 每个章节预计字数
  5. 预计总耗时

  特别关注嵌入式/电气工程领域特点:
  - 硬件架构图
  - 软件流程图
  - 实验数据表格
  - 性能对比分析
`, {
  label: '生成写作计划',
  phase: '规划',
  schema: PAPER_PLAN_SCHEMA,
})

log('写作计划已生成: ' + (plan.title || '待定'))
log('章节结构: ' + (plan.sections?.length || 0) + ' 个')
log('预计耗时: ' + (plan.estimated_time || '未知'))

return {
  plan,
  action_items: getPaperActionItems('plan', plan, args),
  state: { produced: getPaperState('plan', plan, args) },
}

// ============================================================
// Phase 2: 文献检索
// ============================================================

phase('文献')
log('开始文献检索...')

const literature = await agent(`
  为嵌入式/电气工程领域的论文进行文献检索和综述。

  论文主题: ${topic || '嵌入式系统设计与实现'}
  研究方向: ${plan.keywords?.join(', ') || '嵌入式系统, STM32, 低功耗设计'}

  要求:
  1. 检索相关文献（至少 15 篇）
  2. 按相关性排序
  3. 总结每篇文献的关键发现
  4. 识别研究空白
  5. 提出本文的贡献点

  文献类型:
  - 期刊论文 (IEEE, ACM, Elsevier)
  - 会议论文 (IEEE Conference, ACM Conference)
  - 学位论文
  - 技术报告
  - 标准文档

  重点关注:
  - 近 5 年的文献
  - 高引用论文
  - 开源实现方案
`, {
  label: '文献检索',
  phase: '文献',
  schema: LITERATURE_REVIEW_SCHEMA,
})

log('文献检索完成: ' + (literature.papers?.length || 0) + ' 篇')
log('研究空白: ' + (literature.gaps?.length || 0) + ' 个')
log('贡献点: ' + (literature.contributions?.length || 0) + ' 个')

return {
  literature,
  action_items: getPaperActionItems('literature', literature, args),
  state: { produced: getPaperState('literature', literature, args) },
}

// ============================================================
// Phase 3: 内容撰写
// ============================================================

phase('写作')
log('开始论文撰写...')

const sections = []
for (const section of plan.sections || []) {
  log('撰写章节: ' + section.name)

  const draft = await agent(`
    为嵌入式/电气工程领域的论文撰写章节内容。

    章节信息:
    - 名称: ${section.name}
    - 内容要点: ${section.content}
    - 目标字数: ${section.word_count}

    论文上下文:
    - 类型: ${isJournal ? '期刊论文' : '学位论文'}
    - 语言: ${isEnglish ? '英文' : '中文'}
    - 主题: ${topic || '嵌入式系统设计与实现'}
    - 关键词: ${plan.keywords?.join(', ')}

    参考文献:
    ${literature.papers?.slice(0, 5).map(p => `- ${p.title} (${p.year})`).join('\n') || '待补充'}

    要求:
    1. 使用 LaTeX 格式
    2. 学术写作风格
    3. 适当引用文献
    4. 包含图表占位符
    5. 嵌入式/电气工程领域专业术语准确

    特别注意:
    - 硬件描述要准确（芯片型号、外设配置）
    - 软件流程要清晰（算法、数据结构）
    - 实验数据要真实可信
    - 性能对比要客观公正
  `, {
    label: '撰写: ' + section.name,
    phase: '写作',
    schema: DRAFT_SECTION_SCHEMA,
  })

  sections.push(draft)
  log('完成: ' + section.name + ' (' + (draft.word_count || 0) + ' 字)')
}

log('论文撰写完成: ' + sections.length + ' 个章节')

return {
  sections,
  action_items: getPaperActionItems('write', sections[0], args),
  state: { produced: getPaperState('write', { section_name: sections.map(s => s.section_name).join(', ') }, args) },
}

// ============================================================
// Phase 4: 排版
// ============================================================

phase('格式')
log('开始 LaTeX 排版...')

const formatResult = await agent(`
  为嵌入式/电气工程领域的论文进行 LaTeX 排版。

  论文信息:
  - 类型: ${isJournal ? '期刊论文' : '学位论文'}
  - 语言: ${isEnglish ? '英文' : '中文'}
  - 目标: ${isJournal ? 'IEEE/ACM 期刊' : '学位论文模板'}

  章节内容:
  ${sections.map(s => `## ${s.section_name}\n${s.content?.substring(0, 200)}...`).join('\n\n')}

  要求:
  1. 选择合适的 LaTeX 模板
  2. 配置文档类和包
  3. 生成完整的 .tex 文件
  4. 包含参考文献 .bib 文件
  5. 图表编号和引用

  特别注意:
  - 嵌入式代码高亮（listings 包）
  - 电路图绘制（circuitikz 包）
  - 系统架构图（tikz 包）
  - 性能对比表格（booktabs 包）
  - 中文字体配置（ctex 包）
`, {
  label: 'LaTeX 排版',
  phase: '格式',
})

log('排版完成')

return {
  format: formatResult,
  action_items: getPaperActionItems('format', null, args),
  state: { produced: getPaperState('format', null, args) },
}

// ============================================================
// Phase 5: 审查
// ============================================================

phase('审查')
log('开始论文审查...')

const review = await agent(`
  对嵌入式/电气工程领域的论文进行全面审查。

  论文信息:
  - 类型: ${isJournal ? '期刊论文' : '学位论文'}
  - 语言: ${isEnglish ? '英文' : '中文'}
  - 主题: ${topic || '嵌入式系统设计与实现'}

  审查维度:
  1. 内容质量:
     - 创新性
     - 技术深度
     - 实验充分性
     - 结论合理性

  2. 写作质量:
     - 逻辑结构
     - 语言表达
     - 学术规范
     - 引用格式

  3. 格式规范:
     - LaTeX 格式
     - 图表规范
     - 参考文献格式
     - 页眉页脚

  4. 嵌入式/电气工程专业性:
     - 硬件描述准确性
     - 软件实现可行性
     - 实验数据可信度
     - 性能指标合理性

  评分标准:
  - 9-10: 优秀，可直接投稿/答辩
  - 7-8: 良好，需小幅修改
  - 5-6: 一般，需重大修改
  - <5: 不合格，需重写
`, {
  label: '论文审查',
  phase: '审查',
  schema: REVIEW_RESULT_SCHEMA,
})

log('审查完成: ' + (review.overall_score || 0) + '/10')
log('优势: ' + (review.strengths?.length || 0) + ' 个')
log('不足: ' + (review.weaknesses?.length || 0) + ' 个')
log('建议: ' + (review.suggestions?.length || 0) + ' 个')

return {
  review,
  action_items: getPaperActionItems('review', review, args),
  state: { produced: getPaperState('review', review, args) },
}

// ============================================================
// 最终输出
// ============================================================

log('论文写作工作流完成!')
log('标题: ' + (plan.title || '未生成'))
log('总字数: ' + (sections.reduce((sum, s) => sum + (s.word_count || 0), 0)))
log('评分: ' + (review.overall_score || 0) + '/10')

return {
  success: true,
  paper: {
    title: plan.title,
    type: isJournal ? 'journal' : 'thesis',
    language: isEnglish ? 'en' : 'zh',
    topic: topic,
    sections: sections,
    literature: literature,
    format: formatResult,
    review: review,
  },
  summary: {
    total_words: sections.reduce((sum, s) => sum + (s.word_count || 0), 0),
    sections_count: sections.length,
    references_count: literature.papers?.length || 0,
    overall_score: review.overall_score || 0,
  },
  action_items: [
    { step: 1, action: 'review', title: '最终审查', detail: '论文已完成，请检查所有内容', depends_on: [] },
    { step: 2, action: 'manual', title: '根据审稿意见修改', detail: review.suggestions?.join('\n') || '无修改建议', depends_on: ['step_1'] },
    { step: 3, action: 'workflow', title: '生成最终版本', detail: '使用 paperjury 进行投稿前审稿', depends_on: ['step_2'] },
  ],
  state: { produced: getPaperState('complete', null, args) },
}
