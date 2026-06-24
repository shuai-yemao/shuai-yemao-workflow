/**
 * 机械设计 JSON 验证器
 */

class JsonValidator {
  constructor() {
    this.schemas = {
      'mechanical-record': {
        required: ['id', 'product', 'metadata'],
        properties: {
          id: { type: 'string', pattern: /^MECH-\d{3,}$/ },
          product: { required: ['id', 'name'] },
          metadata: { required: ['createdAt'] }
        }
      },
      'part': {
        required: ['id', 'name', 'type'],
        properties: {
          id: { type: 'string', pattern: /^PART-\d{3,}$/ },
          name: { type: 'string', minLength: 1 },
          type: { type: 'string', enum: ['enclosure', 'bracket', 'shaft', 'gear', 'spring', 'fastener', 'other'] },
          material: { type: 'string' },
          status: { type: 'string', enum: ['draft', 'reviewed', 'approved', 'manufacturing'] }
        }
      },
      'assembly': {
        required: ['id', 'name', 'parts'],
        properties: {
          id: { type: 'string', pattern: /^ASSY-\d{3,}$/ },
          name: { type: 'string', minLength: 1 },
          parts: { type: 'array', minLength: 1 }
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

  sanitize(type, data) {
    const sanitized = { ...data };
    switch (type) {
      case 'part': sanitized.status = sanitized.status || 'draft'; sanitized.createdAt = new Date().toISOString(); break;
      case 'assembly': sanitized.status = sanitized.status || 'draft'; sanitized.createdAt = new Date().toISOString(); break;
    }
    return sanitized;
  }
}

module.exports = JsonValidator;
