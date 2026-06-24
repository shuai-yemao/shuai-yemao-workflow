/**
 * 法规认证 JSON 验证器
 * 用于验证认证数据结构的完整性
 */

class JsonValidator {
  constructor() {
    this.schemas = {
      'certification-record': {
        required: ['id', 'product', 'regulations', 'certifications', 'metadata'],
        properties: {
          id: { type: 'string', pattern: /^CERT-\d{3,}$/ },
          product: {
            required: ['id', 'name'],
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              version: { type: 'string' }
            }
          },
          regulations: { type: 'array', minLength: 1 },
          certifications: { type: 'array' },
          metadata: {
            required: ['createdAt'],
            properties: {
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' }
            }
          }
        }
      },
      'regulation': {
        required: ['id', 'name', 'region', 'category'],
        properties: {
          id: { type: 'string', pattern: /^REG-\d{3,}$/ },
          name: { type: 'string', minLength: 1 },
          region: { type: 'string', enum: ['CN', 'EU', 'US', 'JP', 'KR', 'GLOBAL'] },
          category: { type: 'string', enum: ['safety', 'emc', 'environmental', 'radio', 'other'] },
          requirements: { type: 'array' },
          description: { type: 'string' }
        }
      },
      'certification': {
        required: ['id', 'name', 'authority', 'status'],
        properties: {
          id: { type: 'string', pattern: /^CERT-\d{3,}$/ },
          name: { type: 'string', minLength: 1 },
          authority: { type: 'string', minLength: 1 },
          regulationId: { type: 'string' },
          status: { type: 'string', enum: ['planned', 'in-progress', 'obtained', 'expired', 'suspended'] },
          applicationDate: { type: 'string' },
          expiryDate: { type: 'string' },
          documents: { type: 'array' },
          cost: { type: 'number', min: 0 },
          notes: { type: 'string' }
        }
      },
      'compliance-item': {
        required: ['regulationId', 'requirementId', 'status'],
        properties: {
          regulationId: { type: 'string' },
          requirementId: { type: 'string' },
          status: { type: 'string', enum: ['compliant', 'non-compliant', 'partial', 'pending'] },
          evidence: { type: 'string' },
          notes: { type: 'string' }
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

    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in obj)) {
          errors.push(`${path}.${field}: Required field missing`);
        }
      }
    }

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
    if (schema.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== schema.type) {
        errors.push(`${path}: Expected ${schema.type}, got ${actualType}`);
        return;
      }
    }

    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(`${path}: Value must be one of [${schema.enum.join(', ')}]`);
    }

    if (schema.type === 'number') {
      if (schema.min !== undefined && value < schema.min) {
        errors.push(`${path}: Value ${value} is less than minimum ${schema.min}`);
      }
    }

    if (schema.type === 'string') {
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        errors.push(`${path}: String length ${value.length} is less than minimum ${schema.minLength}`);
      }
      if (schema.pattern && !schema.pattern.test(value)) {
        errors.push(`${path}: String does not match pattern ${schema.pattern}`);
      }
    }

    if (schema.type === 'array') {
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        errors.push(`${path}: Array length ${value.length} is less than minimum ${schema.minLength}`);
      }
    }

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
      case 'certification-record':
        sanitized.metadata = sanitized.metadata || {};
        sanitized.metadata.createdAt = sanitized.metadata.createdAt || new Date().toISOString();
        sanitized.metadata.updatedAt = new Date().toISOString();
        sanitized.regulations = sanitized.regulations || [];
        sanitized.certifications = sanitized.certifications || [];
        break;

      case 'certification':
        sanitized.status = sanitized.status || 'planned';
        sanitized.documents = sanitized.documents || [];
        sanitized.createdAt = sanitized.createdAt || new Date().toISOString();
        break;

      case 'compliance-item':
        sanitized.status = sanitized.status || 'pending';
        sanitized.checkedAt = sanitized.checkedAt || new Date().toISOString();
        break;
    }

    return sanitized;
  }
}

module.exports = JsonValidator;
