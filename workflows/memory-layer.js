// 记忆层 Workflow — Agent 系统的持久化记忆
// 输入: { action, query?, name?, type?, content?, for? }
// 输出: 记忆搜索结果 / 读取内容 / 写入确认 / 格式化上下文
//
// 使用方式:
//   Workflow({ scriptPath: '.claude/workflows/memory-layer.js', args: { action: 'search', query: 'I2C' } })
//   Workflow({ scriptPath: '.claude/workflows/memory-layer.js', args: { action: 'read', name: 'project-goal' } })
//   Workflow({ scriptPath: '.claude/workflows/memory-layer.js', args: { action: 'write', name: 'xxx', description: '...', type: 'decision', content: '...' } })
//   Workflow({ scriptPath: '.claude/workflows/memory-layer.js', args: { action: 'context', for: '当前任务描述...' } })
//   Workflow({ scriptPath: '.claude/workflows/memory-layer.js', args: { action: 'vector_search', query: '嵌入式系统' } })
//   Workflow({ scriptPath: '.claude/workflows/memory-layer.js', args: { action: 'add_to_vector', name: 'xxx', content: '...' } })

import { VectorStore } from './vector-store.js'

export const meta = {
  name: 'memory-layer',
  description: '记忆层：持久化记忆读写 + 上下文注入 + 检索',
  phases: [
    { title: '检索', detail: '扫描 MEMORY.md 索引，匹配关键词' },
    { title: '读写', detail: '读取/写入持久化记忆文件' },
    { title: '交付', detail: '格式化输出' },
  ],
}

// ============================================================
// Schema 定义
// ============================================================

const MEMORY_INDEX_SCHEMA = {
  type: 'object',
  properties: {
    matches: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: '记忆名称 (slug)' },
          description: { type: 'string', description: '一行摘要' },
          file: { type: 'string', description: '文件名' },
          type: { type: 'string', description: '记忆类型' },
        },
      },
    },
  },
}

const MEMORY_FILE_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    content: { type: 'string', description: '文件正文' },
    type: { type: 'string' },
  },
}

const MEMORY_WRITE_RESULT_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    file: { type: 'string', description: '写入的文件名' },
    path: { type: 'string', description: '完整路径' },
    index_line: { type: 'string', description: '追加到 MEMORY.md 的索引行' },
    error: { type: 'string' },
  },
}

const CONTEXT_SCHEMA = {
  type: 'object',
  properties: {
    context: { type: 'string', description: '格式化后的记忆上下文，供注入到 agent prompt' },
    source_count: { type: 'number', description: '匹配到的记忆文件数量' },
  },
}

const CODEGRAPH_RESULT_SCHEMA = {
  type: 'object',
  properties: {
    resolved: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          symbol: { type: 'string', description: '原始符号名' },
          file: { type: 'string', description: '文件路径' },
          line: { type: 'number', description: '行号' },
          signature: { type: 'string', description: '函数签名' },
          code: { type: 'string', description: '源码片段（截取前 20 行）' },
          error: { type: 'string', description: '解析错误信息' },
        },
        required: ['symbol'],
      },
    },
  },
}

// ============================================================
// 记忆文件路径（可通过 args.memory_dir 覆盖）
// ============================================================

const MEMORY_DIR = args.memory_dir || 'C:/Users/zhang/.claude/projects/C--Users-zhang/memory'
const MEMORY_INDEX_PATH = `${MEMORY_DIR}/MEMORY.md`

// ============================================================
// Phase 1: 检索记忆（search / list / context 检索子步骤）
// ============================================================

phase('Phase 1: 检索记忆')

// --- 参数准备 ---
const action = args.action || 'help'
const query = args.query || ''
const name = args.name || ''
const type = args.type || ''
const content = args.content || ''
const forContext = args.for || ''
const description = args.description || ''

let result = null

// --- 参数校验 ---
if (action === 'read' && !name) throw new Error('read action 缺少 name 参数')
if (action === 'write' && !name) throw new Error('write action 缺少 name 参数')
if (action === 'write' && !content) throw new Error('write action 缺少 content 参数')
if (action === 'context' && !forContext) throw new Error('context action 缺少 for 参数')

