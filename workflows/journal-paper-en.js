// 英文期刊论文写作 Workflow — 嵌入式/电气工程领域专用
// 输入: { topic: string, journal?: string, impact_factor?: number, ... }
// 输出: 英文期刊论文写作工作流执行结果
//
// 使用方式:
//   Workflow({ scriptPath: '.claude/workflows/journal-paper-en.js', args: { topic: 'Low-Power Design for IoT Devices', journal: 'IEEE Transactions on Industrial Electronics' } })

export const meta = {
  name: 'journal-paper-en',
  description: '英文期刊论文写作工作流 — 嵌入式/电气工程领域，支持 IEEE/ACM/Elsevier 期刊',
  phases: [
    { title: '选题', detail: '选题分析与期刊选择' },
    { title: '文献', detail: '文献检索与综述' },
    { title: '设计', detail: '研究设计与方法' },
    { title: '实验', detail: '实验设计与实施' },
    { title: '写作', detail: '论文撰写' },
    { title: '排版', detail: 'LaTeX 排版' },
    { title: '审查', detail: '质量检查与审稿' },
  ],
}

// ============================================================
// Schema 定义
// ============================================================

const TOPIC_ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: '论文标题' },
    abstract_outline: { type: 'string', description: '摘要大纲' },
    keywords: { type: 'array', items: { type: 'string' }, description: '关键词' },
    research_gap: { type: 'string', description: '研究空白' },
    contributions: { type: 'array', items: { type: 'string' }, description: '贡献点' },
    target_journal: { type: 'string', description: '目标期刊' },
    estimated_impact: { type: 'string', description: '预计影响' },
  },
  required: ['title', 'contributions', 'target_journal'],
}

const METHODOLOGY_SCHEMA = {
  type: 'object',
  properties: {
    research_design: { type: 'string', description: '研究设计' },
    methodology: { type: 'string', description: '研究方法' },
    data_collection: { type: 'string', description: '数据收集' },
    data_analysis: { type: 'string', description: '数据分析' },
    validation: { type: 'string', description: '验证方法' },
    ethical_considerations: { type: 'string', description: '伦理考虑' },
  },
  required: ['research_design', 'methodology'],
}

const EXPERIMENT_SCHEMA = {
  type: 'object',
  properties: {
    experimental_setup: { type: 'string', description: '实验环境' },
    baselines: { type: 'array', items: { type: 'string' }, description: '基准方法' },
    metrics: { type: 'array', items: { type: 'string' }, description: '评估指标' },
    results: { type: 'string', description: '实验结果' },
    analysis: { type: 'string', description: '结果分析' },
    threats_to_validity: { type: 'array', items: { type: 'string' }, description: '效度威胁' },
  },
  required: ['experimental_setup', 'metrics', 'results'],
}

// ============================================================
// action_items 生成器
// ============================================================

