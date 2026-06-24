// vector-store.test.js — 向量存储单元测试
// 运行方式: node workflows/__tests__/vector-store.test.js

import fs from 'fs'

let passed = 0, failed = 0
const P = []

function check(desc, condition) {
  if (condition) { passed++; P.push(`  ✅ ${desc}`) }
  else { failed++; P.push(`  ❌ ${desc}`) }
}

function phase(name) {
  console.log(`\n▸ ${name}`)
}

// ── Test 1: import — 模块导入 ──
phase('import')

let VectorStore
try {
  const mod = await import('../vector-store.js')
  VectorStore = mod.default || mod.VectorStore
  check('导入 vector-store 模块', true)
} catch (e) {
  check('导入 vector-store 模块', false)
  console.log(P.join('\n'))
  throw new Error(`导入失败: ${e.message}`)
}

// ── Test 2: vector_gen — 向量生成 ──
phase('vector_gen')

const store = new VectorStore({ dimension: 256 })
check('创建 VectorStore 实例', store !== null)
check('dimension 属性正确', store.dimension === 256)

// 生成向量
const text1 = 'TinyML inference on STM32 microcontroller'
const text2 = 'Machine learning for embedded devices'
const vec1 = store.generateEmbedding(text1)
check('生成向量返回数组', Array.isArray(vec1))
check('向量维度正确', vec1.length === 256)
check('向量值在 [-1, 1] 范围', vec1.every(v => v >= -1 && v <= 1))

const vec2 = store.generateEmbedding(text2)
check('不同文本生成不同向量', JSON.stringify(vec1) !== JSON.stringify(vec2))

// 相同文本生成相同向量（确定性）
const vec1b = store.generateEmbedding(text1)
check('相同文本生成相同向量', JSON.stringify(vec1) === JSON.stringify(vec1b))

// ── Test 3: storage — 存储和读取 ──
phase('storage')

const testItem = {
  id: 'test/project-1',
  text: text1,
  metadata: { name: 'test/project', stars: 1000 }
}

store.add(testItem)
check('添加项目到存储', store.size === 1)

const retrieved = store.get('test/project-1')
check('获取项目成功', retrieved !== null)
check('获取项目 ID 正确', retrieved?.id === 'test/project-1')
check('获取项目文本正确', retrieved?.text === text1)
check('获取项目元数据正确', retrieved?.metadata?.stars === 1000)

// 添加多个项目
store.add({ id: 'test/project-2', text: text2, metadata: { name: 'test/project-2' } })
store.add({ id: 'test/project-3', text: 'Deep learning on edge', metadata: { name: 'test/project-3' } })
check('添加多个项目', store.size === 3)

// 删除项目
store.remove('test/project-2')
check('删除项目', store.size === 2)
check('删除后获取返回 null', store.get('test/project-2') === null)

// ── Test 4: search — 语义检索 ──
phase('search')

// 搜索相关项目（之前删除了 project-2，所以只有 2 个项目）
const results = store.search('embedded machine learning', 3)
check('搜索返回数组', Array.isArray(results))
check('搜索结果数量正确', results.length === 2)

// 搜索结果按相似度排序
if (results.length >= 2) {
  check('搜索结果按相似度降序', results[0].score >= results[1].score)
}

// 搜索结果包含分数
check('搜索结果包含 score 字段', results[0] && typeof results[0].score === 'number')
check('搜索结果分数在 [-1, 1] 范围', results.every(r => r.score >= -1 && r.score <= 1))

// 搜索不存在的内容
const emptyResults = store.search('quantum computing blockchain', 5)
check('搜索不相关内容返回空数组', emptyResults.length === 0 || emptyResults[0].score < 0.3)

// ── Test 5: edge_cases — 边界情况 ──
phase('edge_cases')

// 空文本
const emptyVec = store.generateEmbedding('')
check('空文本生成向量', Array.isArray(emptyVec) && emptyVec.length === 256)

// 特殊字符
const specialVec = store.generateEmbedding('!@#$%^&*()_+{}|:"<>?')
check('特殊字符生成向量', Array.isArray(specialVec) && specialVec.length === 256)

// 中文文本
const chineseVec = store.generateEmbedding('嵌入式系统人工智能')
check('中文文本生成向量', Array.isArray(chineseVec) && chineseVec.length === 256)

// 空存储搜索
const emptyStore = new VectorStore({ dimension: 256 })
const emptySearchResults = emptyStore.search('test', 5)
check('空存储搜索返回空数组', emptySearchResults.length === 0)

// 保存和加载
const saved = store.save('/tmp/test-vector-store.json')
check('保存到文件', saved === true)

const loadedStore = VectorStore.load('/tmp/test-vector-store.json')
check('从文件加载', loadedStore !== null)
check('加载后数据完整', loadedStore.size === store.size)

// 清理测试文件
if (fs.existsSync('/tmp/test-vector-store.json')) {
  fs.unlinkSync('/tmp/test-vector-store.json')
}

// ── 输出结果 ──
console.log('\n📊 向量存储测试结果:')
console.log(P.join('\n'))
console.log(`\n✅ 通过: ${passed} / ❌ 失败: ${failed}`)

if (failed > 0) {
  throw new Error(`${failed} 个测试失败`)
}
