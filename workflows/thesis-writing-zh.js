// 中文学位论文写作 Workflow — 嵌入式/电气工程领域专用
// 输入: { topic: string, university?: string, major?: string, supervisor?: string, ... }
// 输出: 中文学位论文写作工作流执行结果
//
// 使用方式:
//   Workflow({ scriptPath: '.claude/workflows/thesis-writing-zh.js', args: { topic: '基于 STM32 的智能家居系统设计' } })

export const meta = {
  name: 'thesis-writing-zh',
  description: '中文学位论文写作工作流 — 嵌入式/电气工程领域，支持本科/硕士论文',
  phases: [
    { title: '选题', detail: '选题分析与开题报告' },
    { title: '文献', detail: '文献检索与综述' },
    { title: '设计', detail: '系统设计与架构' },
    { title: '实现', detail: '系统实现与测试' },
    { title: '写作', detail: '论文撰写' },
    { title: '排版', detail: 'LaTeX 排版' },
    { title: '审查', detail: '质量检查与修改' },
  ],
}

// ============================================================
// Schema 定义
// ============================================================

const TOPIC_ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    topic: { type: 'string', description: '论文题目' },
    research_background: { type: 'string', description: '研究背景' },
    research_significance: { type: 'string', description: '研究意义' },
    research_objectives: { type: 'array', items: { type: 'string' }, description: '研究目标' },
    research_methods: { type: 'array', items: { type: 'string' }, description: '研究方法' },
    expected_results: { type: 'array', items: { type: 'string' }, description: '预期成果' },
    innovation_points: { type: 'array', items: { type: 'string' }, description: '创新点' },
  },
  required: ['topic', 'research_background', 'research_objectives'],
}

const SYSTEM_DESIGN_SCHEMA = {
  type: 'object',
  properties: {
    overall_architecture: { type: 'string', description: '整体架构描述' },
    hardware_design: {
      type: 'object',
      properties: {
        main_controller: { type: 'string', description: '主控制器选型' },
        peripherals: { type: 'array', items: { type: 'string' }, description: '外设模块' },
        circuit_diagram: { type: 'string', description: '电路图描述' },
      },
    },
    software_design: {
      type: 'object',
      properties: {
        os: { type: 'string', description: '操作系统' },
        modules: { type: 'array', items: { type: 'string' }, description: '软件模块' },
        algorithms: { type: 'array', items: { type: 'string' }, description: '核心算法' },
      },
    },
    communication_protocol: { type: 'string', description: '通信协议' },
    power_management: { type: 'string', description: '电源管理' },
  },
  required: ['overall_architecture', 'hardware_design', 'software_design'],
}

const IMPLEMENTATION_RESULT_SCHEMA = {
  type: 'object',
  properties: {
    hardware_implementation: { type: 'string', description: '硬件实现' },
    software_implementation: { type: 'string', description: '软件实现' },
    testing_results: {
      type: 'object',
      properties: {
        functional_tests: { type: 'array', items: { type: 'string' }, description: '功能测试' },
        performance_tests: { type: 'array', items: { type: 'string' }, description: '性能测试' },
        reliability_tests: { type: 'array', items: { type: 'string' }, description: '可靠性测试' },
      },
    },
    issues_and_solutions: { type: 'array', items: { type: 'string' }, description: '问题与解决方案' },
  },
  required: ['hardware_implementation', 'software_implementation', 'testing_results'],
}

// ============================================================
// action_items 生成器
// ============================================================