// --- Search ---
if (action === 'search') {
  log(`检索: "${query}" (type=${type || 'all'})`)

  const searchResult = await agent(
    `你是记忆检索 agent。你的任务是：
1. 读取文件 ${MEMORY_INDEX_PATH}（MEMORY.md 索引）
2. 在索引中搜索与 "${query}" 匹配的行（大小写不敏感）
${type ? `3. 按类型 "${type}" 过滤（匹配 metadata.type 字段）` : ''}
4. 返回所有匹配的条目，包含 name, description, file, type

索引格式示例（每行一个条目）：
- [Title](file.md) — description

只返回匹配的条目。不匹配则返回空数组。`,
    { schema: MEMORY_INDEX_SCHEMA, label: '搜索记忆索引' }
  )

  if (searchResult?.matches?.length) {
    log(`找到 ${searchResult.matches.length} 个匹配`)
  } else {
    log('未找到匹配的记忆')
  }
  result = searchResult || { matches: [] }
}

// --- List ---
else if (action === 'list') {
  log(`列出记忆 (type=${type || 'all'})`)

  const listResult = await agent(
    `你是记忆检索 agent。你的任务是：
1. 读取文件 ${MEMORY_INDEX_PATH}（MEMORY.md 索引）
2. ${type ? `只保留 metadata.type 为 "${type}" 的条目` : '列出所有条目'}
3. 返回所有匹配的条目，包含 name, description, file, type

索引格式示例（每行一个条目）：
- [Title](file.md) — description

返回所有条目。`,
    { schema: MEMORY_INDEX_SCHEMA, label: '列出记忆索引' }
  )

  if (listResult?.matches?.length) {
    log(`共 ${listResult.matches.length} 条记忆`)
  } else {
    log('记忆库为空')
  }
  result = listResult || { matches: [] }
}

// ============================================================
// Phase 2: 读写（read / write / context 文件读子步骤）
// ============================================================

// --- Read ---
if (action === 'read') {
  phase('Phase 2: 读写')
  log(`读取: ${name}.md`)

  const readResult = await agent(
    `你是记忆读取 agent。你的任务是读取长期记忆文件。

文件路径: ${MEMORY_DIR}/${name}.md

步骤:
1. 读取文件。如果文件不存在，设置 name="" 并说明
2. 解析 YAML frontmatter（--- 之间的部分）获取 name, description, type
3. 返回正文内容（frontmatter 之后的部分）

返回格式: { name, description, type, content }`,
    { schema: MEMORY_FILE_SCHEMA, label: '读取记忆文件' }
  )

  if (readResult?.name) {
    log(`✅ 成功读取: ${readResult.name}`)
    result = readResult
  } else {
    log(`⚠️ 文件 ${name}.md 不存在`)
    result = { name, content: '文件不存在', exists: false }
  }
}

