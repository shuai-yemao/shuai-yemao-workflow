/**
 * JSON 验证器
 *
 * 职责：
 * - 验证输入数据格式
 * - 验证输出数据格式
 * - 提供数据清洗功能
 */

class JsonValidator {
  /**
   * 验证 Sprint 计划输入
   */
  validateSprintPlanningInput(data) {
    const errors = [];

    if (!data.requirements || !Array.isArray(data.requirements)) {
      errors.push('requirements 必须是数组');
    }

    if (typeof data.teamCapacity !== 'number' || data.teamCapacity <= 0) {
      errors.push('teamCapacity 必须是正数');
    }

    if (data.teamVelocity !== undefined) {
      if (typeof data.teamVelocity !== 'number' || data.teamVelocity <= 0) {
        errors.push('teamVelocity 必须是正数');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证每日例会输入
   */
  validateDailyStandupInput(data) {
    const errors = [];

    if (!data.date || !this.isValidDate(data.date)) {
      errors.push('date 必须是有效的日期格式 (YYYY-MM-DD)');
    }

    if (data.teamMembers && !Array.isArray(data.teamMembers)) {
      errors.push('teamMembers 必须是数组');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证 Sprint 评审输入
   */
  validateSprintReviewInput(data) {
    const errors = [];

    if (data.feedback && !Array.isArray(data.feedback)) {
      errors.push('feedback 必须是数组');
    }

    if (data.productDecision) {
      const validDecisions = ['approved', 'rejected', 'conditional', 'revise'];
      if (!validDecisions.includes(data.productDecision)) {
        errors.push(`productDecision 必须是以下之一: ${validDecisions.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证 Sprint 回顾输入
   */
  validateSprintRetrospectiveInput(data) {
    const errors = [];

    if (data.goodPoints && !Array.isArray(data.goodPoints)) {
      errors.push('goodPoints 必须是数组');
    }

    if (data.improvements && !Array.isArray(data.improvements)) {
      errors.push('improvements 必须是数组');
    }

    if (data.actionItems && !Array.isArray(data.actionItems)) {
      errors.push('actionItems 必须是数组');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证任务对象
   */
  validateTask(task) {
    const errors = [];

    if (!task.id || typeof task.id !== 'string') {
      errors.push('task.id 必须是非空字符串');
    }

    if (!task.title || typeof task.title !== 'string') {
      errors.push('task.title 必须是非空字符串');
    }

    if (task.storyPoints !== undefined) {
      if (typeof task.storyPoints !== 'number' || task.storyPoints <= 0) {
        errors.push('task.storyPoints 必须是正数');
      }
    }

    if (task.status) {
      const validStatuses = ['todo', 'in-progress', 'completed', 'blocked'];
      if (!validStatuses.includes(task.status)) {
        errors.push(`task.status 必须是以下之一: ${validStatuses.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证用户故事对象
   */
  validateUserStory(story) {
    const errors = [];

    if (!story.id || typeof story.id !== 'string') {
      errors.push('story.id 必须是非空字符串');
    }

    if (!story.title || typeof story.title !== 'string') {
      errors.push('story.title 必须是非空字符串');
    }

    if (story.priority) {
      const validPriorities = ['critical', 'high', 'medium', 'low'];
      if (!validPriorities.includes(story.priority)) {
        errors.push(`story.priority 必须是以下之一: ${validPriorities.join(', ')}`);
      }
    }

    if (story.storyPoints !== undefined) {
      const fibSequence = [1, 2, 3, 5, 8, 13, 21];
      if (!fibSequence.includes(story.storyPoints)) {
        errors.push('story.storyPoints 必须是 Fibonacci 数列中的值 (1, 2, 3, 5, 8, 13, 21)');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证日期格式
   */
  isValidDate(dateString) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) {
      return false;
    }

    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  }

  /**
   * 清洗数据（移除多余字段）
   */
  sanitizeTask(task) {
    return {
      id: task.id,
      storyId: task.storyId,
      title: task.title,
      description: task.description || '',
      storyPoints: task.storyPoints || 1,
      estimatedHours: task.estimatedHours || 4,
      status: task.status || 'todo',
      assignee: task.assignee || null,
      phase: task.phase,
      dependencies: task.dependencies || [],
      acceptanceCriteria: task.acceptanceCriteria || [],
      createdAt: task.createdAt,
      lastUpdated: task.lastUpdated,
      updatedBy: task.updatedBy
    };
  }

  /**
   * 清洗用户故事
   */
  sanitizeUserStory(story) {
    return {
      id: story.id,
      title: story.title,
      description: story.description || '',
      priority: story.priority || 'medium',
      storyPoints: story.storyPoints || 5,
      acceptanceCriteria: story.acceptanceCriteria || [],
      dependencies: story.dependencies || [],
      category: story.category || 'functionality',
      sprintStatus: story.sprintStatus || 'backlog'
    };
  }

  /**
   * 深度验证嵌套对象
   */
  validateNestedObject(obj, schema, path = '') {
    const errors = [];

    for (const [key, rules] of Object.entries(schema)) {
      const fullPath = path ? `${path}.${key}` : key;
      const value = obj[key];

      // 检查必需字段
      if (rules.required && (value === undefined || value === null)) {
        errors.push(`${fullPath} 是必需的`);
        continue;
      }

      // 如果值不存在且非必需，跳过
      if (value === undefined || value === null) {
        continue;
      }

      // 检查类型
      if (rules.type && typeof value !== rules.type) {
        errors.push(`${fullPath} 必须是 ${rules.type} 类型`);
        continue;
      }

      // 检查数组
      if (rules.isArray && !Array.isArray(value)) {
        errors.push(`${fullPath} 必须是数组`);
        continue;
      }

      // 检查枚举
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`${fullPath} 必须是以下之一: ${rules.enum.join(', ')}`);
        continue;
      }

      // 检查最小/最大值
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`${fullPath} 必须大于等于 ${rules.min}`);
      }

      if (rules.max !== undefined && value > rules.max) {
        errors.push(`${fullPath} 必须小于等于 ${rules.max}`);
      }

      // 递归验证嵌套对象
      if (rules.schema && typeof value === 'object') {
        const nestedErrors = this.validateNestedObject(value, rules.schema, fullPath);
        errors.push(...nestedErrors);
      }
    }

    return errors;
  }
}

module.exports = JsonValidator;