function getThesisActionItems(phase, result, args) {
  const items = {
    topic: [
      { step: 1, action: 'review', title: '审查选题分析', skill: null, detail: '题目: ' + (result?.topic || '待定'), reason: '选题是论文成功的基础', expects: '选题符合专业方向', depends_on: [] },
      { step: 2, action: 'manual', title: '撰写开题报告', skill: null, detail: '创新点: ' + (result?.innovation_points?.length || 0) + ' 个', reason: '开题报告是论文的蓝图', expects: '开题报告完成', depends_on: ['step_1'] },
    ],
    literature: [
      { step: 1, action: 'review', title: '审查文献综述', skill: null, detail: '文献数量: ' + (result?.papers?.length || 0) + ' 篇', reason: '文献综述体现研究深度', expects: '文献覆盖全面', depends_on: [] },
    ],
    design: [
      { step: 1, action: 'review', title: '审查系统设计', skill: null, detail: '架构: ' + (result?.overall_architecture || '待定'), reason: '设计是实现的蓝图', expects: '设计合理可行', depends_on: [] },
      { step: 2, action: 'verify', title: '验证硬件选型', skill: null, detail: '主控: ' + (result?.hardware_design?.main_controller || '待定'), reason: '硬件选型影响系统性能', expects: '选型合理', depends_on: ['step_1'] },
    ],
    implementation: [
      { step: 1, action: 'review', title: '审查实现结果', skill: null, detail: '功能测试: ' + (result?.testing_results?.functional_tests?.length || 0) + ' 项', reason: '实现质量决定论文价值', expects: '所有功能正常', depends_on: [] },
      { step: 2, action: 'verify', title: '验证性能指标', skill: null, detail: '性能测试: ' + (result?.testing_results?.performance_tests?.length || 0) + ' 项', reason: '性能数据支撑论文结论', expects: '性能达标', depends_on: ['step_1'] },
    ],
    write: [
      { step: 1, action: 'review', title: '审查论文内容', skill: null, detail: '章节: ' + (result?.sections_count || 0) + ' 个', reason: '内容质量是论文核心', expects: '内容完整准确', depends_on: [] },
    ],
    format: [
      { step: 1, action: 'review', title: '检查排版格式', skill: null, detail: '模板: ' + (args.university || '默认'), reason: '格式规范影响答辩', expects: '符合学校要求', depends_on: [] },
    ],
    review: [
      { step: 1, action: 'review', title: '审查审稿结果', skill: null, detail: '评分: ' + (result?.overall_score || 0) + '/10', reason: '质量把关', expects: '达到答辩标准', depends_on: [] },
      { step: 2, action: 'manual', title: '根据导师意见修改', skill: null, detail: '建议: ' + (result?.suggestions?.length || 0) + ' 条', reason: '导师意见是修改方向', expects: '所有问题已解决', depends_on: ['step_1'] },
    ],
  }
  return items[phase] || []
}

function getThesisState(phase, result, args) {
  return {
    phase,
    topic: args.topic,
    university: args.university,
    major: args.major,
    progress: phase === 'topic' ? 10 : phase === 'literature' ? 20 : phase === 'design' ? 35 : phase === 'implementation' ? 50 : phase === 'write' ? 70 : phase === 'format' ? 85 : 100,
  }
}

// ============================================================
// 主流程
// ============================================================

const { topic, university, major, supervisor, degree_level } = args
const isMaster = degree_level === 'master'

phase('选题')
log(`论文题目: ${topic || '待指定'}`)
log(`学校: ${university || '待指定'}`)
log(`专业: ${major || '电气工程及其自动化'}`)
log(`学位级别: ${isMaster ? '硕士' : '本科'}`)

// ============================================================
// Phase 1: 选题分析
// ============================================================

const topicAnalysis = await agent(`
  为嵌入式/电气工程领域的中文学位论文进行选题分析。

  论文信息:
  - 题目: ${topic || '基于 STM32 的智能家居系统设计'}
  - 学校: ${university || '待指定'}
  - 专业: ${major || '电气工程及其自动化'}
  - 学位级别: ${isMaster ? '硕士' : '本科'}

  要求:
  1. 分析选题的研究背景
  2. 阐述研究意义（理论意义和实际意义）
  3. 明确研究目标
  4. 提出研究方法
  5. 描述预期成果
  6. 总结创新点

  嵌入式/电气工程领域特点:
  - 硬件设计与实现
  - 软件开发与调试
  - 系统集成与测试
  - 性能优化与验证

  学位论文要求:
  - 本科: 工程实现为主，工作量适中
  - 硕士: 理论深度 + 创新性，工作量较大
`, {
  label: '选题分析',
  phase: '选题',
  schema: TOPIC_ANALYSIS_SCHEMA,
})

log('选题分析完成: ' + (topicAnalysis.topic || '待定'))
log('创新点: ' + (topicAnalysis.innovation_points?.length || 0) + ' 个')

return {
  topicAnalysis,
  action_items: getThesisActionItems('topic', topicAnalysis, args),
  state: { produced: getThesisState('topic', topicAnalysis, args) },
}