// --- Write ---
else if (action === 'write') {
  phase('Phase 2: 读写')

  // Step 1: 解析代码符号（通过 Codegraph）
  const symbols = args.symbols || []
  let codeIndexSection = ''
  const SYMBOLS_FRONTMATTER = symbols.length > 0
    ? '  symbols:\n' + symbols.map(s => `    - "${s}"`).join('\n')
    : ''

  if (symbols.length > 0) {
    log(`解析 ${symbols.length} 个代码符号: ${symbols.join(', ')}`)
    const codeResult = await agent(
      `你有 Codegraph MCP 工具可用。解析以下代码符号在当前项目中的位置和源码。

符号列表:
${symbols.map(s => '  - ' + s).join('\n')}

对每个符号，使用 codegraph_node 工具（设置 includeCode=true）获取完整的定义位置和源码。
如果 codegraph_node 找不到某个符号，再尝试 codegraph_search。
如果都找不到，设 error 字段描述原因。

返回每个符号的: symbol, file, line, signature, code(前20行), error(可选)`,
      { schema: CODEGRAPH_RESULT_SCHEMA, label: '解析代码符号', phase: 'Phase 2: 读写' }
    )

    if (codeResult?.resolved?.length) {
      const valid = codeResult.resolved.filter(r => !r.error)
      const failed = codeResult.resolved.filter(r => r.error)
      if (valid.length > 0) {
        codeIndexSection = '\n\n## 代码索引\n\n' +
          '| 符号 | 文件 | 行号 | 签名 |\n' +
          '|------|------|:----:|------|\n' +
          valid.map(r =>
            `| \`${r.symbol}\` | \`${r.file}\` | ${r.line || '-'} | ${(r.signature || '').substring(0, 60)} |`
          ).join('\n') +
          '\n\n' +
          valid.map(r =>
            r.code ? `### \`${r.symbol}\` (${r.file}:${r.line})\n\n\`\`\`c\n${r.code}\n\`\`\`\n\n` : ''
          ).filter(Boolean).join('')
        log(`✅ Codegraph 解析: ${valid.length} 成功, ${failed.length} 失败`)
      }
      if (failed.length > 0) {
        log(`⚠️ 未能解析的符号: ${failed.map(f => f.symbol).join(', ')}`)
      }
    } else {
      log('⚠️ Codegraph 未返回解析结果（项目可能尚未索引）')
    }
  }

  log(`写入: ${name}.md (${type || '未分类'})`)

  const enhancedContent = content + codeIndexSection

  const writeResult = await agent(
    `你是记忆写入 agent。你的任务是创建新的长期记忆并更新索引。

记忆文件路径: ${MEMORY_DIR}/${name}.md
索引文件路径: ${MEMORY_INDEX_PATH}

步骤:
1. 创建文件 ${MEMORY_DIR}/${name}.md:
---
name: ${name}
description: ${description}
metadata:
  type: ${type || 'reference'}
${SYMBOLS_FRONTMATTER}
---

${enhancedContent}

2. 检查 ${MEMORY_INDEX_PATH} 中是否已有 ${name} 的索引行
   - 格式: "- [任何文本](${name}.md) — 任何描述"
   - 如果不存在：在文件末尾追加一行 "- [${description || name}](${name}.md) — ${description || name}"
   - 如果已存在：不要重复追加

3. 如果文件已存在 ${MEMORY_DIR}/${name}.md，先读取后追加内容（不覆盖）

返回: { success: true/false, file: "${name}.md", path: "${MEMORY_DIR}/${name}.md", index_line: "...", error: "..." }`,
    { schema: MEMORY_WRITE_RESULT_SCHEMA, label: '写入记忆文件' }
  )

  if (writeResult?.success) {
    log(`✅ 写入成功: ${writeResult.file}`)
    if (symbols.length > 0) log(`  代码符号已记录: ${symbols.length} 个`)
  } else {
    log(`❌ 写入失败: ${writeResult?.error || '未知错误'}`)
  }
  result = writeResult || { success: false, error: 'agent 未返回结果' }
}

