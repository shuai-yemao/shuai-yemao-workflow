/**
 * 固件开发 JSON 验证器
 */

class JsonValidator {
  constructor() {
    this.schemas = {
      'firmware-record': {
        required: ['id', 'product', 'metadata'],
        properties: {
          id: { type: 'string', pattern: /^FW-\d{3,}$/ },
          product: { required: ['id', 'name'], properties: { id: { type: 'string' }, name: { type: 'string' }, version: { type: 'string' } } },
          metadata: { required: ['createdAt'], properties: { createdAt: { type: 'string' }, updatedAt: { type: 'string' } } }
        }
      },
      'firmware-module': {
        required: ['id', 'name', 'type'],
        properties: {
          id: { type: 'string', pattern: /^MOD-\d{3,}$/ },
          name: { type: 'string', minLength: 1 },
          type: { type: 'string', enum: ['bootloader', 'driver', 'middleware', 'application', 'protocol', 'utility'] },
          status: { type: 'string', enum: ['planned', 'in-development', 'testing', 'completed', 'deprecated'] }
        }
      },
      'release': {
        required: ['id', 'version', 'status'],
        properties: {
          id: { type: 'string', pattern: /^REL-\d{3,}$/ },
          version: { type: 'string' },
          status: { type: 'string', enum: ['planned', 'building', 'testing', 'released', 'deprecated'] }
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
    if (schema.properties) { for (const [key, propSchema] of Object.entries(schema.properties)) { if (key in obj) this.validateProperty(obj[key], propSchema, `${path}.${key}`, errors); } }
  }

  validateProperty(value, schema, path, errors) {
    if (schema.type) { const actualType = Array.isArray(value) ? 'array' : typeof value; if (actualType !== schema.type) { errors.push(`${path}: Expected ${schema.type}`); return; } }
    if (schema.enum && !schema.enum.includes(value)) errors.push(`${path}: Value must be one of [${schema.enum.join(', ')}]`);
    if (schema.type === 'string' && schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${path}: String too short`);
    if (schema.required || schema.properties) this.validateObject(value, schema, path, errors);
  }

  sanitize(type, data) {
    const sanitized = { ...data };
    switch (type) {
      case 'firmware-record': sanitized.metadata = { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...sanitized.metadata }; break;
      case 'firmware-module': sanitized.status = sanitized.status || 'planned'; sanitized.version = sanitized.version || '1.0.0'; break;
      case 'release': sanitized.status = sanitized.status || 'planned'; sanitized.createdAt = new Date().toISOString(); break;
    }
    return sanitized;
  }
}

module.exports = JsonValidator;
