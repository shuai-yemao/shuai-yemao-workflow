/**
 * DFMEA JSON 验证器
 * 用于验证 DFMEA 数据结构的完整性
 */

class JsonValidator {
  constructor() {
    this.schemas = {
      'dfmea-record': {
        required: ['id', 'product', 'functions', 'metadata'],
        properties: {
          id: { type: 'string', pattern: /^DFMEA-\d{3,}$/ },
          product: {
            required: ['id', 'name'],
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              version: { type: 'string' }
            }
          },
          functions: { type: 'array', minLength: 1 },
          metadata: {
            required: ['createdAt'],
            properties: {
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
              version: { type: 'string' }
            }
          }
        }
      },
      'function': {
        required: ['id', 'name', 'failureModes'],
        properties: {
          id: { type: 'string', pattern: /^FUNC-\d{3,}$/ },
          name: { type: 'string', minLength: 1 },
          description: { type: 'string' },
          failureModes: { type: 'array', minLength: 1 }
        }
      },
      'failure-mode': {
        required: ['id', 'description', 'effects', 'causes', 'rpn'],
        properties: {
          id: { type: 'string', pattern: /^FM-\d{3,}$/ },
          description: { type: 'string', minLength: 1 },
          effects: { type: 'array', minLength: 1 },
          causes: { type: 'array', minLength: 1 },
          currentControls: { type: 'array' },
          rpn: {
            required: ['severity', 'occurrence', 'detection', 'total'],
            properties: {
              severity: { type: 'number', min: 1, max: 10 },
              occurrence: { type: 'number', min: 1, max: 10 },
              detection: { type: 'number', min: 1, max: 10 },
              total: { type: 'number', min: 1, max: 1000 }
            }
          },
          actions: { type: 'array' },
          status: { type: 'string', enum: ['open', 'in-progress', 'completed'] }
        }
      },
      'risk-assessment': {
        required: ['functionId', 'failureModeId', 'rpn'],
        properties: {
          functionId: { type: 'string' },
          failureModeId: { type: 'string' },
          rpn: {
            required: ['severity', 'occurrence', 'detection'],
            properties: {
              severity: { type: 'number', min: 1, max: 10 },
              occurrence: { type: 'number', min: 1, max: 10 },
              detection: { type: 'number', min: 1, max: 10 }
            }
          }
        }
      },
      'improvement-action': {
        required: ['id', 'failureModeId', 'description', 'responsible'],
        properties: {
          id: { type: 'string', pattern: /^ACT-\d{3,}$/ },
          failureModeId: { type: 'string' },
          description: { type: 'string', minLength: 1 },
          responsible: { type: 'string', minLength: 1 },
          deadline: { type: 'string' },
          status: { type: 'string', enum: ['planned', 'in-progress', 'completed'] },
          targetRpn: {
            properties: {
              severity: { type: 'number', min: 1, max: 10 },
              occurrence: { type: 'number', min: 1, max: 10 },
              detection: { type: 'number', min: 1, max: 10 }
            }
          }
        }
      }
    };
  }

  /**
   * 验证数据结构
   * @param {string} type - 数据类型
   * @param {object} data - 要验证的数据
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validate(type, data) {
    const schema = this.schemas[type];
    if (!schema) {
      return { valid: false, errors: [`Unknown schema type: ${type}`] };
    }

    const errors = [];
    this.validateObject(data, schema, '', errors);

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 递归验证对象
   */
  validateObject(obj, schema, path, errors) {
    if (!obj || typeof obj !== 'object') {
      errors.push(`${path}: Expected object, got ${typeof obj}`);
      return;
    }

    // 检查必需字段
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in obj)) {
          errors.push(`${path}.${field}: Required field missing`);
        }
      }
    }

    // 检查属性
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in obj) {
          this.validateProperty(obj[key], propSchema, `${path}.${key}`, errors);
        }
      }
    }
  }

  /**
   * 验证属性值
   */
  validateProperty(value, schema, path, errors) {
    // 类型检查
    if (schema.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== schema.type) {
        errors.push(`${path}: Expected ${schema.type}, got ${actualType}`);
        return;
      }
    }

    // 枚举检查
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(`${path}: Value must be one of [${schema.enum.join(', ')}]`);
    }

    // 数字范围检查
    if (schema.type === 'number') {
      if (schema.min !== undefined && value < schema.min) {
        errors.push(`${path}: Value ${value} is less than minimum ${schema.min}`);
      }
      if (schema.max !== undefined && value > schema.max) {
        errors.push(`${path}: Value ${value} is greater than maximum ${schema.max}`);
      }
    }

    // 字符串长度检查
    if (schema.type === 'string') {
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        errors.push(`${path}: String length ${value.length} is less than minimum ${schema.minLength}`);
      }
      if (schema.pattern && !schema.pattern.test(value)) {
        errors.push(`${path}: String does not match pattern ${schema.pattern}`);
      }
    }

    // 数组检查
    if (schema.type === 'array') {
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        errors.push(`${path}: Array length ${value.length} is less than minimum ${schema.minLength}`);
      }
    }

    // 嵌套对象验证
    if (schema.required || schema.properties) {
      this.validateObject(value, schema, path, errors);
    }
  }

  /**
   * 清洗数据，填充默认值
   * @param {string} type - 数据类型
   * @param {object} data - 要清洗的数据
   * @returns {object} 清洗后的数据
   */
  sanitize(type, data) {
    const sanitized = { ...data };

    switch (type) {
      case 'dfmea-record':
        sanitized.metadata = sanitized.metadata || {};
        sanitized.metadata.createdAt = sanitized.metadata.createdAt || new Date().toISOString();
        sanitized.metadata.updatedAt = new Date().toISOString();
        sanitized.functions = sanitized.functions || [];
        break;

      case 'failure-mode':
        sanitized.effects = sanitized.effects || [];
        sanitized.causes = sanitized.causes || [];
        sanitized.currentControls = sanitized.currentControls || [];
        sanitized.actions = sanitized.actions || [];
        sanitized.status = sanitized.status || 'open';
        break;

      case 'improvement-action':
        sanitized.status = sanitized.status || 'planned';
        sanitized.createdAt = sanitized.createdAt || new Date().toISOString();
        break;
    }

    return sanitized;
  }
}

module.exports = JsonValidator;
