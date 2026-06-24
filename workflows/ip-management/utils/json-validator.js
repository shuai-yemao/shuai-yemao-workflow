/**
 * 知识产权 JSON 验证器
 */

class JsonValidator {
  constructor() {
    this.schemas = {
      'ip-record': {
        required: ['id', 'product', 'metadata'],
        properties: {
          id: { type: 'string', pattern: /^IP-\d{3,}$/ },
          product: { required: ['id', 'name'], properties: { id: { type: 'string' }, name: { type: 'string' } } },
          metadata: { required: ['createdAt'] }
        }
      },
      'patent': {
        required: ['id', 'title', 'type'],
        properties: {
          id: { type: 'string', pattern: /^PAT-\d{3,}$/ },
          title: { type: 'string', minLength: 1 },
          type: { type: 'string', enum: ['invention', 'utility-model', 'design'] },
          status: { type: 'string', enum: ['draft', 'filed', 'pending', 'granted', 'rejected', 'abandoned'] }
        }
      },
      'trademark': {
        required: ['id', 'name', 'category'],
        properties: {
          id: { type: 'string', pattern: /^TM-\d{3,}$/ },
          name: { type: 'string', minLength: 1 },
          category: { type: 'string', enum: ['text', 'logo', 'combination', 'sound', 'color'] },
          status: { type: 'string', enum: ['planned', 'filed', 'pending', 'registered', 'rejected'] }
        }
      },
      'copyright': {
        required: ['id', 'title', 'type'],
        properties: {
          id: { type: 'string', pattern: /^CR-\d{3,}$/ },
          title: { type: 'string', minLength: 1 },
          type: { type: 'string', enum: ['software', 'documentation', 'design', 'other'] },
          status: { type: 'string', enum: ['planned', 'registered'] }
        }
      }
    };
  }

  validate(type, data) {
    const schema = this.schemas[type];
    if (!schema) return { valid: false, errors: [`Unknown schema type: ${type}`] };
    const errors = [];
    this.validateObject(data, schema, '', errors);
    return { valid: errors.length === 0, errors };
  }

  validateObject(obj, schema, path, errors) {
    if (!obj || typeof obj !== 'object') { errors.push(`${path}: Expected object`); return; }
    if (schema.required) { for (const field of schema.required) { if (!(field in obj)) errors.push(`${path}.${field}: Required field missing`); } }
  }

  sanitize(type, data) {
    const sanitized = { ...data };
    switch (type) {
      case 'patent': sanitized.status = sanitized.status || 'draft'; sanitized.createdAt = new Date().toISOString(); break;
      case 'trademark': sanitized.status = sanitized.status || 'planned'; sanitized.createdAt = new Date().toISOString(); break;
      case 'copyright': sanitized.status = sanitized.status || 'planned'; sanitized.createdAt = new Date().toISOString(); break;
    }
    return sanitized;
  }
}

module.exports = JsonValidator;