// ============================================================
// Phase 2: 文献检索
// ============================================================

phase('文献')
log('开始文献检索...')

const literature = await agent(`
  为嵌入式/电气工程领域的中文学位论文进行文献检索和综述。

  论文主题: ${topic || '基于 STM32 的智能家居系统设计'}
  研究方向: ${topicAnalysis.research_objectives?.join(', ') || '嵌入式系统, 智能家居'}

  要求:
  1. 检索相关文献（本科 20 篇，硕士 40 篇）
  2. 中英文文献比例 1:1
  3. 近 5 年文献占比 > 60%
  4. 高被引论文优先
  5. 总结研究现状
  6. 识别研究空白

  文献类型:
  - 中文期刊（知网、万方）
  - 英文期刊（IEEE, ACM, Elsevier）
  - 学位论文
  - 会议论文
  - 技术标准
  - 专利文献

  文献综述结构:
  1. 国外研究现状
  2. 国内研究现状
  3. 现有研究不足
  4. 本文研究切入点
`, {
  label: '文献检索',
  phase: '文献',
})

log('文献检索完成')

return {
  literature,
  action_items: getThesisActionItems('literature', literature, args),
  state: { produced: getThesisState('literature', literature, args) },
}

// ============================================================
// Phase 3: 系统设计
// ============================================================

phase('设计')
log('开始系统设计...')

const systemDesign = await agent(`
  为嵌入式/电气工程领域的中文学位论文进行系统设计。

  论文主题: ${topic || '基于 STM32 的智能家居系统设计'}
  研究目标: ${topicAnalysis.research_objectives?.join('\n') || '设计并实现一个嵌入式系统'}

  要求:
  1. 设计整体系统架构
  2. 硬件设计:
     - 主控制器选型（STM32 系列）
     - 外设模块选择
     - 电路设计
  3. 软件设计:
     - 操作系统选择（FreeRTOS/Linux）
     - 软件模块划分
     - 核心算法设计
  4. 通信协议设计
  5. 电源管理设计

  嵌入式系统设计原则:
  - 模块化设计
  - 低功耗优化
  - 实时性保证
  - 可扩展性
  - 成本控制

  电气工程特点:
  - 信号完整性
  - 电源完整性
  - 电磁兼容性
  - 安全性设计
`, {
  label: '系统设计',
  phase: '设计',
  schema: SYSTEM_DESIGN_SCHEMA,
})

log('系统设计完成')
log('主控: ' + (systemDesign.hardware_design?.main_controller || '待定'))
log('外设: ' + (systemDesign.hardware_design?.peripherals?.length || 0) + ' 个')

return {
  systemDesign,
  action_items: getThesisActionItems('design', systemDesign, args),
  state: { produced: getThesisState('design', systemDesign, args) },
}

// ============================================================
// Phase 4: 系统实现
// ============================================================

phase('实现')
log('开始系统实现...')

const implementation = await agent(`
  为嵌入式/电气工程领域的中文学位论文进行系统实现和测试。

  系统设计:
  - 架构: ${systemDesign.overall_architecture || '待实现'}
  - 主控: ${systemDesign.hardware_design?.main_controller || 'STM32'}
  - 外设: ${systemDesign.hardware_design?.peripherals?.join(', ') || '待实现'}

  要求:
  1. 硬件实现:
     - PCB 设计
     - 硬件调试
     - 信号测试
  2. 软件实现:
     - 代码开发
     - 功能测试
     - 性能优化
  3. 系统测试:
     - 功能测试
     - 性能测试
     - 可靠性测试
     - 功耗测试
  4. 问题记录与解决方案

  嵌入式调试方法:
  - 串口调试
  - JTAG/SWD 调试
  - 逻辑分析仪
  - 示波器
  - 功耗分析仪

  测试用例设计:
  - 正常功能测试
  - 边界条件测试
  - 异常处理测试
  - 长时间运行测试
`, {
  label: '系统实现',
  phase: '实现',
  schema: IMPLEMENTATION_RESULT_SCHEMA,
})

log('系统实现完成')
log('功能测试: ' + (implementation.testing_results?.functional_tests?.length || 0) + ' 项')
log('性能测试: ' + (implementation.testing_results?.performance_tests?.length || 0) + ' 项')

