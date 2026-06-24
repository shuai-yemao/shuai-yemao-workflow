/**
 * 可视化 JSON 验证器
 */

class JsonValidator {
  constructor() {
    this.schemas = {
      'mindmap': {
        required: ['root'],
        properties: {
          root: { type: 'string', minLength: 1 },
          children: { type: 'array' }
        }
      },
      'flowchart': {
        required: ['nodes'],
        properties: {
          nodes: { type: 'array', minLength: 1 },
          connections: { type: 'array' },
          direction: { type: 'string', enum: ['TD', 'LR', 'RL', 'BT'] }
        }
      },
      'architecture': {
        required: ['blocks'],
        properties: {
          blocks: { type: 'array', minLength: 1 },
          connections: { type: 'array' },
          columns: { type: 'number', min: 1, max: 12 }
        }
      },
      'sequence': {
        required: ['participants', 'messages'],
        properties: {
          participants: { type: 'array', minLength: 1 },
          messages: { type: 'array', minLength: 1 },
          notes: { type: 'array' }
        }
      },
      'state': {
        required: ['states', 'transitions'],
        properties: {
          states: { type: 'array', minLength: 1 },
          transitions: { type: 'array', minLength: 1 }
        }
      }
    };
  }

  validate(type, data) {
    const schema = this.schemas[type];
    if (!schema) return { valid: true, errors: [] };

    const errors = [];
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in data) || data[field] === undefined || data[field] === null) {
          errors.push(`${field}: Required field missing`);
        }
      }
    }
    return { valid: errors.length === 0, errors };
  }
}

module.exports = JsonValidator;
