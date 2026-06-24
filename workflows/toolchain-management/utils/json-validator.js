/**
 * 工具链管理 JSON 验证器
 */

class JsonValidator {
  constructor() {
    this.schemas = {
      'tool': {
        required: ['id', 'name', 'category'],
        properties: {
          id: { type: 'string', pattern: /^TOOL-\d{3,}$/ },
          name: { type: 'string', minLength: 1 },
          category: { type: 'string', enum: ['ide', 'compiler', 'debugger', 'vcs', 'build', 'test', 'deploy', 'utility'] }
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
