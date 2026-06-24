/**
 * 软件开发 JSON 验证器
 */

class JsonValidator {
  constructor() {
    this.schemas = {
      'software-record': {
        required: ['id', 'product', 'metadata'],
        properties: {
          id: { type: 'string', pattern: /^SW-\d{3,}$/ },
          product: { required: ['id', 'name'] },
          metadata: { required: ['createdAt'] }
        }
      },
      'module': {
        required: ['id', 'name', 'type'],
        properties: {
          id: { type: 'string', pattern: /^MOD-\d{3,}$/ },
          name: { type: 'string', minLength: 1 },
          type: { type: 'string', enum: ['frontend', 'backend', 'api', 'library', 'utility', 'service', 'other'] }
        }
      }
    };
  }

  validate(type, data) {
    const schema = this.schemas[type];
    if (!schema) return { valid: false, errors: [`Unknown schema type: ${type}`] };
    const errors = [];
    if (schema.required) { for (const field of schema.required) { if (!(field in data)) errors.push(`${field}: Required field missing`); } }
    return { valid: errors.length === 0, errors };
  }
}

module.exports = JsonValidator;