// --- Context (two-phase: search → parallel read → format) ---
else if (action === 'context') {
  log(`生成上下文: "${forContext.substring(0, 80)}..."`)

  // Step 1: 检索相关记忆（仍在 Phase 1）
  const searchCtx = await agent(
    `你是记忆检索 agent。当前任务: "${forContext}"

1. 读取 ${MEMORY_INDEX_PATH}（MEMORY.md 索引）
2. 找出与当前任务最相关的记忆条目（关键词匹配即可）
3. 最多返回 5 条最相关的
4. 如果没有任何相关条目，返回空数组

每个返回条目需要: name, file, description`,
    { schema: MEMORY_INDEX_SCHEMA, label: '检索上下文相关记忆' }
  )

  const relevant = (searchCtx?.matches || []).filter(Boolean)
  log(`找到 ${relevant.length} 条相关记忆`)

  if (relevant.length === 0) {
    result = { context: '', source_count: 0 }
  } else {
    // Step 2: 并行读取所有相关文件
    phase('Phase 2: 读写')
    log(`并行读取 ${relevant.length} 个记忆文件...`)

    const fileReads = relevant.map(m => () =>
      agent(
        `读取记忆文件 ${MEMORY_DIR}/${m.file}

解析 YAML frontmatter 获取 name, description, type。
返回文件的完整正文内容。

如果没有这个文件，返回 { name: "${m.name}", content: "[文件不存在]" }`,
        { schema: MEMORY_FILE_SCHEMA, label: `读取: ${m.name}` }
      )
    )

    const readResults = (await parallel(fileReads)).filter(Boolean)

    // Step 3: 格式化输出（Phase 3 负责）
    const fetched = readResults.filter(r => r?.name && r.content !== '[文件不存在]')

    if (fetched.length > 0) {
      // 统计代码索引引用
      const withCodeRefs = fetched.filter(f => f.content && f.content.includes('## 代码索引'))
      const codeRefNote = withCodeRefs.length > 0
        ? `[代码引用: ${withCodeRefs.length} 个文件包含 codegraph 符号索引，可追踪到源代码位置]\n\n`
        : ''

      let ctxStr = '<memory-context>\n'
      ctxStr += '[记忆上下文 — 以下是从长期记忆中检索的持久化知识，不是新输入]\n\n'
      if (codeRefNote) ctxStr += codeRefNote
      for (const f of fetched) {
        ctxStr += `=== ${f.name} ===\n`
        ctxStr += `${f.content}\n\n`
      }
      ctxStr += '</memory-context>'

      if (withCodeRefs.length > 0) {
        log(`✅ ${withCodeRefs.length}/${fetched.length} 个文件含 codegraph 代码索引`)
      }
      log(`✅ 生成 ${fetched.length} 条上下文 (${ctxStr.length} 字符)`)
      result = { context: ctxStr, source_count: fetched.length }
    } else {
      log('没有可用的上下文（文件均不存在）')
      result = { context: '', source_count: 0 }
    }
  }
}

// --- Vector Search ---
else if (action === 'vector_search') {
  phase('Phase 1.5: 向量检索')
  log(`向量检索: "${query}" (topK=${args.topK || 5})`)

  const vectorStorePath = `${MEMORY_DIR}/vector-store.json`
  const topK = args.topK || 5

  // 检查向量存储文件是否存在
  const fs = require('fs')
  if (!fs.existsSync(vectorStorePath)) {
    log('向量存储文件不存在，返回空结果')
    result = { matches: [], total: 0 }
  } else {
    // 使用 VectorStore 进行语义检索
    const vectorSearchResult = await agent(
      `你是向量检索 agent。你的任务是：

1. 读取向量存储文件: ${vectorStorePath}
2. 使用 cosine similarity 检索与 "${query}" 最相关的 ${topK} 个条目
3. 返回检索结果，包含 id, text, metadata, score

向量存储格式:
{
  "dimension": 256,
  "items": [
    {
      "id": "string",
      "text": "string",
      "metadata": {},
      "vector": [0.1, 0.2, ...]
    }
  ]
}

对查询文本 "${query}" 生成向量嵌入（使用相同的 hash 方法），然后计算与所有存储向量的 cosine similarity。

返回格式: { matches: [{ id, text, metadata, score }], total: number }`,
      { schema: MEMORY_INDEX_SCHEMA, label: '向量语义检索' }
    )

    if (vectorSearchResult?.matches?.length) {
      log(`向量检索找到 ${vectorSearchResult.matches.length} 个匹配`)
    } else {
      log('向量检索未找到匹配')
    }
    result = vectorSearchResult || { matches: [], total: 0 }
  }
}

// --- Add to Vector Store ---
else if (action === 'add_to_vector') {
  phase('Phase 1.5: 添加到向量存储')
  log(`添加到向量存储: ${name}`)

  const vectorStorePath = `${MEMORY_DIR}/vector-store.json`
  const fs = require('fs')

  // 读取或创建向量存储
  let vectorStore = { dimension: 256, items: [] }
  if (fs.existsSync(vectorStorePath)) {
    try {
      vectorStore = JSON.parse(fs.readFileSync(vectorStorePath, 'utf8'))
    } catch (e) {
      log(`⚠️ 读取向量存储失败: ${e.message}`)
    }
  }

  // 检查是否已存在
  const existingIndex = vectorStore.items.findIndex(item => item.id === name)
  if (existingIndex >= 0) {
    log(`更新已存在的条目: ${name}`)
    vectorStore.items[existingIndex] = {
      id: name,
      text: content,
      metadata: { type: type || 'reference', description: description || name },
      vector: [] // 向量会在检索时生成
    }
  } else {
    log(`添加新条目: ${name}`)
    vectorStore.items.push({
      id: name,
      text: content,
      metadata: { type: type || 'reference', description: description || name },
      vector: [] // 向量会在检索时生成
    })
  }

  // 保存向量存储
  try {
    fs.writeFileSync(vectorStorePath, JSON.stringify(vectorStore, null, 2), 'utf8')
    log(`✅ 已保存到向量存储: ${vectorStorePath}`)
    result = { success: true, file: vectorStorePath, total: vectorStore.items.length }
  } catch (e) {
    log(`❌ 保存失败: ${e.message}`)
    result = { success: false, error: e.message }
  }
}