function getJournalActionItems(phase, result, args) {
  const items = {
    topic: [
      { step: 1, action: 'review', title: '审查选题分析', skill: null, detail: '标题: ' + (result?.title || '待定'), reason: '选题是论文成功的基础', expects: '选题符合期刊范围', depends_on: [] },
      { step: 2, action: 'verify', title: '验证期刊匹配度', skill: null, detail: '目标期刊: ' + (result?.target_journal || '待定'), reason: '期刊选择影响录用率', expects: '期刊匹配度高', depends_on: ['step_1'] },
    ],
    literature: [
      { step: 1, action: 'review', title: '审查文献综述', skill: null, detail: '文献数量: ' + (result?.papers?.length || 0) + ' 篇', reason: '文献综述体现研究深度', expects: '文献覆盖全面', depends_on: [] },
    ],
    methodology: [
      { step: 1, action: 'review', title: '审查研究方法', skill: null, detail: '方法: ' + (result?.methodology || '待定'), reason: '方法论是论文核心', expects: '方法科学合理', depends_on: [] },
    ],
    experiment: [
      { step: 1, action: 'review', title: '审查实验设计', skill: null, detail: '指标: ' + (result?.metrics?.length || 0) + ' 个', reason: '实验设计决定结果可信度', expects: '实验设计合理', depends_on: [] },
      { step: 2, action: 'verify', title: '验证实验结果', skill: null, detail: '结果: ' + (result?.results?.substring(0, 100) || '待分析'), reason: '实验结果支撑论文结论', expects: '结果显著', depends_on: ['step_1'] },
    ],
    write: [
      { step: 1, action: 'review', title: '审查论文内容', skill: null, detail: '章节: ' + (result?.sections_count || 0) + ' 个', reason: '内容质量是论文核心', expects: '内容完整准确', depends_on: [] },
    ],
    format: [
      { step: 1, action: 'review', title: '检查排版格式', skill: null, detail: '模板: ' + (args.journal || 'IEEE'), reason: '格式规范影响投稿', expects: '符合期刊要求', depends_on: [] },
    ],
    review: [
      { step: 1, action: 'review', title: '审查审稿结果', skill: null, detail: '评分: ' + (result?.overall_score || 0) + '/10', reason: '质量把关', expects: '达到发表标准', depends_on: [] },
      { step: 2, action: 'manual', title: '根据审稿意见修改', skill: null, detail: '建议: ' + (result?.suggestions?.length || 0) + ' 条', reason: '审稿意见是修改方向', expects: '所有问题已解决', depends_on: ['step_1'] },
    ],
  }
  return items[phase] || []
}

function getJournalState(phase, result, args) {
  return {
    phase,
    topic: args.topic,
    journal: args.journal,
    progress: phase === 'topic' ? 10 : phase === 'literature' ? 25 : phase === 'methodology' ? 40 : phase === 'experiment' ? 60 : phase === 'write' ? 75 : phase === 'format' ? 90 : 100,
  }
}

// ============================================================
// 主流程
// ============================================================

const { topic, journal, impact_factor, open_access } = args

phase('选题')
log(`论文主题: ${topic || '待指定'}`)
log(`目标期刊: ${journal || 'IEEE Transactions'}`)
log(`影响因子: ${impact_factor || '待查'}`)

// ============================================================
// Phase 1: 选题分析
// ============================================================

const topicAnalysis = await agent(`
  为嵌入式/电气工程领域的英文期刊论文进行选题分析。

  论文信息:
  - 主题: ${topic || 'Low-Power Design for IoT Devices'}
  - 目标期刊: ${journal || 'IEEE Transactions on Industrial Electronics'}
  - 影响因子: ${impact_factor || '7.5+'}
  - 开放获取: ${open_access ? '是' : '否'}

  要求:
  1. 生成吸引人的论文标题
  2. 撰写摘要大纲
  3. 选择关键词（4-6 个）
  4. 识别研究空白
  5. 总论文贡献点（3-5 个）
  6. 评估期刊匹配度

  嵌入式/电气工程领域热点:
  - 低功耗设计
  - 物联网（IoT）
  - 边缘计算
  - 人工智能芯片
  - 无线传感器网络
  - 嵌入式机器学习
  - 电源管理
  - 实时系统

  期刊选择策略:
  - IEEE Transactions: 高影响力，审稿严格
  - ACM Transactions: 计算机科学导向
  - Elsevier: 跨学科，应用导向
  - MDPI: 开放获取，审稿快
`, {
  label: '选题分析',
  phase: '选题',
  schema: TOPIC_ANALYSIS_SCHEMA,
})

log('选题分析完成: ' + (topicAnalysis.title || '待定'))
log('贡献点: ' + (topicAnalysis.contributions?.length || 0) + ' 个')

return {
  topicAnalysis,
  action_items: getJournalActionItems('topic', topicAnalysis, args),
  state: { produced: getJournalState('topic', topicAnalysis, args) },
}

// ============================================================
// Phase 2: 文献检索
// ============================================================

phase('文献')
log('开始文献检索...')

