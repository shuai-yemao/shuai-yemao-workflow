/**
 * 工厂测试 JSON 验证器
 */

class JsonValidator {
  constructor() {
    this.schemas = {
      'test-plan': {
        required: ['id', 'product', 'metadata'],
        properties: {
          id: { type: 'string', pattern: /^FT-\d{3,}$/ },
          product: { required: ['id', 'name'] },
          metadata: { required: ['createdAt'] }
        }
      },
      'test-case': {
        required: ['id', 'name', 'type'],
        properties: {
          id: { type: 'string', pattern: /^TC-\d{3,}$/ },
          name: { type: 'string', minLength: 1 },
          type: { type: 'string', enum: ['ict', 'fct', 'burn-in', 'environmental', 'visual', 'other'] }
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
