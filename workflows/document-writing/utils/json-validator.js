/**
 * JSON 验证工具
 * 验证工作流输入输出数据的结构
 */

class JsonValidator {
  constructor() {
    this.schemas = {
      documentInput: {
        required: ['documentType', 'topic'],
        properties: {
          documentType: { type: 'string', enum: ['survey', 'guide', 'business-plan', 'meeting-report', 'paper', 'technical', 'general'] },
          topic: { type: 'string', minLength: 1 },
          researchData: { type: 'object' },
          outputFormat: { type: 'string', enum: ['markdown', 'docx', 'pdf', 'html'], default: 'markdown' },
          language: { type: 'string', enum: ['zh-CN', 'en-US'], default: 'zh-CN' },
          customTemplate: { type: 'string' },
          template: { type: 'object' }
        }
      },
      researchData: {
        properties: {
          summary: { type: 'string' },
          background: { type: 'string' },
          methodology: { type: 'string' },
          findings: { type: 'array', items: { type: 'string' } },
          dataAnalysis: { type: 'string' },
          conclusions: { type: 'string' },
          sources: { type: 'array', items: { type: 'object' } }
        }
      },
      formatInput: {
        required: ['content', 'outputFormat'],
        properties: {
          content: { type: 'string', minLength: 1 },
          sourceFormat: { type: 'string', enum: ['markdown'], default: 'markdown' },
          outputFormat: { type: 'string', enum: ['docx', 'pdf', 'html'] },
          outputPath: { type: 'string' },
          fileName: { type: 'string' }
        }
      }
    };
  }

  /**
   * 验证数据
   */
  validate(data, schemaName) {
    const schema = this.schemas[schemaName];
    if (!schema) {
      return { valid: true, errors: [] };
    }

    const errors = [];

    // 检查必填字段
    if (schema.required) {
      for (const field of schema.required) {
        if (data[field] === undefined || data[field] === null) {
          errors.push(`缺少必填字段: ${field}`);
        }
      }
    }

    // 检查属性类型
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (data[key] !== undefined && data[key] !== null) {
          const value = data[key];

          // 类型检查
          if (propSchema.type === 'string' && typeof value !== 'string') {
            errors.push(`字段 ${key} 应为字符串类型`);
          } else if (propSchema.type === 'object' && typeof value !== 'object') {
            errors.push(`字段 ${key} 应为对象类型`);
          } else if (propSchema.type === 'array' && !Array.isArray(value)) {
            errors.push(`字段 ${key} 应为数组类型`);
          } else if (propSchema.type === 'number' && typeof value !== 'number') {
            errors.push(`字段 ${key} 应为数字类型`);
          }

          // 枚举检查
          if (propSchema.enum && !propSchema.enum.includes(value)) {
            errors.push(`字段 ${key} 的值 "${value}" 不在允许范围 [${propSchema.enum.join(', ')}] 内`);
          }

          // 最小长度检查
          if (propSchema.minLength && typeof value === 'string' && value.length < propSchema.minLength) {
            errors.push(`字段 ${key} 长度不能少于 ${propSchema.minLength} 个字符`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 清理数据 - 移除未知字段，填充默认值
   */
  sanitize(data, schemaName) {
    const schema = this.schemas[schemaName];
    if (!schema || !schema.properties) {
      return { ...data };
    }

    const result = {};

    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (data[key] !== undefined) {
        result[key] = data[key];
      } else if (propSchema.default !== undefined) {
        result[key] = propSchema.default;
      }
    }

    return result;
  }
}

module.exports = JsonValidator;