return {
  implementation,
  action_items: getThesisActionItems('implementation', implementation, args),
  state: { produced: getThesisState('implementation', implementation, args) },
}

// ============================================================
// Phase 5: 论文撰写
// ============================================================

phase('写作')
log('开始论文撰写...')

const thesisStructure = isMaster ? [
  { name: '摘要', content: '中英文摘要', word_count: 500 },
  { name: '第一章 绪论', content: '研究背景、意义、现状、内容', word_count: 3000 },
  { name: '第二章 相关技术', content: '技术原理、开发环境', word_count: 4000 },
  { name: '第三章 系统设计', content: '需求分析、架构设计、详细设计', word_count: 5000 },
  { name: '第四章 系统实现', content: '硬件实现、软件实现、系统集成', word_count: 5000 },
  { name: '第五章 系统测试', content: '测试环境、测试用例、测试结果', word_count: 3000 },
  { name: '第六章 总结与展望', content: '工作总结、不足与展望', word_count: 1500 },
  { name: '参考文献', content: '参考文献列表', word_count: 0 },
  { name: '致谢', content: '致谢', word_count: 300 },
  { name: '附录', content: '代码、电路图等', word_count: 0 },
] : [
  { name: '摘要', content: '中英文摘要', word_count: 300 },
  { name: '第一章 绪论', content: '研究背景、意义、内容', word_count: 2000 },
  { name: '第二章 相关技术', content: '技术原理', word_count: 2500 },
  { name: '第三章 系统设计', content: '设计过程', word_count: 3000 },
  { name: '第四章 系统实现', content: '实现过程', word_count: 3000 },
  { name: '第五章 总结', content: '总结与展望', word_count: 1000 },
  { name: '参考文献', content: '参考文献列表', word_count: 0 },
  { name: '致谢', content: '致谢', word_count: 200 },
]

const sections = []
for (const section of thesisStructure) {
  log('撰写章节: ' + section.name)

  const draft = await agent(`
    为嵌入式/电气工程领域的中文学位论文撰写章节内容。

    章节信息:
    - 名称: ${section.name}
    - 内容要点: ${section.content}
    - 目标字数: ${section.word_count}

    论文上下文:
    - 题目: ${topic || '基于 STM32 的智能家居系统设计'}
    - 专业: ${major || '电气工程及其自动化'}
    - 学位级别: ${isMaster ? '硕士' : '本科'}

    系统设计:
    - 架构: ${systemDesign.overall_architecture || ''}
    - 主控: ${systemDesign.hardware_design?.main_controller || ''}
    - 外设: ${systemDesign.hardware_design?.peripherals?.join(', ') || ''}

    实现结果:
    - 功能测试: ${implementation.testing_results?.functional_tests?.join(', ') || ''}
    - 性能测试: ${implementation.testing_results?.performance_tests?.join(', ') || ''}

    要求:
    1. 使用 LaTeX 格式
    2. 中文学术写作风格
    3. 适当引用文献
    4. 包含图表占位符
    5. 嵌入式/电气工程专业术语准确

    特别注意:
    - 硬件描述要准确（芯片型号、引脚配置）
    - 软件流程要清晰（程序流程图、时序图）
    - 实验数据要真实可信
    - 图表编号要规范
  `, {
    label: '撰写: ' + section.name,
    phase: '写作',
    schema: DRAFT_SECTION_SCHEMA,
  })

  sections.push(draft)
  log('完成: ' + section.name + ' (' + (draft.word_count || 0) + ' 字)')
}

log('论文撰写完成: ' + sections.length + ' 个章节')
log('总字数: ' + sections.reduce((sum, s) => sum + (s.word_count || 0), 0))

return {
  sections,
  action_items: getThesisActionItems('write', { sections_count: sections.length }, args),
  state: { produced: getThesisState('write', { sections_count: sections.length }, args) },
}

// ============================================================
// Phase 6: LaTeX 排版
// ============================================================

phase('格式')
log('开始 LaTeX 排版...')