// --- List Vector Store ---
else if (action === 'list_vector') {
  phase('Phase 1.5: 列出向量存储')
  log('列出向量存储')

  const vectorStorePath = `${MEMORY_DIR}/vector-store.json`
  const fs = require('fs')

  if (!fs.existsSync(vectorStorePath)) {
    log('向量存储文件不存在')
    result = { items: [], total: 0 }
  } else {
    try {
      const vectorStore = JSON.parse(fs.readFileSync(vectorStorePath, 'utf8'))
      log(`向量存储包含 ${vectorStore.items.length} 个条目`)
      result = {
        items: vectorStore.items.map(item => ({
          id: item.id,
          text: item.text,
          metadata: item.metadata,
        })),
        total: vectorStore.items.length,
      }
    } catch (e) {
      log(`❌ 读取失败: ${e.message}`)
      result = { items: [], total: 0, error: e.message }
    }
  }
}

// --- Help ---
else if (action === 'help' || action === '') {
  log('记忆层 Workflow — 可用的 actions:')
  log('')
  log('  search  query=<关键词>  [type=<类型>]')
  log('    搜索记忆索引，返回匹配的条目列表')
  log('')
  log('  list    [type=<类型>]')
  log('    列出所有记忆（可按类型过滤）')
  log('')
  log('  read    name=<记忆名>')
  log('    读取指定记忆文件的完整内容')
  log('')
  log('  write   name=<记忆名>  content=<正文>  [description=<摘要>]  [type=<类型>]  [symbols=<符号数组>]')
  log('    创建或追加新的长期记忆，自动更新索引')
  log('    symbols: 可选，传入代码符号名数组，自动通过 Codegraph 解析并附加代码索引')
  log('    示例: symbols=["timer_init", "led_pwm_set_duty"]')
  log('')
  log('  context for=<任务描述>')
  log('    检索相关记忆并格式化为可注入 agent prompt 的上下文块')
  log('')
  log('  vector_search  query=<查询文本>  [topK=<返回数量>]')
  log('    语义向量检索，使用 cosine similarity 找到最相关的记忆')
  log('')
  log('  add_to_vector  name=<条目ID>  content=<文本>  [type=<类型>]  [description=<描述>]')
  log('    添加条目到向量存储（用于语义检索）')
  log('')
  log('  list_vector')
  log('    列出向量存储中的所有条目')
  log('')
  log('示例:')
  log('  Workflow({ name: "memory-layer", args: { action: "search", query: "I2C" } })')
  log('  Workflow({ name: "memory-layer", args: { action: "list", type: "project" } })')
  log('  Workflow({ name: "memory-layer", args: { action: "read", name: "project-goal" } })')
  log('  Workflow({ name: "memory-layer", args: { action: "write", name: "new-note", description: "...", type: "reference", content: "..." } })')
  log('  Workflow({ name: "memory-layer", args: { action: "write", name: "bug-fix", content: "...", symbols: ["timer_init", "led_set_mode"] } })')
  log('  Workflow({ name: "memory-layer", args: { action: "context", for: "当前任务描述" } })')
  log('  Workflow({ name: "memory-layer", args: { action: "vector_search", query: "嵌入式系统", topK: 5 } })')
  log('  Workflow({ name: "memory-layer", args: { action: "add_to_vector", name: "i2c-guide", content: "I2C 协议详解", type: "reference" } })')
  log('  Workflow({ name: "memory-layer", args: { action: "list_vector" } })')

  result = {
    help: true,
    actions: ['search', 'list', 'read', 'write', 'context', 'vector_search', 'add_to_vector', 'list_vector'],
    examples: {
      search: { action: 'search', query: 'I2C' },
      list: { action: 'list', type: 'project' },
      read: { action: 'read', name: 'project-goal' },
      write: { action: 'write', name: 'new-note', description: '摘要', type: 'reference', content: '正文内容' },
      write_with_symbols: { action: 'write', name: 'bug-fix', content: '正文', symbols: ['timer_init', 'led_set_mode'] },
      context: { action: 'context', for: '当前任务描述' },
      vector_search: { action: 'vector_search', query: '嵌入式系统', topK: 5 },
      add_to_vector: { action: 'add_to_vector', name: 'i2c-guide', content: 'I2C 协议详解', type: 'reference' },
      list_vector: { action: 'list_vector' },
    },
  }
}

