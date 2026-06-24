/**
 * 硬件设计 JSON 验证器
 */

class JsonValidator {
  constructor() {
    this.schemas = {
      'hardware-record': {
        required: ['id', 'product', 'metadata'],
        properties: {
          id: { type: 'string', pattern: /^HW-\d{3,}$/ },
          product: { required: ['id', 'name'], properties: { id: { type: 'string' }, name: { type: 'string' }, version: { type: 'string' } } },
          metadata: { required: ['createdAt'], properties: { createdAt: { type: 'string' }, updatedAt: { type: 'string' } } }
        }
      },
      'component': {
        required: ['id', 'name', 'type'],
        properties: {
          id: { type: 'string', pattern: /^COMP-\d{3,}$/ },
          name: { type: 'string', minLength: 1 },
          type: { type: 'string', enum: ['mcu', 'sensor', 'power', 'communication', 'memory', 'connector', 'passive', 'other'] },
          partNumber: { type: 'string' },
          supplier: { type: 'string' },
          status: { type: 'string', enum: ['selected', 'evaluated', 'qualified', 'deprecated'] }
        }
      },
      'schematic': {
        required: ['id', 'name', 'version'],
        properties: {
          id: { type: 'string', pattern: /^SCH-\d{3,}$/ },
          name: { type: 'string', minLength: 1 },
          version: { type: 'string' },
          status: { type: 'string', enum: ['draft', 'reviewed', 'approved', 'rejected'] },
          reviews: { type: 'array' }
        }
      },
      'pcb': {
        required: ['id', 'name', 'version'],
        properties: {
          id: { type: 'string', pattern: /^PCB-\d{3,}$/ },
          name: { type: 'string', minLength: 1 },
          version: { type: 'string' },
          layers: { type: 'number', min: 1 },
          status: { type: 'string', enum: ['draft', 'reviewed', 'fabricated', 'assembled'] },
          reviews: { type: 'array' }
        }
      },
      'bom-item': {
        required: ['id', 'componentName', 'quantity'],
        properties: {
          id: { type: 'string', pattern: /^BOM-\d{3,}$/ },
          componentName: { type: 'string', minLength: 1 },
          partNumber: { type: 'string' },
          quantity: { type: 'number', min: 1 },
          unitPrice: { type: 'number', min: 0 },
          supplier: { type: 'string' }
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
    if (schema.type) { const actualType = Array.isArray(value) ? 'array' : typeof value; if (actualType !== schema.type) { errors.push(`${path}: Expected ${schema.type}, got ${actualType}`); return; } }
    if (schema.enum && !schema.enum.includes(value)) errors.push(`${path}: Value must be one of [${schema.enum.join(', ')}]`);
    if (schema.type === 'number' && schema.min !== undefined && value < schema.min) errors.push(`${path}: Value ${value} is less than minimum ${schema.min}`);
    if (schema.type === 'string' && schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${path}: String too short`);
    if (schema.type === 'array' && schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${path}: Array too short`);
    if (schema.required || schema.properties) this.validateObject(value, schema, path, errors);
  }

  sanitize(type, data) {
    const sanitized = { ...data };
    switch (type) {
      case 'hardware-record': sanitized.metadata = { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...sanitized.metadata }; break;
      case 'schematic': sanitized.status = sanitized.status || 'draft'; sanitized.reviews = sanitized.reviews || []; break;
      case 'pcb': sanitized.status = sanitized.status || 'draft'; sanitized.reviews = sanitized.reviews || []; break;
      case 'bom-item': sanitized.status = sanitized.status || 'active'; break;
    }
    return sanitized;
  }
}

module.exports = JsonValidator;