const formatResult = await agent(`
  为嵌入式/电气工程领域的中文学位论文进行 LaTeX 排版。

  论文信息:
  - 题目: ${topic || '基于 STM32 的智能家居系统设计'}
  - 学校: ${university || '待指定'}
  - 专业: ${major || '电气工程及其自动化'}
  - 学位级别: ${isMaster ? '硕士' : '本科'}

  章节内容:
  ${sections.map(s => `## ${s.section_name}\n${s.content?.substring(0, 200)}...`).join('\n\n')}

  要求:
  1. 选择学位论文模板
  2. 配置中文支持（ctex 包）
  3. 生成完整的 .tex 文件
  4. 包含参考文献 .bib 文件
  5. 图表编号和交叉引用
  6. 目录生成
  7. 页眉页脚配置

  学位论文格式要求:
  - 封面格式
  - 中英文摘要
  - 目录
  - 正文
  - 参考文献
  - 致谢
  - 附录

  嵌入式论文特殊格式:
  - 代码高亮（listings 包）
  - 电路图（circuitikz 包）
  - 系统架构图（tikz 包）
  - 时序图（pgfplots 包）
  - 数据表格（booktabs 包）
`, {
  label: 'LaTeX 排版',
  phase: '格式',
})

log('排版完成')

return {
  format: formatResult,
  action_items: getThesisActionItems('format', null, args),
  state: { produced: getThesisState('format', null, args) },
}

// ============================================================
// Phase 7: 质量审查
// ============================================================

phase('审查')
log('开始论文审查...')

const review = await agent(`
  对嵌入式/电气工程领域的中文学位论文进行全面审查。

  论文信息:
  - 题目: ${topic || '基于 STM32 的智能家居系统设计'}
  - 专业: ${major || '电气工程及其自动化'}
  - 学位级别: ${isMaster ? '硕士' : '本科'}

  审查维度:
  1. 内容质量:
     - 创新性（硕士要求高，本科要求适中）
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

  学位论文评审标准:
  - 优秀 (90-100): 创新性强，工作量大，质量高
  - 良好 (80-89): 有一定创新，工作量适中，质量较好
  - 中等 (70-79): 创新性一般，工作量基本达到要求
  - 及格 (60-69): 创新性不足，工作量勉强达到要求
  - 不及格 (<60): 不符合学位论文要求

  常见问题检查:
  - 查重率（本科 < 30%，硕士 < 15%）
  - 格式规范
  - 图表质量
  - 参考文献格式
  - 学术不端
`, {
  label: '论文审查',
  phase: '审查',
  schema: REVIEW_RESULT_SCHEMA,
})

log('审查完成: ' + (review.overall_score || 0) + '/100')
log('优势: ' + (review.strengths?.length || 0) + ' 个')
log('不足: ' + (review.weaknesses?.length || 0) + ' 个')

return {
  review,
  action_items: getThesisActionItems('review', review, args),
  state: { produced: getThesisState('review', review, args) },
}

// ============================================================
// 最终输出
// ============================================================

log('中文学位论文写作工作流完成!')
log('题目: ' + (topic || '待定'))
log('总字数: ' + sections.reduce((sum, s) => sum + (s.word_count || 0), 0))
log('评分: ' + (review.overall_score || 0) + '/100')

return {
  success: true,
  thesis: {
    topic: topic,
    university: university,
    major: major,
    degree_level: isMaster ? 'master' : 'bachelor',
    topicAnalysis: topicAnalysis,
    literature: literature,
    systemDesign: systemDesign,
    implementation: implementation,
    sections: sections,
    format: formatResult,
    review: review,
  },
  summary: {
    total_words: sections.reduce((sum, s) => sum + (s.word_count || 0), 0),
    sections_count: sections.length,
    innovation_points: topicAnalysis.innovation_points?.length || 0,
    overall_score: review.overall_score || 0,
  },
  action_items: [
    { step: 1, action: 'review', title: '最终审查', detail: '论文已完成，请检查所有内容', depends_on: [] },
    { step: 2, action: 'manual', title: '根据导师意见修改', detail: review.suggestions?.join('\n') || '无修改建议', depends_on: ['step_1'] },
    { step: 3, action: 'workflow', title: '查重检测', detail: '使用查重工具检测重复率', depends_on: ['step_2'] },
    { step: 4, action: 'manual', title: '格式最终调整', detail: '确保格式完全符合学校要求', depends_on: ['step_3'] },
    { step: 5, action: 'manual', title: '准备答辩', detail: '制作答辩 PPT，准备答辩演讲', depends_on: ['step_4'] },
  ],
  state: { produced: getThesisState('complete', null, args) },
}