const literature = await agent(`
  为嵌入式/电气工程领域的英文期刊论文进行文献检索和综述。

  论文主题: ${topic || 'Low-Power Design for IoT Devices'}
  研究方向: ${topicAnalysis.keywords?.join(', ') || 'Low-Power, IoT, Embedded Systems'}

  要求:
  1. 检索相关文献（30-50 篇）
  2. 英文文献为主
  3. 近 5 年文献占比 > 70%
  4. 高被引论文优先
  5. 总结研究现状
  6. 识别研究空白

  文献类型:
  - IEEE/ACM/Elsevier 期刊论文
  - 顶级会议论文（DAC, DATE, ICCAD, EMSOFT）
  - 综述论文
  - 技术标准
  - 专利文献

  文献综述结构:
  1. Low-Power Design Techniques
  2. IoT Device Architecture
  3. Embedded Machine Learning
  4. Energy Harvesting
  5. Research Gaps and Opportunities

  高影响力期刊:
  - IEEE Transactions on Industrial Electronics (IF: 7.5+)
  - IEEE Transactions on Computers (IF: 3.7+)
  - ACM Transactions on Embedded Computing Systems (IF: 2.0+)
  - IEEE Transactions on Very Large Scale Integration Systems (IF: 2.8+)
`, {
  label: '文献检索',
  phase: '文献',
})

log('文献检索完成')

return {
  literature,
  action_items: getJournalActionItems('literature', literature, args),
  state: { produced: getJournalState('literature', literature, args) },
}

// ============================================================
// Phase 3: 研究方法
// ============================================================

phase('设计')
log('开始研究方法设计...')

const methodology = await agent(`
  为嵌入式/电气工程领域的英文期刊论文设计研究方法。

  论文主题: ${topic || 'Low-Power Design for IoT Devices'}
  研究贡献: ${topicAnalysis.contributions?.join('\n') || '提出新的低功耗设计方法'}

  要求:
  1. 设计研究框架
  2. 选择研究方法
  3. 描述数据收集方法
  4. 设计数据分析方法
  5. 提出验证方法
  6. 考虑伦理问题

  嵌入式/电气工程研究方法:
  - 实验研究（Experimental Research）
  - 设计科学研究（Design Science Research）
  - 案例研究（Case Study）
  - 仿真研究（Simulation Study）
  - 比较研究（Comparative Study）

  数据收集方法:
  - 原型实现
  - 性能测试
  - 功耗测量
  - 温度测试
  - 可靠性测试

  数据分析方法:
  - 统计分析
  - 性能对比
  - 功耗分析
  - 成本效益分析
  - 敏感性分析
`, {
  label: '研究方法设计',
  phase: '设计',
  schema: METHODOLOGY_SCHEMA,
})

log('研究方法设计完成')
log('方法: ' + (methodology.methodology || '待定'))

return {
  methodology,
  action_items: getJournalActionItems('methodology', methodology, args),
  state: { produced: getJournalState('methodology', methodology, args) },
}

// ============================================================
// Phase 4: 实验设计
// ============================================================

phase('实验')
log('开始实验设计...')

const experiment = await agent(`
  为嵌入式/电气工程领域的英文期刊论文设计实验。

  论文主题: ${topic || 'Low-Power Design for IoT Devices'}
  研究方法: ${methodology.methodology || 'Experimental Research'}

  要求:
  1. 设计实验环境
  2. 选择基准方法
  3. 定义评估指标
  4. 设计实验方案
  5. 预期实验结果
  6. 识别效度威胁

  嵌入式实验设计:
  - 硬件平台: STM32, ESP32, nRF52
  - 软件环境: FreeRTOS, Linux, Zephyr
  - 测试工具: 逻辑分析仪, 示波器, 功耗分析仪
  - 仿真工具: MATLAB/Simulink, Cadence

  评估指标:
  - 功耗 (Power Consumption)
  - 能效 (Energy Efficiency)
  - 延迟 (Latency)
  - 吞吐量 (Throughput)
  - 面积 (Area)
  - 成本 (Cost)
  - 可靠性 (Reliability)

  基准方法:
  - 状态最先进方法 (State-of-the-Art)
  - 传统方法 (Traditional Methods)
  - 商业工具 (Commercial Tools)
  - 开源方案 (Open-Source Solutions)
`, {
  label: '实验设计',
  phase: '实验',
  schema: EXPERIMENT_SCHEMA,
})

