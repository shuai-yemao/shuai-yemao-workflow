/**
 * 向量存储模块
 *
 * 功能：
 * - 向量生成（使用 hash 函数模拟 embedding）
 * - JSON 文件存储
 * - 语义检索（cosine similarity）
 *
 * 使用方式：
 *   import { VectorStore } from './vector-store.js'
 *   const store = new VectorStore({ dimension: 256 })
 *   store.add({ id: 'project-1', text: 'TinyML on STM32', metadata: {...} })
 *   const results = store.search('embedded ML', 5)
 */

import fs from 'fs'
import crypto from 'crypto'

class VectorStore {
  /**
   * 创建向量存储实例
   *
   * @param {Object} options
   * @param {number} options.dimension - 向量维度（默认 256）
   */
  constructor(options = {}) {
    this.dimension = options.dimension || 256
    this.items = new Map()  // id -> { id, text, metadata, vector }
  }

  /**
   * 生成文本的向量嵌入
   *
   * 使用确定性 hash 函数模拟 embedding，确保：
   * - 相同文本生成相同向量
   * - 向量值在 [-1, 1] 范围
   * - 维度正确
   *
   * @param {string} text - 输入文本
   * @returns {number[]} - 向量数组
   */
  generateEmbedding(text) {
    if (!text || text.length === 0) {
      // 空文本返回零向量
      return new Array(this.dimension).fill(0)
    }

    // 使用 SHA-256 生成确定性 hash
    const hash = crypto.createHash('sha256').update(text, 'utf8').digest()

    // 扩展到所需维度
    const vector = []
    for (let i = 0; i < this.dimension; i++) {
      // 从 hash 中循环取字节，映射到 [-1, 1]
      const byte = hash[i % hash.length]
      vector.push((byte / 127.5) - 1)
    }

    // 归一化，使向量长度为 1
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0))
    if (norm > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= norm
      }
    }

    return vector
  }

  /**
   * 计算两个向量的 cosine similarity
   *
   * @param {number[]} vec1 - 向量 1
   * @param {number[]} vec2 - 向量 2
   * @returns {number} - 相似度 [-1, 1]
   */
  cosineSimilarity(vec1, vec2) {
    if (vec1.length !== vec2.length) {
      throw new Error('向量维度不匹配')
    }

    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i]
      norm1 += vec1[i] * vec1[i]
      norm2 += vec2[i] * vec2[i]
    }

    norm1 = Math.sqrt(norm1)
    norm2 = Math.sqrt(norm2)

    if (norm1 === 0 || norm2 === 0) {
      return 0
    }

    return dotProduct / (norm1 * norm2)
  }

  /**
   * 添加项目到存储
   *
   * @param {Object} item
   * @param {string} item.id - 唯一标识
   * @param {string} item.text - 文本内容
   * @param {Object} item.metadata - 元数据
   */
  add(item) {
    const vector = this.generateEmbedding(item.text)
    this.items.set(item.id, {
      id: item.id,
      text: item.text,
      metadata: item.metadata || {},
      vector,
    })
  }

  /**
   * 获取项目
   *
   * @param {string} id - 项目 ID
   * @returns {Object|null} - 项目数据
   */
  get(id) {
    return this.items.get(id) || null
  }

  /**
   * 删除项目
   *
   * @param {string} id - 项目 ID
   */
  remove(id) {
    this.items.delete(id)
  }

  /**
   * 获取存储中的项目数量
   */
  get size() {
    return this.items.size
  }

  /**
   * 语义检索
   *
   * @param {string} query - 查询文本
   * @param {number} topK - 返回前 K 个结果
   * @returns {Array<{id, text, metadata, score}>} - 检索结果，按相似度降序
   */
  search(query, topK = 5) {
    const queryVector = this.generateEmbedding(query)
    const results = []

    for (const [id, item] of this.items) {
      const score = this.cosineSimilarity(queryVector, item.vector)
      results.push({
        id: item.id,
        text: item.text,
        metadata: item.metadata,
        score,
      })
    }

    // 按相似度降序排序
    results.sort((a, b) => b.score - a.score)

    // 返回前 K 个
    return results.slice(0, topK)
  }

  /**
   * 保存到 JSON 文件
   *
   * @param {string} filePath - 文件路径
   * @returns {boolean} - 是否成功
   */
  save(filePath) {
    try {
      const data = {
        dimension: this.dimension,
        items: Array.from(this.items.values()),
      }
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
      return true
    } catch (e) {
      console.error('保存失败:', e.message)
      return false
    }
  }

  /**
   * 从 JSON 文件加载
   *
   * @param {string} filePath - 文件路径
   * @returns {VectorStore|null} - 加载的存储实例
   */
  static load(filePath) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      const store = new VectorStore({ dimension: data.dimension })
      for (const item of data.items) {
        store.items.set(item.id, item)
      }
      return store
    } catch (e) {
      console.error('加载失败:', e.message)
      return null
    }
  }
}

export { VectorStore }
export default VectorStore