// ============================================================
// Phase 3: 交付
// ============================================================

phase('Phase 3: 交付')

if (result) {
  log(`✅ action=${action} 完成`)
}

// --- 记忆层 action_items（AI 推理步骤清单） ---
function getMemoryActionItems(act, res) {
  const items = {
    search: [
      { step: 1, action: 'workflow', title: '读取匹配的记忆文件', skill: null, detail: '搜索到 ' + (res?.matches?.length || 0) + ' 条记忆，依次调 memory-layer read 读取每条内容', reason: '搜索只返回元数据，需要读取正文才能使用', expects: '完整的记忆内容', depends_on: [] },
      { step: 2, action: 'manual', title: '将记忆内容应用到当前上下文', skill: null, detail: '根据搜索到的记忆内容，更新当前对话中的技术判断、决策记录或约束条件', reason: '记忆层的价值在于应用而非存储', expects: '记忆内容已整合到当前任务中', depends_on: ['step_1'] },
    ],
    read: [
      { step: 1, action: 'manual', title: '将记忆内容应用到当前任务', skill: null, detail: res?.content && res.content !== '文件不存在' ? '内容已读取，请在当前对话中引用' : '文件不存在，可能需要先 write', reason: '已读取的记忆可以直接在对话中使用', expects: '记忆内容已应用', depends_on: [] },
    ],
    write: [
      { step: 1, action: 'verify', title: '验证写入成功', skill: null, detail: res?.success ? '写入成功: ' + res.file : '写入失败: ' + (res?.error || '未知') + '，请重试', reason: '确保持久化写入和索引更新', expects: '记忆已持久化可检索', depends_on: [] },
    ],
    context: [
      { step: 1, action: 'manual', title: '将记忆上下文注入 agent prompt', skill: null, detail: (res?.source_count || 0) + ' 条相关记忆已格式化 (' + (res?.context?.length || 0) + ' 字符)\n在后续 agent 调用时，将此上下文注入 prompt 以提高分析质量', reason: '历史经验能减少重复踩坑', expects: '上下文已在后续步骤中使用', depends_on: [] },
    ],
    list: [
      { step: 1, action: 'workflow', title: '选择并读取需要的记忆', skill: null, detail: '共 ' + (res?.matches?.length || 0) + ' 条记忆，选择需要的条目调 memory-layer read 读取', reason: '列表只显示元数据', expects: '选中的记忆已读取', depends_on: [] },
    ],
  }
  return items[act] || []
}

function getMemoryState(act, res) {
  const base = { action: act }
  if (act === 'search') return { ...base, matches_count: res?.matches?.length || 0, query: query }
  if (act === 'read') return { ...base, name: res?.name || null, exists: res?.content !== '文件不存在' }
  if (act === 'write') return { ...base, success: res?.success || false, name: res?.name || null, file: res?.file || null }
  if (act === 'context') return { ...base, source_count: res?.source_count || 0, context_length: res?.context?.length || 0 }
  if (act === 'list') return { ...base, total: res?.matches?.length || 0 }
  return base
}

const enrichedResult = result && typeof result === 'object'
  ? { ...result, action_items: getMemoryActionItems(action, result), state: { produced: getMemoryState(action, result) } }
  : result

return enrichedResult