log('实验设计完成')
log('指标: ' + (experiment.metrics?.length || 0) + ' 个')
log('基准: ' + (experiment.baselines?.length || 0) + ' 个')

return {
  experiment,
  action_items: getJournalActionItems('experiment', experiment, args),
  state: { produced: getJournalState('experiment', experiment, args) },
}

// ============================================================
// Phase 5: 论文撰写
// ============================================================

phase('写作')
log('开始论文撰写...')

const paperStructure = [
  { name: 'Title', content: 'Paper title', word_count: 20 },
  { name: 'Abstract', content: 'Background, Objective, Methods, Results, Conclusion', word_count: 250 },
  { name: 'Keywords', content: '4-6 keywords', word_count: 0 },
  { name: 'I. Introduction', content: 'Background, Motivation, Contributions, Organization', word_count: 1500 },
  { name: 'II. Related Work', content: 'Literature review, Research gaps', word_count: 2000 },
  { name: 'III. Methodology', content: 'Proposed approach, Algorithms, Design', word_count: 3000 },
  { name: 'IV. Implementation', content: 'Hardware, Software, Integration', word_count: 2000 },
  { name: 'V. Experimental Results', content: 'Setup, Baselines, Metrics, Results, Analysis', word_count: 3000 },
  { name: 'VI. Discussion', content: 'Implications, Limitations, Future work', word_count: 1000 },
  { name: 'VII. Conclusion', content: 'Summary, Contributions, Future work', word_count: 500 },
  { name: 'References', content: 'Bibliography', word_count: 0 },
]

