/**
 * JSON 验证器
 *
 * 职责：
 * - 验证缺陷数据格式
 * - 数据清洗
 */

class JsonValidator {
  /**
   * 验证缺陷记录
   */
  validateDefect(defect) {
    const errors = [];

    if (!defect.id || typeof defect.id !== 'string') {
      errors.push('defect.id 必须是非空字符串');
    }

    if (!defect.title || typeof defect.title !== 'string') {
      errors.push('defect.title 必须是非空字符串');
    }

    if (!defect.description || typeof defect.description !== 'string') {
      errors.push('defect.description 必须是非空字符串');
    }

    const validSeverities = ['critical', 'major', 'minor', 'trivial'];
    if (!validSeverities.includes(defect.severity)) {
      errors.push(`defect.severity 必须是以下之一: ${validSeverities.join(', ')}`);
    }

    const validPriorities = ['critical', 'high', 'medium', 'low'];
    if (!validPriorities.includes(defect.priority)) {
      errors.push(`defect.priority 必须是以下之一: ${validPriorities.join(', ')}`);
    }

    const validStatuses = ['open', 'in-progress', 'resolved', 'closed', 'reopened', 'deferred'];
    if (!validStatuses.includes(defect.status)) {
      errors.push(`defect.status 必须是以下之一: ${validStatuses.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证分类结果
   */
  validateClassification(classification) {
    const errors = [];

    const validSeverities = ['critical', 'major', 'minor', 'trivial'];
    if (!validSeverities.includes(classification.severity)) {
      errors.push(`classification.severity 必须是以下之一: ${validSeverities.join(', ')}`);
    }

    const validPriorities = ['critical', 'high', 'medium', 'low'];
    if (!validPriorities.includes(classification.priority)) {
      errors.push(`classification.priority 必须是以下之一: ${validPriorities.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 清洗缺陷数据
   */
  sanitizeDefect(defect) {
    return {
      id: defect.id || `BUG-${Date.now()}`,
      title: defect.title || '未命名缺陷',
      description: defect.description || '',
      type: defect.type || 'defect',
      severity: defect.severity || 'major',
      priority: defect.priority || 'high',
      status: defect.status || 'open',
      source: defect.source || 'unknown',
      reporter: defect.reporter || 'unknown',
      assignee: defect.assignee || null,
      createdAt: defect.createdAt || new Date().toISOString(),
      updatedAt: defect.updatedAt || new Date().toISOString(),
      resolvedAt: defect.resolvedAt || null,
      closedAt: defect.closedAt || null,
      reproduction: defect.reproduction || {
        steps: [],
        expected: '',
        actual: '',
        environment: '',
        buildVersion: ''
      },
      rootCause: defect.rootCause || null,
      resolution: defect.resolution || null,
      links: defect.links || {
        duplicateOf: null,
        blocks: [],
        blockedBy: [],
        relatedRequirements: [],
        relatedTests: []
      },
      comments: defect.comments || [],
      acceptanceCriteria: defect.acceptanceCriteria || []
    };
  }
}

module.exports = JsonValidator;