const sections = []
for (const section of paperStructure) {
  log('撰写章节: ' + section.name)

  const draft = await agent(`
    为嵌入式/电气工程领域的英文期刊论文撰写章节内容。

    章节信息:
    - 名称: ${section.name}
    - 内容要点: ${section.content}
    - 目标字数: ${section.word_count}

    论文上下文:
    - 标题: ${topicAnalysis.title || 'Low-Power Design for IoT Devices'}
    - 期刊: ${journal || 'IEEE Transactions on Industrial Electronics'}
    - 贡献: ${topicAnalysis.contributions?.join(', ') || 'Low-power design method'}

    研究方法:
    - 方法: ${methodology.methodology || 'Experimental Research'}
    - 设计: ${methodology.research_design || 'Controlled experiment'}

    实验结果:
    - 指标: ${experiment.metrics?.join(', ') || 'Power, Latency, Throughput'}
    - 基准: ${experiment.baselines?.join(', ') || 'State-of-the-art'}

    要求:
    1. 使用 LaTeX 格式
    2. 英文学术写作风格
    3. 适当引用文献
    4. 包含图表占位符
    5. 嵌入式/电气工程专业术语准确

    写作风格:
    - 清晰简洁
    - 逻辑严密
    - 客观公正
    - 技术准确

    特别注意:
    - 使用被动语态
    - 避免第一人称
    - 图表编号规范
    - 参考文献格式（IEEE/ACM）
  `, {
    label: '撰写: ' + section.name,
    phase: '写作',
    schema: DRAFT_SECTION_SCHEMA,
  })

  sections.push(draft)
  log('完成: ' + section.name + ' (' + (draft.word_count || 0) + ' words)')

log('论文撰写完成: ' + sections.length + ' 个章节')
log('总字数: ' + sections.reduce((sum, s) => sum + (s.word_count || 0), 0))

return {
  sections,
  action_items: getJournalActionItems('write', { sections_count: sections.length }, args),
  state: { produced: getJournalState('write', { sections_count: sections.length }, args) },
}

// ============================================================
// Phase 6: LaTeX 排版
// ============================================================

phase('格式')
log('开始 LaTeX 排版...')

const formatResult = await agent(`
  为嵌入式/电气工程领域的英文期刊论文进行 LaTeX 排版。

  论文信息:
  - 标题: ${topicAnalysis.title || 'Low-Power Design for IoT Devices'}
  - 期刊: ${journal || 'IEEE Transactions on Industrial Electronics'}

  章节内容:
  ${sections.map(s => `## ${s.section_name}\n${s.content?.substring(0, 200)}...`).join('\n\n')}

  要求:
  1. 选择期刊模板
  2. 配置文档类和包
  3. 生成完整的 .tex 文件
  4. 包含参考文献 .bib 文件
  5. 图表编号和交叉引用
  6. 双栏排版

  期刊模板:
  - IEEE: IEEEtran.cls
  - ACM: acmart.cls
  - Elsevier: article.cls + elsarticle.cls
  - MDPI: mdpi.cls

  嵌入式论文特殊格式:
  - 代码高亮（listings 包）
  - 算法排版（algorithm2e 包）
  - 系统架构图（tikz 包）
  - 性能对比表格（booktabs 包）
  - 数学公式（amsmath 包）
`, {
  label: 'LaTeX 排版',
  phase: '格式',
})

log('排版完成')

return {
  format: formatResult,
  action_items: getJournalActionItems('format', null, args),
  state: { produced: getJournalState('format', null, args) },
}

// ============================================================
// Phase 7: 质量审查
// ============================================================

phase('审查')
log('开始论文审查...')

const review = await agent(`
  对嵌入式/电气工程领域的英文期刊论文进行全面审查。

  论文信息:
  - 标题: ${topicAnalysis.title || 'Low-Power Design for IoT Devices'}
  - 期刊: ${journal || 'IEEE Transactions on Industrial Electronics'}

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
     - 双栏排版

  4. 嵌入式/电气工程专业性:
     - 硬件描述准确性
     - 软件实现可行性
     - 实验数据可信度
     - 性能指标合理性

  期刊评审标准:
  - Accept: 创新性强，质量高，可直接发表
  - Minor Revision: 小幅修改，基本达到要求
  - Major Revision: 重大修改，需要补充实验
  - Reject: 不符合期刊要求

  常见问题检查:
  - 英语语法
  - 学术不端
  - 图表质量
  - 参考文献格式
  - 创新性不足
`, {
  label: '论文审查',
  phase: '审查',
  schema: REVIEW_RESULT_SCHEMA,
})

log('审查完成: ' + (review.overall_score || 0) + '/10')
log('优势: ' + (review.strengths?.length || 0) + ' 个')
log('不足: ' + (review.weaknesses?.length || 0) + ' 个')

return {
  review,
  action_items: getJournalActionItems('review', review, args),
  state: { produced: getJournalState('review', review, args) },
}

// ============================================================
// 最终输出
// ============================================================

log('英文期刊论文写作工作流完成!')
log('标题: ' + (topicAnalysis.title || '待定'))
log('总字数: ' + sections.reduce((sum, s) => sum + (s.word_count || 0), 0))
log('评分: ' + (review.overall_score || 0) + '/10')

return {
  success: true,
  paper: {
    title: topicAnalysis.title,
    journal: journal,
    topic: topic,
    topicAnalysis: topicAnalysis,
    literature: literature,
    methodology: methodology,
    experiment: experiment,
    sections: sections,
    format: formatResult,
    review: review,
  },
  summary: {
    total_words: sections.reduce((sum, s) => sum + (s.word_count || 0), 0),
    sections_count: sections.length,
    contributions: topicAnalysis.contributions?.length || 0,
    overall_score: review.overall_score || 0,
  },
  action_items: [
    { step: 1, action: 'review', title: '最终审查', detail: '论文已完成，请检查所有内容', depends_on: [] },
    { step: 2, action: 'manual', title: '根据审稿意见修改', detail: review.suggestions?.join('\n') || '无修改建议', depends_on: ['step_1'] },
    { step: 3, action: 'workflow', title: '使用 paperjury 审稿', detail: '进行投稿前压力测试', depends_on: ['step_2'] },
    { step: 4, action: 'manual', title: '格式最终调整', detail: '确保格式完全符合期刊要求', depends_on: ['step_3'] },
    { step: 5, action: 'manual', title: '准备投稿', detail: '撰写 Cover Letter，准备补充材料', depends_on: ['step_4'] },
  ],
  state: { produced: getJournalState('complete', null, args) },
}